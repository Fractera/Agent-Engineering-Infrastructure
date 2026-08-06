import express from 'express'
import cors from 'cors'
import multer from 'multer'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs'
import { resolve, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { shouldBypassAuth } from './auth-bypass.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env') })

const PORT        = process.env.PORT ?? 3300
const AUTH_URL    = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001'
const STORAGE_DIR = resolve(__dirname, 'storage')
const ICONS_DIR   = resolve(__dirname, 'icons')
const MEDIA_DB    = resolve(__dirname, 'data/media.db')
const APP_DB      = process.env.APP_DB_PATH ?? resolve(__dirname, '../../app/data/products.db')

mkdirSync(STORAGE_DIR,                   { recursive: true })
mkdirSync(ICONS_DIR,                     { recursive: true })
mkdirSync(resolve(__dirname, 'data'),    { recursive: true })

// ── Databases ─────────────────────────────────────────────────────────────────

const mediaDb = new Database(MEDIA_DB)
mediaDb.pragma('journal_mode = WAL')

mediaDb.exec(`
  CREATE TABLE IF NOT EXISTS icon_sets (
    id           TEXT PRIMARY KEY,
    source_id    TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    files        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS media (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    title       TEXT DEFAULT '',
    description TEXT DEFAULT '',
    url         TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    extension   TEXT NOT NULL,
    crop_mode   TEXT DEFAULT '',
    size        INTEGER NOT NULL,
    width       INTEGER,
    height      INTEGER,
    duration    REAL,
    storage_key TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const existingCols = mediaDb.prepare('PRAGMA table_info(media)').all().map(c => c.name)
if (!existingCols.includes('title'))       mediaDb.exec(`ALTER TABLE media ADD COLUMN title TEXT DEFAULT ''`)
if (!existingCols.includes('description')) mediaDb.exec(`ALTER TABLE media ADD COLUMN description TEXT DEFAULT ''`)
if (!existingCols.includes('url'))         mediaDb.exec(`ALTER TABLE media ADD COLUMN url TEXT NOT NULL DEFAULT ''`)
if (!existingCols.includes('crop_mode'))   mediaDb.exec(`ALTER TABLE media ADD COLUMN crop_mode TEXT DEFAULT ''`)

const appDb = new Database(APP_DB)
appDb.pragma('journal_mode = WAL')
appDb.pragma('foreign_keys = ON')

appDb.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    price      REAL NOT NULL DEFAULT 0,
    media_id   TEXT,
    media_url  TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const productsCols = new Set(appDb.prepare('PRAGMA table_info(products)').all().map(c => c.name))
if (!productsCols.has('media_id'))    appDb.exec(`ALTER TABLE products ADD COLUMN media_id   TEXT`)
if (!productsCols.has('media_url'))   appDb.exec(`ALTER TABLE products ADD COLUMN media_url  TEXT`)
if (!productsCols.has('created_by'))  appDb.exec(`ALTER TABLE products ADD COLUMN created_by TEXT NOT NULL DEFAULT 'system'`)

// ── Vector store (step 500) ────────────────────────
// The third warehouse of the data layer, next to rows (/db) and objects (/media).
// It replaces LightRAG (:9621), which was a graph-RAG framework installed to make
// the Hermes agent smarter; Hermes is gone, so the graph half went with it and only
// the vector half is kept — in the SAME SQLite file as the rows it annotates, so it
// shares one backup, one auth posture and one wipe semantics.
//
// Similarity search: sqlite-vec if the extension loads, otherwise a plain scan with
// cosine computed in JS. The fallback is honest at this scale (thousands of rows) —
// it is linear, so it is logged once at startup instead of pretending to be an index.
const EMBED_MODEL = process.env.EMBED_MODEL ?? 'text-embedding-3-small'
const EMBED_DIMS  = Number(process.env.EMBED_DIMS ?? 1536)

let vecExtension = false
try {
  const { load } = await import('sqlite-vec')
  load(appDb)
  vecExtension = true
} catch {
  vecExtension = false
}

appDb.exec(`
  CREATE TABLE IF NOT EXISTS vectors (
    id         TEXT PRIMARY KEY NOT NULL,
    collection TEXT NOT NULL,
    ref_table  TEXT,
    ref_id     TEXT,
    text       TEXT NOT NULL,
    embedding  BLOB NOT NULL,
    dims       INTEGER NOT NULL,
    model      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS vectors_collection_idx ON vectors (collection);
  CREATE INDEX IF NOT EXISTS vectors_ref_idx        ON vectors (ref_table, ref_id);
`)

function toBlob(vec) {
  return Buffer.from(new Float32Array(vec).buffer)
}
function fromBlob(buf) {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// One place where text becomes a vector. Callers may pass a ready `embedding`
// instead and never touch OpenAI — the store itself has no opinion about who
// produced the numbers, only that the dimensions match.
async function embed(text) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set in the data service env')
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  })
  if (!r.ok) throw new Error(`embeddings ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const data = await r.json()
  return data.data[0].embedding
}

// ── Auth middleware ───────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
  if (shouldBypassAuth()) {
    req.session = { userId: 'demo@local', email: 'demo@local', roles: ['admin'] }
    return next()
  }
  const dataSecret = process.env.DATA_SECRET
  if (dataSecret && req.headers['x-data-secret'] === dataSecret) {
    const agentId = req.headers['x-agent-identity'] ?? 'agent'
    req.session = { userId: `${agentId}@agent`, email: `${agentId}@agent`, roles: ['agent'] }
    return next()
  }
  const cookie = req.headers.cookie ?? ''
  try {
    const r = await fetch(`${AUTH_URL}/api/session`, { headers: { cookie } })
    if (!r.ok) return res.status(401).json({ error: 'Unauthorized' })
    req.session = await r.json()
    next()
  } catch {
    res.status(503).json({ error: 'Auth service unavailable' })
  }
}

// ── Multer ────────────────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
})

// ── App ───────────────────────────────────────────────────────────────────────

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// ── GET /health — no auth ─────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }))

// ── Apply auth to everything below ───────────────────────────────────────────

app.use(requireAuth)

// ── GET /media ────────────────────────────────────────────────────────────────

app.get('/media', (_req, res) => {
  const rows = mediaDb.prepare('SELECT * FROM media ORDER BY created_at DESC').all()
  res.json({ ok: true, items: rows })
})

// ── POST /media/upload ────────────────────────────────────────────────────────

app.post('/media/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ ok: false, error: 'No file provided' })

    const id         = uuidv4()
    const ext        = extname(file.originalname).replace('.', '').toLowerCase() || 'bin'
    const storageKey = `${id}.${ext}`
    const destPath   = resolve(STORAGE_DIR, storageKey)
    const isImage    = file.mimetype.startsWith('image/')

    let width = null, height = null, duration = null, buffer = file.buffer

    if (isImage) {
      const meta = await sharp(buffer).metadata()
      width  = meta.width  ?? null
      height = meta.height ?? null

      const crop = req.body.crop ? JSON.parse(req.body.crop) : null
      if (crop) {
        buffer = await sharp(buffer)
          .extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h })
          .toBuffer()
        width  = crop.w
        height = crop.h
      }
    }

    await import('fs/promises').then(fs => fs.writeFile(destPath, buffer))

    const baseUrl = process.env.DATA_PUBLIC_URL ?? `http://localhost:${PORT}`
    const row = {
      id,
      name:        file.originalname,
      title:       req.body.title || '',
      description: req.body.description || '',
      url:         `${baseUrl}/media/${id}/file`,
      mime_type:   file.mimetype,
      extension:   ext,
      crop_mode:   req.body.crop_mode || '',
      size:        buffer.length,
      width,
      height,
      duration,
      storage_key: storageKey,
    }

    mediaDb.prepare(`
      INSERT INTO media (id, name, title, description, url, mime_type, extension, crop_mode, size, width, height, duration, storage_key)
      VALUES (@id, @name, @title, @description, @url, @mime_type, @extension, @crop_mode, @size, @width, @height, @duration, @storage_key)
    `).run(row)

    res.json({ ok: true, item: mediaDb.prepare('SELECT * FROM media WHERE id = ?').get(id) })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// ── PATCH /media/:id ──────────────────────────────────────────────────────────

app.patch('/media/:id', (req, res) => {
  const { title, description, crop_mode } = req.body
  const item = mediaDb.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ ok: false, error: 'Not found' })

  mediaDb.prepare('UPDATE media SET title = ?, description = ?, crop_mode = ? WHERE id = ?')
    .run(title ?? item.title ?? '', description ?? item.description ?? '', crop_mode ?? item.crop_mode ?? '', req.params.id)

  res.json({ ok: true, item: mediaDb.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id) })
})

// ── DELETE /media/:id ─────────────────────────────────────────────────────────

app.delete('/media/:id', (req, res) => {
  const item = mediaDb.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ ok: false, error: 'Not found' })

  const filePath = resolve(STORAGE_DIR, item.storage_key)
  if (existsSync(filePath)) { try { unlinkSync(filePath) } catch {} }

  mediaDb.prepare('DELETE FROM media WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ── GET /media/:id/file ───────────────────────────────────────────────────────

app.get('/media/:id/file', (req, res) => {
  const item = mediaDb.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).end()

  const filePath = resolve(STORAGE_DIR, item.storage_key)
  if (!existsSync(filePath)) return res.status(404).end()

  res.setHeader('Content-Type', item.mime_type)
  res.setHeader('Cache-Control', 'public, max-age=31536000')
  createReadStream(filePath).pipe(res)
})

// ── GET /media/:id/thumb ──────────────────────────────────────────────────────

app.get('/media/:id/thumb', async (req, res) => {
  const item = mediaDb.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id)
  if (!item || !item.mime_type.startsWith('image/')) return res.status(404).end()

  const filePath = resolve(STORAGE_DIR, item.storage_key)
  if (!existsSync(filePath)) return res.status(404).end()

  try {
    const thumb = await sharp(filePath).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer()
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(thumb)
  } catch {
    res.status(500).end()
  }
})

// ── POST /media/generate-icons ────────────────────────────────────────────────

app.post('/media/generate-icons', async (req, res) => {
  try {
    const { media_id } = req.body
    if (!media_id) return res.status(400).json({ ok: false, error: 'media_id required' })

    const item = mediaDb.prepare('SELECT * FROM media WHERE id = ?').get(media_id)
    if (!item) return res.status(404).json({ ok: false, error: 'Media not found' })
    if (!item.mime_type.startsWith('image/')) return res.status(400).json({ ok: false, error: 'Source must be an image' })

    const srcPath = resolve(STORAGE_DIR, item.storage_key)
    if (!existsSync(srcPath)) return res.status(404).json({ ok: false, error: 'Source file not found' })

    const id  = uuidv4()
    const dir = resolve(ICONS_DIR, id)
    mkdirSync(dir, { recursive: true })

    const sizes = [16, 32, 180, 192, 512]
    const pngBuffers = {}
    for (const size of sizes) {
      pngBuffers[size] = await sharp(srcPath)
        .resize(size, size, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer()
    }

    writeFileSync(resolve(dir, 'favicon-16.png'),       pngBuffers[16])
    writeFileSync(resolve(dir, 'favicon-32.png'),       pngBuffers[32])
    writeFileSync(resolve(dir, 'apple-touch-icon.png'), pngBuffers[180])
    writeFileSync(resolve(dir, 'icon-192.png'),         pngBuffers[192])
    writeFileSync(resolve(dir, 'icon-512.png'),         pngBuffers[512])

    const icoBuffer = await pngToIco([pngBuffers[16], pngBuffers[32]])
    writeFileSync(resolve(dir, 'favicon.ico'), icoBuffer)

    const ogBuffer = await sharp(srcPath)
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 90 })
      .toBuffer()
    writeFileSync(resolve(dir, 'og-image.jpg'), ogBuffer)

    const baseUrl = process.env.DATA_PUBLIC_URL ?? `http://localhost:${PORT}`
    const manifest = {
      name: 'Fractera Light',
      short_name: 'Fractera',
      icons: [
        { src: `${baseUrl}/media/icons/${id}/file/icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${baseUrl}/media/icons/${id}/file/icon-512.png`, sizes: '512x512', type: 'image/png' },
      ],
      theme_color: '#000000',
      background_color: '#000000',
      display: 'standalone',
    }
    writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))

    const files = {
      favicon_ico:       `${id}/favicon.ico`,
      favicon_16:        `${id}/favicon-16.png`,
      favicon_32:        `${id}/favicon-32.png`,
      apple_touch_icon:  `${id}/apple-touch-icon.png`,
      icon_192:          `${id}/icon-192.png`,
      icon_512:          `${id}/icon-512.png`,
      og_image:          `${id}/og-image.jpg`,
      manifest:          `${id}/manifest.json`,
    }

    mediaDb.prepare(`INSERT INTO icon_sets (id, source_id, files) VALUES (?, ?, ?)`).run(id, media_id, JSON.stringify(files))
    res.json({ ok: true, id, files })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// ── GET /media/icons/current ──────────────────────────────────────────────────

app.get('/media/icons/current', (_req, res) => {
  const row = mediaDb.prepare('SELECT * FROM icon_sets ORDER BY generated_at DESC LIMIT 1').get()
  if (!row) return res.status(404).json({ ok: false, error: 'No icon sets generated yet' })
  res.json({ ok: true, ...row, files: JSON.parse(row.files) })
})

// ── GET /media/icons ──────────────────────────────────────────────────────────

app.get('/media/icons', (_req, res) => {
  const rows = mediaDb.prepare('SELECT * FROM icon_sets ORDER BY generated_at DESC').all()
  res.json({ ok: true, items: rows.map(r => ({ ...r, files: JSON.parse(r.files) })) })
})

// ── GET /media/icons/:id/file/:name ──────────────────────────────────────────

app.get('/media/icons/:id/file/:name', (req, res) => {
  const row = mediaDb.prepare('SELECT * FROM icon_sets WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).end()

  const filePath = resolve(ICONS_DIR, req.params.id, req.params.name)
  if (!existsSync(filePath)) return res.status(404).end()

  const ext  = req.params.name.split('.').pop()
  const mime = ext === 'ico' ? 'image/x-icon' : ext === 'jpg' ? 'image/jpeg' : ext === 'json' ? 'application/json' : 'image/png'

  res.setHeader('Content-Type', mime)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  createReadStream(filePath).pipe(res)
})

// ── GET /db/tables ────────────────────────────────────────────────────────────

app.get('/db/tables', (_req, res) => {
  const rows = appDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
  res.json({ tables: rows.map(r => r.name) })
})

// ── GET /db/tables/:table ─────────────────────────────────────────────────────

app.get('/db/tables/:table', (req, res) => {
  const { table } = req.params
  const validTables = new Set(
    appDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)
  )
  if (!validTables.has(table)) return res.status(404).json({ error: 'Table not found' })

  const search = req.query.search ?? ''
  const limit  = Math.min(parseInt(req.query.limit ?? '500'), 1000)
  const offset = parseInt(req.query.offset ?? '0')

  const columns = appDb.prepare(`PRAGMA table_info("${table}")`).all().map(c => c.name)

  let rows
  if (search.trim()) {
    const textCols   = columns.filter(c => c !== 'id')
    const conditions = textCols.length ? textCols.map(c => `"${c}" LIKE ?`).join(' OR ') : null
    rows = conditions
      ? appDb.prepare(`SELECT * FROM "${table}" WHERE ${conditions} LIMIT ? OFFSET ?`).all(...textCols.map(() => `%${search}%`), limit, offset)
      : appDb.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`).all(limit, offset)
  } else {
    rows = appDb.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`).all(limit, offset)
  }

  const total = appDb.prepare(`SELECT COUNT(*) as n FROM "${table}"`).get().n
  res.json({ columns, rows, total })
})

// ── POST /db/tables/:table — insert row ──────────────────────────────────────

app.post('/db/tables/:table', (req, res) => {
  const { table } = req.params
  const validTables = new Set(
    appDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)
  )
  if (!validTables.has(table)) return res.status(404).json({ error: 'Table not found' })

  const body = req.body
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0)
    return res.status(400).json({ error: 'Body must be a non-empty object' })

  const validCols = new Set(appDb.prepare(`PRAGMA table_info("${table}")`).all().map(c => c.name))
  const cols = Object.keys(body).filter(k => validCols.has(k))
  if (cols.length === 0) return res.status(400).json({ error: 'No valid columns provided' })

  appDb.prepare(
    `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
  ).run(...cols.map(c => body[c]))
  res.json({ ok: true })
})

// ── DELETE /db/tables/:table — drop table ────────────────────────────────────

app.delete('/db/tables/:table', (req, res) => {
  const { table } = req.params
  const validTables = new Set(
    appDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)
  )
  if (!validTables.has(table)) return res.status(404).json({ error: 'Table not found' })

  appDb.prepare(`DROP TABLE "${table}"`).run()
  res.json({ ok: true })
})

// ── POST /db/migrate — execute arbitrary SQL ──────────────────────────────────

app.post('/db/migrate', (req, res) => {
  const { sql, params = [] } = req.body
  if (!sql || typeof sql !== 'string' || !sql.trim())
    return res.status(400).json({ error: 'sql field is required' })

  try {
    const upper = sql.trim().toUpperCase()
    const isDDL = upper.startsWith('CREATE') || upper.startsWith('ALTER') ||
                  upper.startsWith('DROP')   || upper.startsWith('PRAGMA')
    if (isDDL) {
      appDb.exec(sql)
      return res.json({ ok: true })
    }
    const stmt = appDb.prepare(sql)
    if (upper.startsWith('SELECT')) {
      const rows = params.length ? stmt.all(...params) : stmt.all()
      return res.json({ ok: true, rows })
    }
    const result = params.length ? stmt.run(...params) : stmt.run()
    res.json({ ok: true, changes: result.changes, lastInsertRowid: result.lastInsertRowid })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// ── POST /vectors — upsert one record ─────────────────────────────────────────
// Body: { id?, collection, text, embedding?, refTable?, refId? }
// Without `embedding` the text is embedded here; with it, no model is called.

app.post('/vectors', async (req, res) => {
  const { id, collection, text, embedding, refTable = null, refId = null } = req.body ?? {}
  if (!collection || typeof collection !== 'string') return res.status(400).json({ error: 'collection is required' })
  if (!text || typeof text !== 'string')             return res.status(400).json({ error: 'text is required' })
  try {
    const vec = Array.isArray(embedding) ? embedding : await embed(text)
    if (vec.length !== EMBED_DIMS) {
      return res.status(400).json({ error: `expected ${EMBED_DIMS} dims, got ${vec.length}` })
    }
    const rowId = id ?? uuidv4()
    appDb.prepare(`
      INSERT INTO vectors (id, collection, ref_table, ref_id, text, embedding, dims, model)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        collection = excluded.collection, ref_table = excluded.ref_table, ref_id = excluded.ref_id,
        text = excluded.text, embedding = excluded.embedding, dims = excluded.dims, model = excluded.model
    `).run(rowId, collection, refTable, refId, text, toBlob(vec), vec.length, EMBED_MODEL)
    res.json({ ok: true, id: rowId, dims: vec.length, model: EMBED_MODEL })
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) })
  }
})

// ── POST /vectors/search ──────────────────────────────────────────────────────
// Body: { collection?, query? | embedding?, k? } → nearest records with a score.

app.post('/vectors/search', async (req, res) => {
  const { collection = null, query, embedding, k = 5 } = req.body ?? {}
  if (!query && !Array.isArray(embedding)) return res.status(400).json({ error: 'query or embedding is required' })
  try {
    const probe = Array.isArray(embedding) ? Float32Array.from(embedding) : Float32Array.from(await embed(query))
    const rows = collection
      ? appDb.prepare('SELECT id, collection, ref_table, ref_id, text, embedding FROM vectors WHERE collection = ?').all(collection)
      : appDb.prepare('SELECT id, collection, ref_table, ref_id, text, embedding FROM vectors').all()
    const scored = rows
      .map((r) => ({
        id: r.id, collection: r.collection, refTable: r.ref_table, refId: r.ref_id, text: r.text,
        score: cosine(probe, fromBlob(r.embedding)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(100, Number(k) || 5)))
    res.json({ ok: true, scanned: rows.length, indexed: vecExtension, results: scored })
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) })
  }
})

// ── DELETE /vectors/:id ───────────────────────────────────────────────────────

app.delete('/vectors/:id', (req, res) => {
  const info = appDb.prepare('DELETE FROM vectors WHERE id = ?').run(req.params.id)
  res.json({ ok: true, deleted: info.changes })
})

// ── GET /vectors/status — is the store usable at all ──────────────────────────

app.get('/vectors/status', (_req, res) => {
  const { n } = appDb.prepare('SELECT COUNT(*) AS n FROM vectors').get()
  res.json({
    ok: true,
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: EMBED_MODEL,
    dims: EMBED_DIMS,
    indexed: vecExtension,
    count: n,
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Data service listening on http://localhost:${PORT}`)
  console.log(`Storage: ${STORAGE_DIR}`)
  console.log(`Media DB: ${MEDIA_DB}`)
  console.log(`App DB:   ${APP_DB}`)
  console.log(`Auth:     ${AUTH_URL}`)
  console.log(`Vectors:  ${EMBED_MODEL} (${EMBED_DIMS}d), index: ${vecExtension ? "sqlite-vec" : "linear scan"}`)
})

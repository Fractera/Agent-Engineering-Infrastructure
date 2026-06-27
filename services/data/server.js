import express from 'express'
import cors from 'cors'
import multer from 'multer'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve, dirname, extname, join, relative } from 'path'
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

// ── Shared store-tree reader — walks a store dir into a { relpath: utf8 } map ──
// Used by the Frozen Template Constructor store endpoint below (/frozen-templates/tree).

function readArchetypeTree(dir) {
  const files = {}
  const walk = d => {
    for (const name of readdirSync(d)) {
      const full = join(d, name)
      if (statSync(full).isDirectory()) walk(full)
      else files[relative(dir, full).split('\\').join('/')] = readFileSync(full, 'utf8')
    }
  }
  walk(dir)
  return files
}

// ── Frozen Template Constructor — read-only store (step 147) ───────────────────
// The basis of the constructor: registry + primitives + providers + aspects + the
// vetted engine. GET /frozen-templates/registry → the catalog (for matching).
// GET /frozen-templates/tree → the whole tree { files } so the composer can unpack
// it to a temp dir and compose. Read-only; no mutation here. Strategy doc:
// CRUD-DOCS/workspace-standards/frozen-template-constructor.md.
const FROZEN_TEMPLATES_DIR = resolve(__dirname, 'frozen-templates')

app.get('/frozen-templates/registry', (_req, res) => {
  if (!existsSync(join(FROZEN_TEMPLATES_DIR, 'registry.json')))
    return res.status(404).json({ error: 'frozen-templates store not found' })
  try { res.json(JSON.parse(readFileSync(join(FROZEN_TEMPLATES_DIR, 'registry.json'), 'utf8'))) }
  catch { res.status(500).json({ error: 'registry parse error' }) }
})

app.get('/frozen-templates/tree', (_req, res) => {
  if (!existsSync(FROZEN_TEMPLATES_DIR))
    return res.status(404).json({ error: 'frozen-templates store not found' })
  const files = readArchetypeTree(FROZEN_TEMPLATES_DIR) // registry.json + engine/** + primitives/** + providers/** + aspects/**
  res.json({ store: 'frozen-templates', files })
})

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

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Data service listening on http://localhost:${PORT}`)
  console.log(`Storage: ${STORAGE_DIR}`)
  console.log(`Media DB: ${MEDIA_DB}`)
  console.log(`App DB:   ${APP_DB}`)
  console.log(`Auth:     ${AUTH_URL}`)
})

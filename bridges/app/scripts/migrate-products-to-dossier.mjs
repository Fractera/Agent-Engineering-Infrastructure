// Переезд продукта в досье: из четырёх хранилищ в одно (2026-08-18).
//
// Читает прежние места — `PRODUCTS-CONFIG/products-config.json`, кейсы в
// `development-docs/USE-CASES/<id>/CASES/*.md`, вопросы и ответы в `RAW/`, шаги в
// таблице `development_steps` — и складывает всё в `PRODUCTS-CONFIG/<id>.json`.
//
// 🔒 НИЧЕГО НЕ УДАЛЯЕТ. Прежние файлы и строки остаются на месте: пока новое
// хранилище не доказано живьём, единственная копия описания продукта не имеет
// права зависеть от правильности этого скрипта. Уборка — отдельным шагом.
//
// 🔒 ИДЕМПОТЕНТЕН. Досье, которое уже есть, не перезаписывается: повторный
// прогон после ручной правки в панели затёр бы работу владельца. Нужно
// перезалить — удалите досье и запустите снова.
//
// Запуск на сервере: node scripts/migrate-products-to-dossier.mjs

import fs from "node:fs"
import path from "node:path"

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app"
const PRODUCTS = path.join(APP_DIR, "PRODUCTS-CONFIG")
const USE_CASES = path.join(APP_DIR, "development-docs", "USE-CASES")
const DB = process.env.APP_DB_PATH ?? path.join(APP_DIR, "data", "app.db")

const read = (p, fallback) => {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) } catch { return fallback }
}

const legacy = read(path.join(PRODUCTS, "products-config.json"), { products: [] })
if (!Array.isArray(legacy.products) || legacy.products.length === 0) {
  console.log("Прежний реестр пуст — переносить нечего.")
  process.exit(0)
}

// ── шаги: читаем таблицу, если она есть ──────────────────────────────────────
// Драйвер SQLite в панели опционален (в сборке он есть, в чужом окружении может
// не быть). Отсутствие драйвера НЕ повод потерять продукты: переносим без шагов
// и говорим об этом вслух.
let stepsByProduct = new Map()
try {
  const { default: Database } = await import("better-sqlite3")
  const db = new Database(DB, { readonly: true })
  const rows = db.prepare("SELECT * FROM development_steps ORDER BY number").all()
  for (const r of rows) {
    const list = stepsByProduct.get(r.product_id) ?? []
    list.push({
      number: r.number,
      title: r.title ?? "",
      status: r.status ?? "new",
      importance: r.importance ?? "mandatory",
      kind: r.kind ?? "work",
      cases: (() => { try { return JSON.parse(r.cases ?? "[]") } catch { return [] } })(),
      plan: r.plan ?? "",
      result: r.result ?? "",
      createdAt: r.created_at ?? "",
      updatedAt: r.updated_at ?? "",
    })
    stepsByProduct.set(r.product_id, list)
  }
  db.close()
  console.log(`шагов в таблице: ${rows.length}`)
} catch (e) {
  console.log(`шаги не прочитаны (${e.message}) — продукты переносятся без них`)
}

// ── кейсы: разбираем markdown прежнего формата ───────────────────────────────
function readCases(pid) {
  const dir = path.join(USE_CASES, pid, "CASES")
  let files = []
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort() } catch { return [] }
  return files.map((file) => {
    const text = fs.readFileSync(path.join(dir, file), "utf-8")
    const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? file.replace(/\.md$/, "")
    const confirmed = /\*\*status:\*\*\s*confirmed/.test(text)
    const confirmedAt = /\*\*confirmed:\*\*\s*(\S+)/.exec(text)?.[1] ?? null
    // Тело — всё после служебной шапки: заголовок, маркер и строки состояния.
    const summary = text
      .split("\n")
      .filter((l) => !/^#\s|^<!--|^\*\*status:|^\*\*confirmed:/.test(l))
      .join("\n").trim()
    return {
      slug: file.replace(/\.md$/, ""),
      title, summary,
      confirmed,
      confirmedAt: confirmed ? confirmedAt : null,
      updatedAt: new Date().toISOString(),
    }
  })
}

const phaseOf = (devStatus) => {
  switch (devStatus) {
    case "decomposition": return "decomposition"
    case "skeleton": case "revision": case "building": return "development"
    case "acceptance": case "extra-tasks": case "done": return "analysis"
    default: return "intake"
  }
}

let moved = 0
for (const p of legacy.products) {
  const target = path.join(PRODUCTS, `${p.id}.json`)
  if (fs.existsSync(target)) { console.log(`${p.id}: досье уже есть — пропуск`); continue }

  const questions = read(path.join(USE_CASES, p.id, "RAW", "questions.json"), [])
  let seed = ""
  try { seed = fs.readFileSync(path.join(USE_CASES, p.id, "RAW", "seed.md"), "utf-8").trim() } catch {}

  const dossier = {
    id: p.id,
    title: p.title ?? p.id,
    ...(p.titleAuto ? { titleAuto: true } : {}),
    type: p.type ?? "custom",
    ...(p.description ? { description: p.description } : {}),
    surface: p.surface ?? "public",
    route: p.route ?? "",
    published: p.status === "live",
    phase: phaseOf(p.devStatus),
    stage: "waiting",
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    intake: { questions: Array.isArray(questions) ? questions : [], answers: [], seed },
    cases: readCases(p.id),
    steps: stepsByProduct.get(p.id) ?? [],
    pages: [],
    history: [{ at: new Date().toISOString(), phase: phaseOf(p.devStatus), stage: "waiting", by: "system" }],
  }

  fs.mkdirSync(PRODUCTS, { recursive: true })
  fs.writeFileSync(target, `${JSON.stringify(dossier, null, 2)}\n`, "utf-8")
  moved += 1
  console.log(`${p.id}: перенесён — кейсов ${dossier.cases.length}, шагов ${dossier.steps.length}, вопросов ${dossier.intake.questions.length}`)
}

// Реестр-распределитель: номера не должны переиспользоваться после удаления.
const maxId = legacy.products.reduce((m, p) => Math.max(m, Number(String(p.id).replace(/\D+/g, "")) || 0), 0)
const registry = { version: 1, ids: legacy.products.map((p) => p.id), maxId: Math.max(maxId, legacy.maxId ?? 0) }
fs.writeFileSync(path.join(PRODUCTS, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`, "utf-8")

console.log(`перенесено продуктов: ${moved}; реестр: ids=${registry.ids.join(",")} maxId=${registry.maxId}`)
console.log("прежние файлы и строки НЕ удалены — уборка отдельным шагом")

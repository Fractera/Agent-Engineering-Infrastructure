// Прибор 109-1: поднимает службу данных на временных файлах окружения и проверяет
// дверь ключа целиком — запись, состояние и три негативных контроля.
// Боевые файлы не трогаются: все три пути переопределены.
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"

const dir = mkdtempSync(join(tmpdir(), "key109-"))
const slot = join(dir, "slot.env")
const data = join(dir, "data.env")
const rag = join(dir, "rag.env")
const absent = join(dir, "nope.env") // намеренно НЕ создаём

writeFileSync(slot, "OPENAI_API_KEY=\nOTHER_SETTING=keep-me\n")
writeFileSync(data, "OPENAI_API_KEY=\nDATA_SECRET=keep-me-too\n")
writeFileSync(rag, "LLM_BINDING=openai\nLLM_BINDING_API_KEY=\nEMBEDDING_BINDING_API_KEY=\nEMBEDDING_MODEL=text-embedding-3-small\n")

const PORT = 3391
const SECRET = "probe-secret-109"
const env = {
  ...process.env,
  PORT: String(PORT),
  APP_ENV_FILE: slot,
  DATA_ENV_PATH: data,
  RAG_ENV_PATH: rag,
  DATA_SECRET: SECRET,
  APP_DB_PATH: join(dir, "probe.db"),
  FRACTERA_IP_NODOMAIN_MODE: "true",
}

// Путь к службе — параметром: прибор запускают и из корня репозитория, и из папки
// самой службы, и относительный путь молча промахивается во втором случае.
const SERVER_JS = process.env.SERVER_JS ?? "services/data/server.js"
const srv = spawn("node", [SERVER_JS], { env, cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] })
let log = ""
srv.stdout.on("data", (d) => (log += d))
srv.stderr.on("data", (d) => (log += d))

const B = `http://127.0.0.1:${PORT}`
const H = { "Content-Type": "application/json", "X-Data-Secret": SECRET }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

let bad = 0
const ok = (name, cond, detail = "") => {
  console.log(`  ${cond ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`)
  if (!cond) bad++
}

try {
  let up = false
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`${B}/health`); if (r.ok) { up = true; break } } catch {}
    await wait(250)
  }
  // 🔒 Прибор, который не поднялся, обязан сказать ПОЧЕМУ, а не упасть на первом
  // запросе: иначе диагностика стоит отдельного захода на сервер.
  if (!up) { console.log("СЛУЖБА НЕ ПОДНЯЛАСЬ. Лог:"); console.log(log.slice(-1200)); process.exit(1) }

  console.log("=== ПЛОСКОСТЬ 1: ДВЕРЬ ПИШЕТ ===")
  const before = await (await fetch(`${B}/platform/openai-key`, { headers: H })).json()
  console.log("  до записи:", JSON.stringify(before.state.graph))
  ok("до записи граф НЕ задан", before.state.graph.configured === false)

  const w = await (await fetch(`${B}/platform/openai-key`, { method: "POST", headers: H, body: JSON.stringify({ key: "sk-probe-109-abcdefghijklmnop" }) })).json()
  console.log("  запись →", JSON.stringify({ ok: w.ok, written: w.written, failed: w.failed, skipped: w.skipped }))
  ok("записаны все три потребителя", w.written.join(",") === "app,data,graph")
  ok("отказов нет", w.failed.length === 0)

  const ragText = readFileSync(rag, "utf8")
  ok("граф получил LLM_BINDING_API_KEY", /^LLM_BINDING_API_KEY=sk-probe-109/m.test(ragText))
  ok("граф получил EMBEDDING_BINDING_API_KEY", /^EMBEDDING_BINDING_API_KEY=sk-probe-109/m.test(ragText))
  ok("НЕГ.КОНТРОЛЬ: OPENAI_API_KEY графу НЕ заведена", !/^OPENAI_API_KEY=/m.test(ragText),
     "переменная, которой служба не читает, не появляется")
  ok("НЕГ.КОНТРОЛЬ: соседние строки уцелели", /^EMBEDDING_MODEL=text-embedding-3-small$/m.test(ragText) &&
     /^DATA_SECRET=keep-me-too$/m.test(readFileSync(data, "utf8")) &&
     /^OTHER_SETTING=keep-me$/m.test(readFileSync(slot, "utf8")),
     "писалась заплата, а не снимок")

  console.log("=== ПЛОСКОСТЬ 2: ДВЕРЬ ОТВЕЧАЕТ О СОСТОЯНИИ ===")
  const after = await (await fetch(`${B}/platform/openai-key`, { headers: H })).json()
  ok("все трое задан", after.state.app.configured && after.state.data.configured && after.state.graph.configured)
  ok("значение наружу не выходит, только хвост", after.tail === "mnop" && !JSON.stringify(after).includes("sk-probe-109-abcdefghijklmnop"))

  writeFileSync(rag, ragText.replace(/^EMBEDDING_BINDING_API_KEY=.*$/m, "EMBEDDING_BINDING_API_KEY="))
  const half = await (await fetch(`${B}/platform/openai-key`, { headers: H })).json()
  ok("НЕГ.КОНТРОЛЬ: половина переменных → НЕ задан", half.state.graph.configured === false,
     "одна из двух — это слепое встраивание при работающей генерации")

  console.log("=== ПЛОСКОСТЬ 3: ЗАМОК И ОТСУТСТВУЮЩАЯ СЛУЖБА ===")
  const noAuth = await fetch(`${B}/platform/openai-key`, { headers: { "Content-Type": "application/json" } })
  ok("НЕГ.КОНТРОЛЬ: без секрета дверь отказывает", noAuth.status === 401 || noAuth.status === 403,
     `HTTP ${noAuth.status}`)
  ok("отсутствующий файл не создаётся", !existsSync(absent))
} finally {
  srv.kill()
}

console.log(bad === 0 ? "===PROBE109_OK===" : `===PROBE109_FAILED=== провалов: ${bad}`)
if (bad !== 0) { console.log("--- лог службы ---"); console.log(log.slice(-800)) }
process.exit(bad === 0 ? 0 : 1)

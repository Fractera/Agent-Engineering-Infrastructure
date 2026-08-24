import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import { requireAuth } from "@/lib/require-auth"
import { publicDataUrl } from "@/lib/public-data-url"
import { sshHost, CLIENT_KEY_PATH, ensureKeyPair, authorize, privateKeyB64 } from "@/lib/ssh-access"

const APP_ENV  = process.env.APP_ENV_PATH  ?? "/opt/fractera/app/.env.local"
const DATA_ENV = process.env.DATA_ENV_PATH ?? "/opt/fractera/services/data/.env"
const PANEL_ENV = process.env.PANEL_ENV_PATH ?? "/opt/fractera/bridges/app/.env.local"

// Keys that are server-infrastructure-only and should not go into local dev
const EXCLUDE_KEYS = new Set([
  "APP_DB_PATH",
  "AUTH_TRUST_HOST",
  "NEXT_PUBLIC_MEDIA_URL", // exported as REMOTE_DATA_URL
  // 🔒 КЛЮЧИ, КОТОРЫЕ ЭТА ВЫГРУЗКА ВЫДАЁТ САМА ВЫШЕ (2026-08-24).
  //
  // ✗ Дефект, который они создавали, — ровно тот, ради предотвращения которого
  // написан весь этот файл. `REMOTE_DATA_URL` вычисляется выше «с точки зрения
  // принимающей машины», а затем дамп серверного окружения дописывал его ВТОРОЙ
  // раз — со значением `http://localhost:3300`, верным на сервере и ведущим в
  // пустоту на ноутбуке. `.env` читается сверху вниз, побеждает последняя
  // строка, поэтому правильный адрес молча отменялся своим же дублем.
  //
  // Правило применили к `NEXT_PUBLIC_MEDIA_URL` и пропустили на переменной,
  // которую сама выгрузка и производит. Нашёл агент в проекте владельца,
  // разбирая, почему локальная копия не видит данных.
  "REMOTE_DATA_URL",
  "DATA_SECRET",
  "DATA_API_KEY",
  "DEPLOY_SECRET",
  "FRACTERA_DEPLOY_SECRET",
  "FRACTERA_SSH_HOST",
  "FRACTERA_SSH_USER",
  "FRACTERA_SSH_PORT",
  "FRACTERA_SSH_KEY_PATH",
  "FRACTERA_SSH_KEY_B64",
])

function readAllVars(file: string): Record<string, string> {
  try {
    const content = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : ""
    const result: Record<string, string> = {}
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq < 0) continue
      result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1)
    }
    return result
  } catch { return {} }
}

function readVar(file: string, key: string): string {
  const vars = readAllVars(file)
  return vars[key] ?? ""
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "")
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const appVars    = readAllVars(APP_ENV)
  const dataSecret = readVar(DATA_ENV, "DATA_SECRET")
  const deploySecret = readVar(PANEL_ENV, "DEPLOY_SECRET")

  // (step 500) The address is RESOLVED for the receiving machine, not copied from
  // this server's own env. NEXT_PUBLIC_MEDIA_URL is "http://localhost:3300" here —
  // correct on the server, and on a developer's laptop it points at the laptop.
  // That one line is why the local-development loop silently did nothing.
  const data = publicDataUrl()

  if (!dataSecret) {
    return NextResponse.json({ error: "Could not read the data secret" }, { status: 500 })
  }
  if (!data.url) {
    return NextResponse.json({ error: data.reason ?? "Could not resolve the public data address" }, { status: 409 })
  }

  const lines: string[] = [
    `# Local dev — connects to your production server`,
    `# Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
    `# Rename this file to .env.local and place it in your project root`,
    ``,
    `# --- Remote data & media (required for local dev) ---`,
    `# Your local app reads and writes the SERVER's rows, files and vector memory`,
    `# through this address. Nothing is copied to your machine, so there are no`,
    `# two versions of the data to drift apart.`,
    `REMOTE_DATA_URL=${data.url}`,
    // 🔒 ИМЯ КЛЮЧА — `DATA_SECRET` (исправлено 2026-08-17). Здесь выдавалось
    // `DATA_API_KEY` — имя, которого нет в окружении сервера, — и локальная
    // копия работала не так, как продакшн: часть кода искала `DATA_SECRET` и не
    // находила. Одно имя на обе среды и есть смысл этой выдачи.
    //
    // Запасное имя пишется рядом ради проектов, склонированных раньше: их код
    // мог остаться со старым чтением, и отобрать у него ключ значило бы сломать
    // машину разработчика правкой на сервере.
    `DATA_SECRET=${dataSecret}`,
    `DATA_API_KEY=${dataSecret}`,
    ``,
  ]

  // 🔒 КЛЮЧ ЗАПУСКА РАЗВЁРТЫВАНИЯ (владелец 2026-08-19). Без него агент на машине
  // владельца может только собрать проект сам по SSH — в обход очереди панели, её
  // журнала развёртываний и отката на последнюю рабочую сборку. Панель после такой
  // сборки показывает в подвале ЧУЖУЮ, предыдущую запись, и владелец читает журнал
  // своего сервера как неверный.
  //
  // Ключ уже существует: его заводит установщик (`bootstrap.sh`) в окружении панели,
  // и `POST /api/deploy` принимает его заголовком `x-deploy-secret`. Здесь он только
  // ВЫДАЁТСЯ — нового механизма не появляется.
  //
  // Отсутствует — строку не пишем вовсе: пустое значение читалось бы как «ключ есть,
  // но неверный», и агент бил бы в 401 вместо честного «панель ключа не выдала».
  if (deploySecret) {
    lines.push(
      `# --- Deployment (lets your agent press Deploy without opening the panel) ---`,
      `FRACTERA_DEPLOY_SECRET=${deploySecret}`,
      ``,
    )
  }

  // 🔒 ДОСТУП К СЕРВЕРУ ДЛЯ АГЕНТА (владелец 2026-08-24): «как ты ходишь на
  // сервер, так и он должен ходить».
  //
  // ✗ До этой правки `scripts/server/*` в проекте требовали `FRACTERA_SSH_*` и
  // файл ключа, а не выдавал их НИКТО. Агент упирался в тупик, и это выглядело
  // как его непослушание.
  //
  // 🔒 ОДНА КНОПКА. Выгрузка ЗАВОДИТ ключ сама, если его ещё нет, и кладёт
  // приватную половину прямо сюда строкой. Владелец скачивает один файл и
  // больше не делает НИЧЕГО: скрипты слота разворачивают ключ на диск сами.
  //
  // ✗ Прежний порядок — скачать ключ отдельной кнопкой, положить руками в
  // `.fractera-ssh/`, скачать окружение второй кнопкой — владелец назвал
  // неприемлемым, и он прав: четыре ручных действия там, где хватает одного.
  const host = sshHost()
  if (host) {
    try {
      authorize(ensureKeyPair())
      lines.push(
        `# --- Server access (your agent reaches the server the way we do) ---`,
        `# The key below is already authorised on the server. Nothing to place by hand:`,
        `# the slot scripts write it to the path above with 600 permissions on first use.`,
        `# This file is git-ignored, so the key never travels to GitHub with your code.`,
        `FRACTERA_SSH_HOST=${host}`,
        `FRACTERA_SSH_USER=root`,
        `FRACTERA_SSH_PORT=22`,
        `FRACTERA_SSH_KEY_PATH=${CLIENT_KEY_PATH}`,
        `FRACTERA_SSH_KEY_B64=${privateKeyB64()}`,
        ``,
      )
    } catch {
      // Ключ не завёлся — молчать нельзя: агент прочитает файл без строк
      // доступа и снова решит, что канала нет вовсе.
      lines.push(
        `# --- Server access ---`,
        `# FAILED to issue the access key on the server. Tell the platform team.`,
        ``,
      )
    }
  }

  // Append all remaining custom vars from app/.env.local
  const customEntries = Object.entries(appVars).filter(([k]) => !EXCLUDE_KEYS.has(k))
  if (customEntries.length > 0) {
    lines.push(`# --- All other server env vars ---`)
    for (const [k, v] of customEntries) {
      lines.push(`${k}=${v}`)
    }
    lines.push(``)
  }

  const content = lines.join("\n")

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename=".env.local"; filename*=UTF-8''.env.local`,
    },
  })
}

import { NextRequest, NextResponse } from "next/server"
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import { requireAuth } from "@/lib/require-auth"
import { KEY_DIR, KEY_FILE, AUTH_KEYS, MARKER, sshHost } from "@/lib/ssh-access"

// 🔒 ДОСТУП АГЕНТА К СЕРВЕРУ ВЫДАЁТ ПАНЕЛЬ (владелец 2026-08-24).
//
// Дословно: «я ожидаю, что ты ему сделаешь такой же доступ, как у тебя: как ты
// ходишь на сервер, так и он должен ходить». Речь об агенте-программисте,
// который работает на МАШИНЕ ВЛАДЕЛЬЦА — в его клоне проекта, вне сервера.
//
// ✗ Чем это оплачено. `scripts/server/*` в шаблоне слота требуют
// `FRACTERA_SSH_HOST/USER/KEY_PATH` и файл приватного ключа — и не выдавал их
// НИКТО: поиск `FRACTERA_SSH` по всему продукту давал ноль совпадений, а
// сообщение об ошибке отправляло агента в экран панели, где этих переменных
// нет. Агент на удалённой машине упирался в тупик, и это выглядело как его
// непослушание. Дверь была описана, инструмент написан, ключа не существовало.
//
// 🔒 ПАРОЛЬ root НЕ ВЫДАЁТСЯ НИКОГДА. Тот же уровень доступа даётся ключом:
// он не печатается в логах, отзывается одной строкой и не лежит в документах.
// Ключ создаётся ЗДЕСЬ, на сервере владельца, и приватная половина покидает его
// ровно один раз — в ответ на нажатие владельца в панели.
//
// 🔒 ГРАНИЦА ОТВЕТСТВЕННОСТИ НЕ РАВНА ГРАНИЦЕ ДОСТУПА. Ключ открывает сервер
// целиком, потому что так решил владелец. Закон о том, что агент проекта решает
// задачи ТОЛЬКО внутри своего приложения (`:3000`), живёт в его инструкции и
// держится дисциплиной, а не техникой. Говорить об этом надо прямо: технически
// он может больше, чем ему позволено.

function ensureKeyPair(): string {
  if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 })
  if (!fs.existsSync(KEY_FILE)) {
    execFileSync("ssh-keygen", ["-t", "ed25519", "-N", "", "-C", MARKER, "-f", KEY_FILE], {
      stdio: "ignore",
    })
  }
  fs.chmodSync(KEY_FILE, 0o600)
  return fs.readFileSync(`${KEY_FILE}.pub`, "utf8").trim()
}

function authorize(publicKey: string): void {
  const dir = path.dirname(AUTH_KEYS)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const current = fs.existsSync(AUTH_KEYS) ? fs.readFileSync(AUTH_KEYS, "utf8") : ""
  // Идемпотентно: строка с этой меткой должна быть ровно одна. Перевыпуск ключа
  // обязан ЗАМЕНИТЬ прежнюю строку, иначе старый ключ останется рабочим, а
  // владелец будет считать, что отозвал доступ.
  const kept = current.split("\n").filter((l) => l.trim() && !l.includes(MARKER))
  kept.push(publicKey)
  fs.writeFileSync(AUTH_KEYS, kept.join("\n") + "\n", { mode: 0o600 })
  fs.chmodSync(AUTH_KEYS, 0o600)
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "")
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let publicKey: string
  try {
    publicKey = ensureKeyPair()
    authorize(publicKey)
  } catch (e) {
    return NextResponse.json(
      { error: `Не удалось завести ключ доступа: ${(e as Error).message}` },
      { status: 500 },
    )
  }

  const host = sshHost()
  const key = fs.readFileSync(KEY_FILE, "utf8")

  // Отдаём вместе с адресом: без хоста ключ бесполезен, а искать адрес глазами
  // в другом экране — та же дверь без ключа, только наоборот.
  return new NextResponse(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="fractera-agent-key"`,
      "X-Fractera-Ssh-Host": host,
      "X-Fractera-Ssh-User": "root",
      "X-Fractera-Ssh-Port": "22",
    },
  })
}

// Отзыв. Ради него метка и существует: строка уходит из `authorized_keys`, пара
// удаляется, и прежний ключ перестаёт открывать сервер немедленно.
export async function DELETE(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "")
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    if (fs.existsSync(AUTH_KEYS)) {
      const kept = fs
        .readFileSync(AUTH_KEYS, "utf8")
        .split("\n")
        .filter((l) => l.trim() && !l.includes(MARKER))
      fs.writeFileSync(AUTH_KEYS, kept.length ? kept.join("\n") + "\n" : "", { mode: 0o600 })
    }
    for (const f of [KEY_FILE, `${KEY_FILE}.pub`]) if (fs.existsSync(f)) fs.unlinkSync(f)
  } catch (e) {
    return NextResponse.json(
      { error: `Не удалось отозвать ключ: ${(e as Error).message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ revoked: true })
}

import fs from "fs"
import path from "path"
import { execFileSync } from "child_process"
import { readServerIp } from "@/lib/server-ip"
import { publicDataUrl } from "@/lib/public-data-url"

// Доступ агента проекта к серверу: где лежит ключ, чем он помечен и по какому
// адресу им пользоваться. Один модуль на две двери — выдачу ключа
// (`api/config/ssh-key`) и выгрузку окружения (`api/config/env-export`).
//
// 🔒 Второй способ вычислить тот же адрес разошёлся бы с первым молча. Здесь
// он один, и он тот же, которым панель уже определяет свой адрес снаружи.

export const KEY_DIR = process.env.AGENT_KEY_DIR ?? "/opt/fractera/.agent-access"
export const KEY_FILE = path.join(KEY_DIR, "id_ed25519")
export const AUTH_KEYS = process.env.ROOT_AUTHORIZED_KEYS ?? "/root/.ssh/authorized_keys"

// Метка живёт в комментарии публичного ключа. По ней запись находится для
// перевыпуска и для отзыва — искать по телу ключа нельзя, тело меняется.
export const MARKER = "fractera-project-agent"

// Куда владелец кладёт скачанный файл. Путь относительный: скрипты шаблона
// слота разрешают его от корня проекта, а папка уже в `.gitignore` — ключ не
// уедет в GitHub вместе с кодом.
export const CLIENT_KEY_PATH = ".fractera-ssh/fractera-agent-key"

export function sshHost(): string {
  // Для SSH адрес — это IP: имя ему не нужно, сертификат тем более.
  const ip = readServerIp()
  if (ip) return ip
  const data = publicDataUrl()
  if (data.mode === "domain" && data.url) {
    try { return new URL(data.url).hostname.replace(/^data\./, "") } catch { return "" }
  }
  return ""
}

// Выдан ли ключ. Выгрузка окружения пишет параметры доступа только когда он
// существует: строки о ключе, которого нет, читаются агентом как «ключ есть,
// но неверный» — и он бьёт в отказ вместо честного «ключ ещё не выдавали».
export function keyIssued(): boolean {
  return fs.existsSync(KEY_FILE)
}

// 🔒 ОДНА КНОПКА, А НЕ ДВЕ (владелец 2026-08-24, дословно: «сделай так, чтобы при
// нажатии на кнопку ключ появился прямо в переменных окружения и я просто скачал
// новые переменные окружения одной кнопкой»).
//
// ✗ Оплачено: первая версия просила скачать ключ отдельным файлом, положить его
// руками в `.fractera-ssh/`, затем скачать окружение ВТОРОЙ кнопкой. Четыре
// ручных действия там, где достаточно одного, — и каждое можно сделать неверно.
//
// Поэтому пара живёт здесь, а обе двери её переиспользуют: выгрузка окружения
// заводит ключ САМА, если его ещё нет, и кладёт приватную половину прямо в файл
// строкой `FRACTERA_SSH_KEY_B64`. Скрипты слота разворачивают её на диск сами.
export function ensureKeyPair(): string {
  if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 })
  if (!fs.existsSync(KEY_FILE)) {
    execFileSync("ssh-keygen", ["-t", "ed25519", "-N", "", "-C", MARKER, "-f", KEY_FILE], {
      stdio: "ignore",
    })
  }
  fs.chmodSync(KEY_FILE, 0o600)
  return fs.readFileSync(`${KEY_FILE}.pub`, "utf8").trim()
}

export function authorize(publicKey: string): void {
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

// Приватная половина в одну строку — так она переживает файл окружения без
// экранирования переводов строки, а скрипт слота восстанавливает её точь-в-точь.
export function privateKeyB64(): string {
  return fs.readFileSync(KEY_FILE).toString("base64")
}

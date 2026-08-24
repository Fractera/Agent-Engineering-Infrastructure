import fs from "fs"
import path from "path"
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

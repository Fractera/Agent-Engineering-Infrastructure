import fs from "fs";
import path from "path";

// What a backup is made of. (step 500) One list, read by the manifest route, the
// export route and the import route, so the three can never disagree about what
// a part is called or where it lives.
//
// Until now Export was a single button that silently zipped three paths. Two of
// them were obvious; the third — vector memory — was invisible because it lives
// INSIDE app.db. And the most expensive data on the server, the knowledge graph,
// was not in the archive at all: restoring meant paying for every document to be
// read by the model a second time.

export type BackupPart = {
  id: string;
  /** Shown in the dialog. */
  label: string;
  /** One line about what this actually is — not what it is called. */
  note: string;
  /** Files and directories that make up this part, absolute on the server. */
  paths: { from: string; to: string; dir?: boolean }[];
  /** Contains credentials: off by default, and the dialog says why. */
  secret?: boolean;
  /** Checked when the dialog opens. */
  defaultOn: boolean;
};

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const DATA_DIR = process.env.DATA_DIR ?? "/opt/fractera/services/data";

export const BACKUP_PARTS: BackupPart[] = [
  {
    id: "db",
    label: "Database and vector memory",
    note: "Your rows and the meaning-search over them. They share one SQLite file, so they travel together.",
    paths: [{ from: process.env.APP_DB_PATH ?? `${APP_DIR}/data/app.db`, to: "app.db" }],
    defaultOn: true,
  },
  {
    id: "files",
    label: "Files and their details",
    note: "Images, video, audio and documents, plus the record of what each one is.",
    paths: [
      { from: `${DATA_DIR}/data/media.db`, to: "media.db" },
      { from: `${DATA_DIR}/storage`, to: "storage", dir: true },
    ],
    defaultOn: true,
  },
  {
    id: "knowledge",
    label: "Knowledge base (graph)",
    note: "The most expensive data here: rebuilding it means paying for the model to read every document again.",
    paths: [{ from: "/opt/fractera/services/rag/storage", to: "knowledge", dir: true }],
    defaultOn: true,
  },
  {
    id: "config",
    label: "Application settings",
    note: "Branding, SEO, images, languages, theme and routing — what makes this server yours rather than a fresh install.",
    paths: [
      { from: `${APP_DIR}/APP-CONFIG`, to: "APP-CONFIG", dir: true },
      { from: `${APP_DIR}/PLATFORM-CONFIG`, to: "PLATFORM-CONFIG", dir: true },
      // 🔒 ЧЕТЫРЕ КОНФИГА СЛОТА — ЧЕТЫРЕ СТРОКИ ЗДЕСЬ (2026-08-15).
      //
      // `DESIGN-CONFIG` не попадал в резервную копию с самого своего появления,
      // и заметить это можно было только при восстановлении — когда сервер
      // возвращается с чужими цветами и шрифтами. Класс ошибки один и тот же:
      // конфиг заводят, а список копирования обновить забывают, потому что он
      // живёт в другом репозитории и в глаза не бросается.
      //
      // Правило простое: появилась папка `*-CONFIG` в корне слота — строка
      // добавляется сюда в той же партии.
      { from: `${APP_DIR}/DESIGN-CONFIG`, to: "DESIGN-CONFIG", dir: true },
      { from: `${APP_DIR}/PRODUCTS-CONFIG`, to: "PRODUCTS-CONFIG", dir: true },
    ],
    defaultOn: true,
  },
  {
    id: "channels",
    label: "Communication channels",
    note: "The Telegram bot token and the linked account. Anyone holding this archive can speak as your bot.",
    paths: [{ from: "/opt/fractera/services/channels/config.json", to: "channels-config.json" }],
    secret: true,
    defaultOn: false,
  },
  {
    id: "env",
    label: "Environment file",
    note: "Service secrets of this server. Useful for moving to another machine, dangerous anywhere else.",
    paths: [{ from: `${APP_DIR}/.env.local`, to: "env.local" }],
    secret: true,
    defaultOn: false,
  },
];

// Map data is deliberately absent: it is over a gigabyte of OpenStreetMap extract
// that the map panel re-downloads on demand. Backing it up would multiply the
// archive by a hundred to save a step that costs minutes.

function dirSize(dir: string): number {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) total += dirSize(full);
    else if (e.isFile()) total += fs.statSync(full).size;
  }
  return total;
}

/** Bytes this part would add to the archive, uncompressed. 0 = nothing there yet. */
export function partSize(part: BackupPart): number {
  let total = 0;
  for (const p of part.paths) {
    try {
      if (!fs.existsSync(p.from)) continue;
      total += p.dir ? dirSize(p.from) : fs.statSync(p.from).size;
    } catch { /* an unreadable path contributes nothing rather than failing the count */ }
  }
  return total;
}


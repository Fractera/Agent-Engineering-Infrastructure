// ОБЪЕКТНОЕ ХРАНИЛИЩЕ — файлы (изображения и т.п.) на диске внутри папки (_data/runtime/objects/), закон 0.
// Пара к хранилищу строк (`rows.ts`): строка базы данных ХРАНИТ ССЫЛКУ (`fileKey`) на объект здесь, а сам
// байтовый файл лежит тут. Это и есть связь «база данных → объектное хранилище» из закона складов: запись
// таблицы ссылается на объект, объект живёт отдельно, и одно и то же изображение может быть связано с
// несколькими записями (связи всех-ко-всем через общий ключ).
//
// Объектное хранилище — ОДНО на автоматизацию (в продукте — на проект): оно не «создаётся заново» под
// каждую запись, а НАЧИНАЕТ ИСПОЛЬЗОВАТЬСЯ первой же положенной сюда картинкой (каталог рождается первой
// записью). Ключ непредсказуем (капабилити) — по нему объект и отдаётся.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const OBJECTS_DIR = join(
  process.cwd(),
  "app",
  "(projects)",
  "projects",
  "other",
  "frozen-template-v-2",
  "_data",
  "runtime",
  "objects",
);

// Расширение → MIME. Только то, что кладём: картинки и текст (шаг 300 — выход склада сохраняет
// сообщение файлом .txt). Неизвестное отдаём как поток байтов.
const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  txt: "text/plain; charset=utf-8",
};

/** Ключ вида `obj<time><rand>.<ext>` — без слэшей и точек в теле, поэтому обход каталога невозможен. */
const KEY_RE = /^obj[a-z0-9]+\.[a-z0-9]{1,5}$/;

function safeExt(ext: string): string {
  const e = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  return e || "bin";
}

export async function saveObject(bytes: Buffer, ext = "jpg"): Promise<{ key: string; size: number }> {
  const key = `obj${Date.now().toString(36)}${randomBytes(6).toString("hex")}.${safeExt(ext)}`;
  await mkdir(OBJECTS_DIR, { recursive: true });
  await writeFile(join(OBJECTS_DIR, key), bytes);
  return { key, size: bytes.byteLength };
}

export async function readObject(key: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!KEY_RE.test(key)) return null; // чужой/битый ключ — не читаем ничего
  try {
    const bytes = await readFile(join(OBJECTS_DIR, key));
    const ext = key.split(".").pop() ?? "";
    return { bytes, contentType: MIME[ext] ?? "application/octet-stream" };
  } catch {
    return null; // нет такого объекта
  }
}

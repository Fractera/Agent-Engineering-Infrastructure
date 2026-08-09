// Образцы кода — СЕРВЕРНАЯ работа с папкой (шаг 501, 2026-08-09).
//
// ЗАЧЕМ. Владелец приходит в новый проект не с пустыми руками: у него уже есть
// наработки — главная страница из прошлого проекта, набор стилей, кусок
// компонента. Здесь он их складывает, чтобы не разрабатывать заново.
//
// 🔒 КАК ЭТИМ ПОЛЬЗУЕТСЯ АГЕНТ. Только по ПРЯМОЙ просьбе и только по имени
// образца. Сам он сюда не заглядывает: библиотека чужих наработок может весить
// сколько угодно, и читать её на всякий случай — это платить контекстом за
// материал, который в текущей задаче может быть вовсе не нужен. Правило
// записано в главной инструкции стартера.
//
// 🔒 ЗДЕСЬ `fs` — файл только серверный. Расширения и правило имени лежат в
// `code-samples.shared.ts` без зависимостей.

import fs from "fs";
import path from "path";
import { isValidName, isAllowedExt, fileNameOf } from "@/lib/code-samples.shared";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
export const SAMPLES_DIR = "CODE-SAMPLES";

const dirPath = () => path.join(APP_DIR, SAMPLES_DIR);

export type Sample = { file: string; name: string; ext: string; bytes: number; modified: string | null };

export function listSamples(): { dir: string; files: Sample[] } {
  try {
    const names = fs.readdirSync(dirPath(), { withFileTypes: true });
    const files: Sample[] = [];
    for (const e of names) {
      if (!e.isFile()) continue;
      const dot = e.name.lastIndexOf(".");
      if (dot <= 0) continue;
      const ext = e.name.slice(dot + 1).toLowerCase();
      if (!isAllowedExt(ext)) continue;
      let bytes = 0;
      let modified: string | null = null;
      try {
        const st = fs.statSync(path.join(dirPath(), e.name));
        bytes = st.size;
        modified = st.mtime.toISOString();
      } catch { /* файл исчез между чтением папки и статистикой — пропускаем */ }
      files.push({ file: e.name, name: e.name.slice(0, dot), ext, bytes, modified });
    }
    files.sort((a, b) => a.file.localeCompare(b.file));
    return { dir: SAMPLES_DIR, files };
  } catch {
    return { dir: SAMPLES_DIR, files: [] };
  }
}

/**
 * Содержимое одного образца.
 *
 * Имя сверяется с ФАКТИЧЕСКИМ списком папки, а не разбирается строкой: чего в
 * списке нет, того не прочитать, и обойти такую проверку нечем.
 */
export function readSample(file: string): { file: string; exists: boolean; text: string; ext: string } {
  const known = listSamples().files.find((f) => f.file === file);
  if (!known) return { file, exists: false, text: "", ext: "" };
  try {
    return { file, exists: true, ext: known.ext, text: fs.readFileSync(path.join(dirPath(), file), "utf-8") };
  } catch {
    return { file, exists: false, text: "", ext: "" };
  }
}

export type WriteResult = { ok: true; file: string } | { ok: false; error: string };

export function writeSample(name: string, ext: string, text: string): WriteResult {
  if (!isValidName(name)) return { ok: false, error: "bad_name" };
  if (!isAllowedExt(ext)) return { ok: false, error: "bad_extension" };
  const file = fileNameOf(name, ext);
  try {
    fs.mkdirSync(dirPath(), { recursive: true });
    fs.writeFileSync(path.join(dirPath(), file), text, "utf-8");
    return { ok: true, file };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function removeSample(file: string): WriteResult {
  // Та же сверка со списком: удалять можно только то, что мы сами показали.
  if (!listSamples().files.some((f) => f.file === file)) return { ok: false, error: "unknown_sample" };
  try {
    fs.unlinkSync(path.join(dirPath(), file));
    return { ok: true, file };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

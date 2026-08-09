// Установка инструмента в продуктовый слой (шаг 501, 2026-08-09).
//
// Копирует папку инструмента из панели в слот: `/opt/fractera/app/tools/<id>/`.
// После этого приложение владеет копией — правит, переименовывает, выбрасывает.
// Панель в рантайме больше не участвует.
//
// 🔒 ЗДЕСЬ `fs` — файл только серверный. Данные реестра лежат в
// `tools-registry.ts` без зависимостей и годятся и серверу, и островку.

import fs from "fs";
import path from "path";
import { toolById, type ToolId } from "@/lib/tools-registry";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
/** Корень панели: отсюда берутся исходники инструментов. */
const PANEL_DIR = process.env.PANEL_DIR ?? "/opt/fractera/bridges/app";
export const SLOT_TOOLS_DIR = "tools";

export type Installed = {
  id: ToolId;
  /** Версия исходника на момент установки — по ней видно, что копия отстала. */
  sourceHash: string;
  installedAt: string;
  files: string[];
};

/**
 * Отпечаток исходника: длины файлов и их имена.
 *
 * Не криптография, а признак изменения — достаточный, чтобы сказать «в панели
 * инструмент с тех пор поменялся». Считать настоящий хеш ради этой единственной
 * задачи означало бы читать все файлы на каждую отрисовку страницы.
 */
export function sourceHash(id: ToolId): string {
  const tool = toolById(id);
  const parts: string[] = [];
  for (const rel of tool.files) {
    try {
      const st = fs.statSync(path.join(PANEL_DIR, tool.dir, rel));
      parts.push(`${rel}:${st.size}`);
    } catch {
      parts.push(`${rel}:missing`);
    }
  }
  return parts.join("|");
}

export function readInstalled(id: ToolId): Installed | null {
  try {
    const raw = fs.readFileSync(path.join(APP_DIR, SLOT_TOOLS_DIR, id, "INSTALLED.json"), "utf-8");
    return JSON.parse(raw) as Installed;
  } catch {
    return null;
  }
}

export type InstallResult =
  | { ok: true; files: string[]; target: string }
  | { ok: false; error: string };

export function installTool(id: ToolId): InstallResult {
  const tool = toolById(id);
  const from = path.join(PANEL_DIR, tool.dir);
  const to = path.join(APP_DIR, SLOT_TOOLS_DIR, id);

  try {
    const copied: string[] = [];
    for (const rel of tool.files) {
      const src = path.join(from, rel);
      if (!fs.existsSync(src)) return { ok: false, error: `source_missing: ${rel}` };
      const dst = path.join(to, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      // Перезапись НАМЕРЕННАЯ: повторная установка = обновление до свежей
      // версии. Правки владельца при этом теряются, поэтому страница
      // предупреждает об этом до нажатия, а не после.
      fs.copyFileSync(src, dst);
      copied.push(rel);
    }

    const meta: Installed = {
      id,
      sourceHash: sourceHash(id),
      installedAt: new Date().toISOString(),
      files: copied,
    };
    fs.writeFileSync(path.join(to, "INSTALLED.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");

    return { ok: true, files: copied, target: `${SLOT_TOOLS_DIR}/${id}/` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export type ToolState = {
  id: ToolId;
  installed: boolean;
  installedAt: string | null;
  /** Копия отстала от исходника панели — установка обновит её. */
  outdated: boolean;
  target: string;
};

export function toolState(id: ToolId): ToolState {
  const meta = readInstalled(id);
  return {
    id,
    installed: Boolean(meta),
    installedAt: meta?.installedAt ?? null,
    outdated: Boolean(meta) && meta!.sourceHash !== sourceHash(id),
    target: `${SLOT_TOOLS_DIR}/${id}/`,
  };
}

// Предупреждения панели — верхняя область меню (решение владельца 2026-08-09).
//
// ЗАЧЕМ. Красные и оранжевые метки были разбросаны по разделам: чтобы узнать, что
// мешает начать, владелец должен был обойти меню и заметить каждую. Здесь они
// собраны в одну область НАВЕРХУ. Записи не переезжают — они ДУБЛИРУЮТСЯ: у
// каждой есть своё законное место в проекте, и ссылка ведёт именно туда.
//
// ОБЛАСТЬ САМОУНИЧТОЖАЕТСЯ. Заполнил — запись пропала; заполнил всё — исчезла и
// область. Предупреждение, которое висит вечно, перестают читать.
//
// Два уровня, и разница между ними содержательная:
//   `blocking` (красный) — без этого начинать НЕВОЗМОЖНО;
//   `advised`  (оранжевый) — начинать можно, но нежелательно.
//
// Все проверки СИНХРОННЫЕ и терпят отказ: их делает шапка на каждой странице
// панели, и упавшая проверка не имеет права уронить панель. Отказ трактуется как
// «не настроено» — честнее промолчать о готовности, чем соврать о ней.

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { useCasesMissing, contextStateHandoff } from "@/lib/product-docs";
import { readContextHandoff } from "@/lib/context-handoff";
import type { AdminPageSlug } from "@/lib/admin-nav";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const APP_ENV = process.env.APP_ENV_PATH ?? path.join(APP_DIR, ".env.local");
const APP_DB = process.env.APP_DB_PATH ?? path.join(APP_DIR, "data", "app.db");
const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env";

export type WarningLevel = "blocking" | "advised";

export type AdminWarning = {
  id: "github" | "use-cases" | "openai" | "domain" | "context-state";
  level: WarningLevel;
  /** Куда ведёт запись — то самое «основное место» настройки. */
  slug: AdminPageSlug;
};

function envHas(file: string, key: string): boolean {
  try {
    const re = new RegExp(`^${key}=(.+)$`, "m");
    const m = fs.readFileSync(file, "utf-8").match(re);
    return Boolean(m && m[1].trim() !== "");
  } catch {
    return false;
  }
}

function domainActive(): boolean {
  try {
    const db = new Database(APP_DB, { readonly: true });
    const row = db
      .prepare("SELECT custom_domain, domain_status FROM site_settings WHERE id = 1")
      .get() as { custom_domain?: string | null; domain_status?: string } | undefined;
    db.close();
    return row?.domain_status === "active" && Boolean(row.custom_domain);
  } catch {
    // Таблицы ещё нет — сервер, который не открывал визард домена.
    return false;
  }
}

export function collectWarnings(): AdminWarning[] {
  const out: AdminWarning[] = [];

  // Красные — без них разработка не начинается.
  if (!envHas(APP_ENV, "USER_GITHUB_REPO_URL")) {
    out.push({ id: "github", level: "blocking", slug: "github" });
  }
  if (useCasesMissing()) {
    out.push({ id: "use-cases", level: "blocking", slug: "doc-use-cases" });
  }

  // Оранжевые — начинать можно, но лучше не.
  if (!envHas(APP_ENV, "OPENAI_API_KEY") && !envHas(RAG_ENV, "OPENAI_API_KEY")) {
    out.push({ id: "openai", level: "advised", slug: "openai" });
  }
  if (!domainActive()) {
    out.push({ id: "domain", level: "advised", slug: "domain" });
  }

  // Незакрытая передача между контекстными окнами. НЕ поломка: чаще всего это
  // нормальный след прерванной сессии. Область называется «Прежде чем начинать»
  // ровно поэтому — знать о ней надо ДО того, как начнут строить, иначе новая
  // сессия либо повторит сделанное, либо продолжит с шага, который уже закрыт.
  // Возможность экспериментальная и по умолчанию выключена: выключенный
  // механизм не имеет права ни о чём предупреждать.
  if (readContextHandoff().enabled && contextStateHandoff()) {
    out.push({ id: "context-state", level: "advised", slug: "doc-context-state" });
  }

  return out;
}

// ПЕРЕКРЁСТНЫЕ ССЫЛКИ ВСЕХ-КО-ВСЕМ (шаг 309, требование владельца) — каждая строка ЛЮБОЙ базы несёт
// ссылки на ВСЕ связанные строки в остальных базах, ОБОЮДНО. Из любой записи достаётся любая связь: из
// storage-строки чека — назад к finance-записи и к вектор-памяти; из вектора — к записи и файлу; и т.д.
// «Нет связи» как ситуация исчезает.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ПОМОЩНИК. Узлы-выходы идут по очереди: кто записался раньше (vector, storage), не знает
// id тех, кто создан позже (database, finance, map). Прямые ссылки были, обратных — нет. Этот помощник
// зовётся КАЖДЫМ выходом ПОСЛЕ создания его строки: он (1) вписывает в СВОЮ строку ссылки на всех уже
// известных соседей прогона и (2) ДОПИСЫВАЕТ свою ссылку в строки соседей. За несколько выходов связи
// сходятся к полному двустороннему графу, независимо от порядка (поздний выход латает ранние).
//
// Форма ссылки — единая: `links: {table, id}[]` на каждой строке. Существующие `storageIds`/`vectorIds`
// остаются (их читает UI) — это подмножество; `links` — полный граф, из него извлекается что угодно.
import { listRows, updateRow } from "../../rows";

export type Link = { table: string; id: string };

/** Соседи этого прогона, известные из контекста (id, проставленные ранее выполнившимися выходами). */
function knownSiblings(ctx: Record<string, unknown>): Link[] {
  const out: Link[] = [];
  const push = (table: string, id: unknown) => { const s = String(id ?? "").trim(); if (s) out.push({ table, id: s }); };
  push("vector-memory", ctx.vectorRowId);
  push("database", ctx.databaseRowId);
  push("finance", ctx.financeRowId);
  push("map", ctx.mapRowId);
  // Объекты хранилища этого всплеска — из привязанных вложений (fileKey — ключ объекта, rowId — строка storage).
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { rowId?: unknown }[]) : [];
  for (const a of atts) push("storage", a?.rowId);
  return out;
}

const mergeLinks = (existing: unknown, add: Link[]): Link[] => {
  const cur: Link[] = Array.isArray(existing) ? (existing as Link[]).filter((l) => l && l.table && l.id) : [];
  const seen = new Set(cur.map((l) => `${l.table}/${l.id}`));
  for (const l of add) { const k = `${l.table}/${l.id}`; if (!seen.has(k)) { seen.add(k); cur.push(l); } }
  return cur;
};

/**
 * Связать только что созданную строку (`table`/`id`) со всеми соседями прогона ОБОЮДНО.
 * `also` — дополнительные соседи, ещё не попавшие в контекст (напр. finance-строка, созданная в том же
 * узле, что и database). Тихо переживает отсутствие строки-соседа (updateRow вернёт null).
 */
export async function crossLink(ctx: Record<string, unknown>, table: string, id: string, also: Link[] = []): Promise<void> {
  const me = String(id ?? "").trim();
  if (!me) return;
  const siblings = [...knownSiblings(ctx), ...also].filter((l) => !(l.table === table && l.id === me));
  if (!siblings.length) return;

  // 1) в МОЮ строку — ссылки на всех соседей.
  const mine = (await listRows(table, Infinity)).find((r) => r.id === me);
  if (mine) await updateRow(table, me, { links: mergeLinks(mine.links, siblings) });

  // 2) в каждую строку СОСЕДА — обратная ссылка на меня.
  const back: Link = { table, id: me };
  for (const s of siblings) {
    const row = (await listRows(s.table, Infinity)).find((r) => r.id === s.id);
    if (row) await updateRow(s.table, s.id, { links: mergeLinks(row.links, [back]) });
  }
}

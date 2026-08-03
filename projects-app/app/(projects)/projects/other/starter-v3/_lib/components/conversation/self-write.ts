// САМОИЗМЕНЕНИЕ — ЕДИНСТВЕННАЯ ДВЕРЬ, ЧЕРЕЗ КОТОРУЮ СЛОЙ ЭВОЛЮЦИИ ПИШЕТ В ЯДРО (шаг 314).
//
// 🔴 ЗАЧЕМ ОДНА ДВЕРЬ НА ЧЕТЫРЕ ОБЛАСТИ. Каждая область меняет своё поле, но предохранители у них общие, и
// написанные по разу в каждом узле они разъедутся — как разъезжается всё, что живёт в четырёх копиях.
// Здесь они исполняются механически, а не по доброй воле автора узла.
//
// 🔒 П1 — ПРАВКА, А НЕ ПЕРЕЗАПИСЬ: каждое изменение оставляет ВЕРСИЮ в истории с рассказом, что именно
//    изменилось. Владелец обязан видеть, что автоматизация сделала с собой.
// 🔒 П6 — ВИДИМОСТЬ: молчаливая мутация конфигурации запрещена. Нет версии — нет изменения.
// 🔒 Записывает ТОЛЬКО `entity.data` вкладки «Ассистент» и историю. Ни узлов, ни рёбер, ни паспорта: холст
//    меняется лишь с одобрения владельца (область `graph`, вторая итерация) — и эта дверь туда не ведёт.
import { readCore, writeCore } from "../../core-io";
import { SUMMARY_LIMIT } from "../../../_data/record.schema";

/** Дата в формате истории — `dd-mm-yyyy hh:mm:ss` (закон схемы). */
function historyStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const cuid = () => `cevo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Изменить `data` вкладки «Ассистент» и записать версию.
 *
 * `patch` получает текущее `data` и возвращает НОВОЕ либо `null` — «менять нечего». Возврат `null` это
 * штатный исход, а не ошибка: чаще всего человек просит то, что уже настроено.
 *
 * Возвращает `true`, если ядро действительно изменилось.
 */
export async function evolveAssistantData(
  patch: (data: Record<string, unknown>) => Record<string, unknown> | null,
  summary: string,
): Promise<boolean> {
  const core = await readCore();
  const tab = core.components.tabs.find((t) => t.name === "assistant");
  if (!tab) return false;
  const entities = "entities" in tab && Array.isArray(tab.entities) ? tab.entities : [];
  const entity = entities[0];
  if (!entity) return false;

  const current = (entity.data ?? {}) as Record<string, unknown>;
  const next = patch(current);
  if (!next) return false;
  if (JSON.stringify(next) === JSON.stringify(current)) return false; // нечего писать — и версии не будет

  entity.data = next;

  // П1/П6: версия — след изменения. Номер продолжает существующий ряд, рассказ ограничен общим пределом
  // короткой формы папки: у «краткого изложения» один закон на всё.
  const versions = core.history.versions;
  const nextNumber = versions.reduce((m, v) => Math.max(m, v.number), 0) + 1;
  const text = summary.trim().slice(0, SUMMARY_LIMIT);
  versions.push({
    cuid: cuid(),
    number: nextNumber,
    createdAt: historyStamp(),
    objectsTouched: 1,
    summary: text || `the assistant adjusted itself (version ${nextNumber})`,
  });

  const result = await writeCore(core);
  // Отказ схемы — не повод ронять прогон: ответ человеку уже доставлен (§7 ТЗ). Но и молчать нельзя,
  // поэтому исход возвращается ложью, а узел объявит его своим `outcomes`.
  return result.ok;
}

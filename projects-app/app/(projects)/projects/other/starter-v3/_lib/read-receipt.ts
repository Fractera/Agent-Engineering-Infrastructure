// РАСПИСКА О ПРОЧТЕНИИ — гейт на структурную правку графа (требование владельца 2026-08-02).
//
// ЗАЧЕМ. Спроектировать связи, не прочитав ядро и схему целиком, — источник катастрофических ошибок
// проектирования: модель видит кусок графа и строит рёбра по догадке. Инструкция это запрещает, но
// инструкция — просьба. Здесь просьба становится условием записи: дверь `api/patch` не примет операцию,
// меняющую СОСТАВ узлов или связи, пока вызывающий не предъявит расписку.
//
// 🔒 ЧТО ЭТА РАСПИСКА ГАРАНТИРУЕТ, А ЧТО НЕТ — честно, без преувеличения.
//   ГАРАНТИРУЕТ: (1) вызывающий держал в руках ОБА файла — иначе ему неоткуда взять их хеши;
//                (2) он читал ИХ ТЕКУЩУЮ версию: файл изменился после прочтения → расписка не совпадает,
//                    и запись отклоняется. Это защита от правки против устаревшего представления.
//   НЕ ГАРАНТИРУЕТ: что содержимое действительно попало в контекст модели. Никакая серверная проверка
//                этого доказать не может — любую функцию от файла можно посчитать, не читая его.
//                Расписка поднимает цену обхода с «молча пропустить» до «сознательно обойти» и повторяет
//                закон при каждом отказе.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AUTOMATION_ROOT, CORE_PATH } from "./paths";

export const SCHEMA_PATH = join(AUTOMATION_ROOT, "_data", "automation.schema.ts");

/** Операции, меняющие СОСТАВ графа и его связи. Только они требуют расписку. */
export const STRUCTURAL_OPS = ["add", "delete", "connect", "disconnect"] as const;

/**
 * `set` и `visibility` НЕ требуют расписки намеренно: ими правит владелец из своего интерфейса (форма
 * вкладки «Ассистент», роли доступа, раскрытие узла на холсте). Гейт защищает проектирование связей, а не
 * мешает человеку работать с собственной автоматизацией.
 */
export const needsReceipt = (op: string): boolean => (STRUCTURAL_OPS as readonly string[]).includes(op);

const sha256 = async (path: string): Promise<string> => createHash("sha256").update(await readFile(path)).digest("hex");

export type ReceiptVerdict = { ok: true } | { ok: false; why: string };

/**
 * Проверить расписку в заголовках запроса: `X-Core-Read` и `X-Schema-Read` — sha256 файлов, которые
 * вызывающий прочитал. Отказ объясняет словами, что сделать: это обучающий отказ, как и весь `api/patch`.
 */
export async function checkReadReceipt(headers: Headers): Promise<ReceiptVerdict> {
  const given = {
    core: (headers.get("x-core-read") ?? "").trim().toLowerCase(),
    schema: (headers.get("x-schema-read") ?? "").trim().toLowerCase(),
  };
  const actual = { core: await sha256(CORE_PATH), schema: await sha256(SCHEMA_PATH) };

  const how =
    "Read BOTH files IN FULL, then send their sha256 in the headers: " +
    "`X-Core-Read: <sha256 of _data/automation.json>` and `X-Schema-Read: <sha256 of _data/automation.schema.ts>`. " +
    "Building edges without the whole core and the whole schema in front of you is the single most expensive " +
    "mistake in this project: you cannot see which connections are lawful from a fragment.";

  if (!given.core || !given.schema) {
    return { ok: false, why: `a structural change to the graph requires a READ RECEIPT for the core and the schema. ${how}` };
  }
  if (given.core !== actual.core) {
    return {
      ok: false,
      why:
        "the core read receipt does not match the core as it stands NOW — you read an older version, or you " +
        `did not read it at all. Read _data/automation.json again and resend. ${how}`,
    };
  }
  if (given.schema !== actual.schema) {
    return {
      ok: false,
      why:
        "the schema read receipt does not match the schema as it stands NOW — you read an older version, or " +
        `you did not read it at all. Read _data/automation.schema.ts again and resend. ${how}`,
    };
  }
  return { ok: true };
}

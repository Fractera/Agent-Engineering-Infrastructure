// ВАЛИДАТОРЫ УЗЛОВ — то место, где результат функции получает ИМЯ ИСХОДА (шаг 311.8, требование
// владельца).
//
// 🔒 ЗАЧЕМ ОНИ СУЩЕСТВУЮТ. Живой прогон 311.7: `fetchExternal` получил от источника 403 и вернул
// «ничего не нашлось» обычным ctx-патчем. Движок слил патч в контекст и пошёл дальше — для графа узел
// отработал успешно. Владелец назвал корень одной фразой: **без валидатора функция всегда пропускает
// выход**, и любой провал превращается в успех.
//
// Валидатор — не «да/нет». Исходов бывает много с обеих сторон («выше 80% — успех, остальное — провал»),
// поэтому он КЛАССИФИКАТОР: смотрит на патч, который вернула функция, и называет один из исходов,
// объявленных этим узлом в ядре (`function.outcomes`). Движок сверяет имя с объявленным перечнем: не
// совпало — прогон падает честно, с названной причиной.
//
// ИМЯ ВЫВОДИТСЯ, НЕ ВЫБИРАЕТСЯ: `fetchExternal` → `fetchExternalValidate` (закон схемы). Реестр ниже —
// по образцу `NODE_FUNCTIONS`: статическая карта, потому что шаблонные import'ы в route-group не
// резолвятся в рантайме.
import type { NodeCtx } from "./executor";

/** Контракт валидатора: по патчу функции и контексту прогона назвать ОДИН объявленный исход. */
export type NodeValidator = (patch: NodeCtx, ctx: NodeCtx) => string;

const has = (patch: NodeCtx, key: string) => patch[key] !== undefined && patch[key] !== null && patch[key] !== "";

// ─── СЕРЕДИНА ───────────────────────────────────────────────────────────────────────────────────────

/** `transformPayload`: сообщение либо нормализовано, либо пусто (пустое бросает — сюда не доходит). */
export const transformPayloadValidate: NodeValidator = (patch) =>
  has(patch, "text") ? "normalized" : "empty";

/** `fetchExternal` — ТОТ САМЫЙ УЗЕЛ. Три исхода вместо одного молчаливого. */
export const fetchExternalValidate: NodeValidator = (patch) => {
  if (has(patch, "subjectError")) return "unreachable"; // источник отказал (403, сеть) — НЕ «не нашлось»
  if (has(patch, "subjectMissing")) return "missing"; // источник ответил, сведений нет
  if (has(patch, "subject")) return "found";
  return "not-mine"; // класс запроса не наш — узел не работал
};

/** `keepObject`: байты сохранены, либо нечего сохранять, либо источник не отдал файл. */
export const keepObjectValidate: NodeValidator = (patch) => {
  if (has(patch, "objectError")) return "unreachable";
  if (has(patch, "objectKept")) return "kept";
  return "nothing-to-keep";
};

/** `resolveMoment`: дата найдена в описании предмета или её там нет. */
export const resolveMomentValidate: NodeValidator = (patch) => (has(patch, "when") ? "dated" : "undated");

// ─── УСЛОВИЯ ────────────────────────────────────────────────────────────────────────────────────────
// Условие без валидатора пропускает всегда — то есть его как будто нет. Здесь оно вычисляет СВОЙСТВО
// прогона и этим свойством решает, держит ли ветка.

/** `ifSuccess`: ветка успеха держит, когда прогон принёс полезную нагрузку и ни один узел не заявил отказ. */
export const ifSuccessValidate: NodeValidator = (_patch, ctx) => {
  if (has(ctx, "subjectError") || has(ctx, "objectError")) return "not-holding";
  if (ctx.skipStores === true) return "nothing-to-deliver";
  return "holding";
};

/** `ifFailure`: ветка провала держит ровно тогда, когда прогон нёс отказ — и несёт его причину дальше. */
export const ifFailureValidate: NodeValidator = (_patch, ctx) => {
  if (has(ctx, "subjectError") || has(ctx, "objectError")) return "failed";
  if (ctx.skipStores === true) return "empty-handed";
  return "not-holding";
};

export const NODE_VALIDATORS: Record<string, NodeValidator> = {
  transformPayloadValidate,
  fetchExternalValidate,
  keepObjectValidate,
  resolveMomentValidate,
  ifSuccessValidate,
  ifFailureValidate,
};

// 🔒 ВТОРОЙ УРОВЕНЬ ПРИНУЖДЕНИЯ — падение на загрузке модуля. Каждая функция решающего узла обязана
// иметь валидатор с ВЫВЕДЕННЫМ именем. Если функция зарегистрирована, а её валидатор — нет, модуль
// падает здесь, а не деградирует молча в рантайме (образец — страховка инструкций в схеме).
//
// Проверяются только те функции, что реально стоят решающими узлами: приёмники и доставщики валидатора
// не имеют — их исход определяется каналом, а не логикой.
const DECIDING_FUNCTIONS = [
  "transformPayload",
  "fetchExternal",
  "keepObject",
  "resolveMoment",
  "ifSuccess",
  "ifFailure",
] as const;

const missingValidators = DECIDING_FUNCTIONS.map((fn) => `${fn}Validate`).filter((v) => !NODE_VALIDATORS[v]);
if (missingValidators.length) {
  throw new Error(
    `deciding functions without a registered validator: ${missingValidators.join(", ")} — ` +
      `without a validator a function always lets its result through, and a failure becomes a success`,
  );
}

// СОСТОЯНИЕ НОВОГО ПУТИ ЗАПУСКА (шаг 28-17, 2026-08-27). Серверный модуль.
//
// 🔒 ЗАЧЕМ ОТДЕЛЬНОЕ СОСТОЯНИЕ, А НЕ `lib/launch.ts`. Владелец, потеряв введённый
// адрес после перезагрузки, спросил прямо: «почему ты не рисуешь сохранённые
// данные — ты сохраняешь?». Ответ был «нет», и причина была верная: запись в
// `USER_LAUNCH_*` двигает состояние ЖИВОГО мастера, а его трогать запрещено.
//
// Выбор владельца — «replace logic to new flow»: у нового пути СВОИ ключи. Живой
// мастер продолжает жить своей жизнью на `/[lang]/github`, новый путь — своей.
// Два состояния временно стоят рядом; когда новый путь заменит старый, старое
// уйдёт вместе с ним, и это будет одна правка, а не распутывание общих ключей.
//
// 🔒 ПРЕФИКС СВОЙ И НЕПЕРЕСЕКАЮЩИЙСЯ: `USER_FLOW_`. Ни одного ключа из
// `USER_LAUNCH_*` здесь не читается и не пишется — проверяется зондом, а не
// обещанием.
//
// 🔒 ХРАНИТСЯ ЗНАЧЕНИЕ, А НЕ ФАКТ «ПРОЙДЕНО». Шаг считается пройденным ровно
// тогда, когда у него есть непустое значение: второй ключ «пройдено» рядом со
// значением — это второй источник правды, который через неделю разойдётся с
// первым. Тот же закон, что в `lib/launch.ts`: «состояние выводится из фактов, а
// не хранится отдельно».
//
// ✗ ЧЕМ ОПЛАЧЕНА ЭТА ОСТОРОЖНОСТЬ (шаг 25): отметка одного шага была заимствована
// у другого, и мастер поздравлял человека с тем, чего он не делал. Здесь у
// каждого шага свой ключ, и заимствований нет вовсе.

import { getValue, setValue, clearPrefix } from "@/lib/dev-tools-marks";

/** Префикс всех ключей нового пути. По нему же идёт сброс. */
export const FLOW_PREFIX = "USER_FLOW_";

/**
 * Шаги пути «стартовый шаблон», у которых есть сохраняемое значение.
 *
 * 🔒 СПИСОК ЗДЕСЬ, А НЕ В СТРАНИЦАХ: он нужен и странице шага, и карте пути, и
 * сбросу. Три копии разошлись бы на первой же правке.
 */
export const FLOW_STEPS = ["repo-url", "token"] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];

export const isFlowStep = (v: unknown): v is FlowStep =>
  typeof v === "string" && (FLOW_STEPS as readonly string[]).includes(v);

const key = (step: FlowStep): string =>
  `${FLOW_PREFIX}${step.toUpperCase().replace(/-/g, "_")}`;

/** Значение шага. Пустая строка означает «шаг не пройден». */
export function flowValue(step: FlowStep): string {
  return getValue(key(step)).trim();
}

export function setFlowValue(step: FlowStep, value: string | null): void {
  const next = value && value.trim() !== "" ? value.trim() : null;
  const changed = next !== (getValue(key(step)).trim() || null);
  setValue(key(step), next);

  // 🔒 СМЕНИЛОСЬ ПРОВЕРЕННОЕ — ОТМЕТКА ПРОВЕРКИ ГАСНЕТ. GitHub отвечал про ТОТ
  // адрес и ТОТ токен; после замены зелёная отметка утверждала бы то, чего никто
  // не спрашивал. Гасить надо здесь, у единственного писателя значений, — иначе
  // однажды появится второй путь записи, который об этом не знает.
  if (changed) setValue(FLOW_VERIFIED_KEY, null);
}

/** Пройден ли шаг. Один источник правды — наличие значения. */
export function flowDone(step: FlowStep): boolean {
  return flowValue(step) !== "";
}

/**
 * Значение, показываемое человеку.
 *
 * 🔒 СЕКРЕТ НАРУЖУ НЕ ОТДАЁТСЯ ЦЕЛИКОМ. Токен сохранён — человеку нужно видеть,
 * ЧТО он сохранён, а не сам токен: страница панели открывается при коллегах, на
 * проекторе и в записи экрана. Показываются четыре последних знака, остальное —
 * точки. Адрес репозитория секретом не является и показывается целиком.
 */
export function flowShown(step: FlowStep): string {
  const v = flowValue(step);
  if (v === "" || step !== "token") return v;
  return `••••••••${v.slice(-4)}`;
}

/** Сброс всего состояния нового пути. Живого мастера НЕ касается. */
export function resetFlow(): string[] {
  return clearPrefix(FLOW_PREFIX);
}

/** Сколько шагов пути пройдено — для карты пути и шкалы. */
export function flowDoneCount(): number {
  return FLOW_STEPS.filter(flowDone).length;
}

// ── ШАГ 3: ПРОВЕРКА СВЯЗИ ───────────────────────────────────────────────────
//
// 🔒 ЭТО ОТМЕТКА, А НЕ ЗНАЧЕНИЕ, И ПОТОМУ ЖИВЁТ ОТДЕЛЬНО. У шагов 1 и 2 факт
// «пройден» выводится из наличия значения; у проверки значения нет — есть только
// ответ GitHub и время, когда он пришёл. Втиснуть её в `FLOW_STEPS` значило бы
// назвать временну́ю метку «значением шага» и однажды показать её человеку в
// поле ввода.
//
// 🔒 ОТМЕТКА ГАСНЕТ ПРИ ЛЮБОЙ СМЕНЕ АДРЕСА ИЛИ ТОКЕНА. Проверено было ТО, что
// стояло в тот момент; заменил токен — проверка больше ничего не утверждает.
// Оставить зелёным — ровно тот дефект шага 25, где мастер поздравлял человека с
// тем, чего он не делал.

export const FLOW_VERIFIED_KEY = `${FLOW_PREFIX}VERIFIED_AT`;

export function flowVerifiedAt(): string {
  return getValue(FLOW_VERIFIED_KEY).trim();
}

export function flowVerified(): boolean {
  return flowVerifiedAt() !== "";
}

export function setFlowVerified(on: boolean): void {
  setValue(FLOW_VERIFIED_KEY, on ? new Date().toISOString() : null);
}

// ── ШАГ 4: ОТПРАВКА ПРОЕКТА ─────────────────────────────────────────────────
//
// 🔒 ОТМЕТКА ОТПРАВКИ НЕ ГАСНЕТ ПРИ СМЕНЕ ТОКЕНА — и это отличие от проверки
// осознанное. Проверка утверждает про НЫНЕШНИЕ данные: сменил токен — она больше
// ничего не утверждает. Отправка утверждает про ПРОШЛОЕ СОБЫТИЕ: файлы уехали, и
// новый токен этого не отменяет. Погасить её значило бы соврать в другую сторону.

export const FLOW_PUSHED_KEY = `${FLOW_PREFIX}PUSHED_AT`;

export function flowPushedAt(): string {
  return getValue(FLOW_PUSHED_KEY).trim();
}

export function flowPushed(): boolean {
  return flowPushedAt() !== "";
}

export function setFlowPushed(on: boolean): void {
  setValue(FLOW_PUSHED_KEY, on ? new Date().toISOString() : null);
}

// ── ШАГ 5: ОТМЕТКИ, КОТОРЫЕ СТАВИТ ЧЕЛОВЕК ─────────────────────────────────
//
// 🔒 ТРЕТИЙ РОД ФАКТА, И ОН НЕ СВОДИТСЯ К ДВУМ ПРЕДЫДУЩИМ. У шагов 1–2 факт —
// сохранённое ЗНАЧЕНИЕ, у шагов 3–4 — СОБЫТИЕ, случившееся на сервере. Здесь
// факт живёт на машине человека: Claude Code открыт, подписка оплачена. Панель
// работает на сервере, канала для такого вопроса между ними нет, и спрашивать
// его неоткуда.
//
// 🔒 ПОЭТОМУ ОТМЕТКА СНИМАЕМАЯ. Одноразовая говорила бы «когда-то стояло» и
// врала бы ровно тем способом, который этот проект выкорчёвывает: подписка
// кончается, программу сносят. Снял галочку — шаг снова открыт.

// 🔒 «folder» и «open-folder» ПРИНАДЛЕЖАТ СЮДА ЖЕ, И ПО ТОЙ ЖЕ ПРИЧИНЕ (28-26).
// Папка заводится на машине человека, и Claude Code открывает её там же. Панель
// не видит ни его диска, ни его окна: спросить неоткуда, значит закрывает
// человек — и отметка остаётся снимаемой, как у Claude Code.
export const FLOW_MARKS = ["claude-code", "folder", "open-folder", "local-run"] as const;
export type FlowMark = (typeof FLOW_MARKS)[number];

export const isFlowMark = (v: unknown): v is FlowMark =>
  typeof v === "string" && (FLOW_MARKS as readonly string[]).includes(v);

const markKeyOf = (mark: FlowMark): string =>
  `${FLOW_PREFIX}MARK_${mark.toUpperCase().replace(/-/g, "_")}_AT`;

export function flowMarked(mark: FlowMark): boolean {
  return getValue(markKeyOf(mark)).trim() !== "";
}

export function setFlowMark(mark: FlowMark, on: boolean): void {
  setValue(markKeyOf(mark), on ? new Date().toISOString() : null);
}

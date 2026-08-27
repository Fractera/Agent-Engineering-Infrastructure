// Мастер запуска проекта — СПИСОК ШАГОВ (шаг 25).
//
// 🔒 ЭТОТ ФАЙЛ — ЕДИНСТВЕННЫЙ ИСТОЧНИК ПОРЯДКА. Из него выводятся: бусины
// верёвочки наверху страницы, правило раскрытия «показан пройденный и первый
// непройденный», тип ключей словаря и адрес отметки каждого шага. Добавить шаг =
// добавить строку здесь; забыть его слова не получится — тип не соберётся.
// Правило записано, потому что запрет в тексте не исполняется, а тип исполняется.
//
// 🔒 ЗДЕСЬ НЕТ `fs` И НЕТ СЛОВАРЯ. Файл импортируют островки; словарь панели —
// 82 языка, и один его импорт из `"use client"` уезжает в браузер целиком.
//
// `id` — машинная строка, НЕ переводится. Слова живут в словаре под тем же id.

/** Две двери, за которыми начинается работа. Выбор пишется в `USER_START_MODE`. */
export const START_MODES = ["starter", "adopt"] as const;
export type StartMode = (typeof START_MODES)[number];

export const isStartMode = (v: unknown): v is StartMode =>
  typeof v === "string" && (START_MODES as readonly string[]).includes(v);

/**
 * Чем шаг закрывается, и разница здесь содержательная:
 *
 * `verified` — закрывает МАШИНА. Репозиторий отвечает, GitHub подтвердил ключ,
 *   ветка `main` несёт коммит, сборка чужого проекта прошла. Галочку такому шагу
 *   человек поставить не может, и это правильно: он бы поставил её из вежливости.
 *
 * `checked`  — закрывает ЧЕЛОВЕК. Папка создана, подписка активирована, файл
 *   перетащен в окно агента. У панели нет глаз на машине разработчика, и делать
 *   вид, что она это видит, — та самая ложь, которую проект выкорчёвывает.
 *   Отметка СНИМАЕМАЯ: снял — шаг снова открыт.
 */
export type LaunchStepKind = "verified" | "checked";

/**
 * Хвост, общий для обеих дверей. Он начинается там, где кончается разница: и тот,
 * кто отправил стартовый шаблон, и тот, кто подключил свой проект, дальше делают
 * ОДНО И ТО ЖЕ — ставят агента, заводят папку, активируют подписку, забирают
 * окружение и доводят первое изменение до своего домена.
 */
const COMMON_TAIL = [
  { id: "claude-code",  kind: "checked" },
  { id: "folder",       kind: "checked" },
  { id: "open-folder",  kind: "checked" },
  { id: "subscription", kind: "checked" },
  { id: "first-prompt", kind: "checked" },
  { id: "env",          kind: "checked" },
  { id: "drop-env",     kind: "checked" },
  { id: "install",      kind: "checked" },
  { id: "first-change", kind: "checked" },
  { id: "first-deploy", kind: "checked" },
] as const;

/** Стартовый шаблон: завести пустой репозиторий и отправить в него проект. */
const STARTER_HEAD = [
  { id: "repo",   kind: "verified" },
  { id: "key",    kind: "verified" },
  { id: "upload", kind: "verified" },
] as const;

/**
 * Чужой проект Fractera: назвать репозиторий, заменить им слот и УБЕДИТЬСЯ
 * ГЛАЗАМИ, что проект поднялся. Отправки здесь нет — проект уже на GitHub,
 * оттуда он и приехал; шаг «загрузить проект» в этой двери означал бы отправить
 * человеку его же код обратно.
 */
const ADOPT_HEAD = [
  { id: "repo",       kind: "verified" },
  { id: "key",        kind: "verified" },
  { id: "adopt",      kind: "verified" },
  { id: "live-check", kind: "checked"  },
] as const;

export const LAUNCH_STEPS = {
  starter: [...STARTER_HEAD, ...COMMON_TAIL],
  adopt: [...ADOPT_HEAD, ...COMMON_TAIL],
} as const satisfies Record<StartMode, readonly { id: string; kind: LaunchStepKind }[]>;

export type LaunchStepId =
  | (typeof STARTER_HEAD)[number]["id"]
  | (typeof ADOPT_HEAD)[number]["id"]
  | (typeof COMMON_TAIL)[number]["id"];

/** Все существующие шаги — для типа словаря и для сброса. Порядок не важен. */
export const ALL_LAUNCH_STEP_IDS = [
  ...new Set<LaunchStepId>([
    ...STARTER_HEAD.map((s) => s.id),
    ...ADOPT_HEAD.map((s) => s.id),
    ...COMMON_TAIL.map((s) => s.id),
  ]),
] as LaunchStepId[];

export const isLaunchStepId = (v: unknown): v is LaunchStepId =>
  typeof v === "string" && (ALL_LAUNCH_STEP_IDS as readonly string[]).includes(v);

export function launchSteps(mode: StartMode): readonly { id: LaunchStepId; kind: LaunchStepKind }[] {
  return LAUNCH_STEPS[mode];
}

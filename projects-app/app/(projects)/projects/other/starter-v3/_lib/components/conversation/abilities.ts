// 🔒 ЧТО ЭТА СБОРКА УМЕЕТ — ВЫВОДИТСЯ ИЗ ЯДРА, НЕ ПИШЕТСЯ РУКАМИ (шаг 312.4).
//
// ЗАЧЕМ. Перечень возможностей жил ТРЕМЯ копиями и все три врали про эту сборку: `DEFAULT_INSTRUCTION`
// («умею только принять и развезти»), `CAPABILITIES` в детерминированном фолбэке и — по умолчанию —
// молчание ядра. Живой прогон 2026-08-03: автоматизация добыла Колизей, положила его в три склада и в том
// же ответе сказала, что умеет только пересылать сообщения. Зашитый список гниёт ПО ПРИРОДЕ: раскрыли
// канал — он в перечне не появился, сняли узел — не исчез.
//
// ЛЕЧЕНИЕ. Один источник — само ядро. Список собирается на КАЖДОМ прогоне из ВИДИМЫХ узлов, поэтому
// разойтись со сборкой физически не может: раскрыл дверь — она в перечне, скрыл — исчезла.
//
// ОТНОШЕНИЕ К ТЗ 314 §4а. Там перечень обязан ПЕРЕПИСЫВАТЬ узел `behavior` на каждой итерации. Вывод на
// чтении строго сильнее: переписывать нечего, гнить нечему. За `behavior` остаётся остальная инструкция
// поведения (тон, примеры, предпочтения) — фрагмент возможностей ему больше не нужен.
import type { Automation } from "../../../_data/automation.schema";
import { allNodes } from "../../../_data/automation.schema";

export type Abilities = {
  /** Как автоматизация называется — первое, что человек спрашивает («ты кто?»). */
  title: string;
  /** Своими словами владельца: как это работает. Пусто — законно, тогда о ней говорят выведенные факты. */
  howItWorks: string[];
  /** Сценарии владельца ЦЕЛИКОМ, без сокращения (требование владельца 2026-08-03). */
  useCases: { title: string; text: string }[];
  inputs: string[];
  outputs: string[];
  steps: string[];
  speaks: boolean;
  /** Сколько узлов работает и сколько ещё закрыто — чтобы масштаб был назван, а не угадан. */
  counts: { visible: number; total: number; hidden: number };
};

/**
 * 🗣 ЧЕЛОВЕЧЕСКИЕ ИМЕНА КАНАЛОВ И СКЛАДОВ (330.5, требование владельца).
 *
 * Машинный `ioType` — наш словарь: `control-panel`, `vector-memory`, `toast`. Человек этих слов не знает,
 * а модель, получив их, пересказывает конвейер вместо разговора о себе. Живой прогон: на «что ты умеешь»
 * ассистент отвечал «проверяю ввод, вывожу заголовок» — описание узлов, а не помощи.
 *
 * Словарь конечен (каналы закрыты словарём схемы), поэтому перевод — таблица, а не догадка. Неизвестное
 * имя отдаём как есть: честнее машинное слово, чем выдуманное человеческое.
 */
const HUMAN_IN: Record<string, string> = {
  "control-panel": "right on its own page, in the message box",
  "telegram-bot": "in Telegram, by writing to its bot",
  "user-telegram-chat": "in your personal Telegram chat",
  email: "by email",
  webhook: "from another program, automatically",
  "public-page": "from its public page, where anyone may write",
  cron: "by itself, on a schedule",
};

const HUMAN_OUT: Record<string, string> = {
  toast: "tells you right there on the page",
  dashboard: "shows it in a list you can look through",
  database: "keeps it as a record you can find later",
  "vector-memory": "remembers the meaning, so you can ask about it in your own words",
  storage: "keeps files and pictures for you",
  map: "puts a marker on your map",
  calendar: "puts a date in your calendar",
  email: "sends you an email",
  "telegram-bot": "answers in Telegram",
  "user-telegram-chat": "writes to your personal Telegram chat",
  "public-page": "publishes it on the public page",
  analytics: "counts it, so you can see how much came and from where",
};

const human = (map: Record<string, string>, key: string): string => map[key] ?? key;

/** Видимые узлы = то, что реально работает в прогоне. Скрытый узел — закрытая дверь, его в перечне нет. */
export function abilitiesOf(core: Automation): Abilities {
  const all = allNodes(core.graph.nodes);
  const visible = all.filter((n) => n.state === "visible");
  const channels = (kind: string, map: Record<string, string>) =>
    visible
      .filter((n) => n.kind === kind && typeof n.ioType === "string")
      .map((n) => human(map, String(n.ioType)));
  const cases = Array.isArray((core as { useCases?: { cases?: unknown } }).useCases?.cases)
    ? ((core as { useCases: { cases: { title?: unknown; text?: unknown }[] } }).useCases.cases)
    : [];
  return {
    title: String(core.passport.title ?? "").trim(),
    howItWorks: Array.isArray(core.passport.howItWorks) ? core.passport.howItWorks.map(String).filter(Boolean) : [],
    // ЦЕЛИКОМ: кейс — единственное место, где написано, ЗАЧЕМ эта сборка существует. Сократить его значит
    // отобрать у ассистента понимание задачи и оставить ему перечень деталей.
    useCases: cases.map((c) => ({ title: String(c.title ?? "").trim(), text: String(c.text ?? "").trim() })).filter((c) => c.text),
    inputs: channels("input", HUMAN_IN),
    outputs: channels("output", HUMAN_OUT),
    // Середина — это и есть «что автоматизация делает с данными»; берём её собственные краткие описания.
    steps: visible.filter((n) => n.kind === "transform").map((n) => n.function.summary),
    speaks: visible.some((n) => n.kind === "speech"),
    counts: { visible: visible.length, total: all.length, hidden: all.length - visible.length },
  };
}

/**
 * 🔒 ГДЕ ЭТО СМОТРЕТЬ И КТО ЭТО ВИДИТ (шаг 312.7, требование владельца) — тоже ВЫВОД ИЗ ЯДРА, не текст в
 * инструкции. Модель должна уметь ответить «зайди сюда» и «твой коллега не видит автоматизацию, потому
 * что страница открыта таким-то ролям» — фактами, а не догадкой.
 *
 * Публичный адрес живёт в паспорте; адрес кокпита не хранится нигде и не должен — он выводится из адреса,
 * по которому пришёл прогон (`ctx.automationUrl`, кладёт дверь `api/run`): второе хранилище одного факта
 * разъехалось бы с первым. Роли — `passport.access`: пусто = видно всем.
 */
export function placesBrief(core: Automation, cockpitUrl: string): string {
  const publicUrl = String((core.passport as { publicUrl?: unknown }).publicUrl ?? "").trim();
  const roles = (core.passport as { access?: unknown }).access;
  const list = Array.isArray(roles) ? roles.map(String).filter(Boolean) : [];
  return [
    `WHERE THIS AUTOMATION LIVES (facts, never invent an address):`,
    `· public page: ${publicUrl || "not assigned yet — say so plainly instead of giving a link"}`,
    `· cockpit (the owner's development page): ${cockpitUrl || "unknown from this run"}`,
    `· who sees the public page: ${list.length ? `only holders of the roles ${list.join(", ")}` : "everyone — access is not restricted"}`,
    list.length
      ? `If someone cannot see it, that is why: they lack one of those roles, and the owner grants them in the admin panel.`
      : `If someone cannot see it, it is NOT a role restriction — say so and do not guess the reason.`,
  ].join("\n");
}

/**
 * ФАКТЫ ДЛЯ МОДЕЛИ — приписываются к инструкции поведения и ГЛАВНЕЕ неё: инструкцию пишет человек и может
 * ошибиться или устареть, а это выведено из сборки только что. Формулировать красиво — работа модели;
 * знать правду — работа ядра.
 */
export function abilitiesBrief(a: Abilities): string {
  const list = (xs: string[]) => (xs.length ? xs.join("; ") : "none");
  const lines: string[] = [
    `WHO YOU ARE, derived from this build's core right now. These facts OUTRANK the instruction above: never ` +
      `contradict them and never extend them.`,
    "",
    `You are the assistant of ${a.title || "this automation"}.`,
  ];

  // 🔒 КЕЙСЫ — ЦЕЛИКОМ И ПЕРВЫМИ (требование владельца). Они говорят, ЗАЧЕМ сборка существует; без них
  // ассистент знает детали и не знает задачи, поэтому и звучал как инструкция к прибору.
  if (a.useCases.length) {
    lines.push("", "WHAT THE OWNER BUILT THIS FOR — his own words, in full:");
    for (const c of a.useCases) lines.push(`· ${c.title ? `${c.title}: ` : ""}${c.text}`);
  }

  if (a.howItWorks.length) {
    lines.push("", "HOW IT WORKS, as the owner describes it:");
    for (const l of a.howItWorks) lines.push(`· ${l}`);
  }

  lines.push(
    "",
    "WHAT YOU CAN ACTUALLY DO:",
    `· people reach you: ${list(a.inputs)}`,
    `· what you can bring or work out yourself: ${a.steps.length ? a.steps.join(" · ") : "nothing — you pass things through as they came"}`,
    `· what you do with what you get: ${list(a.outputs)}`,
    `· ${a.speaks ? "you answer in your own words" : "you do not talk to people at all"}`,
    // Масштаб называется вслух: «26 из 39» — честный ответ на «а много ты умеешь?», и он же объясняет,
    // что остальное не сломано, а просто ещё не открыто владельцем.
    `· ${a.counts.visible} of the ${a.counts.total} steps of this build are switched on` +
      (a.counts.hidden ? `; the other ${a.counts.hidden} are built but not switched on yet — the owner switches them on in the cockpit.` : "."),
    "",
    "HOW TO TALK ABOUT THIS: speak as a helper, not as a diagram. Say what the person GETS — «I'll remember " +
      "that and you can ask me about it later» — never the names of your steps or stores. If they ask for " +
      "something not on these lines, say plainly that it is not part of you yet, offer what you CAN do, and " +
      "never promise it for later.",
  );
  return lines.join("\n");
}

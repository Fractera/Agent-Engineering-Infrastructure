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

export type Abilities = { inputs: string[]; outputs: string[]; steps: string[]; speaks: boolean };

/** Видимые узлы = то, что реально работает в прогоне. Скрытый узел — закрытая дверь, его в перечне нет. */
export function abilitiesOf(core: Automation): Abilities {
  const visible = allNodes(core.graph.nodes).filter((n) => n.state === "visible");
  const channels = (kind: string) =>
    visible.filter((n) => n.kind === kind && typeof n.ioType === "string").map((n) => String(n.ioType));
  return {
    inputs: channels("input"),
    outputs: channels("output"),
    // Середина — это и есть «что автоматизация делает с данными»; берём её собственные краткие описания.
    steps: visible.filter((n) => n.kind === "transform").map((n) => n.function.summary),
    speaks: visible.some((n) => n.kind === "speech"),
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
  const list = (xs: string[]) => (xs.length ? xs.join(", ") : "none");
  return (
    `FACTS ABOUT THIS BUILD, derived from its core right now — they OUTRANK anything above and you must ` +
    `never contradict or extend them:\n` +
    `· open input channels: ${list(a.inputs)}\n` +
    `· open output channels: ${list(a.outputs)}\n` +
    `· what it does with the data: ${a.steps.length ? a.steps.join(" · ") : "nothing beyond passing it through"}\n` +
    `· it ${a.speaks ? "answers through a conversational node" : "has no conversational node"}.\n` +
    `Anything not on these lines is NOT built: say so plainly instead of promising it.`
  );
}

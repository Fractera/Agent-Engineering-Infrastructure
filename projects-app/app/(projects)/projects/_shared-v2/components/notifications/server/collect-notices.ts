import { coreEntitiesOf, type CoreNode, type Notice, type NoticesCore } from "../types/notifications";

// МАРКЕР ОТВЕТА НА ПРЕДУПРЕЖДЕНИЕ — им начинается сырая инструкция, которую пишет дверь 
// (). Одна строка-договор между дверью и полосой: меняется в двух местах вместе.
const ANSWER_MARKER = "ОТВЕТ НА ПРЕДУПРЕЖДЕНИЕ.";

// СЕРВЕРНАЯ ДЕРИВАЦИЯ микросервиса «уведомления» — ЕДИНЫЙ ИСТОЧНИК поводов внимания (шаг 298, перенос из
// папки автоматизации в дев-слой). Чистая функция над ядром: ничего не хранит (закон 2 — единственный
// источник истины — ядро). Её вызывает дверь `api/projects/notices`, а провайдер раздаёт результат ОДИН РАЗ
// всем поверхностям — так разные места (полоса, будущие бейджи узлов, панель проблем) не выводят одно и то
// же независимо и не расходятся.
//
// ЧЕТЫРЕ КАТЕГОРИИ ВНИМАНИЯ:
//   warning   — у объекта непустой `warnings[]`: агент остановился и сказал владельцу.
//   unbuilt   — объект ВЫВЕДЕН на страницу, но ещё в разработке (видимые узлы, присутствующие вкладки/сущности).
//   ready     — набор кейсов ПОДТВЕРЖДЁН (подпись совпала с `reviewedSignature`): можно запускать разработку.
//   new-case  — пользовательский кейс со статусом `new`: заявка, которую ещё не начали.

/** Плоский список всех узлов из трёх групп графа. */
function allNodes(nodes: NoticesCore["graph"]["nodes"]): CoreNode[] {
  return [
    ...(nodes.groups.input?.nodes ?? []),
    ...(nodes.groups.middle?.nodes ?? []),
    ...(nodes.groups.output?.nodes ?? []),
  ];
}

// ПОДПИСЬ НАБОРА КЕЙСОВ — БАЙТ-В-БАЙТ с `_shared-v2/components/use-cases/client/signature.ts` (панель пишет
// подпись подтверждённого набора в ядро, деривация читает и считает ТАК ЖЕ — иначе «подтверждено» не совпадёт).
function useCasesSignature(cases: { cuid: string; title: string; text: string }[]): string {
  const body = cases.map((c) => `${c.cuid}␟${c.title}␟${c.text}`).join("␞");
  let h = 2166136261; // FNV-1a 32-бит
  for (let i = 0; i < body.length; i++) {
    h ^= body.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Собрать все поводы внимания из ядра. Порядок: предупреждения → недоделанное → готовность → новые кейсы. */
export function collectNotices(core: NoticesCore): Notice[] {
  const warnings: Notice[] = [];
  const unbuilt: Notice[] = [];
  const newCases: Notice[] = [];

  const nodes = allNodes(core.graph.nodes);

  for (const node of nodes) {
    for (const w of node.warnings) warnings.push({ category: "warning", scope: "node", name: node.name, text: w.text });
  }
  for (const tab of core.components.tabs) {
    for (const w of tab.warnings) warnings.push({ category: "warning", scope: "tab", name: tab.name, text: w.text });
    for (const entity of coreEntitiesOf(tab)) {
      for (const w of entity.warnings) warnings.push({ category: "warning", scope: "entity", name: entity.name, text: w.text });
    }
  }
  for (const w of core.useCases.warnings) {
    warnings.push({ category: "warning", scope: "use-cases", name: "use-cases", text: w.text });
  }

  // ОТВЕТ ВЛАДЕЛЬЦА НА ПРЕДУПРЕЖДЕНИЕ — отдельный повод (требование владельца 2026-07-24). Когда владелец
  // отвечает агенту в Центре проблем, предупреждение СНИМАЕТСЯ, а его ответ ложится в сырую инструкцию
  // объекта с маркером. Полоса обязана это показать: иначе повод «предупреждение» просто исчезает, и
  // выглядит так, будто вопрос пропал сам. Признак выводится ИЗ ЯДРА (маркер в `info.crudUser`), а не
  // хранится отдельным полем — второго источника истины о том же факте быть не должно.
  const answered: Notice[] = [];
  const isAnswer = (info?: { crudUser?: string }) => Boolean(info?.crudUser?.startsWith(ANSWER_MARKER));

  for (const node of nodes) {
    if (isAnswer(node.info)) { answered.push({ category: "answered", scope: "node", name: node.name }); continue; }
    if (node.state === "visible" && node.status === "in-development") {
      unbuilt.push({ category: "unbuilt", scope: "node", name: node.name });
    }
  }
  for (const tab of core.components.tabs) {
    if (tab.presence === "absent") continue;
    if (isAnswer(tab.info)) answered.push({ category: "answered", scope: "tab", name: tab.name });
    else if (tab.status === "in-development") unbuilt.push({ category: "unbuilt", scope: "tab", name: tab.name });
    for (const entity of coreEntitiesOf(tab)) {
      if (isAnswer(entity.info)) answered.push({ category: "answered", scope: "entity", name: entity.name });
      else if (entity.status === "in-development") unbuilt.push({ category: "unbuilt", scope: "entity", name: entity.name });
    }
  }

  for (const useCase of core.useCases.cases) {
    if (useCase.status === "new") {
      newCases.push({ category: "new-case", scope: "case", name: String(useCase.number), text: useCase.text });
    }
  }

  const ready: Notice[] = [];
  if (
    core.useCases.cases.length > 0 &&
    core.useCases.reviewedSignature &&
    core.useCases.reviewedSignature === useCasesSignature(core.useCases.cases)
  ) {
    ready.push({ category: "ready", scope: "use-cases", name: "use-cases" });
  }

  // Порядок: предупреждения → ОТВЕТЫ владельца (он их ждёт больше всего) → недоделанное → готовность → кейсы.
  return [...warnings, ...answered, ...unbuilt, ...ready, ...newCases];
}

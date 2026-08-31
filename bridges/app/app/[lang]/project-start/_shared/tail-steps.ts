import { stepFiveStrings } from "./_step5";
import { stepSixStrings } from "./_step6";
import { stepSevenStrings } from "./_step7";
import { stepEightStrings, installPrompt } from "./_step8";
import { stepNineStrings, localVsPublic } from "./_step9";
import type { FlowMark } from "@/lib/launch-flow";

// ОБЩИЙ ХВОСТ ОБОИХ ПУТЕЙ — ПЯТЬ ШАГОВ, ОДНО ПЕРЕЧИСЛЕНИЕ (35-5, 2026-08-31).
//
// 🔒 РАЗНИЦА ПУТЕЙ КОНЧАЕТСЯ ТАМ, ГДЕ НАЧИНАЕТСЯ РАБОТА НА МАШИНЕ ЧЕЛОВЕКА.
// Первый путь ведёт его к пустому репозиторию, второй — к чужому проекту; но
// «поставить Claude Code · завести папку · открыть её · поставить зависимости ·
// увидеть проект на localhost:3000» одинаково для обоих. Это уже записано в
// `launch.shared.ts` как `COMMON_TAIL` — здесь то же знание про СЛОВА.
//
// 🔒 КОПИЯ РАЗОШЛАСЬ БЫ С ОРИГИНАЛОМ НА ПЕРВОЙ ЖЕ ПРАВКЕ ТЕКСТА, и это не
// опасение: тексты шагов пишет владелец, он правит их по одному, и правка ушла
// бы в тот путь, который он в ту минуту открыл. Второй продолжал бы показывать
// прежние слова, ничем этого не показывая.
//
// 🔒 СЛОВА СЮДА НЕ ПЕРЕПИСЫВАЛИСЬ, А ПЕРЕЕХАЛИ ФАЙЛАМИ (`git mv`): пять модулей
// `_step5…_step9` лежали в папке первого пути и теперь лежат здесь теми же
// байтами. Перенабрать их значило бы завести второй текст под видом переезда, и
// разница всплыла бы у владельца, а не у меня.
//
// 🔒 НОМЕР ШАГА ЗДЕСЬ НЕ ХРАНИТСЯ. У первого пути это шаги 5–9, у второго 8–12;
// зашитый номер сделал бы перечисление непереиспользуемым ровно там, где оно
// заводится ради переиспользования. Номер приходит от пути — он и знает свой
// порядок.

/** Что показывает шаг сверх обычной анатомии. Ничего лишнего — только отличия. */
export type TailStep = {
  /** Отметка человека, закрывающая шаг. Своя у каждого, заимствований нет. */
  mark: FlowMark;
  /** Слова шага на языке страницы. */
  strings: (lang: string) => TailStrings;
  /** Снимок чужого экрана, если для шага он есть. */
  shot?: { src: string };
  /** Внешняя ссылка-действие: адрес общий, подпись приходит из слов. */
  linkHref?: string;
  /** Кнопка выдачи окружения — только у шага зависимостей. */
  grabHref?: string;
  /** Есть ли блок с подсказкой для агента. */
  hasPrompt?: boolean;
  /**
   * Голубая подсказка считается от адреса сервера, а не берётся строкой.
   *
   * 🔒 Только у шага «проект на localhost»: там объясняется разница между тем,
   * что видит человек, и тем, что видят люди, — а для этого нужен живой адрес.
   */
  infoFromSite?: (lang: string, siteUrl: string | null) => string;
  /**
   * Подсказка агенту считается от АДРЕСА РЕПОЗИТОРИЯ этого пути (75-9).
   *
   * 🔒 Только у шага зависимостей: он единственный, где агенту надо назвать, ЧТО
   * клонировать. Остальным адрес не передаётся вовсе.
   */
  promptFromRepo?: (lang: string, repoUrl: string) => string;
};

/**
 * Слова общего шага. Поля, которых у конкретного шага нет, необязательны —
 * закон анатомии: любую часть можно НЕ ДАТЬ.
 */
export type TailStrings = {
  pageTitle: string;
  pageHint: string;
  badge: string;
  title: string;
  lead: string;
  info?: string;
  important: string;
  danger?: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;
  linkLabel?: string;
  shotAlt?: string;
  shotCaption?: string;
  grabLabel?: string;
  grabToastTitle?: string;
  grabToastBody?: string;
  grabFailure?: string;
  promptLead?: string;
  promptText?: string;
  copyLabel?: string;
  copiedLabel?: string;
  copyToast?: string;
  copyFailed?: string;
  checkLabel: string;
  cta: string;
  busy: string;
  successTitle: string;
  successHint: string;
  failureTitle: string;
  failureFix: string;
  goPrev: string;
  goNext: string;
};

/**
 * Пять общих шагов В ПОРЯДКЕ ПРОХОЖДЕНИЯ. Единственное перечисление; путь
 * прикладывает к нему свои номера.
 */
export const TAIL_STEPS: readonly TailStep[] = [
  {
    mark: "claude-code",
    strings: stepFiveStrings,
    shot: { src: "/images/launch/step-5-claude-download.png" },
    linkHref: "https://claude.com/download",
  },
  { mark: "folder", strings: stepSixStrings },
  {
    mark: "open-folder",
    strings: stepSevenStrings,
    shot: { src: "/images/launch/step-7-open-folder.png" },
  },
  {
    mark: "local-run",
    strings: stepEightStrings,
    shot: { src: "/images/launch/step-8-install-deps.png" },
    grabHref: "/api/config/env-export",
    hasPrompt: true,
    promptFromRepo: installPrompt,
  },
  {
    mark: "project-seen",
    strings: stepNineStrings,
    shot: { src: "/images/launch/step-9-localhost-running.png" },
    hasPrompt: true,
    infoFromSite: localVsPublic,
  },
];

/** Сколько шагов в общем хвосте. Считается, а не пишется числом. */
export const TAIL_LENGTH = TAIL_STEPS.length;

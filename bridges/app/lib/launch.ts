// Мастер запуска проекта — СОСТОЯНИЕ (шаг 25). Серверный модуль.
//
// 🔒 СОСТОЯНИЕ ВЫВОДИТСЯ ИЗ ФАКТОВ, А НЕ ХРАНИТСЯ ОТДЕЛЬНО. Отдельный «прогресс
// мастера» — второй источник правды рядом с настоящим: репозиторий подключён, а
// мастер считает, что нет; связь оборвалась, а зелёная галочка стоит. Поэтому
// машинные шаги читают ТЕ ЖЕ ключи, которыми живут страница GitHub и подвал
// панели (`USER_GITHUB_REPO_URL`, `USER_GITHUB_VERIFIED_AT`), а человеческие —
// снимаемые отметки в том же файле, у того же единственного писателя.
//
// 🔒 ШАГ «CLAUDE CODE» ДЕЛИТ ОТМЕТКУ С «ИНСТРУМЕНТАМИ РАЗРАБОТКИ». Программа на
// машине человека одна, и вторая галочка про неё же разошлась бы с первой на
// первом же снятии — а расходящиеся галочки перестают читать обе.

import { hasMark, getValue, setMark, setValue, clearPrefix, markKey } from "@/lib/dev-tools-marks";
import {
  launchSteps, isStartMode, ALL_LAUNCH_STEP_IDS,
  type StartMode, type LaunchStepId, type LaunchStepKind,
} from "@/lib/launch.shared";

export const START_MODE_KEY = "USER_START_MODE";

/** Префикс всех собственных отметок мастера. По нему же идёт сброс. */
export const LAUNCH_PREFIX = "USER_LAUNCH_";

/**
 * Где живёт отметка шага.
 *
 * Три шага одалживают ключи у соседей, и каждый случай осознанный:
 * `key` — это и есть подтверждение GitHub, второй записи о том же не бывает;
 * `claude-code` — отметка о программе на машине, общая с «Инструментами разработки»;
 * остальные владеют своим ключом `USER_LAUNCH_<ID>_AT`.
 */
const BORROWED: Partial<Record<LaunchStepId, string>> = {
  key: "USER_GITHUB_VERIFIED_AT",
  "claude-code": markKey("claude-code"),
};

export function launchMarkKey(id: LaunchStepId): string {
  return BORROWED[id] ?? `${LAUNCH_PREFIX}${id.toUpperCase().replace(/-/g, "_")}_AT`;
}

/**
 * Адрес репозитория, который ПРОВЕРЕН, — и он же адрес, который записан.
 *
 * 🔒 ПОЧЕМУ ОДИН КЛЮЧ, А НЕ ДВА. Держать отдельно «что введено» и «что проверено»
 * значит однажды показать зелёную галочку проверки для другого адреса: человек
 * поправил строку, а отметка осталась от прежней. Дверь проверки пишет ОБА
 * значения одной операцией — `USER_GITHUB_REPO_URL` и `USER_LAUNCH_REPO_AT`, —
 * поэтому разойтись им негде.
 */
export const REPO_URL_KEY = "USER_GITHUB_REPO_URL";

export type LaunchStep = {
  id: LaunchStepId;
  kind: LaunchStepKind;
  done: boolean;
  /** Человеческий шаг можно снять; машинный закрывается только проверкой. */
  markKey: string;
};

export type LaunchState = {
  /** `null` — дверь ещё не выбрана, страница показывает экран выбора. */
  mode: StartMode | null;
  steps: LaunchStep[];
  total: number;
  /**
   * Номер первого НЕзакрытого шага, 0-based. Равен `total`, когда пройдено всё.
   * Правило раскрытия: видны шаги `0..current` включительно, дальше ничего.
   */
  current: number;
  /** Адрес репозитория — нужен и шагам, и подстановке в копируемые инструкции. */
  repoUrl: string;
};

function stepDone(id: LaunchStepId): boolean {
  // Первый шаг закрыт только когда адрес и записан, и подтверждён: отметка без
  // адреса — это память о репозитории, которого в настройках больше нет.
  if (id === "repo") return hasMark(launchMarkKey("repo")) && getValue(REPO_URL_KEY) !== "";
  return hasMark(launchMarkKey(id));
}

export function readStartMode(): StartMode | null {
  const raw = getValue(START_MODE_KEY);
  return isStartMode(raw) ? raw : null;
}

export function readLaunch(): LaunchState {
  const mode = readStartMode();
  const list = mode ? launchSteps(mode) : [];
  const steps: LaunchStep[] = list.map((s) => ({
    id: s.id,
    kind: s.kind,
    done: stepDone(s.id),
    markKey: launchMarkKey(s.id),
  }));

  // Первый незакрытый — и НЕ «первый незакрытый после последнего закрытого».
  // Человек вправе снять галочку с шага 5, пройдя шаг 9; тогда мастер честно
  // возвращает его на пятый, а не делает вид, что снятая отметка ничего не значит.
  const firstOpen = steps.findIndex((s) => !s.done);

  return {
    mode,
    steps,
    total: steps.length,
    current: firstOpen === -1 ? steps.length : firstOpen,
    repoUrl: getValue(REPO_URL_KEY),
  };
}

export function writeStartMode(mode: StartMode | null): void {
  setValue(START_MODE_KEY, mode);
}

export function setLaunchStep(id: LaunchStepId, done: boolean): void {
  setMark(launchMarkKey(id), done);
}

/**
 * Сброс мастера (шаг 25, решение владельца 2026-08-26).
 *
 * 🔒 ЧТО СБРОС НЕ ТРОГАЕТ И ПОЧЕМУ. `DEV_CLAUDE_CODE_INSTALLED_AT` — факт о
 * машине человека, общий с «Инструментами разработки». Начать мастер заново не
 * означает удалить программу с ноутбука, и гасить чужую галочку у нас нет
 * оснований.
 *
 * `withGithub` стирает и саму связь — адрес, ключ, подтверждение. Это отдельная
 * дверь, а не часть обычного сброса: пройти мастер заново хотят часто, а остаться
 * без репозитория — почти никогда.
 */
export function resetLaunch(withGithub: boolean): { cleared: string[] } {
  const cleared: string[] = [];
  cleared.push(...clearPrefix(LAUNCH_PREFIX));
  if (getValue(START_MODE_KEY)) {
    setValue(START_MODE_KEY, null);
    cleared.push(START_MODE_KEY);
  }
  if (withGithub) {
    for (const key of ["USER_GITHUB_REPO_URL", "USER_GITHUB_ACCESS_TOKEN", "USER_GITHUB_VERIFIED_AT"]) {
      if (getValue(key)) {
        setValue(key, null);
        cleared.push(key);
      }
    }
  }
  return { cleared };
}

export { ALL_LAUNCH_STEP_IDS };

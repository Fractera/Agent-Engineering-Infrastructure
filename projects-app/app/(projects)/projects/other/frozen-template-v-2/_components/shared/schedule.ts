import type { Automation, Entity } from "../../_data/automation.schema";

// ОБЪЯВЛЕНИЕ РАСПИСАНИЯ — единственное место, где читается крон из ядра. Обе половины раздела и
// календарь (ему нужен период проверки) берут его отсюда: одно объявление — один читатель.
//
// ЧТО ТАКОЕ КРОН В ЭТОЙ ПАПКЕ. Это не серверный планировщик, а ПЕРИОД, по которому автоматизация
// оглядывается на саму себя: раз в столько-то минут проверить, не наступило ли что-нибудь. Серверный
// крон платформы не может показать тост — тост рисует браузер, поэтому период объявлен в ядре, а тикают
// по нему страницы. Тик ВЫРОВНЕН по стенным часам (`now % period`), поэтому у всех вкладок и на обеих
// поверхностях «следующее событие крона» одно и то же, а не своё у каждой открытой страницы.

export type CronSettings = { enabled: boolean; everyMinutes: number };

/** Период по умолчанию, если раздел есть, а число не объявлено. Пять минут — умолчание владельца. */
export const DEFAULT_EVERY_MINUTES = 5;

/** Разрешённые периоды: их же предлагает настройка раздела. */
export const PERIODS = [1, 5, 10, 15, 30, 60] as const;

export function scheduleOf(entity: Entity): CronSettings {
  const data = entity.data as Record<string, unknown>;
  const raw = Number(data.everyMinutes);
  return {
    enabled: data.enabled !== false, // объявлен раздел — считаем включённым, пока не сказано обратное
    everyMinutes: Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_EVERY_MINUTES,
  };
}

/**
 * КРОН ВСЕЙ АВТОМАТИЗАЦИИ — или `null`, если его НЕТ: раздел выключен (`presence: "absent"`) либо в нём
 * нет ни одной сущности. Разница между «крона нет» и «крон выключен» существенна и не схлопывается:
 * по закону владельца проверять календарь некому в ОБОИХ случаях, но сказать об этом нужно по-разному.
 */
export function cronOf(components: Automation["components"]): CronSettings | null {
  const tab = components.tabs.find((t) => t.name === "cron");
  if (!tab || tab.presence === "absent" || tab.entities.length === 0) return null;
  return scheduleOf(tab.entities[0]);
}

/** Секунд до конца текущего периода. Выровнено по стенным часам — см. закон выше. */
export function secondsLeft(everyMinutes: number, nowMs: number = Date.now()): number {
  const period = Math.max(1, everyMinutes) * 60;
  const rest = period - (Math.floor(nowMs / 1000) % period);
  return rest === 0 ? period : rest;
}

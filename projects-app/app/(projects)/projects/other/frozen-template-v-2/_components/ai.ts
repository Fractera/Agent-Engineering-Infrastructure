import type { Passport } from "../_data/automation.schema";

// ПРОВАЙДЕР И МОДЕЛЬ ИИ — единственное место, где читается выбор из ядра, и единственный список
// доступных моделей. Меню показывает выбранное, настройки его меняют — оба берут отсюда.
//
// ГДЕ ХРАНИТСЯ ВЫБОР: в ПАСПОРТЕ автоматизации (`passport.ai`), а не в переменных окружения. Ключ
// провайдера — секрет и общий на весь проект (окружение); а вот КАКОЙ моделью работает ЭТА
// автоматизация — её собственное свойство, как тип или жизненный цикл. Две автоматизации на одном
// ключе вправе думать разными моделями.
//
// ЧТО ЗДЕСЬ НЕ ЖИВЁТ: ключи. Они идут через каталог `channels.ts` и дверь `api/env`, как у любого
// другого сервиса — второго механизма ввода секретов в продукте нет.

export type ProviderKey = "anthropic" | "openai";

export type Model = { id: string; label: string };

export type Provider = {
  key: ProviderKey;
  label: string;
  /** Ключ окружения — тот же механизм, что у каналов; описание лежит в каталоге `channels.ts`. */
  envKey: string;
  /** Модели провайдера. Первая — умолчание, если владелец не выбрал ничего. */
  models: Model[];
};

// СПИСОК МОДЕЛЕЙ ЗАФИКСИРОВАН В КОДЕ, а не запрашивается у провайдера. Живой список красив, но
// требует ключа, чтобы его получить, — а выбрать модель владелец должен ДО того, как введёт ключ.
// Список короткий и правится одной строкой; устаревшая модель здесь честнее пустого выпадающего
// списка, который ничего не объясняет.
export const PROVIDERS: Provider[] = [
  {
    key: "anthropic",
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
  },
  {
    key: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
    ],
  },
];

export const providerOf = (key: string): Provider => PROVIDERS.find((p) => p.key === key) ?? PROVIDERS[0];

/**
 * Что выбрано у ЭТОЙ автоматизации.
 *
 * Модель ищется в каталоге по id, но НЕ обязана в нём найтись: ядро хранит выбор строкой, а каталог
 * меняется вместе с миром. Незнакомый id показывается как есть — честнее, чем молча подменить его
 * первой моделью списка и оставить владельца в уверенности, что работает не то, что он выбрал.
 */
export function aiOf(passport: Passport): { provider: Provider; model: Model } {
  const provider = providerOf(passport.ai.provider);
  const model = provider.models.find((m) => m.id === passport.ai.model) ?? { id: passport.ai.model, label: passport.ai.model };
  return { provider, model };
}

// Соцсети панели: тип записи, разбор наследства и сборка адреса (шаг 523).
//
// 🔒 ПОЧЕМУ ЗДЕСЬ КОПИЯ ПРАВИЛ, А НЕ ИМПОРТ. Правила живут в шаблоне слота
// (`fractera-next-starter/config/app-config.defaults.ts`) — это ДРУГОЙ
// репозиторий, панель его кода не видит и видеть не должна: слот сменный.
// Значит копия неизбежна, и вопрос лишь в том, какая копия не сгниёт.
//
// Копируется РОВНО ДВЕ вещи, и обе неподвижны:
//   • сборка адреса `socialHref` — три строки, менять их нечем;
//   • таблица четырёх исторических ключей — она ЗАМОРОЖЕНА навсегда: пятого
//     ключа в `seo.social` не появится никогда, потому что ради этого шаг 523 и
//     затевался. Замороженная таблица переноса — не двойной источник правды,
//     а разовый мост из старой формы в новую.
//
// Всё остальное правило сборки приезжает В САМОЙ ЗАПИСИ (`urlTemplate`), поэтому
// вторая копия «какой сети какой адрес» здесь не заводится.

/** Запись соцсети — тот же контракт, что у слота (`SocialLink`). */
export type SocialLink = {
  id: string;
  name: string;
  urlTemplate: string;
  value: string;
  icon?: string;
};

/** Четыре исторических ключа `seo.social`. */
export type LegacySocial = {
  twitter?: string;
  github?: string;
  linkedin?: string;
  facebook?: string;
};

/**
 * Готовый адрес записи. ОБЯЗАН совпадать с `socialHref` слота дословно: здесь он
 * рисует предпросмотр, а по нему владелец решает, та ли это ссылка.
 */
export function socialHref(link: SocialLink): string {
  const v = (link.value ?? "").trim().replace(/^@/, "");
  if (!link.urlTemplate?.includes("{value}")) return link.urlTemplate ?? "";
  return link.urlTemplate.replace("{value}", encodeURIComponent(v));
}

/**
 * Наследство → записи.
 *
 * 🔒 СТРАННОСТЬ LINKEDIN ПЕРЕНОСИТСЯ ДОСЛОВНО. Здесь `/company/`, хотя для личного
 * профиля это неверно. Исправить задним числом нельзя: на работающих серверах в
 * конфиге лежит значение, собранное ПОД ЭТО правило, и смена шаблона молча увела
 * бы живую ссылку в другое место. Новые записи получают правило от модели и этой
 * странности не наследуют.
 */
export function fromLegacy(legacy: LegacySocial | undefined): SocialLink[] {
  if (!legacy) return [];
  const out: SocialLink[] = [];
  const add = (id: string, name: string, value: string | undefined, template: string) => {
    if (!value) return;
    out.push({ id, name, value, urlTemplate: value.startsWith("http") ? value : template });
  };
  add("github", "GitHub", legacy.github, "https://github.com/{value}");
  add("twitter", "X", legacy.twitter, "https://twitter.com/{value}");
  add("linkedin", "LinkedIn", legacy.linkedin, "https://linkedin.com/company/{value}");
  add("facebook", "Facebook", legacy.facebook, "https://facebook.com/{value}");
  return out;
}

/**
 * Что показывать в конструкторе.
 *
 * 🔒 «ВЕТКИ НЕТ» И «ВЕТКА ПУСТА» — РАЗНЫЕ СОСТОЯНИЯ, и это тот же закон, по
 * которому живут меню подвала. Нет ветки — владелец конструктора не открывал,
 * работает наследство. Пустой массив — он убрал все записи руками, и воскрешать
 * четыре старые ссылки против его решения нельзя.
 */
export function currentLinks(links: SocialLink[] | undefined, legacy: LegacySocial | undefined): SocialLink[] {
  return Array.isArray(links) ? links : fromLegacy(legacy);
}

/** Свободный идентификатор записи: слаг занят — добавляем номер. */
export function freeId(base: string, taken: string[]): string {
  const slug = (base || "social").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "social";
  if (!taken.includes(slug)) return slug;
  for (let i = 2; i < 100; i++) if (!taken.includes(`${slug}-${i}`)) return `${slug}-${i}`;
  return `${slug}-${Date.now()}`;
}

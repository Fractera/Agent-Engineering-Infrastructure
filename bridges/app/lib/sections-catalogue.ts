import "server-only";
import fs from "fs";
import path from "path";

// Каталог секций гостевого приложения — читается ИЗ СЛОТА, а не хранится здесь.
//
// 🔒 ПОЧЕМУ ТАК, А НЕ КОПИЕЙ В ПАНЕЛИ. Панель и приложение — разные приложения:
// код рендереров панель импортировать не может физически. Соблазн скопировать
// каталог сюда велик и стоил бы дёшево ровно один день: на следующий в приложении
// появился бы вид, которого копия не знает, и панель уверенно показывала бы
// владельцу каталог, которого в его проекте больше нет.
//
// Поэтому источник один — `sections/SECTIONS.json` в слоте. Его порождает сборка
// приложения (`npm run build:blocks-map`), а свежесть стережёт `check:blocks-map` в
// его `prebuild`: разойтись с реестром файл не может.
//
// 🔒 ФАЙЛА НЕТ — ЭТО НЕ ПОЛОМКА ПАНЕЛИ. Слот в покое пуст, гостевое приложение
// может быть чужим и вовсе не иметь слоя секций. Тогда страница честно говорит
// «каталога нет», а не падает и не рисует пустую таблицу, притворяясь работающей.

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const DESCRIPTIONS_PATH =
  process.env.SECTIONS_DESCRIPTIONS_PATH ?? path.join(APP_DIR, "sections", "descriptions.json");

const CATALOGUE_PATH =
  process.env.SECTIONS_CATALOGUE_PATH ?? path.join(APP_DIR, "sections", "SECTIONS.json");

/** Один из одиннадцати типов: назначение секции, а не её устройство. */
export type SectionType = {
  id: string;
  order: number;
  /**
   * Двуязычно — и это уточнение владельца 2026-08-22, отменяющее прежнее «каталог
   * секций не переводится». Не переводятся САМИ БЛОКИ и их превью: имя вида, поля,
   * заметки для агента, лорем. Страница о них — обычная страница панели и говорит
   * на языке читателя.
   */
  title: Record<string, string>;
  purpose: Record<string, string>;
  variants: Record<string, string>;
};

/** Один вид каталога — то, что реально нарисует приложение. */
export type SectionKind = {
  /** Числовой номер вида — чтобы называть секцию без опечаток («0002»). */
  id: string | null;
  kind: string;
  type: string;
  /** Как панель рисует превью: код рендерера ей недоступен, схему она знает. */
  shape: string;
  fields: string;
  title: string | null;
  /** Проза карточки: что читает агент, выбирая эту секцию. */
  description: string | null;
  hasCard: boolean;
  /**
   * Описание, написанное ВЛАДЕЛЬЦЕМ в панели. Отдельно от `description` (заметок
   * агента из карточки): два голоса, а не две копии — и агент читает оба.
   */
  ownerNote: string | null;
  /** Где вид стоит сегодня — считается обходом содержимого, не ведётся руками. */
  usedOn: { page: string; order: number; times: number }[];
};

export type SectionsCatalogue = {
  ok: boolean;
  types: SectionType[];
  kinds: SectionKind[];
};

/** Строка на языке панели; нет перевода — английский, а не пусто. */
export function pick(value: Record<string, string> | undefined, lang: string): string {
  if (!value) return "";
  return value[lang] ?? value.en ?? Object.values(value)[0] ?? "";
}

/**
 * Слова владельца по видам — свой файл, не порождаемый.
 *
 * 🔒 ОТДЕЛЬНО ОТ КАТАЛОГА НАМЕРЕННО. `SECTIONS.json` порождается сборкой и
 * стережётся гейтом: правка руками роняет следующую сборку приложения. Панель
 * пишет сюда, а каталог остаётся неприкосновенным.
 */
function readOwnerNotes(): Record<string, string> {
  try {
    const raw = JSON.parse(fs.readFileSync(DESCRIPTIONS_PATH, "utf8"));
    return raw && typeof raw === "object" ? (raw as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function readSectionsCatalogue(): SectionsCatalogue {
  try {
    const raw = JSON.parse(fs.readFileSync(CATALOGUE_PATH, "utf8")) as Partial<SectionsCatalogue>;
    const types = Array.isArray(raw.types) ? raw.types : [];
    const rawKinds = Array.isArray(raw.kinds) ? raw.kinds : [];
    // Пустой файл — то же, что отсутствующий: показывать нечего, и врать об этом
    // нельзя. Порядок типов задан данными (`order`), а не порядком в файле.
    if (!types.length) return { ok: false, types: [], kinds: [] };

    // Слова владельца накладываются на чтении, а не вплавляются в каталог: правка
    // видна на следующей загрузке страницы, без пересборки приложения.
    const notes = readOwnerNotes();
    const kinds = rawKinds.map(k => ({ ...k, ownerNote: notes[k.kind] ?? null }));

    return { ok: true, types: [...types].sort((a, b) => a.order - b.order), kinds };
  } catch {
    return { ok: false, types: [], kinds: [] };
  }
}

/** Виды этого типа в порядке каталога — он же порядок реестра приложения. */
export function kindsOfType(catalogue: SectionsCatalogue, typeId: string): SectionKind[] {
  return catalogue.kinds.filter(k => k.type === typeId);
}

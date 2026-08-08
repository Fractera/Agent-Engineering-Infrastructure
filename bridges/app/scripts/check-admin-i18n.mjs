// Машинная приёмка языков панели управления (шаг 501).
// Запуск: npm run check:i18n
//
// Зачем. Вопрос «есть ли английский и русский у ВСЕХ страниц» нельзя проверять
// глазами: страниц 25, у каждой заголовок и подсказка, плюс общие секции. При 82
// языках это 82 партии от внешней модели, и каждую надо принимать одинаково
// строго. Этот скрипт и есть та приёмка — он же станет воротами для будущих
// партий (задача 13 шага 500 требует машинной проверки).
//
// Что проверяется:
//   1. Каждый включённый язык присутствует в словаре.
//   2. Набор ключей каждого языка совпадает с английским — ни лишних, ни
//      потерянных (сравнение по плоским путям, вложенность любой глубины).
//   3. Ни одного пустого значения.
//   4. Плейсхолдеры {…} стоят там же, где в английском.
//   5. У КАЖДОЙ страницы из lib/admin-nav.ts есть title и hint на каждом языке.
//   6. Подозрение на непереведённое: значение дословно равно английскому.
//      Это ПРЕДУПРЕЖДЕНИЕ, не ошибка — часть строк совпадает законно
//      (`OpenAI`, `GitHub`, `PM2`, коды языков).
//   7. Случайные иероглифы CJK в некитайских языках (правило 4б).
//
// Выход: код 1 при любой ОШИБКЕ, 0 при одних предупреждениях.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DICT = path.join(ROOT, "lib/i18n/admin-translations.json");
const NAV = path.join(ROOT, "lib/admin-nav.ts");
const LANG_CONFIG = path.join(ROOT, "config/translations/admin-languages.ts");
const DEFAULT_LANG = "en";

const errors = [];
const warnings = [];

const dict = JSON.parse(fs.readFileSync(DICT, "utf8"));

// Списки маршрутов и языков читаются из тех же файлов, что использует само
// приложение, — иначе проверка проверяла бы свою копию правды.
const slugs = [...fs.readFileSync(NAV, "utf8").matchAll(/\{ slug: "([a-z-]+)",/g)].map((m) => m[1]);
const langsSource = fs.readFileSync(LANG_CONFIG, "utf8");
const buildLangs = [
  ...(langsSource.match(/ADMIN_BUILD_LANGUAGES[^=]*=\s*\[([^\]]*)\]/s)?.[1] ?? "").matchAll(/"([a-z-]+)"/g),
].map((m) => m[1]);

if (!slugs.length) errors.push("не удалось прочитать список маршрутов из lib/admin-nav.ts");
if (!buildLangs.length) errors.push("не удалось прочитать ADMIN_BUILD_LANGUAGES из config/translations/admin-languages.ts");

// Плоские пути вида "pages.users.title" — так наборы ключей сравнимы независимо
// от глубины вложенности.
function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

const placeholders = (s) => (String(s).match(/\{\w+\}/g) ?? []).sort().join(",");
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;
const CJK_LANGS = new Set(["zh", "ja", "ko"]);

const base = flatten(dict[DEFAULT_LANG] ?? {});
if (!Object.keys(base).length) errors.push(`язык по умолчанию "${DEFAULT_LANG}" отсутствует или пуст`);

// 5 — страницы. Проверяется по английскому: он задаёт форму для остальных.
for (const slug of slugs) {
  for (const field of ["title", "hint"]) {
    if (!base[`pages.${slug}.${field}`]) {
      errors.push(`страница "${slug}": нет ключа pages.${slug}.${field} в языке по умолчанию`);
    }
  }
}

for (const lang of buildLangs) {
  const entry = dict[lang];
  if (!entry) {
    errors.push(`язык "${lang}" включён в сборку, но его нет в словаре`);
    continue;
  }
  const flat = flatten(entry);

  for (const key of Object.keys(base)) {
    if (!(key in flat)) {
      errors.push(`${lang}: потерян ключ "${key}"`);
      continue;
    }
    const value = flat[key];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${lang}: пустое значение "${key}"`);
      continue;
    }
    if (placeholders(value) !== placeholders(base[key])) {
      errors.push(`${lang}: плейсхолдеры не совпадают в "${key}" (${placeholders(base[key])} → ${placeholders(value)})`);
    }
    if (lang !== DEFAULT_LANG && value === base[key]) {
      warnings.push(`${lang}: значение "${key}" дословно равно английскому — проверьте, перевод ли это`);
    }
    if (!CJK_LANGS.has(lang) && CJK.test(value)) {
      errors.push(`${lang}: иероглифы CJK в "${key}" — случайная вставка (правило 4б)`);
    }
  }

  for (const key of Object.keys(flat)) {
    if (!(key in base)) errors.push(`${lang}: лишний ключ "${key}", которого нет в английском`);
  }

  // 25 страниц × 2 поля — та проверка, ради которой скрипт и написан.
  const missingPages = slugs.filter((s) => !flat[`pages.${s}.title`] || !flat[`pages.${s}.hint`]);
  if (missingPages.length) {
    errors.push(`${lang}: страницы без заголовка или подсказки: ${missingPages.join(", ")}`);
  }
}

// Длинные документы: у каждого языка либо свой файл, либо честный английский.
const contentDir = path.join(ROOT, "_content");
const documents = fs.existsSync(contentDir)
  ? [...new Set(fs.readdirSync(contentDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.[a-z]{2}\.md$/, "").replace(/\.md$/, "")))]
  : [];
for (const doc of documents) {
  for (const lang of buildLangs) {
    if (lang === DEFAULT_LANG) continue;
    const own = fs.existsSync(path.join(contentDir, `${doc}.${lang}.md`));
    if (!own) warnings.push(`документ "${doc}" не переведён на "${lang}" — покажется английский (положить _content/${doc}.${lang}.md)`);
  }
}

const langCount = buildLangs.length;
const keyCount = Object.keys(base).length;
console.log(`языки: ${buildLangs.join(", ")} (${langCount}) · страниц: ${slugs.length} · ключей на язык: ${keyCount} · документов: ${documents.length}`);
for (const w of warnings) console.log(`  предупреждение: ${w}`);
for (const e of errors) console.log(`  ОШИБКА: ${e}`);

if (errors.length) {
  console.log(`\n===I18N_FAILED=== ошибок: ${errors.length}`);
  process.exit(1);
}
console.log(`\n===I18N_OK=== ошибок нет, предупреждений: ${warnings.length}`);

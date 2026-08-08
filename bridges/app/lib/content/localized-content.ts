// Чтение текстового содержимого раздела НА ЯЗЫК (шаг 501).
//
// Зачем отдельный механизм рядом со словарём. Словарь держит короткие строки —
// заголовки, подписи, подсказки. Длинные документы (руководства, справки,
// пояснения) в JSON-словарь не помещаются по природе: их правят как текст, а не
// как ключи. Поэтому они лежат файлами в `_content/`, а этот модуль решает,
// какой файл отдать.
//
// ПРАВИЛО ТО ЖЕ, ЧТО У СЛОВАРЯ: нет перевода — отдаём английский. Порядок поиска
// для языка `ru` и имени `how-to-build`:
//   1. `_content/how-to-build.ru.md`   ← перевод, если он есть
//   2. `_content/how-to-build.en.md`   ← явный английский, если файлы разложены по языкам
//   3. `_content/how-to-build.md`      ← исторический файл без языка в имени
// Первый найденный побеждает. Поэтому положить перевод = положить один файл;
// ни кода, ни регистрации, ни моего участия это не требует.
//
// Возвращаем ещё и `lang` — язык, который РЕАЛЬНО отдан. Страница вправе сказать
// человеку «этот текст пока на английском», а не делать вид, что всё переведено.

import fs from "node:fs";
import path from "node:path";
import { DEFAULT_ADMIN_LANG } from "@/lib/i18n/admin-strings";

// `bridges/app` — рабочий каталог процесса, `_content` лежит внутри, поэтому
// файлы путешествуют вместе с репозиторием, как любой исходник.
const CONTENT_DIR = path.join(process.cwd(), "_content");

export type LocalizedContent =
  | { ok: true; text: string; lang: string; isFallback: boolean; file: string }
  | { ok: false; tried: string[] };

export function readLocalizedContent(name: string, lang: string): LocalizedContent {
  const candidates: { file: string; lang: string }[] = [
    { file: `${name}.${lang}.md`, lang },
    { file: `${name}.${DEFAULT_ADMIN_LANG}.md`, lang: DEFAULT_ADMIN_LANG },
    { file: `${name}.md`, lang: DEFAULT_ADMIN_LANG },
  ];

  const tried: string[] = [];
  for (const candidate of candidates) {
    const full = path.join(CONTENT_DIR, candidate.file);
    tried.push(full);
    try {
      const text = fs.readFileSync(full, "utf-8");
      return {
        ok: true,
        text,
        lang: candidate.lang,
        isFallback: candidate.lang !== lang,
        file: candidate.file,
      };
    } catch {
      // следующий кандидат
    }
  }

  // Громко, а не пусто: пропавший текст — дефект развёртывания, и чистая
  // страница спрятала бы его. Показываем ВСЕ проверенные пути: без них
  // непонятно, где искать.
  return { ok: false, tried };
}

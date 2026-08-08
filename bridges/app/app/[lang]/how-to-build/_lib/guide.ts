// Серверная логика раздела «Как построить этот проект» (шаг 501, Ф2).
//
// ЧТО ИЗМЕНИЛОСЬ ПРОТИВ СТАРОЙ ПАНЕЛИ. Там клиентский компонент дожидался
// монтирования, запрашивал `/api/config/how-to-build`, показывал «Loading…» и
// только потом текст. Здесь файл читает сервер — тем же `fs`, но до отдачи
// страницы. Поэтому HTTP-запроса нет, состояния «загружается» нет, и текст
// приезжает уже внутри HTML: он виден и при выключенном JS.
//
// Язык выбирает общий механизм `readLocalizedContent`: `how-to-build.<lang>.md`,
// иначе английский. Перевод руководства = один новый файл в `_content/`, без
// правки кода.
//
// Маршрут `/api/config/how-to-build` НЕ удаляем — им пользуется замороженная
// старая панель. Он умрёт вместе с ней на переключении (Ф3).

import { readLocalizedContent } from "@/lib/content/localized-content";

const GUIDE_NAME = "how-to-build";

export type GuideResult =
  | { ok: true; markdown: string; isFallback: boolean }
  | { ok: false; tried: string[] };

export function readGuide(lang: string): GuideResult {
  const found = readLocalizedContent(GUIDE_NAME, lang);
  if (!found.ok) return { ok: false, tried: found.tried };
  return { ok: true, markdown: found.text, isFallback: found.isFallback };
}

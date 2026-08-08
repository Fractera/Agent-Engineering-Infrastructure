// Серверная логика раздела «Как построить этот проект» (шаг 501, Ф2).
//
// ЧТО ИЗМЕНИЛОСЬ ПРОТИВ СТАРОЙ ПАНЕЛИ. Там клиентский компонент дожидался
// монтирования, запрашивал `/api/config/how-to-build`, показывал «Loading…» и
// только потом текст. Здесь файл читает сервер — тем же `fs`, но до отдачи
// страницы. Поэтому HTTP-запроса нет, состояния «загружается» нет, и текст
// приезжает уже внутри HTML: он виден и при выключенном JS.
//
// Маршрут `/api/config/how-to-build` НЕ удаляем — им пользуется замороженная
// старая панель. Он умрёт вместе с ней на переключении (Ф3).

import fs from "node:fs";
import path from "node:path";

// `bridges/app` — рабочий каталог процесса, `_content` лежит внутри, поэтому
// файл путешествует вместе с репозиторием, как любой исходник.
const GUIDE_PATH = path.join(process.cwd(), "_content", "how-to-build.md");

export type GuideResult =
  | { ok: true; markdown: string }
  | { ok: false; path: string; reason: string };

export function readGuide(): GuideResult {
  try {
    return { ok: true, markdown: fs.readFileSync(GUIDE_PATH, "utf-8") };
  } catch (e) {
    // Громко, а не пусто: пропавшее руководство — дефект развёртывания, и
    // чистая страница спрятала бы его. Путь показываем: без него непонятно,
    // где искать.
    return { ok: false, path: GUIDE_PATH, reason: String(e) };
  }
}

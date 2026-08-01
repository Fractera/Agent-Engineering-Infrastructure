// ГДЕ ЖИВЁТ ЭТА АВТОМАТИЗАЦИЯ — ЕДИНСТВЕННЫЙ источник её адреса на диске (закон 0: папка знает только СЕБЯ).
//
// Одна строка `AUTOMATION_ADDRESS` = «категория/слаг» этой автоматизации. Всё остальное — корень папки,
// каталог рантайма, путь ядра, каталог инструкций — выведено отсюда. Это ЕДИНСТВЕННОЕ место, где адрес
// записан буквально.
//
// ЗАЧЕМ ОДНО МЕСТО. Рождение новой автоматизации (шаг 301) — это КЛОН замороженного стартера: копия папки
// целиком. Раньше слаг был зашит в полудюжине файлов двумя разными формами (сегменты `join()` и строка),
// и клон пришлось бы латать по всем. Теперь адрес живёт здесь один раз: рождение подставляет сюда новый
// «категория/слаг» — и все склады, ядро, инструкции и провенанс памяти клона сразу смотрят в его
// собственную папку, без правки остального кода.
import { join } from "node:path";

/** «категория/слаг» этой автоматизации. Рождение (клон стартера) подставляет сюда адрес новорождённого. */
export const AUTOMATION_ADDRESS = "other/starter-v3";

export const AUTOMATION_ROOT = join(process.cwd(), "app", "(projects)", "projects", ...AUTOMATION_ADDRESS.split("/"));
export const RUNTIME_DIR = join(AUTOMATION_ROOT, "_data", "runtime");
export const OBJECTS_DIR = join(RUNTIME_DIR, "objects");
export const CORE_PATH = join(AUTOMATION_ROOT, "_data", "automation.json");
export const INSTRUCTIONS_DIR = join(AUTOMATION_ROOT, "_instructions");

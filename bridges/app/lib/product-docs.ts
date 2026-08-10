// Документы разработки продуктового слоя (шаг 501, слой «Документы»).
//
// ЗАЧЕМ ЭТО СУЩЕСТВУЕТ. Инструкции, по которым работает агент в приложении
// клиента, лежат файлами в КОРНЕ СЛОТА (`/opt/fractera/app/*.md`). До этого слоя
// их можно было прочитать только через терминал или локальный клон: владелец,
// сидящий в панели, свои же правила не видел. Здесь они получают страницы.
//
// 🔒 ГРАНИЦА, КОТОРУЮ НЕЛЬЗЯ РАЗМЫВАТЬ. Панель — источник истины для НАСТРОЕК
// (`APP-CONFIG`, `PLATFORM-CONFIG`). Документы — другая сущность: это файлы
// РЕПОЗИТОРИЯ пользователя, они едут с `git push`/`pull` и принадлежат проекту.
// Панель даёт к ним доступ, но не становится их владельцем: правка здесь
// изменяет файл в рабочем дереве слота ровно так же, как правка в редакторе на
// машине владельца. Поэтому — никаких копий в базе панели.
//
// Белый список нужен не для красоты: без него параметр адреса стал бы дырой
// «прочитай мне /etc/passwd». Ключ приходит из навигации, путь берётся отсюда.

import fs from "fs";
import path from "path";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";

export type DocKey =
  | "doc-instruction"
  | "doc-platform-tools"
  | "doc-architecture"
  | "doc-glossary"
  | "doc-lessons"
  | "doc-antipatterns"
  | "doc-design"
  | "doc-parallel-routing"
  | "doc-coding-standards"
  | "doc-troubleshooting"
  | "doc-context-state"
  | "doc-testing"
  | "doc-single-agent";

/** Ключ страницы → файл в корне слота. Единственное место этого соответствия. */
export const DOC_FILES: Record<DocKey, string> = {
  "doc-instruction": "CLAUDE.md",
  // Перечень того, что платформа УЖЕ даёт: склады, движки, службы. Без этого
  // файла агент не знает о них ничего — у него нет доступа к внешним
  // инструментам, и единственный способ узнать про векторный склад, граф знаний,
  // базу, карту и каналы — прочитать этот документ. Не зная, он строит второе.
  "doc-platform-tools": "PLATFORM-TOOLS.md",
  "doc-architecture": "ARCHITECTURE.md",
  "doc-glossary": "GLOSSARY.md",
  "doc-lessons": "LESSONS.md",
  "doc-antipatterns": "ANTI-PATTERNS.md",
  "doc-design": "DESIGN.md",
  "doc-parallel-routing": "PARALLEL-ROUTING.md",
  "doc-coding-standards": "CODING-STANDARDS.md",
  // Разбор затруднений, с которыми пользователи сталкиваются НА ПРОДАКШНЕ.
  // Читается ПО ТРЕБОВАНИЮ, а не на старте: держать его в контексте каждой
  // сессии — платить за диагностику, которая может не понадобиться.
  "doc-troubleshooting": "TROUBLESHOOTING.md",
  // Передача между двумя контекстными окнами. Пишет её МОДЕЛЬ на подходе к
  // пределу окна, читает следующая сессия. Здесь она нужна затем, чтобы у
  // владельца был способ её ПРОЧИТАТЬ и ОЧИСТИТЬ: устаревшая передача вреднее
  // отсутствующей, а очистка — единственное действие, которое человек обязан
  // мочь выполнить сам.
  "doc-context-state": "CONTEXT-STATE.md",
  // Как шаг доказывается законченным: два независимых доказательства из разных
  // плоскостей. Документ ЗАДАННЫЙ — это требование к работе, а не наблюдение о
  // ней, и агент правит его только по прямой просьбе.
  "doc-testing": "TESTING.md",
  // Запрет мультиагентной разработки и команда, которая его снимает. ЗАДАННЫЙ:
  // это закон работы, а не наблюдение о ней.
  "doc-single-agent": "SINGLE-AGENT.md",
};

/**
 * 🔒 СОБИРАЕМЫЕ ДОКУМЕНТЫ — правка руками у них ОТКЛЮЧЕНА (владелец 2026-08-09).
 *
 * Такой документ описывает состояние проекта, а не мнение о нём: перечень
 * установленных инструментов пересобирается при каждой установке. Оставить у
 * него редактор значило бы позволить написать текст, который исчезнет при
 * следующей установке, — и человек узнал бы об этом, только заметив пропажу.
 */
export const GENERATED_DOCS = new Set<DocKey>(["doc-platform-tools"]);

export function isGenerated(key: DocKey): boolean {
  return GENERATED_DOCS.has(key);
}

export function isDocKey(v: string): v is DocKey {
  return Object.prototype.hasOwnProperty.call(DOC_FILES, v);
}

/**
 * Два рода документов — отвечают на вопрос «кто его ведёт» (владелец 2026-08-09).
 *
 * `evolving` — САМОРАЗВИВАЮЩИЕСЯ: агент дополняет их по ходу проекта. Термин
 *   разошёлся — в глоссарий; ошибся так, что повторится — в уроки; сделал
 *   работу — файл шага; напоролся на тупик — в антипаттерны. Они растут вместе
 *   с проектом, и их рост — признак здоровья, а не беспорядка.
 *
 * `static` — ЗАДАННЫЕ: их пишет владелец или платформа, агент им подчиняется.
 *   Главная инструкция, кейсы, дизайн, стандарты кода, описание инструментов.
 *   Агент правит их только по прямой просьбе — иначе он переписывает правила,
 *   по которым сам же и работает.
 */
export const DOC_KIND: Record<string, "evolving" | "static"> = {
  "doc-instruction": "static",
  "doc-use-cases": "static",
  "doc-platform-tools": "evolving",
  "doc-coding-standards": "static",
  "doc-design": "static",
  "doc-code-samples": "static",
  "doc-parallel-routing": "static",

  "doc-architecture": "evolving",
  "doc-glossary": "evolving",
  "doc-lessons": "evolving",
  "doc-steps": "evolving",
  "doc-antipatterns": "evolving",
  "doc-troubleshooting": "evolving",
  "doc-context-state": "evolving",
  "doc-testing": "static",
  "doc-single-agent": "static",
};

/**
 * Есть ли в файле передачи НЕПУСТАЯ запись (2026-08-10).
 *
 * Проверка идёт в верхнюю область предупреждений, а её делает шапка на КАЖДОЙ
 * странице панели — поэтому читается только начало файла, где стоит машинная
 * шапка, а не весь документ.
 *
 * Пустой файл — норма и молчит. Чужой формат считается записью намеренно: если
 * там лежит что-то, чего мы не понимаем, честнее сказать о нём человеку, чем
 * промолчать и дать следующей сессии наткнуться на это первой.
 */
export function contextStateHandoff(): boolean {
  try {
    const fd = fs.openSync(path.join(APP_DIR, DOC_FILES["doc-context-state"]), "r");
    const buf = Buffer.alloc(512);
    const read = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    const head = buf.subarray(0, read).toString("utf-8");
    if (!head.includes("fractera:context-state")) return true;
    return !/\*\*state:\*\*\s*empty/i.test(head);
  } catch {
    // Файла нет — механизм не установлен или передавать нечего. Молчим.
    return false;
  }
}

/**
 * 🔴 ГЕЙТ РАЗРАБОТКИ (решение владельца 2026-08-09, расширено 2026-08-10).
 *
 * Пока пользовательские кейсы не описаны И НЕ ПОДТВЕРЖДЕНЫ, начинать разработку
 * бессмысленно: агент построит аккуратно и не то. Само наличие кейсов больше не
 * снимает тревогу — написанный моделью кейс остаётся догадкой, пока его не
 * прочитал человек.
 *
 * Живёт в `use-cases-store`, здесь только пере-экспорт для старых мест вызова.
 */
export { useCasesGate } from "@/lib/use-cases-store";

export type DocState = {
  /** Имя файла — владелец должен видеть, что именно он правит. */
  file: string;
  /** Файла может не быть: документ ещё не заведён. Это состояние, а не ошибка. */
  exists: boolean;
  text: string;
  bytes: number;
  /** Когда правили в последний раз — по диску, а не по нашей памяти. */
  modified: string | null;
};

export function readDoc(key: DocKey): DocState {
  const file = DOC_FILES[key];
  const full = path.join(APP_DIR, file);
  try {
    const stat = fs.statSync(full);
    return {
      file,
      exists: true,
      text: fs.readFileSync(full, "utf-8"),
      bytes: stat.size,
      modified: stat.mtime.toISOString(),
    };
  } catch {
    return { file, exists: false, text: "", bytes: 0, modified: null };
  }
}

export function writeDoc(key: DocKey, text: string): void {
  const full = path.join(APP_DIR, DOC_FILES[key]);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  // Пишем как есть, без нормализации переводов строк: документ принадлежит
  // репозиторию пользователя, и молча менять его байты — значит порождать
  // разницу в `git diff`, которой владелец не делал.
  fs.writeFileSync(full, text, "utf-8");
}

/** Шаги разработки — не файл, а ПАПКА: их материализует агент по одному на шаг. */
export const STEPS_DIR = "DEVELOPMENT-STEPS";

export type StepFile = { name: string; bytes: number; modified: string | null };

export function listSteps(): { exists: boolean; dir: string; files: StepFile[] } {
  const dir = path.join(APP_DIR, STEPS_DIR);
  try {
    const names = fs.readdirSync(dir, { withFileTypes: true });
    const files: StepFile[] = [];
    for (const e of names) {
      if (e.isDirectory()) {
        // Вложенные папки конвейера (NEW-STEPS / COMPLETED-STEPS) — показываем их
        // содержимое с префиксом, чтобы владелец видел стадию, а не только имя.
        for (const inner of fs.readdirSync(path.join(dir, e.name))) {
          const st = safeStat(path.join(dir, e.name, inner));
          files.push({ name: `${e.name}/${inner}`, bytes: st.size, modified: st.modified });
        }
      } else if (e.name.endsWith(".md")) {
        const st = safeStat(path.join(dir, e.name));
        files.push({ name: e.name, bytes: st.size, modified: st.modified });
      }
    }
    files.sort((a, b) => a.name.localeCompare(b.name));
    return { exists: true, dir: STEPS_DIR, files };
  } catch {
    return { exists: false, dir: STEPS_DIR, files: [] };
  }
}

/**
 * Содержимое ОДНОГО шага.
 *
 * Имя проверяется по фактическому списку папки, а не разбором строки: любой
 * самодельный фильтр `..` рано или поздно обходят, а сверка со списком не
 * оставляет такой возможности вовсе — чего в папке нет, того не прочитать.
 */
export function readStep(name: string): { name: string; exists: boolean; text: string } {
  const known = listSteps().files.some((f) => f.name === name);
  if (!known) return { name, exists: false, text: "" };
  try {
    return { name, exists: true, text: fs.readFileSync(path.join(APP_DIR, STEPS_DIR, name), "utf-8") };
  } catch {
    return { name, exists: false, text: "" };
  }
}

function safeStat(p: string): { size: number; modified: string | null } {
  try {
    const s = fs.statSync(p);
    return { size: s.size, modified: s.mtime.toISOString() };
  } catch {
    return { size: 0, modified: null };
  }
}

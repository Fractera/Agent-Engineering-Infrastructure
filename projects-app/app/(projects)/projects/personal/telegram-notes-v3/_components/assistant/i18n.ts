// Строки вкладки «Ассистент» (кокпит-слой). Основные ru/en; прочие языки падают на en-фолбэк (расширяемо).
type Dict = {
  title: string; subtitle: string;
  instruction: string; instructionHint: string;
  memory: string; lastN: string; ttl: string; minutes: string; messages: string;
  reveal: string; revealHint: string;
  language: string; langAuto: string; langFixed: string; langCode: string;
  qa: string; qaHint: string; qaQuestion: string; qaAnswer: string; qaAdd: string; qaEmpty: string;
  save: string; saving: string; remove: string;
};

const en: Dict = {
  title: "Assistant", subtitle: "How this automation talks to you — its behavior, memory and examples.",
  instruction: "Behavior instruction", instructionHint: "Who the assistant is and how it should reply. The model follows this text.",
  memory: "Dialogue memory", lastN: "Last messages to remember", ttl: "For how long", minutes: "min", messages: "msgs",
  reveal: "Introduce capabilities on /start", revealHint: "Send the list of what it can do on the first contact.",
  language: "Reply language", langAuto: "Auto (follow the user)", langFixed: "Fixed", langCode: "Language code (e.g. ru)",
  qa: "Example answers (Q → A)", qaHint: "The assistant answers similar questions in this style.",
  qaQuestion: "Question", qaAnswer: "Answer", qaAdd: "Add example", qaEmpty: "No examples yet.",
  save: "Save", saving: "Saving…", remove: "Remove",
};

const ru: Dict = {
  title: "Ассистент", subtitle: "Как автоматизация с тобой разговаривает — поведение, память и примеры.",
  instruction: "Инструкция поведения", instructionHint: "Кто ассистент и как отвечает. Модель следует этому тексту.",
  memory: "Память диалога", lastN: "Сколько последних сообщений помнить", ttl: "Как долго", minutes: "мин", messages: "сообщ.",
  reveal: "Представлять возможности на /start", revealHint: "Слать список умений при первом контакте.",
  language: "Язык ответа", langAuto: "Авто (по пользователю)", langFixed: "Фиксированный", langCode: "Код языка (напр. ru)",
  qa: "Примеры ответов (Вопрос → Ответ)", qaHint: "Ассистент отвечает на похожие вопросы в этом стиле.",
  qaQuestion: "Вопрос", qaAnswer: "Ответ", qaAdd: "Добавить пример", qaEmpty: "Примеров пока нет.",
  save: "Сохранить", saving: "Сохранение…", remove: "Удалить",
};

const BY: Record<string, Dict> = { en, ru };

export function assistantStrings(lang: string): Dict {
  return BY[(lang || "en").toLowerCase().slice(0, 2)] ?? en;
}

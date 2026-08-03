// Строки вкладки «Ассистент» (кокпит-слой). Полные словари ru/en; для НОВЫХ строк — все десять языков
// правила 4г частичными словарями поверх английского (старые строки на них не трогаем: сплошного прохода
// по существующим нет, а новое обязано быть переведено).
//
// 🔒 ЧЕЛОВЕЧЕСКИЕ СЛОВА, А НЕ НАШ ГЛОССАРИЙ (требование владельца 2026-08-03). Здесь стояли «бюджет
// контекста» и «токены» — термины СЛОЯ РАЗРАБОТКИ. Человек в кокпите не обязан знать, что такое токен;
// он знает «сколько разговора помнить» и «это дороже». Внутреннее устройство остаётся внутри: ядро
// по-прежнему хранит число, а выбирают из понятных уровней.
type Dict = {
  title: string; subtitle: string;
  instruction: string; instructionHint: string;
  memory: string; lastN: string; ttl: string; minutes: string; messages: string;
  depth: string; depthHint: string;
  depthShort: string; depthNormal: string; depthLong: string; depthMax: string;
  reveal: string; revealHint: string;
  language: string; langAuto: string; langFixed: string; langCode: string;
  qa: string; qaHint: string; qaQuestion: string; qaAnswer: string; qaAdd: string; qaEmpty: string;
  save: string; saving: string; remove: string;
  access: string; accessHint: string; accessPublic: string;
};

const en: Dict = {
  title: "Assistant", subtitle: "How this automation talks to you — its behavior, memory and examples.",
  instruction: "Behavior instruction", instructionHint: "Who the assistant is and how it should reply. The model follows this text.",
  memory: "Dialogue memory", lastN: "Last messages to remember", ttl: "For how long", minutes: "min", messages: "msgs",
  depth: "How much of the conversation to keep in mind",
  depthHint: "A longer memory makes the assistant better at picking up where you left off, and makes every reply cost a little more. Long dictated messages are trimmed by this, not by the message count.",
  depthShort: "A little", depthNormal: "Normal", depthLong: "A lot", depthMax: "As much as possible",
  reveal: "Introduce capabilities on /start", revealHint: "Send the list of what it can do on the first contact.",
  language: "Reply language", langAuto: "Auto (follow the user)", langFixed: "Fixed", langCode: "Language code (e.g. ru)",
  qa: "Example answers (Q → A)", qaHint: "The assistant answers similar questions in this style.",
  qaQuestion: "Question", qaAnswer: "Answer", qaAdd: "Add example", qaEmpty: "No examples yet.",
  save: "Save", saving: "Saving…", remove: "Remove",
  access: "Public access — who may open the real automation",
  accessHint: "On the public app, only holders of the selected roles see the real automation instead of a teaser. No role selected = fully public.",
  accessPublic: "Public (everyone)",
};

const ru: Dict = {
  title: "Ассистент", subtitle: "Как автоматизация с тобой разговаривает — поведение, память и примеры.",
  instruction: "Инструкция поведения", instructionHint: "Кто ассистент и как отвечает. Модель следует этому тексту.",
  memory: "Память диалога", lastN: "Сколько последних сообщений помнить", ttl: "Как долго", minutes: "мин", messages: "сообщ.",
  depth: "Сколько разговора держать в голове",
  depthHint: "Чем длиннее память, тем лучше ассистент подхватывает начатое — и тем чуть дороже каждый ответ. Длинные надиктованные сообщения обрезает именно это, а не счётчик сообщений.",
  depthShort: "Немного", depthNormal: "Обычно", depthLong: "Много", depthMax: "Максимально",
  reveal: "Представлять возможности на /start", revealHint: "Слать список умений при первом контакте.",
  language: "Язык ответа", langAuto: "Авто (по пользователю)", langFixed: "Фиксированный", langCode: "Код языка (напр. ru)",
  qa: "Примеры ответов (Вопрос → Ответ)", qaHint: "Ассистент отвечает на похожие вопросы в этом стиле.",
  qaQuestion: "Вопрос", qaAnswer: "Ответ", qaAdd: "Добавить пример", qaEmpty: "Примеров пока нет.",
  save: "Сохранить", saving: "Сохранение…", remove: "Удалить",
  access: "Публичный доступ — кто откроет реальную автоматизацию",
  accessHint: "В публичном приложении реальную автоматизацию (а не превью) видят только держатели выбранных ролей. Ни одна роль не выбрана = полностью публично.",
  accessPublic: "Публично (все)",
};

const BY: Record<string, Dict> = { en, ru };

/**
 * НОВЫЕ СТРОКИ — НА ВСЕХ ДЕСЯТИ ЯЗЫКАХ (правило 4г). Частичные словари ложатся ПОВЕРХ английского:
 * добавленное этим шагом человек читает на своём языке, а старые строки остаются как были — сплошного
 * перевода существующего не заказывали, и делать его молча значит менять то, чего не просили.
 */
const NEW_BY: Record<string, Partial<Dict>> = {
  es: {
    depth: "Cuánta conversación mantener en mente",
    depthHint: "Cuanto más larga sea la memoria, mejor retoma el asistente lo empezado, y un poco más cuesta cada respuesta. Los mensajes dictados largos los recorta esto, no el número de mensajes.",
    depthShort: "Poco", depthNormal: "Normal", depthLong: "Mucho", depthMax: "Lo máximo posible",
  },
  fr: {
    depth: "Quelle part de la conversation garder en tête",
    depthHint: "Plus la mémoire est longue, mieux l'assistant reprend le fil, et plus chaque réponse coûte un peu. Les longs messages dictés sont coupés par ceci, pas par le nombre de messages.",
    depthShort: "Un peu", depthNormal: "Normal", depthLong: "Beaucoup", depthMax: "Le plus possible",
  },
  it: {
    depth: "Quanta conversazione tenere a mente",
    depthHint: "Più lunga è la memoria, meglio l'assistente riprende il discorso, e un po' più costa ogni risposta. I lunghi messaggi dettati vengono tagliati da questo, non dal numero di messaggi.",
    depthShort: "Poco", depthNormal: "Normale", depthLong: "Molto", depthMax: "Il massimo possibile",
  },
  de: {
    depth: "Wie viel vom Gespräch im Kopf behalten",
    depthHint: "Je länger das Gedächtnis, desto besser knüpft der Assistent an — und desto etwas teurer wird jede Antwort. Lange diktierte Nachrichten kürzt dies, nicht die Anzahl der Nachrichten.",
    depthShort: "Wenig", depthNormal: "Normal", depthLong: "Viel", depthMax: "So viel wie möglich",
  },
  pt: {
    depth: "Quanto da conversa manter em mente",
    depthHint: "Quanto maior a memória, melhor o assistente retoma o que ficou pendente, e um pouco mais caro fica cada resposta. Mensagens ditadas longas são cortadas por isto, não pelo número de mensagens.",
    depthShort: "Pouco", depthNormal: "Normal", depthLong: "Muito", depthMax: "O máximo possível",
  },
  pl: {
    depth: "Ile rozmowy trzymać w pamięci",
    depthHint: "Im dłuższa pamięć, tym lepiej asystent podejmuje wątek — i tym nieco drożej wypada każda odpowiedź. Długie dyktowane wiadomości przycina to, a nie liczba wiadomości.",
    depthShort: "Trochę", depthNormal: "Zwykle", depthLong: "Dużo", depthMax: "Jak najwięcej",
  },
  tr: {
    depth: "Konuşmanın ne kadarı akılda tutulsun",
    depthHint: "Bellek ne kadar uzun olursa asistan kaldığı yerden o kadar iyi devam eder ve her yanıt biraz daha pahalıya gelir. Uzun sesli mesajları mesaj sayısı değil, bu ayar kısaltır.",
    depthShort: "Biraz", depthNormal: "Normal", depthLong: "Çok", depthMax: "Mümkün olduğunca çok",
  },
  nl: {
    depth: "Hoeveel van het gesprek onthouden",
    depthHint: "Hoe langer het geheugen, hoe beter de assistent de draad oppakt — en hoe iets duurder elk antwoord wordt. Lange ingesproken berichten worden hierdoor ingekort, niet door het aantal berichten.",
    depthShort: "Een beetje", depthNormal: "Normaal", depthLong: "Veel", depthMax: "Zoveel mogelijk",
  },
};

export function assistantStrings(lang: string): Dict {
  const code = (lang || "en").toLowerCase().slice(0, 2);
  return { ...(BY[code] ?? en), ...(NEW_BY[code] ?? {}) };
}

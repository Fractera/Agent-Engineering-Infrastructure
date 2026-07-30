// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — ВСПОМНИТЬ: спросить векторную память (LightRAG) захваченным
// текстом и отдать дальше ОТВЕТ вместо вопроса (шаг 307, узловой навык №1 библиотеки середины).
//
// Место в конвейере «захват → развозка»: приёмник положил вопрос пользователя в `ctx.text`; этот узел
// заменяет его найденным ответом, и любой выходной канал доставляет ответ как обычное сообщение.
// Исходный вопрос сохраняется рядом (`question`) — выходу дашборда/БД может понадобиться пара
// «что спросили → что ответила память».
//
// ТРИ ЧЕСТНЫХ ИСХОДА (ни один не роняет прогон — recall без памяти не катастрофа, паттерн v1
// soft-degrade, и все три говорят на десяти языках, правило 4г):
//   память недоступна (нет сервиса на :9621) → текст = «память временно недоступна»;
//   память ответила пусто                    → текст = «в заметках ничего не нашлось по запросу …»;
//   память ответила                          → текст = ответ памяти.
// Отверг сам сервис (HTTP-отказ при живом сервисе) → `recallFacts` бросает, и это настоящий провал.
//
// БЕЗ ТЕКСТА → БРОСАЕТ: вспоминать нечем — тот же гейт, что у `transformPayload`.
// Имя `recallFromMemory` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { recallFacts } from "../memory";
import { deriveTitle, refuse } from "../message";

const noQuestion = {
  en: "No question was captured — there is nothing to recall from memory.",
  es: "No se capturó ninguna pregunta: no hay nada que recordar de la memoria.",
  fr: "Aucune question capturée — il n'y a rien à rappeler de la mémoire.",
  it: "Nessuna domanda catturata: non c'è nulla da richiamare dalla memoria.",
  ru: "Вопрос не захвачен — вспоминать из памяти нечего.",
  de: "Keine Frage erfasst — es gibt nichts aus dem Gedächtnis abzurufen.",
  pt: "Nenhuma pergunta capturada — não há nada para recordar da memória.",
  pl: "Nie przechwycono pytania — nie ma czego przywołać z pamięci.",
  tr: "Soru yakalanamadı — bellekten hatırlanacak bir şey yok.",
  nl: "Geen vraag vastgelegd — er valt niets uit het geheugen op te halen.",
};

const unavailable: Record<string, string> = {
  en: "Memory is temporarily unavailable — the vector-memory service did not answer.",
  es: "La memoria no está disponible temporalmente: el servicio de memoria vectorial no respondió.",
  fr: "La mémoire est temporairement indisponible — le service de mémoire vectorielle n'a pas répondu.",
  it: "La memoria è temporaneamente non disponibile: il servizio di memoria vettoriale non ha risposto.",
  ru: "Память временно недоступна — сервис векторной памяти не ответил.",
  de: "Das Gedächtnis ist vorübergehend nicht verfügbar — der Vektorspeicher-Dienst antwortete nicht.",
  pt: "A memória está temporariamente indisponível — o serviço de memória vetorial não respondeu.",
  pl: "Pamięć jest tymczasowo niedostępna — usługa pamięci wektorowej nie odpowiedziała.",
  tr: "Bellek geçici olarak kullanılamıyor — vektör bellek servisi yanıt vermedi.",
  nl: "Het geheugen is tijdelijk niet beschikbaar — de vectorgeheugendienst antwoordde niet.",
};

const nothingFound: Record<string, string> = {
  en: "Nothing was found in the saved notes for this query:",
  es: "No se encontró nada en las notas guardadas para esta consulta:",
  fr: "Rien n'a été trouvé dans les notes enregistrées pour cette requête :",
  it: "Non è stato trovato nulla nelle note salvate per questa richiesta:",
  ru: "В сохранённых заметках ничего не нашлось по запросу:",
  de: "In den gespeicherten Notizen wurde zu dieser Anfrage nichts gefunden:",
  pt: "Nada foi encontrado nas notas guardadas para esta consulta:",
  pl: "W zapisanych notatkach niczego nie znaleziono dla tego zapytania:",
  tr: "Kaydedilmiş notlarda bu sorgu için hiçbir şey bulunamadı:",
  nl: "Er is niets gevonden in de opgeslagen notities voor deze zoekopdracht:",
};

/** Все языки одной строкой «en | es | … | nl» — деградация видна на языке читателя, кто бы ни читал. */
const speak = (dict: Record<string, string>, tail = ""): string =>
  Object.values(dict)
    .map((line) => (tail ? `${line} ${tail}` : line))
    .join("\n");

export async function recallFromMemory(ctx: NodeCtx): Promise<NodeCtx> {
  const question = String(ctx.text ?? "").replace(/\s+/g, " ").trim();
  if (!question) refuse(noQuestion);

  const answer = await recallFacts(question);
  const text =
    answer === null ? speak(unavailable) : answer === "" ? speak(nothingFound, `«${question}»`) : answer;

  return {
    text,
    title: deriveTitle(text),
    question,
    at: String(ctx.at ?? new Date().toISOString()),
    source: String(ctx.source ?? "unknown"),
  };
}

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
import { deriveTitle, refuse, servesIntent } from "../message";
import { listRows } from "../rows";
import { isAggregateQuestion, financeAggregate } from "../components/conversation/finance-summary";

// 🔒 РАЗРЕШЕНИЕ ОБРАТНЫХ МАРКЕРОВ (шаг 308.7): в тексте ответа памяти могут стоять маркеры вида
// `[mem#id]`/`[note#id]`/`[fin#id]`, вшитые при ингесте. Каждый указывает на локальную строку И её
// картинки (`storageIds`) — разрешаем за O(1) (прямой доступ по id, без повторного семантического
// поиска), собираем вложения, и СНИМАЕМ маркеры из видимого пользователю текста.
const MARKER_RE = /\[(mem|note|fin)#([a-z0-9]+)\]/gi;
const TABLE_OF: Record<string, string> = { mem: "vector-memory", note: "database", fin: "finance" };

async function resolveMarkers(answer: string): Promise<{ text: string; attachments: string[]; records: { table: string; id: string }[] }> {
  const hits = [...answer.matchAll(MARKER_RE)];
  if (!hits.length) return { text: answer, attachments: [], records: [] };
  const attachments = new Set<string>();
  const records: { table: string; id: string }[] = [];
  const cache = new Map<string, Awaited<ReturnType<typeof listRows>>>();
  for (const [, kind, id] of hits) {
    const table = TABLE_OF[kind.toLowerCase()];
    if (!cache.has(table)) cache.set(table, await listRows(table, Infinity));
    const row = cache.get(table)!.find((r) => r.id === id);
    if (!row) continue;
    records.push({ table, id });
    for (const k of Array.isArray(row.storageIds) ? (row.storageIds as unknown[]) : []) attachments.add(String(k));
  }
  const clean = answer.replace(MARKER_RE, "").replace(/\s{2,}/g, " ").trim();
  return { text: clean, attachments: [...attachments], records };
}

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
  // Ветка RECALL (308.8): память спрашиваем только для намерения `recall`; иначе молчим и не перетираем
  // текст ответом памяти (иначе сломали бы save/remind). Backward-compat: нет классификатора → как раньше.
  if (!servesIntent(ctx, "recall")) return {};
  const question = String(ctx.text ?? "").replace(/\s+/g, " ").trim();
  if (!question) refuse(noQuestion);

  // 🔒 ДЕТЕРМИНИРОВАННЫЙ ФИНАНСОВЫЙ КОНТЕКСТ (309, живой тест «на какую сумму вишню»): вопрос про деньги/
  // покупку → достаём ПОЛНЫЕ finance-строки (их позиции) НАПРЯМУЮ из таблицы, не полагаясь на векторный
  // поиск (он не связал «вишня»↔«cereza» — разные языки/слова). Даём их модели памяти как факты — она сама
  // найдёт нужную позицию через язык. Обходит и семантику языков, и связь.
  let financeFacts = "";
  if (/(сумм|потрат|купил|цена|стоил|деньг|расход|доход|финанс|чек|amount|spent|cost|paid|price|receipt|money)/i.test(question)) {
    const fin = (await listRows("finance", Infinity)).filter((r) => Array.isArray(r.items) && (r.items as unknown[]).length);
    financeFacts = fin.slice(0, 5).map((r) => {
      const items = (r.items as { name?: unknown; qty?: unknown; price?: unknown }[])
        .map((it) => `${it.name ?? ""} ×${it.qty ?? "?"} = ${it.price ?? "?"}`).join("; ");
      return `Receipt from ${r.store ?? "?"} total ${r.amount ?? "?"}${r.currency ?? ""}: ${items}`;
    }).join("\n");
  }

  // ПРИБЛИЗИТЕЛЬНАЯ СВОДКА (310): вопрос «сколько потратил на X за период» → считаем сумму САМИ по записям
  // (детерминированно) и даём модели ГОТОВЫЙ факт — число будет верным, а не «на глаз». Это не бухгалтерия
  // (грубая ориентировка), поэтому помечаем approximate; модель разъяснит на языке владельца.
  let computed = "";
  if (isAggregateQuestion(question)) {
    const agg = financeAggregate(question, (await listRows("finance", Infinity)) as Record<string, unknown>[]);
    if (agg) computed = `Computed approximate total for "${agg.subject}" (${agg.period}, ${agg.count} record(s)): ${agg.total}${agg.currency}. Report this as an APPROXIMATE figure, not exact accounting.`;
  }

  // Глоссарий алиасов (309) — в запрос памяти: «в Меркадоне» матчится на store="SODO ADEJE".
  const glossary = String(ctx.glossary ?? "").trim();
  const enriched = [glossary, computed, question, financeFacts ? `Known receipts:\n${financeFacts}` : ""].filter(Boolean).join("\n\n");
  const answer = await recallFacts(enriched || question);

  // Недоступно / пусто — честные исходы без маркеров. Реальный ответ → разрешаем маркеры в строки+картинки.
  if (answer === null || answer === "") {
    const text = answer === null ? speak(unavailable) : speak(nothingFound, `«${question}»`);
    return { text, title: deriveTitle(text), question, at: String(ctx.at ?? new Date().toISOString()), source: String(ctx.source ?? "unknown") };
  }

  const resolved = await resolveMarkers(answer);

  // 🔒 ДЕТЕРМИНИРОВАННЫЙ ВОЗВРАТ КАРТИНКИ (309, живой тест «покажи чек»): если маркеры не дали вложений
  // (LightRAG не процитировал маркер — вероятностно), но вопрос ПРОСИТ показать чек/фото — достаём картинку
  // напрямую из хранилищ, не полагаясь на память: последняя finance-строка с картинкой (или её связи).
  let attachments = resolved.attachments;
  if (!attachments.length && /(чек|квитанц|фото|картинк|receipt|photo|покажи|show)/i.test(question)) {
    const fin = (await listRows("finance", Infinity)).find((r) => Array.isArray(r.storageIds) && (r.storageIds as unknown[]).length);
    if (fin) attachments = (fin.storageIds as unknown[]).map(String).filter(Boolean);
  }

  return {
    text: resolved.text, // видимый текст без маркеров
    title: deriveTitle(resolved.text),
    question,
    recallAnswer: resolved.text, // структурный результат ветки recall для композитора ответа (308)
    // Разрешённые/детерминированно найденные вложения — выходной узел доставит сами картинки (308.7/309).
    ...(attachments.length ? { recalledAttachments: attachments } : {}),
    ...(resolved.records.length ? { recalledRecords: resolved.records } : {}),
    at: String(ctx.at ?? new Date().toISOString()),
    source: String(ctx.source ?? "unknown"),
  };
}

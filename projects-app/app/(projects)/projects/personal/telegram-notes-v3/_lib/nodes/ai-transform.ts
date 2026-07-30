// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — ДУМАЕТ МОДЕЛЬЮ: прогоняет захваченный текст через выбранную в
// паспорте модель (`passport.ai`) по инструкции и отдаёт результат дальше (шаг 307, узловой навык №2
// библиотеки середины). Инструкция берётся из `ctx.aiInstruction`, иначе дефолт «краткая, но полная
// сводка с сохранением фактов и дат» — типовой случай save-заметки.
//
// НЕ РУШИТ ПРОГОН (v1 soft-degrade): модель недоступна (нет ключа / сеть → `askModel` вернул `null`) ИЛИ
// отвергла (бросок) → текст ОСТАЁТСЯ исходным, `aiUsed=false`, `aiError` для трассировки. Развозка идёт
// на полном оригинале — потеря информации хуже, чем отсутствие сводки. Успех → `text` = ответ модели,
// оригинал сохранён в `original` (памяти/БД может понадобиться и то и другое).
//
// БЕЗ ТЕКСТА → БРОСАЕТ: думать не над чем — тот же гейт, что у `transformPayload`.
// Имя `aiTransform` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { askModel } from "../ai";
import { deriveTitle, refuse, servesIntent } from "../message";

const noText = {
  en: "No text was captured — there is nothing for the model to transform.",
  es: "No se capturó texto: no hay nada que el modelo pueda transformar.",
  fr: "Aucun texte capturé — le modèle n'a rien à transformer.",
  it: "Nessun testo catturato: il modello non ha nulla da trasformare.",
  ru: "Текст не захвачен — модели нечего преобразовывать.",
  de: "Kein Text erfasst — das Modell hat nichts zu verarbeiten.",
  pt: "Nenhum texto capturado — o modelo não tem nada para transformar.",
  pl: "Nie przechwycono tekstu — model nie ma czego przetworzyć.",
  tr: "Metin yakalanmadı — modelin dönüştüreceği bir şey yok.",
  nl: "Geen tekst vastgelegd — het model heeft niets om te verwerken.",
};

const DEFAULT_INSTRUCTION =
  "Produce a concise but complete summary of the message, preserving key facts, names and dates. Write the summary in the SAME LANGUAGE the message is written in — never translate. Reply with the summary text only.";

export async function aiTransform(ctx: NodeCtx): Promise<NodeCtx> {
  // Ветка ЗАМЕТКИ (308.8): в v3 сводку делаем только для намерения `save`; иначе узел молчит и не трогает
  // текст (напр. у `remind` текст с датой должен дойти до `parseDate` нетронутым). Нет классификатора → работает как раньше.
  if (!servesIntent(ctx, "save")) return {};
  const original = String(ctx.text ?? "").replace(/\s+/g, " ").trim();
  if (!original) refuse(noText);

  const instruction = String(ctx.aiInstruction ?? "").trim() || DEFAULT_INSTRUCTION;
  const base = {
    original,
    at: String(ctx.at ?? new Date().toISOString()),
    source: String(ctx.source ?? "unknown"),
  };

  try {
    const out = await askModel({ system: instruction, user: original });
    if (!out) {
      // модель нельзя позвать (нет ключа / сеть) — оставляем оригинал, прогон продолжается
      return { ...base, text: original, title: deriveTitle(original), aiUsed: false, aiError: "model unavailable" };
    }
    return { ...base, text: out, title: deriveTitle(out), aiUsed: true };
  } catch (e) {
    // провайдер отверг запрос — тоже не крах прогона: развозим полный оригинал
    return {
      ...base,
      text: original,
      title: deriveTitle(original),
      aiUsed: false,
      aiError: e instanceof Error ? e.message : String(e),
    };
  }
}

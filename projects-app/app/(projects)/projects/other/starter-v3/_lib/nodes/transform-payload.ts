// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — срединная работа: проверить и нормализовать захваченное
// сообщение (шаг 300). Ровно один приёмник этого прогона положил в контекст поля контракта `Message`;
// здесь текст проверяется на пустоту, схлопываются пробелы и выводится заголовок (`title`).
//
// НЕТ ТЕКСТА → БРОСАЕТ (десять языков): это настоящий гейт успеха/провала — упавший прогон не доходит
// ни до одного выхода, и ветка `condition-failure` честно достигнута. Без ключей, без AI,
// детерминированно. Имя `transformPayload` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { deriveTitle, refuse } from "../message";

const noMessage = {
  en: "No message was captured — the run's input channel delivered nothing to fan out.",
  es: "No se capturó ningún mensaje: el canal de entrada no entregó nada que repartir.",
  fr: "Aucun message capturé — le canal d'entrée n'a rien transmis à distribuer.",
  it: "Nessun messaggio catturato: il canale d'ingresso non ha consegnato nulla da distribuire.",
  ru: "Сообщение не захвачено — входной канал прогона не принёс ничего для развозки.",
  de: "Keine Nachricht erfasst — der Eingangskanal lieferte nichts zum Verteilen.",
  pt: "Nenhuma mensagem capturada — o canal de entrada não entregou nada para distribuir.",
  pl: "Nie przechwycono wiadomości — kanał wejściowy nie dostarczył niczego do rozesłania.",
  tr: "Mesaj yakalanamadı — girdi kanalı dağıtılacak bir şey iletmedi.",
  nl: "Geen bericht vastgelegd — het invoerkanaal leverde niets om te verspreiden.",
};

export function transformPayload(ctx: NodeCtx): { text: string; title: string; at: string; source: string } {
  const text = String(ctx.text ?? "").replace(/\s+/g, " ").trim();
  if (!text) refuse(noMessage);
  // 🔒 ЗАГОЛОВОК, УЖЕ ДАННЫЙ ПОТОКОМ, НЕ ЗАТИРАЕТСЯ. Узел середины, добывший предмет, называет его по
  // имени (`ctx.title`); вывод из первой строки — ФОЛБЭК для сообщений, у которых имени нет. Прежде
  // деривация была безусловной, и в складах вместо «Stonehenge» оседало начало описания статьи.
  const given = String(ctx.title ?? "").trim();
  return {
    text,
    title: given || deriveTitle(String(ctx.text ?? "")),
    at: String(ctx.at ?? new Date().toISOString()),
    source: String(ctx.source ?? "unknown"),
  };
}

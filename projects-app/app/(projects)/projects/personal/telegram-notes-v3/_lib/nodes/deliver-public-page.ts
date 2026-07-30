// ФУНКЦИЯ УЗЛА «OUTPUT» (канал public-page) — публикует захваченное сообщение в ленту публичной
// страницы автоматизации: строка таблицы `public-page` (дата · канал · заголовок · текст), которую
// страница читает через дверь `api/rows?table=public-page`. Узел доставляет ДАННЫЕ ленты; как их
// показать — решает компонент страницы.
//
// Имя `deliverPublicPage` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { addRow } from "../rows";

export async function deliverPublicPage(ctx: NodeCtx): Promise<{ publicPageRowId: string }> {
  const m = messageOf(ctx);
  const row = await addRow("public-page", { date: m.at, source: m.source, title: m.title, text: m.text });
  return { publicPageRowId: row.id };
}

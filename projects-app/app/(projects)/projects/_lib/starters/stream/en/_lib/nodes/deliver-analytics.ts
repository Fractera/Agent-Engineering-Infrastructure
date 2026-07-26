// ФУНКЦИЯ УЗЛА «OUTPUT» (канал analytics) — ведёт счёт захваченного: одна строка таблицы `analytics`
// на каждый входной канал (`metric: "captured"`, `source`, `count`), и каждый успешный прогон
// увеличивает счётчик своего канала на единицу.
//
// Правка строки идёт журнальным приёмом хранилища (`updateRow` дописывает версию с тем же id) — история
// счётчика сохраняется сама собой. Имя `deliverAnalytics` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { addRow, listRows, updateRow } from "../rows";

export async function deliverAnalytics(ctx: NodeCtx): Promise<{ analyticsCount: number }> {
  const m = messageOf(ctx);
  const existing = (await listRows("analytics", Infinity)).find(
    (r) => r.metric === "captured" && r.source === m.source,
  );
  if (existing) {
    const count = (typeof existing.count === "number" ? existing.count : 0) + 1;
    await updateRow("analytics", existing.id, { count, lastAt: m.at });
    return { analyticsCount: count };
  }
  await addRow("analytics", { metric: "captured", source: m.source, count: 1, lastAt: m.at });
  return { analyticsCount: 1 };
}

import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { readCore } from "../../_lib/core-io";
import { pendingWork } from "../../_lib/pending-work";

// ДВЕРЬ «ЧТО ЖДЁТ РАБОТЫ» — точка входа второй и последующих итераций.
//
// Возвращает ТОЛЬКО объекты, у которых есть запись владельца (`info.crudUser`) или предупреждение, и
// ничего больше. Читать ради этого всё ядро незачем: работа обозначена самой записью.
//
//   GET /projects/other/frozen-template-v-2/api/work -> { pending: WorkItem[], count }
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const core = await readCore();
  const pending = pendingWork(core);
  return NextResponse.json({
    count: pending.length,
    pending,
    ...(pending.length === 0 ? { note: "nothing is waiting — an empty list is a lawful end of the iteration" } : {}),
  });
}

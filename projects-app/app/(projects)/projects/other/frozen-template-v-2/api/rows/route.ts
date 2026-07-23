import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { listRows, updateRow } from "../../_lib/rows";

// ДВЕРЬ СТРОК ВЫВОДА — то, что показывают вкладки дашборда и календаря.
//   GET  api/rows?table=history          — строки таблицы (по умолчанию history)
//   POST api/rows { table, id, set }     — правка одной строки по её id
//
// ПРАВКА ТОЛЬКО ПО ПОЛЯМ, И ТОЛЬКО СУЩЕСТВУЮЩЕЙ СТРОКИ. Создавать записи этой дверью нельзя: строки
// рождает выходной узел прогона, и второй путь рождения сделал бы источник данных неопределённым.
// Отказ на несуществующий id честный (404), а не тихое создание.
//
// Идентичность и рождение (`id`, `table`, `createdAt`) не пишутся — их отбрасывает `updateRow`.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const table = (req.nextUrl.searchParams.get("table") ?? "history").trim();
  const rows = await listRows(table);
  return NextResponse.json({ table, rows, source: "runtime" });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { table?: string; id?: string; set?: Record<string, unknown> };
  const table = (body.table ?? "").trim();
  const id = (body.id ?? "").trim();
  const set = body.set ?? {};

  if (!table) return NextResponse.json({ error: "table is required" }, { status: 400 });
  if (!id) return NextResponse.json({ error: "id is required — a row is edited by its own id" }, { status: 400 });
  if (!Object.keys(set).length) return NextResponse.json({ error: "set is empty — name the fields to change" }, { status: 400 });

  const row = await updateRow(table, id, set);
  if (!row) return NextResponse.json({ error: `table "${table}" has no row "${id}"` }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}

import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { listRows } from "../../_lib/rows";

// ДВЕРЬ ЧТЕНИЯ СТРОК ВЫВОДА — то, что показывает вкладка дашборда.
//   GET api/rows?table=history — строки таблицы (по умолчанию history)
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const table = (req.nextUrl.searchParams.get("table") ?? "history").trim();
  const rows = await listRows(table);
  return NextResponse.json({ table, rows, source: "runtime" });
}

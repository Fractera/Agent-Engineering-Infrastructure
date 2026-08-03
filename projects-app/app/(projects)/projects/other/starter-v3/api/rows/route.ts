import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { addRow, deleteRow, listRows, updateRow } from "../../_lib/rows";
import { readLinked } from "../../_lib/stores/read";

// ДВЕРЬ СТРОК ВЫВОДА — то, что показывают вкладки дашборда и календаря.
//   GET    api/rows?table=history&search=&offset=0&limit=20 — страница строк + `hasMore`
//   POST   api/rows { table, id, set }                      — правка одной строки по её id
//   PUT    api/rows { table, values }                       — создать строку ВРУЧНУЮ (владелец, шаг 298)
//   DELETE api/rows?table=history&id=<id>                   — удалить строку
//
// ПОИСК И ПАГИНАЦИЯ НА СЕРВЕРЕ (шаг 298, перенос таблицы v1 один-в-один): таблица показывает «последние N +
// показать ещё», а поиск идёт по всем полям строки. Считать это на клиенте значило бы тянуть всю таблицу в
// браузер — v1 этого не делал, и мы не делаем.
//
// 🔒 РУЧНОЕ СОЗДАНИЕ/УДАЛЕНИЕ СТРОК (`PUT`/`DELETE`) — по прямому требованию владельца при переносе таблицы
// первой версии («max copy»): в v1 у таблицы были «Добавить строку», правка по клику и удаление, и они
// перенесены целиком. Обычный путь рождения строки остаётся прежним — её пишет выходной узел прогона;
// ручная запись существует ДЛЯ ВЛАДЕЛЬЦА (заполнить справочник, поправить историю), а не для автоматизации.
// Идентичность и рождение (`id`, `table`, `createdAt`) правкой не затрагиваются — их отбрасывает `updateRow`.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const p = req.nextUrl.searchParams;
  const table = (p.get("table") ?? "history").trim();
  const search = (p.get("search") ?? "").trim().toLowerCase();

  // ОДНА СТРОКА СО ВСЕМ ЕЁ ОКРУЖЕНИЕМ (шаг 328.1): `?table=map&id=<id>&linked=1`.
  //
  // Зачем дверь. Связи обоюдны и ставит их сама запись (311.9а), а обход `readLinked` жил только на
  // сервере: владелец видел метку и не мог из неё попасть к сущности. Ящик сущности читает ИМЕННО ЭТУ
  // дверь — без неё ему нечего показывать.
  //
  // ЦЕНТР ОКРУЖЕНИЯ — ЗАПИСЬ ОСНОВНОЙ БАЗЫ: метка, объект, квитанция памяти и событие суть ГРАНИ записи,
  // поэтому от любой из них раскрывается одна и та же сущность. Записи нет (журнальная строка истории или
  // аналитики) — `record: null`, и ящик обязан сказать это словами, а не показать пустоту.
  if (p.get("linked")) {
    const id = (p.get("id") ?? "").trim();
    if (!id) return NextResponse.json({ error: "id is required — a neighbourhood is read from one row" }, { status: 400 });
    const row = (await listRows(table, Infinity)).find((r) => r.id === id);
    if (!row) return NextResponse.json({ error: `table "${table}" has no row "${id}"` }, { status: 404 });

    const neighbours = (await readLinked(row)).rows;
    const record = row.table === "database" ? row : neighbours.find((r) => r.table === "database") ?? null;
    // Соседи ЗАПИСИ, а не только кликнутой строки: у метки в связях лежит запись, а объект и событие висят
    // на записи — один шаг от неё собирает все грани сущности.
    const around = record && record.id !== row.id ? (await readLinked(record)).rows : neighbours;

    const linked: Record<string, typeof around> = {};
    for (const r of [...around, ...(record && record.id !== row.id ? [record] : [])]) {
      if (r.id === row.id) continue; // сама кликнутая строка приезжает полем `row`
      (linked[String(r.table)] ??= []).push(r);
    }
    return NextResponse.json({ table, row, record, linked });
  }
  const offset = Math.max(0, Number(p.get("offset") ?? 0) || 0);
  const limit = Math.max(1, Math.min(500, Number(p.get("limit") ?? 20) || 20));

  const all = await listRows(table, Infinity);
  const matched = search
    ? all.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(search)))
    : all;
  // `listRows` уже отдаёт свежие первыми — второй разворот не нужен.
  const ordered = matched;
  const page = ordered.slice(offset, offset + limit);
  return NextResponse.json({
    table,
    rows: page,
    total: ordered.length,
    hasMore: offset + page.length < ordered.length,
    source: ordered.length ? "runtime" : "empty",
  });
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

export async function PUT(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { table?: string; values?: Record<string, unknown> };
  const table = (body.table ?? "").trim();
  const values = body.values ?? {};
  if (!table) return NextResponse.json({ error: "table is required" }, { status: 400 });
  if (!Object.keys(values).length) return NextResponse.json({ error: "values is empty — a row needs at least one field" }, { status: 400 });
  const row = await addRow(table, values);
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const p = req.nextUrl.searchParams;
  const table = (p.get("table") ?? "").trim();
  const id = (p.get("id") ?? "").trim();
  if (!table || !id) return NextResponse.json({ error: "table and id are required" }, { status: 400 });
  const ok = await deleteRow(table, id);
  if (!ok) return NextResponse.json({ error: `table "${table}" has no row "${id}"` }, { status: 404 });
  return NextResponse.json({ ok: true });
}

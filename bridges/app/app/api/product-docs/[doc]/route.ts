import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { isDocKey, readDoc, writeDoc } from "@/lib/product-docs";

// Дверь к документам разработки продуктового слоя (шаг 501, слой «Документы»).
//
// Ключ приходит адресом, путь берётся из белого списка `DOC_FILES` — параметр
// адреса НИКОГДА не превращается в путь на диске. Без этого страница стала бы
// приглашением прочитать `../../etc/passwd`.
//
// Страница читает файл СЕРВЕРНО и сюда за чтением не ходит; этот маршрут нужен
// островку ради записи. GET оставлен для проверки и внешних инструментов.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ doc: string }> }) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { doc } = await params;
  if (!isDocKey(doc)) return NextResponse.json({ error: "unknown_document" }, { status: 404 });
  return NextResponse.json(readDoc(doc));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ doc: string }> }) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { doc } = await params;
  if (!isDocKey(doc)) return NextResponse.json({ error: "unknown_document" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  if (typeof body?.text !== "string") {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  try {
    writeDoc(doc, body.text);
    return NextResponse.json({ ok: true, ...readDoc(doc) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

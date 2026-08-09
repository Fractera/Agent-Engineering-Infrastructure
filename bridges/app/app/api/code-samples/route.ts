import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { listSamples, readSample, writeSample, removeSample } from "@/lib/code-samples";

// Дверь к образцам кода (шаг 501, 2026-08-09).
//
// Имя файла НИКОГДА не склеивается из того, что пришло: создание собирает его из
// проверенных имени и расширения, чтение и удаление сверяются с фактическим
// списком папки. Поэтому «../../etc/passwd» здесь не адрес, а несуществующий
// образец.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const file = req.nextUrl.searchParams.get("file");
  return NextResponse.json(file ? readSample(file) : listSamples());
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; ext?: unknown; text?: unknown }
    | null;

  if (typeof body?.name !== "string" || typeof body?.ext !== "string" || typeof body?.text !== "string") {
    return NextResponse.json({ error: "name_ext_text_required" }, { status: 400 });
  }

  const res = writeSample(body.name.trim(), body.ext.trim().toLowerCase(), body.text);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, file: res.file });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const file = req.nextUrl.searchParams.get("file");
  if (!file) return NextResponse.json({ error: "file_required" }, { status: 400 });

  const res = removeSample(file);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

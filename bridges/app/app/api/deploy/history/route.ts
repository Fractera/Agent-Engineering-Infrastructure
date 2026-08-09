import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

// A thin pass-through to the deploy history kept by the data layer. The secret stays on this side —
// the browser never learns it, exactly like the vector search route next door.
const DATA_URL    = process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://localhost:3300";
const DATA_SECRET = process.env.DATA_SECRET ?? "";

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id    = req.nextUrl.searchParams.get("id");
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";
  const path  = id ? `/deploy-runs/${encodeURIComponent(id)}` : `/deploy-runs?limit=${encodeURIComponent(limit)}`;

  try {
    const res  = await fetch(`${DATA_URL}${path}`, { headers: { "x-data-secret": DATA_SECRET } });
    const body = await res.json();

    // ?download=1 — отдать журнал ФАЙЛОМ (шаг 501). Так кнопка «скачать» на
    // странице становится обычной ссылкой: браузер сохраняет ответ сам, работает
    // правый щелчок и работает без JS. Прежде страница собирала Blob в памяти —
    // это требовало клиентского кода ради того, что умеет заголовок ответа.
    if (id && req.nextUrl.searchParams.get("download") === "1") {
      const run = (body as { run?: { id: string; status?: string; log?: string } }).run;
      if (!run) return NextResponse.json({ error: "run not found" }, { status: 404 });
      const name = `deploy-${run.id}-${String(run.status ?? "unknown").toLowerCase()}.txt`;
      return new NextResponse(run.log ?? "", {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          // Имя файла собирается из id и состояния — оба наши, посторонних
          // символов в них быть не может, но кавычки в заголовке всё равно
          // недопустимы, поэтому имя проходит через фильтр.
          "Content-Disposition": `attachment; filename="${name.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    // Loud: an unreachable data layer is a real fault, and an empty list would read as "no deploys yet".
    return NextResponse.json({ error: `Data layer unreachable: ${String(e)}` }, { status: 502 });
  }
}

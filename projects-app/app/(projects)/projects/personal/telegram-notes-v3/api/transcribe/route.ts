import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { transcribeAudio } from "../../_components/tools/voice-input/server/transcribe";

// ДВЕРЬ РАСШИФРОВКИ — ТОНКАЯ обёртка (шаг 298, микросервисы): вся серверная работа живёт в микросервисе
// голосового ввода (`_components/tools/voice-input/server/transcribe.ts`), рядом со своим клиентом, а не
// разбросана по `api/`. Дверь только проверяет входящего и маппит результат в HTTP.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const res = await transcribeAudio(form?.get("audio"));
  if (!res.ok) {
    return NextResponse.json({ error: res.error, ...(res.reason ? { reason: res.reason } : {}) }, { status: res.status });
  }
  return NextResponse.json({ ok: true, text: res.text });
}

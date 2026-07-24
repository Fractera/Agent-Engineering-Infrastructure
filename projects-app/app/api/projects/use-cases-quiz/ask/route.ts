import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import {
  defaultLanguage,
  nextUseCaseQuestion,
  type Turn,
} from "@/app/(projects)/projects/_shared-v2/components/use-cases/server/quiz-brain";

// v2-QUIZ КЕЙСОВ — РУЧНОЙ ВОПРОС. Тонкая дверь: вся ИИ-логика в микросервисе `_shared-v2/.../server`.
// Stateless — разговор целиком приходит от клиента (`turns`), сервер сессию не хранит.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { instruction?: string; turns?: Turn[] } | null;
  try {
    const question = await nextUseCaseQuestion(defaultLanguage(), body?.instruction ?? "", body?.turns ?? []);
    return NextResponse.json({ question });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

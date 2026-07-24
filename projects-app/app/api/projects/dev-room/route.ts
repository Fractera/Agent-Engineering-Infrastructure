import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { getDevRoom } from "@/app/(projects)/projects/_shared-v2/tools/dev-console/server/dev-room";

// ДВЕРЬ ДЕВ-КОМНАТЫ — ТОНКАЯ обёртка (шаг 298, микросервисы): вся серверная работа живёт в микросервисе
// дев-консоли (`_shared-v2/tools/dev-console/server/dev-room.ts`), рядом со своим клиентом. Дверь только
// проверяет входящего и маппит результат в HTTP.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const room = await getDevRoom(req.nextUrl.searchParams.get("automation") ?? "");
  if (!room.ok) return NextResponse.json({ error: room.error }, { status: room.status });
  return NextResponse.json({ ok: true, roomPath: room.roomPath, roomTask: room.roomTask });
}

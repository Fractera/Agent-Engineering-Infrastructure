import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { recordConsult } from "@/lib/consult-requests";

// Запрос консультации у разработчика (владелец 2026-08-14).
//
// 🔒 ЭТА ДВЕРЬ НЕ ОТПРАВЛЯЕТ ПИСЬМО, И ЭТО НЕ НЕДОДЕЛКА. На сервере пользователя
// отправителя почты НЕТ: в панели нет ни Resend, ни SMTP, ни nodemailer, а слой
// каналов почту не умеет — проверено по зависимостям и коду. Завести отправку
// значило бы либо просить у владельца сервера чужие почтовые ключи, либо гнать
// письма через нашу сторону, и то и другое — отдельная работа, а не строчка.
//
// Поэтому письмо отправляет САМ человек своей почтой (окно открывает готовое
// письмо на admin@fractera.ai), а сервер делает то, ради чего кнопка заведена:
// СЧИТАЕТ СПРОС. Нажатие фиксируется здесь и не зависит от того, дошло ли
// письмо, — иначе самый интересный сигнал терялся бы вместе с передумавшими.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { page?: unknown; topic?: unknown } | null;
  const page = typeof body?.page === "string" ? body.page.slice(0, 300) : "";
  const topic = typeof body?.topic === "string" ? body.topic.slice(0, 80) : "dev-tools";

  try {
    recordConsult({ page, topic });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Не записалось — человеку это не мешает: письмо он отправит всё равно.
    // Врать «ok» нельзя, но и ломать ему путь из-за нашего счётчика тоже.
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

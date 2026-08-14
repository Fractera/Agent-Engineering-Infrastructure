import { NextRequest, NextResponse } from "next/server";
import { requireAuth, sessionUser } from "@/lib/require-auth";
import { recordConsult } from "@/lib/consult-requests";

// Запрос консультации у разработчика (владелец 2026-08-14).
//
// 🔒 ПИСЬМО ОТПРАВЛЯЕТ НАША СТОРОНА, А НЕ ПОЧТА ЧЕЛОВЕКА. Первая версия
// открывала почтовый клиент с готовым письмом — владелец попробовал и сказал
// прямо: «почта не открывается». Дверь, работающая через раз, хуже
// отсутствующей: она обещает.
//
// На сервере пользователя отправителя почты нет (ни Resend, ни SMTP, ни почты в
// слое каналов), поэтому запрос уезжает СЕРВЕР-СЕРВЕРУ на сторону Fractera, где
// ключ почты уже живёт. Браузер в этом не участвует — значит нет ни CORS, ни
// зависимости от того, что установлено на машине человека.
//
// 🔒 ОБРАТНЫЙ АДРЕС БЕРЁТСЯ ИЗ СЕССИИ, а не спрашивается полем: система его уже
// знает, и просить набрать известное — это работа, придуманная для человека на
// ровном месте. Нет адреса в сессии — принимаем присланный, но врать о том, что
// письмо ушло, не будем.
//
// 🔒 СПРОС СЧИТАЕТСЯ ОТДЕЛЬНО ОТ ОТПРАВКИ. Строка в файл пишется ВСЕГДА, даже
// когда письмо не ушло: кнопка заведена ради замера спроса, и «сколько раз
// просили помощь» — величина, которую нельзя терять из-за чужой недоступности.

export const dynamic = "force-dynamic";

const CONSULT_URL = process.env.CONSULT_ENDPOINT ?? "https://www.fractera.ai/api/consult/dev-tools";

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  if (!(await requireAuth(cookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { page?: unknown; topic?: unknown; email?: unknown } | null;
  const page = typeof body?.page === "string" ? body.page.slice(0, 300) : "";
  const topic = typeof body?.topic === "string" ? body.topic.slice(0, 60) : "dev-tools";
  const given = typeof body?.email === "string" ? body.email.trim().slice(0, 200) : "";

  const who = await sessionUser(cookie);
  const email = who?.email && who.email !== "demo@local" ? who.email : given;

  // Спрос фиксируется первым: он не должен зависеть ни от адреса, ни от того,
  // дошло ли письмо.
  try { recordConsult({ page, topic }); } catch { /* счётчик наш, путь человека он ломать не вправе */ }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // Адреса нет — сказать об этом честно, чтобы окно спросило его у человека,
    // а не показывало «отправлено» в пустоту.
    return NextResponse.json({ ok: true, sent: false, reason: "no-email" });
  }

  try {
    const r = await fetch(CONSULT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email, page, topic,
        server: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_SERVICE_URL ?? "",
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return NextResponse.json({ ok: true, sent: false, reason: `upstream ${r.status}`, detail: detail.slice(0, 200), email });
    }
    return NextResponse.json({ ok: true, sent: true, email });
  } catch (e) {
    // Сеть наружу может быть закрыта — это не поломка кнопки, но и не отправка.
    // Окно покажет запасной путь, а не соврёт про успех.
    return NextResponse.json({ ok: true, sent: false, reason: String(e).slice(0, 200), email });
  }
}

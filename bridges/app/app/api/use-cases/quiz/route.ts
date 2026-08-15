import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  nextQuestion, synthesize, rewriteCase, autoStream, openAiKey, quizModel,
  classifyOpenAi, OpenAiError,
} from "@/lib/quiz-brain";
import { readSeed, appendRaw } from "@/lib/use-cases-store";
import { activeProduct } from "@/lib/products-config";

// Разговор Quiz: вопрос, автоквиз (стрим), синтез, переписывание одного кейса.
//
// Сервер СЕССИЮ НЕ ХРАНИТ (перенос из v2): разговор держит клиент и присылает
// целиком. Так автоквиз можно оборвать на середине, а страницу — перезагрузить,
// не оставив на сервере брошенных сессий.
//
// Ключ может отсутствовать: тогда отвечаем `no-key` отдельным кодом, чтобы
// поверхность показала дорогу в раздел OpenAI, а не общую ошибку.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Turn = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!openAiKey()) {
    return NextResponse.json({ error: "no-key", model: quizModel() }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    mode?: "ask" | "auto" | "synthesize" | "rewrite";
    /** Чей это разговор — продукт называется явно, как и везде. */
    productId?: string;
    lang?: string;
    turns?: Turn[];
    title?: string;
    summary?: string;
    remark?: string;
  } | null;
  if (!body?.mode) return NextResponse.json({ error: "mode_required" }, { status: 400 });

  const lang = body.lang ?? "en";
  const turns = body.turns ?? [];
  // Разговор идёт про КОНКРЕТНЫЙ продукт: его затравка, его стенограмма. Без
  // этого модель обсуждала бы первый продукт, пока владелец описывает второй.
  const pid = activeProduct(body.productId)?.id ?? "";
  if (!pid) return NextResponse.json({ error: "no_product" }, { status: 400 });
  const seed = readSeed(pid);

  try {
    if (body.mode === "ask") {
      const question = await nextQuestion(lang, seed, turns);
      return NextResponse.json({ question, ready: question.trim().toUpperCase() === "READY" });
    }

    if (body.mode === "auto") {
      // 🔒 АВТОКВИЗ РАЗВОРАЧИВАЕТ ОПИСАНИЕ ВЛАДЕЛЬЦА, А НЕ ПИШЕТ С НУЛЯ (правка
      // владельца 2026-07-26, перенесена дословно). Без затравки разворачивать
      // нечего — вышла бы выдумка, и владелец принял бы её за свой замысел.
      if (!seed && !turns.some((t) => t.role === "user")) {
        return NextResponse.json({ error: "no-seed" }, { status: 400 });
      }
      const upstream = await autoStream(lang, seed, turns);
      if (!upstream.ok || !upstream.body) {
        // Причина отказа приходит В ТЕЛЕ ответа OpenAI, и раньше она молча
        // выбрасывалась вместе с ним: наружу уезжал голый код состояния.
        const failure = classifyOpenAi(upstream.status, await upstream.text().catch(() => ""));
        return NextResponse.json({ error: failure.code, detail: failure.detail }, { status: 502 });
      }
      return new Response(upstream.body, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    if (body.mode === "synthesize") {
      const cases = await synthesize(seed, turns);
      if (turns.length) appendRaw(pid, turns, "разговор перед синтезом");
      return NextResponse.json({ cases });
    }

    if (body.mode === "rewrite") {
      if (!body.title || !body.remark) {
        return NextResponse.json({ error: "title_and_remark_required" }, { status: 400 });
      }
      const next = await rewriteCase(body.title, body.summary ?? "", body.remark);
      appendRaw(pid, [{ role: "user", content: body.remark }], `правка кейса «${body.title}»`);
      return NextResponse.json({ case: next });
    }

    return NextResponse.json({ error: "unknown_mode" }, { status: 400 });
  } catch (e) {
    // Отказ OpenAI уезжает СВОИМ кодом и со своей подробностью: между «ключ
    // отклонён», «деньги кончились» и «модели нет» стоят разные действия
    // владельца, и одно слово «не удалось» не подсказывает ни одного.
    if (e instanceof OpenAiError) {
      return NextResponse.json({ error: e.code, detail: e.detail, model: quizModel() }, { status: 502 });
    }
    const msg = String((e as Error).message ?? e);
    if (msg === "no-key") return NextResponse.json({ error: "no-key" }, { status: 400 });
    // Сеть до OpenAI не дошла вовсе (нет доступа наружу, таймаут) — это тоже не
    // «не удалось», а называемая причина.
    return NextResponse.json({ error: "upstream", detail: msg.slice(0, 300) }, { status: 500 });
  }
}

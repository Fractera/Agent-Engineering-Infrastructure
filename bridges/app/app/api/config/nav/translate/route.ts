import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { openAiKey } from "@/lib/quiz-brain";

// Перевод ПОДПИСЕЙ КНОПОК меню на языки приложения.
//
// 🔒 ДВЕРЬ, А НЕ ВЫЗОВ ИЗ БРАУЗЕРА. Ключ OpenAI не уходит клиенту ни при каких
// обстоятельствах: всё, что попадает в браузер, читается любым посетителем через
// вкладку разработчика.
//
// 🔒 ПОЧЕМУ НЕ ЗОВЁМ МАРШРУТ ПРИЛОЖЕНИЯ. У приложения есть свой
// `/api/i18n/translate`, но он закрыт ролью сотрудника и живёт в другом
// процессе: панели пришлось бы притворяться пользователем приложения. Ключ у
// панели уже есть — тот же, что у Quiz, — поэтому дверь своя, а правила общие.
//
// 🔒 ПОДПИСЬ КОРОТКАЯ, И ЭТО ЧАСТЬ ЗАДАНИЯ МОДЕЛИ. Кнопка меню — двенадцать
// знаков; перевод, который в них не влезает, бесполезен, поэтому предел сказан
// модели прямо, а не обрезается молча после неё.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gpt-5-mini";
const API = "https://api.openai.com/v1/chat/completions";
const LABEL_MAX = 12;

type Body = {
  /** Подписи как есть: { "<id>": "Blog" }. */
  texts?: Record<string, string>;
  from?: string;
  to?: string[];
};

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = openAiKey();
  // Причина отказа называется КОДОМ, а не прозой: интерфейс по нему показывает
  // нужную подсказку, а не общее «не удалось», после которого некуда идти.
  if (!key) return NextResponse.json({ error: "no-key" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const texts = body?.texts ?? {};
  const from = body?.from ?? "en";
  const to = (body?.to ?? []).filter((l) => l && l !== from);
  if (!Object.keys(texts).length || !to.length) {
    return NextResponse.json({ error: "texts and to are required" }, { status: 400 });
  }

  // Один запрос на ВСЕ языки и ВСЕ подписи: запрос на каждую пару — это десятки
  // вызовов на одно меню, дороже и с частичным результатом при обрыве.
  const prompt = [
    `Translate the values of this JSON object from ${from} into each of these languages: ${to.join(", ")}.`,
    `These are NAVIGATION BUTTON labels. Each translation MUST be at most ${LABEL_MAX} characters —`,
    `choose a shorter natural word rather than a literal long one. Never pad, never explain.`,
    `Return ONLY a JSON object shaped { "<lang>": { "<key>": "<translation>" } } with no commentary.`,
    `Do not translate proper names, product names or URLs.`,
    `Source: ${JSON.stringify(texts)}`,
  ].join("\n");

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      // «Кончились деньги» и «ключ не тот» — разные беды с разными действиями.
      const detail = await res.json().catch(() => null);
      const code = String(detail?.error?.code ?? "");
      if (res.status === 401) return NextResponse.json({ error: "bad-key" }, { status: 401 });
      if (code === "insufficient_quota") return NextResponse.json({ error: "no-funds" }, { status: 402 });
      if (res.status === 429) return NextResponse.json({ error: "rate-limit" }, { status: 429 });
      return NextResponse.json({ error: "upstream", upstreamStatus: res.status }, { status: 502 });
    }

    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}") as
      Record<string, Record<string, string>>;

    // Отдаём только запрошенное: модель иногда добавляет от себя, и лишний ключ
    // уехал бы в конфиг как настоящий перевод. Длина режется и здесь — модель
    // просили, но обещать за неё нельзя.
    const out: Record<string, Record<string, string>> = {};
    for (const lang of to) {
      const got = parsed[lang];
      if (!got) continue;
      out[lang] = {};
      for (const field of Object.keys(texts)) {
        const v = got[field];
        if (typeof v !== "string" || !v.trim()) continue;
        const t = v.trim();
        out[lang][field] = t.length <= LABEL_MAX ? t : `${t.slice(0, LABEL_MAX - 1).trimEnd()}…`;
      }
    }
    return NextResponse.json({ translations: out });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}

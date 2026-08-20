import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { openAiKey, quizModel, languageName } from "@/lib/quiz-brain";

// РАСПОЗНАВАНИЕ СОЦСЕТИ — ПОЛНЫЙ ЦИКЛ, А НЕ ОЦИФРОВКА НАЗВАНИЯ (шаг 523).
//
// 🔒 ЗАЧЕМ ЭТО СУЩЕСТВУЕТ. Владелец говорит голосом: «добавь мой Instagram, профиль
// латиницей, транслитерацией, слова через дефис». Из этой фразы надо получить ТРИ
// разные вещи, и ни одну нельзя угадать полем ввода:
//   • какая это сеть — «телеграм», «Telegram», «tg» пишут по-разному, а значок и
//     правило ссылки надо взять одни и те же;
//   • как у этой сети собирается адрес — `t.me/<псевдоним>`, `wa.me/<номер>`, у
//     LinkedIn личный профиль это `/in/`, а не `/company/`;
//   • какой именно профиль имелся в виду — из описания рождается несколько
//     кандидатов, и выбрать обязан человек, а не модель.
//
// 🔒 У ПРОВЕРКИ ТРИ ИСХОДА, А НЕ ДВА. Instagram и LinkedIn закрываются от ботов
// НЕЗАВИСИМО от того, существует профиль или нет. Спрятать это в «нет» значит
// уверенно предложить владельцу не тот профиль — то есть соврать тихо. Поэтому
// исходов три: `exists` · `absent` · `closed` (сеть не отвечает посторонним).
//
// 🔒 ОТВЕТ ПРЕДЛАГАЕТСЯ, А НЕ ПРИМЕНЯЕТСЯ. Эта дверь ничего не пишет в конфиг: она
// возвращает предложение, а сохраняет его владелец, посмотрев на имя, значок и
// пример собранной ссылки.

export const dynamic = "force-dynamic";

type Outcome = "exists" | "absent" | "closed";

type Candidate = { value: string; url: string; outcome: Outcome; code: number | null };

/**
 * Чем закончилась проверка адреса.
 *
 * Разбор намеренно грубый и честный: мы не притворяемся, что умеем отличить
 * «нет такого профиля» от «нас не пустили», когда сеть отвечает одинаково.
 */
function classify(code: number | null): Outcome {
  if (code === null) return "closed";              // не ответила вовсе — судить не о чем
  if (code === 404 || code === 410) return "absent";
  if (code >= 200 && code < 300) return "exists";
  if (code === 401 || code === 403 || code === 429) return "closed";
  if (code >= 300 && code < 400) return "closed";  // увела на вход — значит закрыта
  return "closed";
}

/**
 * Значение внутри адреса: кодируем ТОЛЬКО то, что действительно опасно.
 *
 * 🔒 `encodeURIComponent` ЛОМАЕТ НОМЕРА ТЕЛЕФОНОВ (найдено замером 2026-08-21).
 * Она считает небезопасным `+`, хотя в пути он законен, и превращает его в
 * `%2B`: номер `+79161234567` становился адресом `wa.me/%2B79161234567` —
 * ссылка выглядит правильной и не работает. Пострадала бы любая сеть, где
 * значение это номер, а не псевдоним.
 */
function encodeValue(v: string): string {
  return encodeURIComponent(v).replace(/%2B/g, "+").replace(/%40/g, "@");
}

async function probe(url: string): Promise<Candidate["code"]> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 (compatible; FracteraSocialCheck/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    return res.status;
  } catch {
    return null;
  }
}

const PROMPT = `You turn a free-form phrase about a social network into a machine record.

Return STRICT JSON only, no prose, with exactly these keys:
{
  "name": "canonical network name as its owner writes it, e.g. Instagram, X, Telegram, LinkedIn",
  "iconSlug": "simple-icons slug, lowercase, e.g. instagram, x, telegram, linkedin",
  "urlTemplate": "profile URL with the literal placeholder {value}, e.g. https://t.me/{value}",
  "valueHint": "what the owner must type, in HIS language: handle without @, phone number, full URL",
  "candidates": ["up to 5 handle guesses derived from the phrase, most likely first"]
}

Rules that matter:
- The URL template must be the form used for the kind of profile the phrase describes. LinkedIn
  personal profiles are /in/, companies are /company/ — choose by the phrase, do not default.
- If the phrase describes how the handle is spelled (transliteration, hyphens, dots), produce the
  spelling variants as candidates: hyphenated, dotted, and joined.
- If the phrase already contains an explicit handle or URL, put it first in candidates.
- If you cannot recognise the network, return "name": "" and leave the rest empty.`;

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = openAiKey();
  // 🔒 НЕТ КЛЮЧА — ЭТО ФАКТ, А НЕ ПОЛОМКА. Панель обязана предложить ручной ввод,
  // поэтому ответ успешный, а причина названа своим именем.
  if (!key) return NextResponse.json({ ok: false, reason: "no-key" });

  let phrase = "";
  let lang = "en";
  try {
    const body = (await req.json()) as { phrase?: unknown; lang?: unknown };
    phrase = typeof body.phrase === "string" ? body.phrase.trim() : "";
    lang = typeof body.lang === "string" ? body.lang : "en";
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!phrase) return NextResponse.json({ error: "Empty phrase" }, { status: 400 });

  let proposal: {
    name: string; iconSlug: string; urlTemplate: string; valueHint: string; candidates: string[];
  };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: quizModel(),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${PROMPT}\n\nThe owner speaks ${languageName(lang)}; write valueHint in that language.` },
          { role: "user", content: phrase },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      // Отказ модели называется своим именем — то же правило, что у Quiz.
      return NextResponse.json({ ok: false, reason: "model", detail: `${res.status} ${(await res.text()).slice(0, 200)}` });
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    proposal = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "model", detail: String(e).slice(0, 200) });
  }

  if (!proposal?.name) return NextResponse.json({ ok: false, reason: "unknown-network" });

  // Кандидаты проверяются ПАРАЛЛЕЛЬНО и с потолком: пять адресов по шесть секунд
  // последовательно — это полминуты ожидания у человека, который сказал одну фразу.
  // 🔒 ДУБЛИ УБИРАЮТСЯ ДО ПРОВЕРКИ (замер 2026-08-21). Модель на номере телефона
  // вернула `79161234567` дважды: пять «вариантов написания» превратились в четыре,
  // и человек читал один и тот же адрес в двух строках, ища между ними разницу.
  // Заодно это экономит лишний поход в сеть.
  const raw = [...new Set(
    (Array.isArray(proposal.candidates) ? proposal.candidates : [])
      .map((v) => String(v).trim().replace(/^@/, ""))
      .filter(Boolean),
  )].slice(0, 5);
  const candidates: Candidate[] = await Promise.all(
    raw.map(async (value) => {
      const v = value;
      const url = proposal.urlTemplate.includes("{value}")
        ? proposal.urlTemplate.replace("{value}", encodeValue(v))
        : proposal.urlTemplate;
      const code = await probe(url);
      return { value: v, url, outcome: classify(code), code };
    }),
  );

  return NextResponse.json({
    ok: true,
    name: proposal.name,
    iconSlug: proposal.iconSlug ?? "",
    urlTemplate: proposal.urlTemplate ?? "",
    valueHint: proposal.valueHint ?? "",
    candidates,
  });
}

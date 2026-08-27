import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { isFlowStep, setFlowValue, flowValue, flowShown, FLOW_STEPS, flowDone } from "@/lib/launch-flow";

// ДВЕРЬ НОВОГО ПУТИ ЗАПУСКА (шаг 28-17, 2026-08-27).
//
// 🔒 ОТДЕЛЬНАЯ ДВЕРЬ, А НЕ `api/config/launch/step`. Та пишет состояние ЖИВОГО
// мастера, и трогать её запрещено владельцем. Эта пишет собственные ключи нового
// пути (`USER_FLOW_*`) и ни одного чужого.
//
// 🔒 `requireAuth` НА ОБОИХ МЕТОДАХ. Дверь панели без гейта — это дверь в
// `.env.local` слота, открытая интернету. Проверяется зондом без сессии: 401.
//
// 🔒 СЕКРЕТ УЕЗЖАЕТ ТЕЛОМ ЗАПРОСА, А НЕ СТРОКОЙ АДРЕСА. Токен в query попал бы в
// журнал nginx, в историю браузера и в заголовок Referer при первом же переходе
// наружу. Поэтому POST с телом и никаких GET-параметров со значением.
//
// 🔒 ЧТЕНИЕ ОТДАЁТ ПОКАЗЫВАЕМОЕ ЗНАЧЕНИЕ, А НЕ НАСТОЯЩЕЕ. Токен возвращается
// замаскированным (`flowShown`): страница показывает, ЧТО он сохранён, и не
// раскладывает его по чужим экранам. Полное значение не покидает сервер вовсе.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    steps: FLOW_STEPS.map((step) => ({
      step,
      done: flowDone(step),
      shown: flowShown(step),
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { step?: unknown; value?: unknown }
    | null;

  if (!isFlowStep(body?.step)) {
    return NextResponse.json({ error: "unknown-step" }, { status: 400 });
  }

  const value = typeof body?.value === "string" ? body.value.trim() : "";
  if (value === "") {
    return NextResponse.json({ error: "empty-value" }, { status: 400 });
  }

  // 🔒 ПРОВЕРКА ФОРМЫ АДРЕСА — ЗДЕСЬ, А НЕ ТОЛЬКО В БРАУЗЕРЕ. Островок проверяет
  // ради быстрого ответа человеку; дверь проверяет потому, что в неё может
  // постучать не островок. Форма минимальная: это ещё не проверка связи — та
  // спрашивает у GitHub и живёт в отдельном шаге.
  if (body.step === "repo-url" && !/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/.test(value)) {
    return NextResponse.json({ error: "bad-repo-url" }, { status: 422 });
  }

  setFlowValue(body.step, value);

  return NextResponse.json({
    ok: true,
    step: body.step,
    done: flowValue(body.step) !== "",
    shown: flowShown(body.step),
  });
}

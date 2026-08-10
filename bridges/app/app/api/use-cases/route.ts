import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  listCases, useCasesGate, appendCases, writeCase, setStatus, confirmAll, deleteCase,
  migrateLegacy, appendRaw, writeSeed, readSeed, appendTurns, readTurns,
} from "@/lib/use-cases-store";

// Кейсы: чтение папки и действия над ней.
//
// Одна дверь на все операции с самими кейсами — они мелкие и всегда об одном и
// том же файле. Разговор с моделью живёт отдельно (`./quiz`), потому что он
// длинный, стримится и может стоить денег.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const state = listCases();
  return NextResponse.json({ ...state, gate: useCasesGate(), seed: readSeed(), turns: readTurns() });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    op?: string;
    id?: string;
    title?: string;
    summary?: string;
    seed?: string;
    cases?: { title: string; summary: string }[];
    turns?: { role: "user" | "assistant"; content: string }[];
    note?: string;
  } | null;
  if (!body?.op) return NextResponse.json({ error: "op_required" }, { status: 400 });

  switch (body.op) {
    // Ответы на вводные вопросы. Ложатся и затравкой, и в стенограмму: сырьё
    // пишется ВСЕГДА, иначе первые семь ответов — единственное, что исчезает.
    case "seed": {
      if (!body.seed?.trim()) return NextResponse.json({ error: "seed_required" }, { status: 400 });
      writeSeed(body.seed);
      if (body.turns?.length) {
        appendRaw(body.turns, body.note ?? "вводные вопросы");
        appendTurns(body.turns);
      }
      return NextResponse.json({ ok: true });
    }
    case "append": {
      if (!body.cases?.length) return NextResponse.json({ error: "cases_required" }, { status: 400 });
      const ids = appendCases(body.cases);
      return NextResponse.json({ ok: true, ids, gate: useCasesGate() });
    }
    case "edit": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = writeCase(body.id, { title: body.title, summary: body.summary });
      return NextResponse.json({ ok, gate: useCasesGate() });
    }
    case "confirm": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = setStatus(body.id, "confirmed");
      return NextResponse.json({ ok, gate: useCasesGate() });
    }
    case "unconfirm": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = setStatus(body.id, "draft");
      return NextResponse.json({ ok, gate: useCasesGate() });
    }
    case "confirmAll": {
      const n = confirmAll();
      return NextResponse.json({ ok: true, confirmed: n, gate: useCasesGate() });
    }
    case "delete": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = deleteCase(body.id);
      return NextResponse.json({ ok, gate: useCasesGate() });
    }
    case "migrate": {
      const r = migrateLegacy();
      return NextResponse.json({ ...r, gate: useCasesGate() });
    }
    // Стенограмма из клиента: ручной диалог держится на клиенте (сервер сессию
    // не хранит), поэтому сохранить его может только он.
    // Разговор дописывается ПОСЛЕ КАЖДОЙ реплики, а не в конце: владелец вправе
    // закрыть окно на середине, и накопленное обязано пережить это.
    case "raw": {
      if (body.turns?.length) {
        appendRaw(body.turns, body.note);
        appendTurns(body.turns);
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "unknown_op" }, { status: 400 });
  }
}

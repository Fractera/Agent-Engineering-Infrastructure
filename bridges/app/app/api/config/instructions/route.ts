import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  readInstructionSet, writeInstructionSet, syncInstructionSection, ensureDoc,
  TOGGLEABLE, defaultEnabled,
} from "@/lib/instruction-set";
import { isDocKey, type DocKey } from "@/lib/product-docs";

// Выключатели инструкций проекта.
//
// Отдельный маршрут, а не ветка общего конфига: одно переключение делает ТРИ
// вещи, и все три обязаны случиться вместе — записать флаг, переписать
// управляемую область в `CLAUDE.md` слота и, при включении, создать документ,
// если проект родился раньше него. Флаг без области — настройка, о которой агент
// не узнает; область без документа — правило, указывающее в пустоту.

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { doc?: string; enabled?: boolean; allOff?: boolean }
    | null;
  if (!body) return NextResponse.json({ error: "bad_payload" }, { status: 400 });

  const state = readInstructionSet();
  const enabled = { ...state.enabled };
  let snapshot = state.snapshot;
  const created: string[] = [];

  if (typeof body.allOff === "boolean") {
    // Мастер-выключатель. Выключая — запоминаем набор целиком, чтобы возврат
    // включил ровно то, что было, а не «всё подряд»: у владельца могли быть
    // выключены отдельные документы задолго до этого.
    if (body.allOff) {
      snapshot = TOGGLEABLE.filter((k) => enabled[k]);
      for (const k of TOGGLEABLE) enabled[k] = false;
    } else {
      const restore = snapshot ?? TOGGLEABLE.filter((k) => defaultEnabled(k));
      for (const k of TOGGLEABLE) enabled[k] = restore.includes(k);
      snapshot = null;
    }
  } else if (typeof body.doc === "string" && typeof body.enabled === "boolean") {
    if (!isDocKey(body.doc) || !TOGGLEABLE.includes(body.doc as DocKey)) {
      return NextResponse.json({ error: "not_toggleable" }, { status: 400 });
    }
    enabled[body.doc] = body.enabled;
    // Ручное переключение отменяет мастер-снимок: набор снова живёт сам по себе,
    // и восстанавливать было бы нечего.
    if (body.enabled) snapshot = null;
  } else {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  try {
    writeInstructionSet(state.config, enabled, snapshot);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  for (const key of TOGGLEABLE) {
    if (!enabled[key]) continue;
    const r = ensureDoc(key as DocKey);
    if (r.created) created.push(key);
  }

  const section = syncInstructionSection(enabled);

  return NextResponse.json({ ok: true, enabled, snapshot, instruction: section, created });
}

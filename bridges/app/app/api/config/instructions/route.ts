import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  readInstructionSet, writeInstructionSet, syncInstructionSection, ensureDoc,
  TOGGLEABLE, defaultEnabled, readCommands, COMMAND_VERBS, isInDevelopment,
  requiresUseCases,
  type CommandMap, type CommandVerb,
} from "@/lib/instruction-set";
import { useCasesGate } from "@/lib/use-cases-store";

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
    | { doc?: string; enabled?: boolean; allOff?: boolean; command?: { doc: string; verb: string; lang: string; phrase: string } }
    | null;
  if (!body) return NextResponse.json({ error: "bad_payload" }, { status: 400 });

  const state = readInstructionSet();
  const enabled = { ...state.enabled };
  let snapshot = state.snapshot;
  const created: string[] = [];
  let commands: CommandMap | undefined;

  // Правка фразы активации. Пустая фраза возвращает документ к поставленной по
  // умолчанию — стереть команду насовсем нельзя: документ-запрет без способа
  // его снять превращается в стену.
  if (body.command) {
    const { doc, verb, lang, phrase } = body.command;
    if (!TOGGLEABLE.includes(doc)) return NextResponse.json({ error: "not_toggleable" }, { status: 400 });
    if (!(COMMAND_VERBS as readonly string[]).includes(verb)) {
      return NextResponse.json({ error: "unknown_verb" }, { status: 400 });
    }
    const next = readCommands(state.config);
    const doc0 = { ...(next[doc] ?? {}) };
    const phrases = { ...(doc0[verb as CommandVerb] ?? {}) };
    if (phrase.trim()) phrases[lang] = phrase.trim();
    else delete phrases[lang];
    doc0[verb as CommandVerb] = phrases;
    next[doc] = doc0;
    commands = next;
  }

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
      // Возврат мастер-выключателя не имеет права открыть дверь, запертую
      // условием: снимок сделан раньше, а кейсы могли быть удалены после него.
      // Без этой строки мастер стал бы обходом замка — самым тихим из возможных,
      // потому что владелец нажимал «вернуть как было», а не «включить».
      for (const k of TOGGLEABLE) {
        if (enabled[k] && requiresUseCases(k) && useCasesGate().kind !== "ready") enabled[k] = false;
      }
      snapshot = null;
    }
  } else if (typeof body.doc === "string" && typeof body.enabled === "boolean") {
    if (!TOGGLEABLE.includes(body.doc)) {
      return NextResponse.json({ error: "not_toggleable" }, { status: 400 });
    }
    // Возможность ещё не открыта: включить нельзя, и отказ идёт С СЕРВЕРА —
    // интерфейсный запрет обходится одним `curl`, и тогда в инструкции агента
    // оказался бы закон о механизме, которого в продукте нет. Выключить
    // разрешаем всегда: запирать владельца в состоянии, которого он не выбирал,
    // мы права не имеем.
    if (body.enabled && isInDevelopment(body.doc)) {
      return NextResponse.json({ error: "in_development" }, { status: 409 });
    }
    // Дверь, запертая условием: возможность есть, но включать её раньше кейсов
    // дороже, чем не включать. Отказ несёт СОСТОЯНИЕ гейта, а не голое «нельзя»:
    // владелец должен увидеть, сколько кейсов написано и сколько подтверждено,
    // иначе отказ читается как поломка.
    if (body.enabled && requiresUseCases(body.doc)) {
      const gate = useCasesGate();
      if (gate.kind !== "ready") {
        return NextResponse.json({ error: "needs_use_cases", gate }, { status: 409 });
      }
    }
    enabled[body.doc] = body.enabled;
    // Ручное переключение отменяет мастер-снимок: набор снова живёт сам по себе,
    // и восстанавливать было бы нечего.
    if (body.enabled) snapshot = null;
  } else {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  try {
    writeInstructionSet(state.config, enabled, snapshot, commands);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  for (const key of TOGGLEABLE) {
    if (!enabled[key]) continue;
    const r = ensureDoc(key);
    if (r.created) created.push(key);
  }

  const section = syncInstructionSection(enabled, commands ?? state.commands);

  return NextResponse.json({ ok: true, enabled, snapshot, instruction: section, created });
}

// @api save the owner's own description of one section kind into the slot
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";

// ОПИСАНИЕ СЕКЦИИ, НАПИСАННОЕ ВЛАДЕЛЬЦЕМ (шаг 541, требование владельца
// 2026-08-22: «не только искусственный интеллект может всегда писать, но и человек
// может его создавать»).
//
// 🔒 ХРАНИТСЯ ОТДЕЛЬНО ОТ ПОРОЖДЁННОГО КАТАЛОГА, И ЭТО НЕ МЕЛОЧЬ.
// `sections/SECTIONS.json` порождается сборкой приложения и стережётся гейтом
// `check:blocks-map`: любая правка руками роняет следующую сборку. Значит писать
// туда из панели нельзя — панель сломала бы проект владельца молча, а он узнал бы
// об этом на развёртывании.
//
// Поэтому слова владельца живут в своём файле `sections/descriptions.json`. Он
// НЕ порождается, гейтом не стережётся, и правится панелью так же, как четыре
// конфига: панель пишет — приложение и панель читают.
//
// 🔒 ДВА ГОЛОСА, А НЕ ДВЕ КОПИИ ОДНОГО. В карточке вида (`sections/blocks/<вид>.md`)
// живут заметки АГЕНТА: что ломается, что уже оплачено ошибкой. Здесь — слова
// ВЛАДЕЛЬЦА: где эту секцию применять, чего он от неё хочет. Агент читает оба, и
// перепутать их нельзя — у них разные авторы и разная цена.

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const FILE =
  process.env.SECTIONS_DESCRIPTIONS_PATH ?? path.join(APP_DIR, "sections", "descriptions.json");

/** Ограничение длины — не вкус, а защита файла от вставки целой книги. */
const MAX = 4000;

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as { kind?: unknown; text?: unknown };
    const kind = typeof body.kind === "string" ? body.kind.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";

    // Имя вида — машинная строка из каталога. Проверяем формой, а не списком:
    // список пришлось бы держать в двух местах и он разошёлся бы с реестром.
    if (!kind || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(kind)) {
      return NextResponse.json({ error: "bad kind" }, { status: 400 });
    }
    if (text.length > MAX) {
      return NextResponse.json({ error: "too long" }, { status: 400 });
    }

    let all: Record<string, string> = {};
    try {
      const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
      if (raw && typeof raw === "object") all = raw as Record<string, string>;
    } catch {
      /* файла ещё нет — это законное начало, а не ошибка */
    }

    // Пустой текст СТИРАЕТ запись, а не сохраняет пустую строку: «владелец ничего
    // не сказал» и «владелец сказал пусто» — разные вещи, и вторая была бы ложью.
    if (text) all[kind] = text;
    else delete all[kind];

    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n", "utf8");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "write failed" },
      { status: 500 },
    );
  }
}

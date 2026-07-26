import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { readInstruction, instructionNames } from "../../_lib/instructions";
import { SYSTEM_INSTRUCTION_NAMES, type SystemInstructionName } from "../../_data/automation.schema";

// ДВЕРЬ ЗАКОНА ПО ИМЕНИ. Объект ядра несёт имя своей инструкции — здесь по этому имени берут текст.
//
//   GET api/instruction            -> список имён
//   GET api/instruction?name=nodes -> текст одной инструкции
//
// Тот же текст лежит файлом в `_instructions/<имя>.md`: агент с доступом к файловой системе читает его
// напрямую, агент без доступа — этой дверью. Источник один.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const name = (req.nextUrl.searchParams.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ names: instructionNames() });
  if (!SYSTEM_INSTRUCTION_NAMES.includes(name as SystemInstructionName)) {
    return NextResponse.json({ error: `no instruction named "${name}"`, names: instructionNames() }, { status: 404 });
  }
  const text = await readInstruction(name as SystemInstructionName);
  return NextResponse.json({ name, text, ...(text ? {} : { note: "not written yet — an empty instruction is lawful" }) });
}

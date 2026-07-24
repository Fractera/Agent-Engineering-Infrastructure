import { type NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { authorize, resolveProject } from "@/lib/nodes";
import { createNodeId } from "@/lib/cuid";
import {
  defaultLanguage,
  synthesizeUseCases,
  type Turn,
} from "@/app/(projects)/projects/_shared-v2/components/use-cases/server/quiz-brain";

// v2-QUIZ КЕЙСОВ — СИНТЕЗ В ЯДРО. Разговор (описание сценариев + автоквиз) превращается в пронумерованные
// кейсы и ДОПИСЫВАЕТСЯ в ядро автоматизации (`useCases.cases` в `automation.json`) — это источник кейсов v2,
// НЕ БД v1. Новые кейсы приходят со статусом `new`; ревью само расходится (панель считает подпись заново).
export const runtime = "nodejs";

type CoreCase = { cuid: string; number: number; title: string; text: string; status: string };

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; instruction?: string; turns?: Turn[] } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const coreFile = join(proj.projectDir, "_data", "automation.json");
  let core: { useCases?: { systemInstructionName?: string; warnings?: unknown[]; cases?: CoreCase[]; reviewedSignature?: string } };
  try {
    core = JSON.parse(readFileSync(coreFile, "utf8"));
  } catch {
    return NextResponse.json({ error: "not a v2 automation (no _data/automation.json)" }, { status: 404 });
  }

  let cases: { title: string; summary: string }[];
  try {
    cases = await synthesizeUseCases(defaultLanguage(), body?.instruction ?? "", body?.turns ?? []);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  if (!cases.length) {
    return NextResponse.json({ error: "the conversation was too thin to make a use case" }, { status: 409 });
  }

  core.useCases = core.useCases ?? { systemInstructionName: "useCases", warnings: [], cases: [] };
  const existing: CoreCase[] = core.useCases.cases ?? [];
  let next = existing.reduce((m, c) => Math.max(m, c.number ?? 0), 0);
  for (const c of cases) {
    existing.push({ cuid: createNodeId(), number: ++next, title: c.title, text: c.summary || c.title, status: "new" });
  }
  core.useCases.cases = existing;
  writeFileSync(coreFile, JSON.stringify(core, null, 2) + "\n", "utf8");

  return NextResponse.json({ ok: true, added: cases.length, cases: cases.map((c) => ({ title: c.title })) });
}

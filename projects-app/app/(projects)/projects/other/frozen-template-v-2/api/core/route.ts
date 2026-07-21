import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { readCore, locate, type Address } from "../../_lib/core-io";
import { lawDigest } from "../../_lib/law-digest";
import { allNodes, type SystemInstructionName } from "../../_data/automation.schema";
import { readInstruction } from "../../_lib/instructions";

// The object names its law (`systemInstructionName`); the door reads that named file and attaches the
// TEXT to the answer, so a model gets the law where it gets the object — while the text itself exists in
// exactly one place, `_instructions/<name>.md`.
const instructionOf = (a: Address): SystemInstructionName => {
  switch (a.object) {
    case "node":
      return "nodes"; // the kind's own instruction rides with the object below
    case "edge":
      return "graph";
    case "tab":
    case "entity":
      return "tab";
    case "useCase":
      return "useCases";
    default:
      return a.object as SystemInstructionName;
  }
};

// ДВЕРЬ ЧТЕНИЯ — СРЕЗОМ, а не целиком.
//
//   GET api/core                       -> обложка: паспорт, счётчики, выжимка закона
//   GET api/core?select=node:<cuid>    -> один объект по адресу
//   GET api/core?select=group:middle   -> одна группа узлов
//   GET api/core?select=graph|components|useCases|history|passport
//   GET api/core?select=all            -> всё ядро (осознанный выбор, а не случайность)
//
// Выжимка закона (`_lib/law-digest.ts`) приезжает с обложкой ВСЕГДА: она порождается из тех же констант,
// что и проверка, весит около 800 токенов и заменяет чтение схемы (~14 000).
export const runtime = "nodejs";

function parseAddress(select: string): Address | null {
  const [head, rest] = select.split(":");
  switch (head) {
    case "passport":
    case "graph":
    case "components":
    case "history":
    case "useCases":
      return { object: head };
    case "node":
    case "edge":
    case "useCase":
      return rest ? ({ object: head, cuid: rest } as Address) : null;
    case "tab":
      return rest ? { object: "tab", name: rest } : null;
    case "entity": {
      const [tab, cuid] = (rest ?? "").split("/");
      return tab && cuid ? { object: "entity", tab, cuid } : null;
    }
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const core = await readCore();
  const select = (req.nextUrl.searchParams.get("select") ?? "").trim();

  if (!select) {
    const nodes = allNodes(core.graph.nodes);
    return NextResponse.json({
      systemInstruction: await readInstruction("passport"), // the starting instruction: how to work here at all
      passport: core.passport,
      counts: {
        nodes: nodes.length,
        visibleNodes: nodes.filter((n) => n.state === "visible").length,
        edges: core.graph.edges.length,
        tabs: core.components.tabs.length,
        useCases: core.useCases.cases.length,
        versions: core.history.versions.length,
      },
      law: lawDigest(),
      doors: {
        work: "GET api/work — only the objects waiting for work; start every iteration after the first here",
        core: "GET api/core?select=<address> — one object; ?select=all for the whole core",
        patch: "POST api/patch {address, set} — change ONE object; never rewrite the file",
      },
    });
  }

  if (select === "all") return NextResponse.json({ systemInstruction: await readInstruction("passport"), ...core });

  if (select.startsWith("group:")) {
    const name = select.slice("group:".length) as "input" | "middle" | "output";
    const group = core.graph.nodes.groups[name];
    return group
      ? NextResponse.json({ systemInstruction: await readInstruction(`group.${name}`), group: name, ...group })
      : NextResponse.json({ error: `no group named "${name}" — there are input, middle, output` }, { status: 400 });
  }

  const address = parseAddress(select);
  if (!address) return NextResponse.json({ error: `cannot read the address "${select}"` }, { status: 400 });
  const found = locate(core, address);
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: 404 });

  // a node also carries the instruction of ITS KIND — the law it is developed by
  const kind = address.object === "node" ? (found.target.kind as string) : null;
  return NextResponse.json({
    systemInstruction: await readInstruction(instructionOf(address)),
    ...(kind ? { kindInstruction: await readInstruction(`kind.${kind}` as SystemInstructionName) } : {}),
    ...found.target,
  });
}

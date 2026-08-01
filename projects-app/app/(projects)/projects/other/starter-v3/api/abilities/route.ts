import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { readCore } from "../../_lib/core-io";
import { askModel } from "../../_lib/ai";
import { allNodes } from "../../_data/automation.schema";

// ДВЕРЬ «УЗЕЛ, ЧТО ТЫ УМЕЕШЬ» (шаг 311.8d, постановка владельца).
//
// Вопрос, на который отвечает эта дверь, — НЕ тот, на который отвечают `description`, имя узла или
// инструкция вида. Те говорят, чем узел ЗАДУМАН. Здесь узел рассказывает, как он работает В ЖИВОЙ
// ЦЕПОЧКЕ: что ему реально приходит на вход ОТ СОСЕДЕЙ, какие исходы он умеет различать, что кладёт
// дальше и когда бессилен.
//
// 🔒 ДВА РЕЖИМА, И ВТОРОЙ — ГЛАВНЫЙ (решение владельца 2026-08-01):
//   `?cuid=…`            — ФАКТЫ из ядра: соседи, контракт, объявленные исходы. Собрано из данных, ни
//                          строки прозы руками — иначе появился бы третий источник правды рядом с
//                          `description` и инструкцией, и он протух бы первым.
//   `?cuid=…&ask=1`      — ВЕРДИКТ ИИ: модель исследует те же факты и отвечает, годится ли узел этой
//                          автоматизации. Ровно три исхода — `fits` · `unfit` · `better-exists`, —
//                          и решение принимает ИИ, а не совпадение слов в описании.
//
// ЗАЧЕМ ВЕРДИКТ (мост к шагу 310). Вектор-поиск по корпусу возвращает ВНЕШНЕЕ описание паттерна, и оно
// льстит: узел выглядит подходящим, пока не встретится с реальными данными нашей цепочки. Может
// оказаться, что при наших входных параметрах он непригоден — это НОРМАЛЬНО, а не ошибка корпуса.
// Значит между «нашли» и «приняли» обязан стоять шаг проверки. Не подошёл → проект его выбрасывает и
// либо ищет другой, либо пишет свой (закон трёх исходов).
//
//   GET api/abilities                 → список узлов, у которых есть что рассказать
//   GET api/abilities?cuid=<cuid>     → факты
//   GET api/abilities?cuid=<cuid>&ask=1 → факты + вердикт ИИ
export const runtime = "nodejs";

const VERDICT_SYSTEM =
  `You judge whether ONE node fits THIS automation. You are given only machine facts: the node's contract, ` +
  `its declared outcomes, and its neighbours in the live chain. Answer as STRICT JSON and nothing else: ` +
  `{"verdict":"fits"|"unfit"|"better-exists","checked":"<what you actually examined>","why":"<one or two ` +
  `sentences>","alternative":"<only for better-exists: what would be better and why>"}. ` +
  `Rules that are not yours to bend: (1) there are exactly three verdicts — never invent a fourth and never ` +
  `hedge; (2) name what you CHECKED — a verdict without examined data is just a confident description; ` +
  `(3) if the facts are too thin to judge, the verdict is "unfit" with the reason "nothing to judge by" — ` +
  `never "probably fits"; (4) never bend the automation's need to match the node: a node that almost fits ` +
  `is "unfit" or "better-exists", never "fits". JSON only.`;

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const core = await readCore();
  const nodes = allNodes(core.graph.nodes);
  const cuid = (req.nextUrl.searchParams.get("cuid") ?? "").trim();

  if (!cuid) {
    return NextResponse.json({
      nodes: nodes.map((n) => ({ cuid: n.cuid, name: n.name, kind: n.kind, outcomes: n.function.outcomes.length })),
      doors: { one: "GET api/abilities?cuid=<cuid>", verdict: "GET api/abilities?cuid=<cuid>&ask=1" },
    });
  }

  const node = nodes.find((n) => n.cuid === cuid);
  if (!node) return NextResponse.json({ error: `no node with cuid "${cuid}"` }, { status: 404 });

  // МЕСТО В ЖИВОЙ ЦЕПОЧКЕ — то, чего нет ни в одном описании: кто реально стоит выше и ниже ИМЕННО ЗДЕСЬ.
  const nameOf = (c: string) => nodes.find((n) => n.cuid === c)?.name ?? c;
  const upstream = core.graph.edges.filter((e) => e.to === cuid).map((e) => nameOf(e.from));
  const downstream = core.graph.edges.filter((e) => e.from === cuid).map((e) => nameOf(e.to));

  const facts = {
    node: { cuid: node.cuid, name: node.name, kind: node.kind, state: node.state, ioType: node.ioType },
    function: {
      name: node.function.name,
      summary: node.function.summary,
      accepts: node.function.accepts,
      returns: node.function.returns,
      validator: node.function.validator || null,
    },
    // ИСХОДЫ — сердце самоописания: что узел умеет РАЗЛИЧАТЬ и когда честно бессилен.
    outcomes: node.function.outcomes,
    chain: { upstream, downstream },
    lineage: node.lineage || null, // от какого паттерна корпуса происходит (шаг 310)
    honesty: node.function.validator
      ? "this node classifies its own result — a failure cannot look like a success here"
      : "this node declares no validator: its result is never classified, so a failure would pass as success",
  };

  if (req.nextUrl.searchParams.get("ask") !== "1") return NextResponse.json(facts);

  // ВЕРДИКТ. Модель недоступна (нет ключа / сеть) → отдаём факты и честно говорим, почему вердикта нет;
  // выдумывать «наверное подойдёт» вместо суждения — ровно то, что эта дверь и должна предотвращать.
  let verdict: unknown = null;
  let verdictError = "";
  try {
    const raw = await askModel({ system: VERDICT_SYSTEM, user: JSON.stringify(facts), maxTokens: 400 });
    if (raw === null) verdictError = "no model is available on this server (no key or no network) — the facts above are all there is";
    else {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      try {
        verdict = s >= 0 && e > s ? JSON.parse(raw.slice(s, e + 1)) : null;
      } catch {
        verdict = null;
      }
      if (!verdict) verdictError = "the model answered in a shape this door cannot read — no verdict is better than a guessed one";
    }
  } catch (err) {
    verdictError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({ ...facts, verdict, ...(verdictError ? { verdictError } : {}) });
}

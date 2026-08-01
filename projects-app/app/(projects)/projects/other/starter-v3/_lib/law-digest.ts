import {
  GROUP_POLICY,
  KIND_PORTS,
  InputChannelSchema,
  OutputChannelSchema,
  SYSTEM_INSTRUCTION_NAMES,
  NodeKindSchema,
  type Automation,
  type GroupName,
  type NodeKind,
} from "../_data/automation.schema";

// ВЫЖИМКА ЗАКОНА — то, что читает модель ВМЕСТО схемы.
//
// Зачем она есть. Знание закона нужно модели ДО первой попытки: отказ валидации учит, но стоит целого
// хода, а без закона даже сильная модель соединяет узлы произвольно (это и наблюдалось на первом этапе
// разработки). Файл схемы для этого не годится: в нём ~5 700 токенов комментариев и ~8 100 токенов
// zod-обвязки, а собственно закона — около 800.
//
// Поэтому выжимка ПОРОЖДАЕТСЯ из тех же самых констант, что и проверка (`KIND_PORTS`, `GROUP_POLICY`,
// словари каналов, список имён инструкций). Она не пишется руками и потому не может разойтись с
// законом: изменится закон — изменится и выжимка, в одну правку.

const ports = (kind: NodeKind) => {
  const row = KIND_PORTS[kind];
  const side = (p: (typeof row)["in"]) => (p.connections === null ? "—" : `${p.state} ← ${p.connections.join(" | ")}`);
  const out = (p: (typeof row)["out"]) => (p.connections === null ? "—" : `${p.state} → ${p.connections.join(" | ")}`);
  return { in: side(row.in), out: out(row.out) };
};

export type LawDigest = {
  kinds: { kind: NodeKind; in: string; out: string }[];
  groups: { group: GroupName; minKinds: number; kinds: { kind: string; deletion: string; addition: string; minNodes: number }[] }[];
  channels: { input: readonly string[]; output: readonly string[]; note: string };
  middleLibrary?: { skill: string; state: string; summary: string }[];
  neverWritable: string[];
  laws: string[];
};

export function lawDigest(core?: Automation): LawDigest {
  return {
    // WHAT MAY CONNECT TO WHAT — read this before adding a node or an edge.
    kinds: NodeKindSchema.options.map((kind) => ({ kind, ...ports(kind) })),

    // WHAT EACH GROUP HOLDS, and whether nodes may be added to it or removed from it.
    groups: (Object.keys(GROUP_POLICY) as GroupName[]).map((group) => ({
      group,
      minKinds: GROUP_POLICY[group].minKinds,
      kinds: Object.entries(GROUP_POLICY[group].kinds).map(([kind, rule]) => ({
        kind,
        deletion: rule!.deletion,
        addition: rule!.addition,
        minNodes: rule!.minNodes,
      })),
    })),

    // THE CHANNEL VOCABULARIES — a node's `ioType` is one of these and nothing else.
    channels: {
      input: InputChannelSchema.options,
      output: OutputChannelSchema.options,
      note: "an input kind takes an input channel, an output kind an output channel, a middle kind none (null)",
    },

    // THE MIDDLE LIBRARY — the node skills this automation was born with (step 307). DERIVED from the
    // core's own middle group, never hand-written: the hidden middle nodes ARE the registry. Read this
    // before writing a new transform function — reveal an existing skill instead of rebuilding it.
    ...(core
      ? {
          middleLibrary: core.graph.nodes.groups.middle.nodes
            .filter((n) => n.kind === "transform")
            .map((n) => ({ skill: n.function.name, state: n.state, summary: n.function.summary })),
        }
      : {}),

    // Fields no write ever touches — asking for them is refused, by name.
    neverWritable: ["systemInstruction", "cuid", "kind", "in", "out"],

    // The handful of laws that are NOT expressible as a table.
    laws: [
      "a node carries exactly ONE function — a node that seems to need two is two nodes",
      "hidden node = its function does not run; it passes data through like an edge without logic",
      "an unused door is HIDDEN, never deleted — that is how an automation keeps the ability to join a group",
      "a function name is unique in this automation — it addresses its file, `_lib/nodes/<kebab-name>.ts`",
      "an edge is lawful when the target's kind is named in the source's out-connections",
      "an edge is visible only when both its ends are visible",
      "frozen-template = every node hidden; real-project = at least one visible node, one use case and an author",
      `an object names its law in systemInstructionName; the text lives in _instructions/<name>.md (${SYSTEM_INSTRUCTION_NAMES.length} of them) — read it by name, never copy it into the core`,
      "a middle need is met one of THREE ways: (a) a skill from middleLibrary, (b) own code in `_lib/nodes/`, (c) capability:needed plus a warning to the owner — «cannot be done» does not exist as an outcome",
      "an incoming requirement (send-task box, rawRequest, any dev-request field) lands on the USE CASES first: append or rework the case(s) it implies via api/patch, THEN change the graph — nodes serve cases, never the other way around (_instructions/useCases.md)",
      "the CONVERSATIONAL boundary (talking to the human) is the MODEL's job by the behavior instruction (the Assistant tab), NOT deterministic code: never enumerate phrases in a node to answer greetings/identity/small-talk — those are conversation (empty intent), the model replies. The «work without AI» law is for data-transforms, not for speech (step 309, _instructions/replies.md)",
      // ─── ЗАКОН ФРОНТА (шаг 311) — четвёртый слой между входом и серединой ───────────────────────
      "EVERY run enters through the INTENT layer: `input`/`input-connector` lead ONLY into `intent`, and no edge from a door into the middle exists any more. The front is the request's first and only gate — there is no bypass to build",
      "the front is ONE NODE PER REQUEST CLASS (never an N-way router): each class node self-gates — «mine?» → it answers and passes the flow on; «not mine» → it returns `null`, an orderly stop of that branch, not an error. Adding a class never touches its neighbours",
      "a class may route to the MIDDLE (work over data is needed) or STRAIGHT TO AN OUTPUT (self-description, refusal, small-talk — the answer needs no store and no tool). Skipping the middle is lawful, not a shortcut",
      "the front's DECISION IS RECORDED: a class node puts `intentClass` and `intentRoute` into the context, so the run journal shows WHY a run went where it went. A front that decides invisibly is a second opaque classifier and is forbidden",
      "the front NEVER falls back silently: an unrecognized request is not swept into a default class. No class claimed it → the automation says so honestly (the same honesty the three-outcomes law demands of the middle)",
      "the front's INVENTORY IS CLOSED: request classes are the FORMS in which a human addresses a system, not a list of business domains — they do not grow from automation to automation. A class exists in the core only together with its working function; a no-op placeholder class is a defect, not a draft",
      // ─── НЕЙТРАЛЬНОСТЬ ШАБЛОНА (шаг 311) ────────────────────────────────────────────────────────
      "NEUTRALITY TEST for every node you add to this template: replace the word «object» with any other noun — request, part, patient, shipment. If a node, a field name or a line of instruction stops making sense, a domain has leaked in and that is a defect. Template nodes are named as VERBS OF FORM (fetchExternal, describeObject, resolveLocation), never as nouns of a business",
      "REUSE IS BY PATTERN, NOT BY COPY: the node corpus answers «how this was solved» (a pattern card), and you write your OWN code from it. Pasting a foreign node's file drags its folder contract, its table names and its output-layer flags along with it (step 310)",
      "EVERY automation has a PUBLIC PAGE ADDRESS in passport.publicUrl (the public app :3000, e.g. <domain>/<lang>/<category>/<slug>): record it when the automation is created, and the assistant answers «where can I see this?» with «on your page: <url>» — empty means not-yet-assigned (say so honestly, never invent a link) (step 310)",
      "EVERY database row of EVERY store carries `links:[{table,id}]` to ALL related rows in the other stores, BOTH ways (crossLink): from any row any relation is retrievable — a receipt object → its finance row, a note → its vector doc and file. «No link» is not a state that exists (step 309)",
      "PUBLIC access is `passport.access: Role[]` (empty = fully public): on the public app the real automation shows to holders of those roles, a teaser otherwise. The Projects layer stays architect-only; this gates the PUBLIC surface only (step 309.A)",
    ],
  };
}

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
      "DATA vs SPEECH classify: a message that STATES data (a fact/amount/place/reminder) carries a data intent; a QUESTION or request ABOUT saved data (how much did I spend, show the receipt) is recall, never a new record; a greeting/identity/small-talk is empty intent (the model converses). Money words alone are not finance — the intent (record vs ask) is",
      "the USER GLOSSARY (the `glossary` store) is a dictionary of the owner's aliases/abbreviations, injected as a SYSTEM PREAMBLE into every model call so «how much at Mercadona» matches receipts stored as store=SODO ADEJE; «remember that X is Y» is a DEFINITION (intent glossary → defineGlossary writes an alias), NOT a note; it fills both by hand (the Glossary tab) and automatically (step 309)",
      "the CONTEXT WINDOW is a SESSION, not a fixed message count: the whole current session (all messages within a ~1h TTL) is fed to the model; after an hour of silence the buffer empties and the next message rebuilds the full system context (instruction+glossary) fresh — the stable preamble goes first (prompt-cache friendly), the changing dialogue last (step 309)",
      "EVERY database row of EVERY store carries `links:[{table,id}]` to ALL related rows in the other stores, BOTH ways (crossLink): from any row any relation is retrievable — a receipt object → its finance row, a note → its vector doc and file. «No link» is not a state that exists (step 309)",
      "PUBLIC access is `passport.access: Role[]` (empty = fully public): on the public app the real automation shows to holders of those roles, a teaser otherwise. The Projects layer stays architect-only; this gates the PUBLIC surface only (step 309.A)",
    ],
  };
}

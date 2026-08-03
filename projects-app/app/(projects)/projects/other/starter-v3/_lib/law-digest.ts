import {
  GROUP_POLICY,
  KIND_PORTS,
  InputChannelSchema,
  OutputChannelSchema,
  IntentClassSchema,
  EvolutionScopeSchema,
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
  intentClasses: readonly string[];
  evolutionScopes: readonly string[];
  middle: {
    vocabulary: null;
    designedLast: string;
    birth: string;
    runtime: string;
    naming: string;
  };
  middleNodes?: { fn: string; state: string; summary: string; lineage: string }[];
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

    // THE VOCABULARIES — a node's `ioType` is one of these and nothing else. FOUR layers are closed by a
    // vocabulary; the middle deliberately has none, and that absence is the point (see `middle` below).
    channels: {
      input: InputChannelSchema.options,
      output: OutputChannelSchema.options,
      note: "an input kind takes an input channel, an output kind an output channel, a middle kind none (null)",
    },
    intentClasses: IntentClassSchema.options,
    evolutionScopes: EvolutionScopeSchema.options,

    // THE MIDDLE — the one INFINITE layer: no vocabulary, no derived names, no quota. It is BUILT, and it
    // is built LAST, because its shape follows from what the front decided. Closed by knowledge, not by
    // inventory — see `_instructions/middle.custom.md` and `group.middle.md`.
    middle: {
      vocabulary: null,
      designedLast: "the middle receives an already-classified run (ctx.intentClass); only 6 of the 11 request classes route into it — record-given, read-own, fetch-external, composite, control, continuation",
      birth: "pattern from the corpus (dev-time, returns a PATTERN not a file, recorded as `lineage`) → own code → capability:needed + warning",
      runtime: "a running automation NEVER contacts the corpus — knowledge is federated, execution is local",
      naming: "a transform's name is chosen, not derived: a VERB OF FORM (fetchExternal, resolveMoment), never a business noun",
    },

    // ЧТО СЕЙЧАС СТОИТ В СЕРЕДИНЕ — инвентарь ЭТОЙ автоматизации, выведенный из её же ядра.
    //
    // 🔒 ЭТО НЕ КАТАЛОГ ДЛЯ ВЫБОРА (изменение шага 310 против прежнего `middleLibrary`). Раньше поле
    // называлось «библиотекой», и перечень читался моделью как МЕНЮ: выбрать из готового всегда дешевле,
    // чем написать своё, — и она выбирала, даже когда выбранное не подходило. Знание о том, КАК строят
    // узлы, живёт в корпусе паттернов (dev-time), а здесь — только факт: вот что уже есть в этой папке,
    // чтобы не написать второй такой же. `lineage` показывает, от какого паттерна узел происходит.
    ...(core
      ? {
          middleNodes: core.graph.nodes.groups.middle.nodes
            .filter((n) => n.kind === "transform")
            .map((n) => ({ fn: n.function.name, state: n.state, summary: n.function.summary, lineage: n.lineage ?? "" })),
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
      "🔒 A NODE THAT DECIDES (transform, condition-success, condition-failure) CANNOT EXIST WITHOUT A VALIDATOR: without one its function ALWAYS lets the result through and a failure silently becomes a success (proven live: an HTTP 403 was returned as «nothing found»). It declares `outcomes` (at least TWO — outcomes are many on each side, e.g. above/below a threshold/no data to judge by) and `validator`, whose name is DERIVED from the function (`fetchExternal` → `fetchExternalValidate`). Three levels enforce it: the schema refuses the node, the module refuses to load if the validator is unregistered, and the engine FAILS the run when a result matches no declared outcome",
      "«unreachable» is NOT «missing»: a source that refused and a source that answered «nothing» look identical in the payload and mean opposite things to the human — telling them apart is the validator's most valuable job",
      "the FAILURE branch is no longer a dead end: `condition-failure` leads into an output, in practice the `toast` channel, which CANNOT be hidden while the automation is a real project. An automation able to fail silently is not an expressible state any more",
      "a LOGICAL node (transform/condition) must carry the edges its ports require IN ANY STATE, hidden or not — unlike a door, which may lawfully stand unwired while hidden. A logic node with no child looks alive on the canvas and never runs",
      "a middle need is met one of THREE ways: (a) a PATTERN from the node corpus — it returns the shape of a solution, never a file to paste; write your own code from it and record its id in `lineage`, (b) own code in `_lib/nodes/` with `lineage` empty, (c) capability:needed plus a warning to the owner — «cannot be done» does not exist as an outcome (step 310)",
      "the node corpus is DEV-TIME ONLY: a RUNNING automation never contacts it — knowledge is federated, execution is local. The single link between a node and the corpus is the `lineage` string, and there is no import, no fetch and no client",
      "the MIDDLE is the one INFINITE layer and therefore has NO vocabulary, no derived names and no closed inventory — it is BUILT, and built LAST: it receives an already-classified run (`ctx.intentClass`), and only 6 of the 11 request classes route into it. A middle node never re-classifies the request and never composes the reply",
      "a transform's name is CHOSEN (unlike doors, classes and scopes, whose names are derived) — so choose a VERB OF FORM: fetchExternal, describeObject, resolveMoment. A business noun in a node name is how a domain leaks into a template (neutrality test: swap the subject noun; if the name stops making sense, it leaked)",
      "an incoming requirement (send-task box, rawRequest, any dev-request field) lands on the USE CASES first: append or rework the case(s) it implies via api/patch, THEN change the graph — nodes serve cases, never the other way around (_instructions/useCases.md)",
      "🔒 A USE CASE CARRIES ONLY THE DISTINCTIVE — the subject area and THIS owner's scenario (studying books, sports training, finding partners). Anything true of EVERY automation is LAW, never a case. TEST: remove the description — if the behaviour still CANNOT be violated it is law and has no place in the cases. A case is edited by the owner, so a guarantee placed there becomes deletable: a case is a REQUEST, a law is a GUARANTEE. Hence «no case, no node» governs what you BUILD (middle nodes, which doors to reveal) and NOT the frozen inventory standing by law — intent classes, channel doors, connectors, toast carry an empty `serves`, and that is the truth (step 315)",
      "a FROZEN TEMPLATE carries no use cases at all (schema-enforced): it has no owner and no purpose yet, and an empty set is what opens the Quiz for a newborn clone (step 315)",
      "the CONVERSATIONAL boundary (talking to the human) is the MODEL's job by the behavior instruction (the Assistant tab), NOT deterministic code: never enumerate phrases in a node to answer greetings/identity/small-talk — those are conversation (empty intent), the model replies. The «work without AI» law is for data-transforms, not for speech (step 309, _instructions/replies.md)",
      // ─── ЗАКОН ФРОНТА (шаг 311) — четвёртый слой между входом и серединой ───────────────────────
      "EVERY run enters through the INTENT layer: `input`/`input-connector` lead ONLY into `intent`, and no edge from a door into the middle exists any more. The front is the request's first and only gate — there is no bypass to build",
      "the front is ONE NODE PER REQUEST CLASS (never an N-way router): each class node self-gates — «mine?» → it claims the run with `intentClass` and passes the flow on; «not mine» → it returns an EMPTY patch and the next class sees the flow untouched. NEVER `null` from a class: the engine is linear and `null` stops the WHOLE run, so one foreign class would kill the run before its real owner is reached (proven live 2026-08-01). The FIRST claimer wins, so the order of class nodes in the core IS their precedence — narrow classes stand before wide ones",
      "a class may route to the MIDDLE (work over data is needed) or STRAIGHT TO AN OUTPUT (self-description, refusal, small-talk — the answer needs no store and no tool). Skipping the middle is lawful, not a shortcut",
      "the front's DECISION IS RECORDED: a class node puts `intentClass` and `intentRoute` into the context, so the run journal shows WHY a run went where it went. A front that decides invisibly is a second opaque classifier and is forbidden",
      "the front NEVER falls back silently: an unrecognized request is not swept into a default class. No class claimed it → the automation says so honestly (the same honesty the three-outcomes law demands of the middle)",
      "the front's INVENTORY IS CLOSED: request classes are the FORMS in which a human addresses a system, not a list of business domains — they do not grow from automation to automation. A class exists in the core only together with its working function; a no-op placeholder class is a defect, not a draft",
      // ─── НЕЙТРАЛЬНОСТЬ ШАБЛОНА (шаг 311) ────────────────────────────────────────────────────────
      "NEUTRALITY TEST for every node you add to this template: replace the word «object» with any other noun — request, part, patient, shipment. If a node, a field name or a line of instruction stops making sense, a domain has leaked in and that is a defect. Template nodes are named as VERBS OF FORM (fetchExternal, describeObject, resolveLocation), never as nouns of a business",
      "REUSE IS BY PATTERN, NOT BY COPY: the node corpus answers «how this was solved» (a pattern card), and you write your OWN code from it. Pasting a foreign node's file drags its folder contract, its table names and its output-layer flags along with it (step 310)",
      "EVERY automation has a PUBLIC PAGE ADDRESS in passport.publicUrl (the public app :3000, e.g. <domain>/<lang>/<category>/<slug>): record it when the automation is created, and the assistant answers «where can I see this?» with «on your page: <url>» — empty means not-yet-assigned (say so honestly, never invent a link) (step 310)",
      "EVERY row of an ENTITY STORE carries `links:[{table,id}]` to its siblings BOTH ways, and the WRITE sets them (`addEntityRow`), not the node: a row cannot be born unlinked, and no node can forget to link. Per-neighbour fields (`storageIds`/`vectorIds`) are forbidden — each new store would need a new one; derive the view with `linksOf(row, table)`. From any row any relation is retrievable in one hop (`readLinked`); «no link» is not a state that exists (steps 309, 311.9а)",
      "🔒 TWO KINDS OF DESTINATION. ENTITY STORES (database · vector-memory · storage · map · calendar) hold what the automation OWNS and write ONLY for the recording classes; RUN JOURNALS (history · analytics · toast) hold what HAPPENED and write ALWAYS — a question is a run too and must stay visible. ASKING IS NOT SAVING: a run of read-own / self-describe / refuse / small-talk / incomplete / unclaimed leaves NO record, and this is enforced by the write itself, not by each node remembering (step 311.9а)",
      "🔒 THE FULL TEXT LIVES IN EXACTLY ONE PLACE — the search index. Stores keep a `summary` (≤300 chars) plus links; that is why two different stores exist at all: the index SEARCHES by meaning, the stores KEEP and LINK. `summary` is present ALWAYS (a short source equals its summary — a conditional field would force every reader to branch), and the limit is held at the WRITE: fits → verbatim without a model call, longer → the middle condenses, no summary arrived → the write cuts at a sentence boundary and marks `summarySource: \"truncated\"`. A row of vector-memory is a RECEIPT (name · summary · trackId · links), never a copy (step 311.9а)",
      "READING a store is a LIBRARY, not nodes (`_lib/stores/read.ts`, one primitive per store, names derived like the writers: `deliverDatabase` → `readDatabase`). Reading FROM a store is as finite as writing TO it; the COMPOSITION of reads is infinite and belongs to the middle — that is why no reader node exists. Each primitive returns a named outcome: found · empty · unreachable, and «unreachable» is NOT «empty» (step 311.9а)",
      "🔒 STRUCTURAL CHANGES REQUIRE A READ RECEIPT: `api/patch` answers HTTP 428 to add/delete/connect/disconnect unless the request carries `X-Core-Read` and `X-Schema-Read` — the sha256 of `_data/automation.json` and `_data/automation.schema.ts`, which you must READ IN FULL first. A stale hash is refused too. You cannot see which connections are lawful from a fragment; `set` and `visibility` are exempt (the owner drives those)",
      "PUBLIC access is `passport.access: Role[]` (empty = fully public): on the public app the real automation shows to holders of those roles, a teaser otherwise. The Projects layer stays architect-only; this gates the PUBLIC surface only (step 309.A)",
      "🔒 A ROW LEADS TO THE ENTITY: clicking a row — or a marker, or any object a tab draws — opens the ONE shared entity drawer (`_components/shared/entity-drawer.client.tsx`, opened by the shared table itself) with the database record and every facet linked to it: objects, memory, places, events. Its data is `api/rows?table=&id=&linked=1`; objects inside it are shown by `media-viewer` and by nothing else; width, overlay and animation belong to the primitive, not to a tab. A tab that builds its own «details» view is a defect — the dashboard carried one and knew nothing of a row's neighbours (step 328). A journal row has no entity, and the drawer says so in words",
      "🔒 A TAB DECLARES ITS SOURCE AND ITS SHAPE IN THE CORE — every tab, no exceptions: `entity.data` names the store (`table`), the columns/fields (key · label ×10 · type · source) and the page size, and the COMPONENT ONLY RENDERS them. A source or a column list written inside a component is a second, private truth that drifts from the law in silence — it cost four tabs in one day (database showed a stale table, storage and vector-memory rendered undeclared lists, the map drew nothing at all while runs wrote and linked their markers). A tab shows what an OUTPUT NODE delivered and computes nothing; before you touch one, read `tab.md` and its own `tab.<name>.md` when the door attaches it (steps 319, 323, 324, 325)",
    ],
  };
}

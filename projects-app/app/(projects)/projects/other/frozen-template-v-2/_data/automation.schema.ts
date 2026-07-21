import { z } from "zod";

// СХЕМА ЯДРА — форма файла `automation.json`, описанная ровно один раз.
// Лежит рядом с файлом, который проверяет: схема и данные всегда правятся вместе.
// Типы отсюда не пишутся руками — они выводятся схемой.

const TEXT_LIMIT = 200;

// IDENTITY — every entity that can be pointed at carries a CUID, and nothing else identifies it.
// A cuid-style id: a leading letter then lowercase alphanumerics — hyphen-free and never all-digits, so a
// model can echo it without the UUID pitfalls. Human-readable names live in `name`, never in the id: a name
// can be edited, an identity cannot.
export const CuidSchema = z.string().regex(/^c[a-z0-9]{8,}$/, "an id must be a cuid (a leading `c`, then lowercase alphanumerics)");

// PASSPORT — the automation's identity.
// The address is deliberately absent: it is given by where the folder sits, and keeping it here too
// would create a second source of truth.
export const AutomationTypeSchema = z.enum(["stream", "instanced", "chained"]);

// LIFECYCLE — what this automation currently IS:
//   frozen-template — the starting template, born but never made anyone's own;
//   real-project    — a real automation someone is building or running.
// One field rather than two flags (is_frozen_template / is_real_project): two flags can contradict
// each other, one cannot.
export const LifecycleSchema = z.enum(["frozen-template", "real-project"]);

// PARALLEL ROUTING PAGES — the places on the host page where a Fractera Pro automation can be placed.
export const ParallelPageSchema = z.enum([
  "promo",
  "center-header",
  "center",
  "center-footer",
  "faq",
  "left-drawer",
  "right-drawer",
]);

// ROLES — the vocabulary the admin can assign to a user (Admin :3002 -> settings -> users -> edit).
// Three groups: access tiers enforced by the auth substrate, customer-facing roles, staff roles.
//
// ⚠️ The OWNER of this vocabulary is the platform's role model, not this file. Law 0 forbids reaching
// outside the folder, so the list is copied in — a copy that must be re-checked when the platform's
// vocabulary changes. Flagged deliberately rather than hidden.
export const RoleSchema = z.enum([
  // access tiers (enforced)
  "guest",
  "user",
  "architect",
  // customer-facing
  "buyer",
  "vip_user",
  "subscriber_lite",
  "subscriber_standard",
  "subscriber_max",
  // staff / operations
  "manager",
  "senior_manager",
  "support_manager",
  "delivery_manager",
  "finance",
  "content_editor",
  // admin
  "admin",
]);

// FRACTERA PRO — either nothing (`null`, the plain mode) or the Pro mode.
// In Pro mode the owner picks WHERE the automation sits on the host page (parallel routing) and,
// optionally, WHICH roles may reach that page. An empty role list means the page is open to everyone;
// listing roles narrows it down.
export const FracteraProSchema = z
  .object({
    page: ParallelPageSchema.default("center"),
    roles: z.array(RoleSchema).default([]),
  })
  .strict();

// The passport carries `info` too: the owner leaves instructions not only for a single node or component
// but for the automation AS A WHOLE, and that text needs one obvious place to live.
// (InfoSchema is declared below — the passport object is assembled after it.)

// STATE — whether a node or an edge is shown on the diagram.
export const StateSchema = z.enum(["hidden", "visible"]);

// BUILD STATUS — still being built, or built and standing. One vocabulary for nodes and components
// alike: the same fact must never be spelled two different ways.
export const BuildStatusSchema = z.enum(["in-development", "materialized"]);

// INFO — the ONE text that describes a thing being built, in exactly one of two forms:
//   { crudUser }  — the owner's own words, as they arrived (the CRUD prompt);
//   { aiSummary } — the model's summary of what was actually built.
// A union, not two fields: two fields could hold both at once, and then it would be impossible to say
// which of them describes the thing. The build STATUS is a separate field — the two answer different
// questions ("what is this" vs "is it standing yet").
export const InfoSchema = z.union([
  z.object({ crudUser: z.string().min(1, "the owner's prompt cannot be empty") }).strict(),
  z.object({ aiSummary: z.string().min(1, "the summary cannot be empty") }).strict(),
]);

export const PassportSchema = z
  .object({
    title: z.string().min(1, "the automation must have a title"),
    description: z.string(),
    type: AutomationTypeSchema,
    lifecycle: LifecycleSchema,
    fracteraPro: FracteraProSchema.nullable(),
    // the owner's instruction for the automation as a whole (or the model's summary of it)
    info: InfoSchema,
  })
  .strict();

// WARNING — the agent → owner message channel. It accompanies EVERY entity that gets built: a node, a
// tab, an entity inside a tab. An empty list means "nothing to say"; a warning means the agent stopped
// and is telling the owner something instead of guessing.
//
// One of its duties is named in the law (`NODE-TREE-RULES.md`): when fundamentally different tasks pile
// up inside a single automation, the agent must PROPOSE a group of automations here — never build them
// all into one.
export const WarningSchema = z
  .object({
    cuid: CuidSchema,
    text: z.string().min(1, "a warning without text is not a warning"),
  })
  .strict();

// AN ENV KEY — a key from the environment that this node or component needs in order to work. The agent
// names the key while it generates the code, and states what it found:
//   present — the key is in the environment and works;
//   missing — the key is not there at all;
//   error   — the key IS there but does not work (expired, mistyped, out of tokens) — and then the
//             comment says WHY, because that is what the agent reads on its next run before deciding.
export const EnvKeyStatusSchema = z.enum(["present", "missing", "error"]);

export const EnvKeySchema = z
  .object({
    name: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "an env key is UPPER_SNAKE_CASE"),
    status: EnvKeyStatusSchema,
    comment: z.string(),
  })
  .strict()
  .superRefine((key, ctx) => {
    if (key.status === "error" && !key.comment.trim()) {
      ctx.addIssue({ code: "custom", path: ["comment"], message: "a key in error must say why — that comment is what the next run reads" });
    }
  });

// Everything that gets BUILT is described the same way: one info text, the build status, the messages to
// the owner, and the env keys it asks for. One vocabulary for nodes and components alike.
const buildRecord = {
  info: InfoSchema,
  status: BuildStatusSchema,
  warnings: z.array(WarningSchema),
  envKeys: z.array(EnvKeySchema),
};

// A NODE FUNCTION — what it does, what it takes, what it gives back. A node carries EXACTLY ONE of them
// (see `function` below): complexity is expressed by the NUMBER OF NODES, never by piling functions into
// one node.
// The three texts are capped: they are a caption for a human and a model, not documentation.
const shortText = (what: string) =>
  z.string().min(1, `${what} is required`).max(TEXT_LIMIT, `${what} must be at most ${TEXT_LIMIT} characters`);

export const NodeFunctionSchema = z
  .object({
    name: z.string().min(1),
    summary: shortText("the function summary"),
    accepts: shortText("what the function accepts"),
    returns: shortText("what the function returns"),
  })
  .strict();

// ─── CHANNELS (ioType) ──────────────────────────────────────────────────────────────────────────────
// WHERE the automation's work arrives from, and WHERE its result is delivered. A CLOSED vocabulary: a
// node may carry exactly one of these values and nothing else. `custom` is the one door left open — it
// names an owner-defined channel without letting arbitrary strings into the core.
export const InputChannelSchema = z.enum([
  "control-panel", // a request the owner sends through the Control panel
  "webhook", // an external system calls in over HTTP
  "cron", // a scheduled tick fires it on a timer
  "public-page", // a form or control on the automation's own public page
  "telegram-bot", // a message sent to the automation's own Telegram bot
  "user-telegram-chat", // a message read from the user's own Telegram chat
  "custom", // any other input source the owner defines
]);

export const OutputChannelSchema = z.enum([
  "public-page", // a page on the automation's own website
  "dashboard", // a row or a table on the dashboard
  "calendar", // an event on the automation's calendar
  "analytics", // a chart in the automation's analytics
  "map", // a marker on the automation's map
  "email", // an email the automation sends out
  "telegram-bot", // a message sent through the automation's own Telegram bot
  "user-telegram-chat", // a message written into the user's own Telegram chat
  "custom", // any other delivery destination the owner defines
]);

export const NodeKindSchema = z.enum([
  "input-connector",
  "output-connector",
  "input",
  "output",
  "transform",
  "condition-success",
  "condition-failure",
]);

// A PORT carries TWO facts about itself, never one:
//   state       — how obligatory it is: required | optional | prohibit;
//   connections — WHAT MAY KNOCK ON IT: the kinds of node it is entitled to be wired to. `external` means
//                 a node of ANOTHER automation — that is what a connector exists for.
// A forbidden port is `state: "prohibit"` + `connections: null`, and nothing else: a prohibition has no
// second spelling. The two facts cannot contradict each other — the schema below binds them.
//
// Port names and data types are NOT stored here — what a node takes and gives back is told by its
// functions (`accepts` / `returns`), and the same fact must not live twice.
export const PortStateSchema = z.enum(["required", "optional", "prohibit"]);
export const PortTargetSchema = z.union([NodeKindSchema, z.literal("external")]);

export const PortSchema = z
  .object({
    state: PortStateSchema,
    connections: z.array(PortTargetSchema).min(1, "a port that leads nowhere must be null, not an empty list").nullable(),
  })
  .strict()
  .superRefine((port, ctx) => {
    if (port.state === "prohibit" && port.connections !== null) {
      ctx.addIssue({ code: "custom", path: ["connections"], message: "a prohibited port cannot be wired to anything — it must be null" });
    }
    if (port.state !== "prohibit" && port.connections === null) {
      ctx.addIssue({ code: "custom", path: ["connections"], message: "an allowed port must name what may connect to it" });
    }
  });

// THE CONNECTION TABLE — the law of the graph, stated once. The node's own `in`/`out` must repeat its row
// exactly (the core states the fact; the schema refuses a contradiction), and an edge is lawful when its
// target is named in the source's `out.connections`.
//
//   kind               in                                              out
//   input-connector    optional  external                              required  transform
//   output-connector   required  condition-success                     optional  external
//   input              prohibit  —                                     required  transform
//   output             required  condition-success                     prohibit  —
//   transform          required  input | transform | condition-success required  transform | condition-success | condition-failure
//   condition-success  required  transform                             required  transform | output
//   condition-failure  required  transform                             prohibit  —
//
// ⚠️ TWO ASYMMETRIES, left exactly as the owner dictated them and flagged rather than quietly "fixed":
//   1. `input-connector`.out names `transform`, but `transform`.in does not name `input-connector`;
//   2. `output-connector`.in names `condition-success`, but `condition-success`.out does not name
//      `output-connector`.
// An edge is therefore checked from its SOURCE side only. Should the check ever run from both ends, these
// two rows must first be closed — until then a connector edge would be refused by the far end.
type Port = z.infer<typeof PortSchema>;

export const KIND_PORTS: Record<z.infer<typeof NodeKindSchema>, { in: Port; out: Port }> = {
  "input-connector": {
    in: { state: "optional", connections: ["external"] },
    out: { state: "required", connections: ["transform"] },
  },
  "output-connector": {
    in: { state: "required", connections: ["condition-success"] },
    out: { state: "optional", connections: ["external"] },
  },
  input: {
    in: { state: "prohibit", connections: null },
    out: { state: "required", connections: ["transform"] },
  },
  output: {
    in: { state: "required", connections: ["condition-success"] },
    out: { state: "prohibit", connections: null },
  },
  transform: {
    in: { state: "required", connections: ["input", "transform", "condition-success"] },
    out: { state: "required", connections: ["transform", "condition-success", "condition-failure"] },
  },
  "condition-success": {
    in: { state: "required", connections: ["transform"] },
    out: { state: "required", connections: ["transform", "output"] },
  },
  "condition-failure": {
    in: { state: "required", connections: ["transform"] },
    out: { state: "prohibit", connections: null },
  },
};

// A node's declared port must repeat its row of the table exactly — same state, same connections in the
// same order. The core states the law out loud; it is not allowed to state it differently.
const samePort = (a: Port, b: Port) =>
  a.state === b.state &&
  (a.connections === null || b.connections === null
    ? a.connections === b.connections
    : a.connections.length === b.connections.length && a.connections.every((v, i) => v === b.connections![i]));

// Fields every node carries, whatever its kind.
const nodeBase = {
  cuid: CuidSchema,
  name: z.string().min(1),
  description: z.string(),
  state: StateSchema,
  // info (one of two forms) + build status + warnings + env keys
  ...buildRecord,
  // ONE function per node — not a list. A node that seems to need two functions is two nodes.
  function: NodeFunctionSchema,
  run: z.enum(["sequential", "parallel"]),
  estDurationMs: z.number().int().positive(),
};

// A node of one kind: its ports must repeat the table's row for that kind, and its channel (`ioType`) is
// the vocabulary its kind is entitled to — the входные kinds pick from the input channels, the выходные
// from the output ones, and a middle node has no channel at all (`null`, never a string).
const nodeOf = (kind: z.infer<typeof NodeKindSchema>, ioType: z.ZodTypeAny) =>
  z
    .object({
      ...nodeBase,
      kind: z.literal(kind),
      ioType,
      in: PortSchema,
      out: PortSchema,
    })
    .strict();

export const NodeSchema = z.discriminatedUnion("kind", [
  nodeOf("input-connector", InputChannelSchema),
  nodeOf("output-connector", OutputChannelSchema),
  nodeOf("input", InputChannelSchema),
  nodeOf("output", OutputChannelSchema),
  nodeOf("transform", z.null()),
  nodeOf("condition-success", z.null()),
  nodeOf("condition-failure", z.null()),
]);

// The kinds that must exist in every automation, whatever it does — see the law in the graph check below.
export const MANDATORY_KINDS: z.infer<typeof NodeKindSchema>[] = ["input", "output", "input-connector", "output-connector"];

// AN EDGE — a link between two nodes. It carries its own cuid (an edge is an entity like any other and
// must be addressable), the cuids of its ends, and whether it is shown on the diagram.
export const EdgeSchema = z
  .object({
    cuid: CuidSchema,
    from: CuidSchema,
    to: CuidSchema,
    state: StateSchema,
  })
  .strict();

// THE GRAPH. Beyond the shape of nodes and edges it checks what a single node's schema cannot see:
// unique cuids, both ends of an edge existing, and the direction being lawful for the kind.
export const GraphSchema = z
  .object({
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema),
  })
  .strict()
  .superRefine((graph, ctx) => {
    const byCuid = new Map<string, z.infer<typeof NodeSchema>>();
    graph.nodes.forEach((node, i) => {
      if (byCuid.has(node.cuid)) {
        ctx.addIssue({ code: "custom", path: ["nodes", i, "cuid"], message: `node "${node.cuid}" is declared twice` });
        return;
      }
      byCuid.set(node.cuid, node);

      // the node must declare its kind's row of the connection table, word for word
      (["in", "out"] as const).forEach((side) => {
        if (!samePort(node[side], KIND_PORTS[node.kind][side])) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes", i, side],
            message: `a node of kind "${node.kind}" must declare ${side}: ${JSON.stringify(KIND_PORTS[node.kind][side])}`,
          });
        }
      });
    });

    const seenEdges = new Set<string>();
    graph.edges.forEach((edge, i) => {
      if (seenEdges.has(edge.cuid)) {
        ctx.addIssue({ code: "custom", path: ["edges", i, "cuid"], message: `edge "${edge.cuid}" is declared twice` });
      }
      seenEdges.add(edge.cuid);

      const from = byCuid.get(edge.from);
      const to = byCuid.get(edge.to);

      if (!from) {
        ctx.addIssue({ code: "custom", path: ["edges", i, "from"], message: `node "${edge.from}" does not exist` });
      } else if (from.out.state === "prohibit") {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "from"],
          message: `node "${from.name}" of kind "${from.kind}" has no output — an edge out of it is impossible`,
        });
      }

      if (!to) {
        ctx.addIssue({ code: "custom", path: ["edges", i, "to"], message: `node "${edge.to}" does not exist` });
      } else if (to.in.state === "prohibit") {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "to"],
          message: `node "${to.name}" of kind "${to.kind}" has no input — an edge into it is impossible`,
        });
      }

      // THE CONNECTION LAW, checked from the SOURCE side (see the asymmetries flagged at the table):
      // the target's kind must be named in the source's outgoing connections.
      if (from && to && from.out.connections && !from.out.connections.includes(to.kind)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i],
          message:
            `a node of kind "${from.kind}" may only lead into ${from.out.connections.join(" | ")} — ` +
            `"${to.name}" is a "${to.kind}"`,
        });
      }

      if (edge.from === edge.to) {
        ctx.addIssue({ code: "custom", path: ["edges", i], message: "an edge cannot lead a node into itself" });
      }

      // An edge is shown only when BOTH its ends are shown: a line to a node nobody sees is a lie.
      if (edge.state === "visible" && from && to && (from.state === "hidden" || to.state === "hidden")) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "state"],
          message: "an edge cannot be visible while one of its ends is hidden",
        });
      }
    });

    // A REQUIRED port must actually carry an edge — but ONLY for a VISIBLE node. A hidden node is a
    // transparent pipe: its function does not run and it may stand unwired (that is how a frozen template
    // ships, with every node hidden). An OPTIONAL port may always stand unwired — that is exactly what a
    // connector's outward side is for: its counterpart lives in another automation, outside this graph.
    graph.nodes.forEach((node, i) => {
      if (node.state !== "visible") return;
      const wiredIn = graph.edges.some((e) => e.to === node.cuid);
      const wiredOut = graph.edges.some((e) => e.from === node.cuid);
      if (node.in.state === "required" && !wiredIn) {
        ctx.addIssue({ code: "custom", path: ["nodes", i, "in"], message: `node "${node.name}" requires an incoming edge and has none` });
      }
      if (node.out.state === "required" && !wiredOut) {
        ctx.addIssue({ code: "custom", path: ["nodes", i, "out"], message: `node "${node.name}" requires an outgoing edge and has none` });
      }
    });

    // THE MANDATORY SET — four kinds are present in EVERY automation, always: the two doors of the
    // automation itself and the two connectors that let it join a group. They are never deleted; a kind
    // this automation does not use is HIDDEN, not removed. Extra nodes may be added freely.
    MANDATORY_KINDS.forEach((kind) => {
      if (!graph.nodes.some((n) => n.kind === kind)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes"],
          message: `every automation must carry a node of kind "${kind}" — an unused one is hidden, never deleted`,
        });
      }
    });
  });

// COMPONENTS — which tabs the automation has and what state each one is in.
//
// Presence is ONE field, not two ("present" + "expanded"): two fields can contradict each other
// (absent yet expanded), one cannot.
//   absent    — not present on the page;
//   collapsed — present, folded into an accordion;
//   expanded  — present, open.
// `name` must match a folder name in `_components/` — that is how the router finds the tab's code.
export const PresenceSchema = z.enum(["absent", "collapsed", "expanded"]);

// AN ENTITY INSIDE A TAB — a single calendar inside the calendar tab, a single analytics inside the
// analytics tab. A tab is a kind; an entity is one concrete thing of that kind, and there may be many.
//
// `data` holds the entity's intermediate settings — the enumeration of what will be created for it
// (as a table would hold its column names and their types). Its shape is deliberately OPEN for now:
// it will be pinned down per component kind.
export const EntitySchema = z
  .object({
    cuid: CuidSchema,
    name: z.string().min(1),
    ...buildRecord,
    data: z.record(z.string(), z.unknown()),
  })
  .strict();

export const TabSchema = z
  .object({
    name: z.string().min(1),
    presence: PresenceSchema,
    ...buildRecord,
    entities: z.array(EntitySchema),
  })
  .strict()
  .superRefine((tab, ctx) => {
    const seen = new Set<string>();
    tab.entities.forEach((entity, i) => {
      if (seen.has(entity.cuid)) {
        ctx.addIssue({ code: "custom", path: ["entities", i, "cuid"], message: `entity "${entity.cuid}" is declared twice` });
      }
      seen.add(entity.cuid);
    });
  });

export const ComponentsSchema = z
  .object({
    tabs: z.array(TabSchema),
  })
  .strict();

// USE CASES — the FOURTH object of the core, and the one an automation is actually defined by. A case is
// the owner's scenario in his own words; the set of cases must be enough, on its own, to build the
// automation. `number` is what the owner refers to out loud ("in case 02, change …"); `status` walks the
// case from a fresh idea to something in use.
export const UseCaseStatusSchema = z.enum(["new", "in-development", "in-use"]);

export const UseCaseSchema = z
  .object({
    cuid: CuidSchema,
    number: z.number().int().positive(),
    text: z.string().min(1, "a case without text is not a case"),
    status: UseCaseStatusSchema,
  })
  .strict();

export const UseCasesSchema = z.array(UseCaseSchema).superRefine((cases, ctx) => {
  const seenCuid = new Set<string>();
  const seenNumber = new Set<number>();
  cases.forEach((useCase, i) => {
    if (seenCuid.has(useCase.cuid)) {
      ctx.addIssue({ code: "custom", path: [i, "cuid"], message: `case "${useCase.cuid}" is declared twice` });
    }
    seenCuid.add(useCase.cuid);
    if (seenNumber.has(useCase.number)) {
      ctx.addIssue({ code: "custom", path: [i, "number"], message: `case number ${useCase.number} is used twice — the owner refers to cases by number` });
    }
    seenNumber.add(useCase.number);
  });
});

// THE CORE as a whole — four objects, plus the two laws that bind them.
//
// THE LIFECYCLE LAW. `lifecycle` lives in the passport and NOWHERE else (one fact, one place), and it
// governs the whole graph:
//   frozen-template — the template as it is born: EVERY node is hidden, nothing runs, the interface reads
//                     this state to keep its controls locked;
//   real-project    — after the first development iteration: the automation has at least one visible node
//                     and at least one use case, because a real project is defined by its cases.
export const AutomationSchema = z
  .object({
    passport: PassportSchema,
    graph: GraphSchema,
    components: ComponentsSchema,
    useCases: UseCasesSchema,
  })
  .strict()
  .superRefine((automation, ctx) => {
    const { lifecycle } = automation.passport;
    const visible = automation.graph.nodes.filter((n) => n.state === "visible");

    if (lifecycle === "frozen-template" && visible.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["graph", "nodes"],
        message: `a frozen template shows nothing: ${visible.length} node(s) are visible while lifecycle is "frozen-template"`,
      });
    }
    if (lifecycle === "real-project" && automation.graph.nodes.length > 0 && visible.length === 0) {
      ctx.addIssue({ code: "custom", path: ["graph", "nodes"], message: "a real project must have at least one visible node" });
    }
    if (lifecycle === "real-project" && automation.useCases.length === 0) {
      ctx.addIssue({ code: "custom", path: ["useCases"], message: "a real project is defined by its use cases — there must be at least one" });
    }
  });

// Editor types — inferred from the schemas, never written by hand.
export type Cuid = z.infer<typeof CuidSchema>;
export type AutomationType = z.infer<typeof AutomationTypeSchema>;
export type Lifecycle = z.infer<typeof LifecycleSchema>;
export type ParallelPage = z.infer<typeof ParallelPageSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type FracteraPro = z.infer<typeof FracteraProSchema>;
export type Passport = z.infer<typeof PassportSchema>;
export type State = z.infer<typeof StateSchema>;
export type Info = z.infer<typeof InfoSchema>;
export type InputChannel = z.infer<typeof InputChannelSchema>;
export type OutputChannel = z.infer<typeof OutputChannelSchema>;
export type PortStateType = z.infer<typeof PortStateSchema>;
export type PortTarget = z.infer<typeof PortTargetSchema>;
export type NodePort = z.infer<typeof PortSchema>;
export type NodeKind = z.infer<typeof NodeKindSchema>;
export type NodeFunction = z.infer<typeof NodeFunctionSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type Graph = z.infer<typeof GraphSchema>;
export type Presence = z.infer<typeof PresenceSchema>;
export type BuildStatus = z.infer<typeof BuildStatusSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Tab = z.infer<typeof TabSchema>;
export type Components = z.infer<typeof ComponentsSchema>;
export type Warning = z.infer<typeof WarningSchema>;
export type EnvKeyStatus = z.infer<typeof EnvKeyStatusSchema>;
export type EnvKey = z.infer<typeof EnvKeySchema>;
export type UseCaseStatus = z.infer<typeof UseCaseStatusSchema>;
export type UseCase = z.infer<typeof UseCaseSchema>;
export type Automation = z.infer<typeof AutomationSchema>;

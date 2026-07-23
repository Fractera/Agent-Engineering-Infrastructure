import { z } from "zod";

// СХЕМА ЯДРА — форма файла `automation.json`, описанная ровно один раз.
// Лежит рядом с файлом, который проверяет: схема и данные всегда правятся вместе.
// Типы отсюда не пишутся руками — они выводятся схемой.

const TEXT_LIMIT = 200;

// ─── SYSTEM INSTRUCTIONS — the law texts, one file each ─────────────────────────────────────────────
// Each kind of entity has a SYSTEM INSTRUCTION: the short, authoritative text saying what is expected of
// THAT entity. It is what replaces a long document no weak model finishes reading.
//
// WHERE THE TEXT LIVES: `_instructions/<name>.md` — one file per name, and nowhere else. The object in
// the core carries the NAME of its instruction (`systemInstructionName`), never a copy of the text: the
// link is visible right in the object, and costs ONE WORD instead of ~1 800 bytes. Nineteen copies of the
// text would have doubled the core file (~11 700 tokens on every full read); nineteen names cost ~400.
//
// The schema therefore knows only the LIST of lawful names and demands the right one of every object — a
// node carries `nodes`, a tab `tab`, the input group `group.input`. The name cannot be swapped: it is law,
// merely a cheap one. The owner edits the law as plain markdown, with no rebuild and no code change.
export const SYSTEM_INSTRUCTION_NAMES = [
  "passport", // the STARTING instruction: how to work here at all (doors, order of iterations)
  "fracteraPro",
  "graph",
  "nodes", // for ALL nodes, whatever their kind
  "group.input",
  "group.middle",
  "group.output",
  "kind.input",
  "kind.input-connector",
  "kind.transform",
  "kind.condition-success",
  "kind.condition-failure",
  "kind.output",
  "kind.output-connector",
  "components", // for ALL components
  "tab", // for every tab
  // A TAB WITH A LAW OF ITS OWN gets an ADDITIONAL instruction `tab.<name>`, and the general `tab` law
  // keeps governing it — the object's pinned name stays `tab`, so nothing in the core changes. The extra
  // one exists for tabs whose behaviour cannot be derived from the general law: the calendar is the
  // first (it raises due notices on the schedule's beat and may declare outward integrations).
  "tab.calendar",
  "useCases",
  "history",
] as const;

export const SystemInstructionNameSchema = z.enum(SYSTEM_INSTRUCTION_NAMES);
export type SystemInstructionName = (typeof SYSTEM_INSTRUCTION_NAMES)[number];

/** The field an object carries: the NAME of its law, pinned to the one that governs this kind of object. */
const instructionName = (name: SystemInstructionName) =>
  z.string().refine((value) => value === name, {
    message: `this object is governed by the instruction "${name}" — the name is law, not a choice`,
  });

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

// THE AI THIS AUTOMATION THINKS WITH — which provider and which model.
//
// It lives in the PASSPORT, not in the environment, because it is a property of THIS automation, the
// same way its type and its lifecycle are. The provider's KEY is a project-wide secret and lives in the
// environment like every other credential; the CHOICE of model does not — two automations sharing one
// key may legitimately think with different models.
//
// The model id is a free string on purpose: the catalogue of available models lives in code
// (`_components/ai.ts`) and changes with the world, while the core only records what was chosen. A
// closed enum here would mean a schema edit — and a failed validation of every existing automation —
// every time a provider ships a model.
export const AiProviderSchema = z.enum(["anthropic", "openai"]);

export const AiSchema = z
  .object({
    provider: AiProviderSchema,
    model: z.string().min(1, "a model id is required — the catalogue lives in _components/ai.ts"),
  })
  .strict();

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

// SHARING — may this automation be published into the public space, or is it for its author alone?
// One field, two honest answers; nothing is public by accident.
export const SharingSchema = z.enum(["private", "public"]);

export const PassportSchema = z
  .object({
    systemInstructionName: instructionName("passport"),
    title: z.string().min(1, "the automation must have a title"),
    description: z.string(),
    type: AutomationTypeSchema,
    lifecycle: LifecycleSchema,
    // WHICH AI it thinks with — see AiSchema above. The menu shows it, Settings changes it.
    ai: AiSchema,
    // WHO made it: the id of the user who created this automation. Empty only while the automation is
    // still the untouched frozen template — a real project always has an author (checked in the core law).
    author: z.string(),
    sharing: SharingSchema,
    // Fractera Pro keeps its own instruction ALWAYS, even in the plain mode where there is no config to
    // speak of: an instruction that disappears with the feature could never explain how to turn it on.
    fracteraPro: z
      .object({
        systemInstructionName: instructionName("fracteraPro"),
        config: FracteraProSchema.nullable(),
      })
      .strict(),
    // the owner's instruction for the automation as a whole (or the model's summary of it)
    info: InfoSchema,
    // HOW IT WORKS — the answer to the owner's question "how does this automation work?", written by
    // the model from the WHOLE context and kept as a list of statements rather than one blob: a list
    // can be extended, re-stated line by line and embedded piece by piece. This text is what the
    // vector record is built from, and therefore what makes this automation FINDABLE among hundreds —
    // it is the automation's public account of itself, not a changelog and not a duplicate of `info`
    // (which is the owner's brief). Empty while nothing has been built yet.
    howItWorks: z.array(z.string().min(1, "an empty line says nothing — remove it instead")),
  })
  .strict();

// WARNING — the agent → owner message channel. It accompanies EVERY entity that gets built: a node, a
// tab, an entity inside a tab. An empty list means "nothing to say"; a warning means the agent stopped
// and is telling the owner something instead of guessing.
//
// One of its duties is named in the law (`_instructions/passport.md`): when fundamentally different tasks pile
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
  "email", // a letter delivered to the automation's own inbound address
  "custom", // any other input source the owner defines
]);
// `hermes` was removed from this vocabulary by the owner (step 293): an automation is not fed by the
// workspace's agent runtime. Its slot in the input quota is taken by `email`, so the count is unchanged.
// This deletion is an EXCEPTION to "a door is never removed, an unused one is hidden" — a channel that
// must not exist at all is a different case from one that exists and is unused.

export const OutputChannelSchema = z.enum([
  "public-page", // a page on the automation's own website
  "dashboard", // a row or a table on the dashboard
  "calendar", // an event on the automation's calendar
  "analytics", // a chart in the automation's analytics
  "map", // a marker on the automation's map
  "email", // an email the automation sends out
  "telegram-bot", // a message sent through the automation's own Telegram bot
  "user-telegram-chat", // a message written into the user's own Telegram chat
  "vector-memory", // a fact remembered in the agent vector memory (LightRAG)
  "database", // a record written into the automation's own local database
  "storage", // a file kept in the automation's own local storage
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
    // ВЕТКА УСПЕХА ВЕДЁТ И В ВЫХОДНОЙ КОННЕКТОР (2026-07-22). Закон связи проверяется со стороны
    // ИСТОЧНИКА, а `output-connector` объявлял вход «только из condition-success» — и при этом ни один
    // вид не называл его в своих исходящих. Требуемый вход коннектора был невыполним: его нельзя было
    // соединить ни с чем законным, и он навсегда оставался висеть отдельно от графа (владелец увидел
    // это на диаграмме). Односторонняя запись была ошибкой, а не задумкой: коннектор доставляет
    // результат наружу ровно так же, как выходной узел доставляет его внутрь автоматизации.
    in: { state: "required", connections: ["transform"] },
    out: { state: "required", connections: ["transform", "output", "output-connector"] },
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

// ─── NODE GROUPS ────────────────────────────────────────────────────────────────────────────────────
// The nodes are not one flat pile: they live in THREE GROUPS — the way in, the middle, the way out — and
// each group states its own rules RIGHT ABOVE the array they govern. A model editing a group therefore
// reads its law locally, without holding the whole table of kinds in its head, and a rule it ignores does
// not merely go against the documentation — it fails validation.
//
// THE QUOTA HAS TWO LEVELS, because one level counts the wrong thing: "at least two nodes" is satisfied by
// two `input` nodes and no connector at all.
//
//   at the GROUP level — `minKinds`: how many DIFFERENT kinds must be present;
//   at the KIND level  — each kind's own rules, because a connector and an ordinary входной узел do not
//                        live by the same law:
//        deletion — may a node of this kind be removed;
//        addition — may another one be added;
//        minNodes — how many nodes of this kind there must be.
//
// The keys of `kinds` ARE the group's allowed kinds — no second list that could disagree with the first.
export const PermissionSchema = z.enum(["allowed", "forbidden"]);
export const GroupNameSchema = z.enum(["input", "middle", "output"]);

// A kind's own rules, plus the system instruction of that kind — the text a model reads before it touches
// a node of this kind. The instruction is pinned per kind in the group check below (a record cannot vary
// its value schema by key).
export const KindPolicySchema = z
  .object({
    systemInstructionName: SystemInstructionNameSchema,
    deletion: PermissionSchema,
    addition: PermissionSchema,
    minNodes: z.number().int().positive(),
  })
  .strict();

type KindPolicy = { deletion: z.infer<typeof PermissionSchema>; addition: z.infer<typeof PermissionSchema>; minNodes: number };
type GroupPolicy = { minKinds: number; kinds: Partial<Record<z.infer<typeof NodeKindSchema>, KindPolicy>> };

// How many channels an automation is born ready for: EVERY channel of the vocabulary except `custom` —
// that one is the open door, a node for it is made when it is actually needed. Counted FROM the vocabulary
// itself, never typed in as a number: a new channel raises the quota by itself, and the two cannot drift.
const channelCount = (options: readonly string[]) => options.filter((c) => c !== "custom").length;
export const INPUT_CHANNEL_QUOTA = channelCount(InputChannelSchema.options);
export const OUTPUT_CHANNEL_QUOTA = channelCount(OutputChannelSchema.options);

// THE GROUP TABLE — the law, stated once. A group's own declaration must repeat its row word for word.
//
// The numbers are NOT arbitrary:
//   input / output — one node per channel of the vocabulary: the automation is born with the FULL
//                    inventory of its doors, all hidden, and the builder only ever UNHIDES one. That is
//                    what makes an automation's composition predictable before it is read.
//   connectors     — exactly one each: deletion AND addition are both forbidden, so the count can neither
//                    fall below one nor rise above it.
//   middle         — one of each kind at the floor, and the group may grow freely: the middle is where the
//                    automation's real work is decomposed.
export const GROUP_POLICY: Record<z.infer<typeof GroupNameSchema>, GroupPolicy> = {
  input: {
    minKinds: 2,
    kinds: {
      input: { deletion: "forbidden", addition: "allowed", minNodes: INPUT_CHANNEL_QUOTA },
      "input-connector": { deletion: "forbidden", addition: "forbidden", minNodes: 1 },
    },
  },
  middle: {
    minKinds: 3,
    kinds: {
      transform: { deletion: "allowed", addition: "allowed", minNodes: 1 },
      "condition-success": { deletion: "allowed", addition: "allowed", minNodes: 1 },
      "condition-failure": { deletion: "allowed", addition: "allowed", minNodes: 1 },
    },
  },
  output: {
    minKinds: 2,
    kinds: {
      output: { deletion: "forbidden", addition: "allowed", minNodes: OUTPUT_CHANNEL_QUOTA },
      "output-connector": { deletion: "forbidden", addition: "forbidden", minNodes: 1 },
    },
  },
};

const sameKinds = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

// One group: the minimum number of kinds, the per-kind rules, and the nodes. The rules are checked against
// the table, the nodes against the rules.
const groupOf = (name: z.infer<typeof GroupNameSchema>) =>
  z
    .object({
      systemInstructionName: instructionName(`group.${name}` as SystemInstructionName),
      minKinds: z.number().int().positive(),
      // the keys are node kinds, but the record is deliberately PARTIAL: a group names only its own kinds.
      // (`z.record(NodeKindSchema, …)` would demand every kind of the enum in every group.) The keys are
      // checked against the table below, so nothing arbitrary gets in.
      kinds: z.record(z.string(), KindPolicySchema),
      nodes: z.array(NodeSchema),
    })
    .strict()
    .superRefine((group, ctx) => {
      const law = GROUP_POLICY[name];
      const lawKinds = Object.keys(law.kinds) as z.infer<typeof NodeKindSchema>[];

      if (group.minKinds !== law.minKinds) {
        ctx.addIssue({ code: "custom", path: ["minKinds"], message: `the "${name}" group carries ${law.minKinds} kinds, not ${group.minKinds}` });
      }

      // the declared kinds, and their rules, must repeat the table exactly
      if (!sameKinds(Object.keys(group.kinds), lawKinds)) {
        ctx.addIssue({ code: "custom", path: ["kinds"], message: `the "${name}" group holds exactly: ${lawKinds.join(", ")}` });
      }
      lawKinds.forEach((kind) => {
        const declared = group.kinds[kind];
        const rule = law.kinds[kind]!;
        if (!declared) return; // already reported above
        (["deletion", "addition"] as const).forEach((key) => {
          if (declared[key] !== rule[key]) {
            ctx.addIssue({ code: "custom", path: ["kinds", kind, key], message: `for "${kind}" ${key} is "${rule[key]}"` });
          }
        });
        if (declared.minNodes !== rule.minNodes) {
          ctx.addIssue({ code: "custom", path: ["kinds", kind, "minNodes"], message: `there are never fewer than ${rule.minNodes} "${kind}" node(s)` });
        }
        // each kind names ITS OWN law — `kind.transform` governs transforms and nothing else
        if (declared.systemInstructionName !== `kind.${kind}`) {
          ctx.addIssue({
            code: "custom",
            path: ["kinds", kind, "systemInstructionName"],
            message: `a "${kind}" is governed by the instruction "kind.${kind}" — the name is law, not a choice`,
          });
        }
      });

      group.nodes.forEach((node, i) => {
        if (!lawKinds.includes(node.kind)) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes", i, "kind"],
            message: `a "${node.kind}" cannot live in the "${name}" group — it holds ${lawKinds.join(", ")}`,
          });
        }
      });

      // THE FLOOR and THE CEILING. `deletion: "forbidden"` means the count cannot fall below the floor —
      // an unused door is HIDDEN, never removed. `addition: "forbidden"` means it cannot rise above it
      // either: there is exactly one connector, no more.
      lawKinds.forEach((kind) => {
        const rule = law.kinds[kind]!;
        const count = group.nodes.filter((n) => n.kind === kind).length;
        if (count < rule.minNodes) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `the "${name}" group carries ${count} "${kind}" node(s) — never fewer than ${rule.minNodes}; an unused one is hidden, not deleted`,
          });
        }
        if (rule.addition === "forbidden" && count > rule.minNodes) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `a second "${kind}" cannot be added — there is exactly ${rule.minNodes} of it`,
          });
        }
      });

      const present = new Set(group.nodes.map((n) => n.kind)).size;
      if (present < law.minKinds) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes"],
          message: `the "${name}" group shows ${present} kind(s) of node — it must carry at least ${law.minKinds}`,
        });
      }
    });

export const NodesSchema = z
  .object({
    systemInstructionName: instructionName("nodes"),
    // the instruction for ALL nodes, whatever their kind — the per-kind ones live in each group's `kinds`
    groups: z
      .object({
        input: groupOf("input"),
        middle: groupOf("middle"),
        output: groupOf("output"),
      })
      .strict(),
  })
  .strict();

// Every graph-wide check works on the flat list; this is the ONE place that flattens the groups.
export const allNodes = (nodes: z.infer<typeof NodesSchema>): z.infer<typeof NodeSchema>[] => [
  ...nodes.groups.input.nodes,
  ...nodes.groups.middle.nodes,
  ...nodes.groups.output.nodes,
];

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
    systemInstructionName: instructionName("graph"),
    nodes: NodesSchema,
    edges: z.array(EdgeSchema),
  })
  .strict()
  .superRefine((graph, ctx) => {
    const nodes = allNodes(graph.nodes);
    const byCuid = new Map<string, z.infer<typeof NodeSchema>>();
    nodes.forEach((node) => {
      if (byCuid.has(node.cuid)) {
        ctx.addIssue({ code: "custom", path: ["nodes"], message: `node "${node.name}" carries a cuid that is declared twice` });
        return;
      }
      byCuid.set(node.cuid, node);

      // the node must declare its kind's row of the connection table, word for word
      (["in", "out"] as const).forEach((side) => {
        if (!samePort(node[side], KIND_PORTS[node.kind][side])) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `node "${node.name}" of kind "${node.kind}" must declare ${side}: ${JSON.stringify(KIND_PORTS[node.kind][side])}`,
          });
        }
      });
    });

    // A FUNCTION NAME IS AN ADDRESS. The code of a node's function lives in
    // `_lib/nodes/<kebab-of-the-name>.ts` — one file per function — so two nodes claiming the name
    // would claim the same file. The name is also a public contract other nodes call by, which is why
    // it is never renamed; here it is additionally forced to be unique.
    const seenFunctions = new Map<string, string>();
    nodes.forEach((node) => {
      const owner = seenFunctions.get(node.function.name);
      if (owner) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes"],
          message: `two nodes claim the function "${node.function.name}" ("${owner}" and "${node.name}") — a function name is the address of its file, and there is only one of it`,
        });
        return;
      }
      seenFunctions.set(node.function.name, node.name);
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
    nodes.forEach((node) => {
      if (node.state !== "visible") return;
      const wiredIn = graph.edges.some((e) => e.to === node.cuid);
      const wiredOut = graph.edges.some((e) => e.from === node.cuid);
      if (node.in.state === "required" && !wiredIn) {
        ctx.addIssue({ code: "custom", path: ["nodes"], message: `node "${node.name}" requires an incoming edge and has none` });
      }
      if (node.out.state === "required" && !wiredOut) {
        ctx.addIssue({ code: "custom", path: ["nodes"], message: `node "${node.name}" requires an outgoing edge and has none` });
      }
    });

    // The mandatory set of kinds is no longer stated here: it is the groups' own law (GROUP_POLICY —
    // deletion "forbidden" ⇒ every allowed kind stays present). One law, one place.
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
    systemInstructionName: instructionName("tab"),
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
    systemInstructionName: instructionName("components"),
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

// The use cases as a WHOLE carry their own warnings — the place where the agent reports a CONFLICT: two
// cases contradicting each other so plainly that building is impossible. Such a conflict belongs to no
// single case (each one is fine on its own), so it has nowhere else to live.
export const UseCasesSchema = z
  .object({
    systemInstructionName: instructionName("useCases"),
    warnings: z.array(WarningSchema),
    cases: z.array(UseCaseSchema),
  })
  .strict()
  .superRefine((useCases, ctx) => {
    const seenCuid = new Set<string>();
    const seenNumber = new Set<number>();
    useCases.cases.forEach((useCase, i) => {
      if (seenCuid.has(useCase.cuid)) {
        ctx.addIssue({ code: "custom", path: ["cases", i, "cuid"], message: `case "${useCase.cuid}" is declared twice` });
      }
      seenCuid.add(useCase.cuid);
      if (seenNumber.has(useCase.number)) {
        ctx.addIssue({ code: "custom", path: ["cases", i, "number"], message: `case number ${useCase.number} is used twice — the owner refers to cases by number` });
      }
      seenNumber.add(useCase.number);
    });
  });

// ─── HISTORY — the fifth object of the core ─────────────────────────────────────────────────────────
// What has been done to this automation, version by version. A version is one round of work: when it
// happened, HOW MUCH was touched (the plain count of nodes and components created, updated or deleted),
// and a short account of what changed. The summary is capped: it is a note for a human and a model, not a
// changelog to hide a wall of text in.
const SUMMARY_LIMIT = 500;
const DATE_FORMAT = /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/; // dd-mm-yyyy hh:mm:ss

export const VersionSchema = z
  .object({
    cuid: CuidSchema,
    number: z.number().int().positive(),
    createdAt: z.string().regex(DATE_FORMAT, "the date is dd-mm-yyyy hh:mm:ss"),
    objectsTouched: z.number().int().nonnegative(),
    summary: z.string().min(1, "a version without an account of it is not a version").max(SUMMARY_LIMIT, `the summary must be at most ${SUMMARY_LIMIT} characters`),
  })
  .strict();

export const HistorySchema = z
  .object({
    systemInstructionName: instructionName("history"),
    versions: z.array(VersionSchema),
  })
  .strict()
  .superRefine((history, ctx) => {
    const seenCuid = new Set<string>();
    const seenNumber = new Set<number>();
    history.versions.forEach((version, i) => {
      if (seenCuid.has(version.cuid)) {
        ctx.addIssue({ code: "custom", path: ["versions", i, "cuid"], message: `version "${version.cuid}" is declared twice` });
      }
      seenCuid.add(version.cuid);
      if (seenNumber.has(version.number)) {
        ctx.addIssue({ code: "custom", path: ["versions", i, "number"], message: `version number ${version.number} is used twice` });
      }
      seenNumber.add(version.number);
    });
  });

// THE CORE as a whole — five objects, plus the laws that bind them.
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
    history: HistorySchema,
  })
  .strict()
  .superRefine((automation, ctx) => {
    const { lifecycle } = automation.passport;
    const nodes = allNodes(automation.graph.nodes);
    const visible = nodes.filter((n) => n.state === "visible");

    if (lifecycle === "frozen-template" && visible.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["graph", "nodes"],
        message: `a frozen template shows nothing: ${visible.length} node(s) are visible while lifecycle is "frozen-template"`,
      });
    }
    if (lifecycle === "real-project" && nodes.length > 0 && visible.length === 0) {
      ctx.addIssue({ code: "custom", path: ["graph", "nodes"], message: "a real project must have at least one visible node" });
    }
    // A WAY IN AND A WAY OUT (owner, 2026-07-22). "At least one visible node" is not enough: an automation
    // whose visible nodes are all middle ones can be neither triggered nor read — it is born dead. So the
    // moment the template becomes a real project, at least one door on EACH side must be open.
    //
    // This is the machine half of the launch law. Its human half lives in the system instructions
    // (`passport.md` §6.1, `group.input.md`, `group.output.md`): the agent REVEALS the channels the owner
    // named in the use cases, and falls back to control-panel in / dashboard out when he named none.
    // The instruction tells the agent what to do; this law makes forgetting it impossible.
    //
    // A connector counts as a door: a chained automation legitimately receives from — or hands to — a
    // neighbour instead of a channel of its own.
    if (lifecycle === "real-project" && nodes.length > 0) {
      for (const side of ["input", "output"] as const) {
        const open = automation.graph.nodes.groups[side].nodes.filter((n) => n.state === "visible");
        if (open.length === 0) {
          ctx.addIssue({
            code: "custom",
            path: ["graph", "nodes", "groups", side],
            message:
              `a real project needs at least one visible ${side} — otherwise it can never ` +
              `${side === "input" ? "be triggered" : "deliver a result"}. Reveal the ${side} channel the owner asked ` +
              `for in the use cases, or the default one (${side === "input" ? "control-panel" : "dashboard"}).`,
          });
        }
      }
    }
    if (lifecycle === "real-project" && automation.useCases.cases.length === 0) {
      ctx.addIssue({ code: "custom", path: ["useCases", "cases"], message: "a real project is defined by its use cases — there must be at least one" });
    }
    // A real project was made by somebody; the untouched template was made by nobody yet.
    if (lifecycle === "real-project" && !automation.passport.author.trim()) {
      ctx.addIssue({ code: "custom", path: ["passport", "author"], message: "a real project must name its author — the id of the user who created it" });
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
export type Permission = z.infer<typeof PermissionSchema>;
export type KindPolicyType = z.infer<typeof KindPolicySchema>;
export type GroupName = z.infer<typeof GroupNameSchema>;
export type Nodes = z.infer<typeof NodesSchema>;
export type NodeGroup = Nodes["groups"]["input"];
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
export type UseCases = z.infer<typeof UseCasesSchema>;
export type Sharing = z.infer<typeof SharingSchema>;
export type Version = z.infer<typeof VersionSchema>;
export type History = z.infer<typeof HistorySchema>;
export type Automation = z.infer<typeof AutomationSchema>;

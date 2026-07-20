import { z } from "zod";

// СХЕМА ЯДРА — форма файла `automation.json`, описанная ровно один раз.
// Лежит рядом с файлом, который проверяет: схема и данные всегда правятся вместе.
// Типы отсюда не пишутся руками — они выводятся схемой.

const TEXT_LIMIT = 200;

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

export const PassportSchema = z
  .object({
    title: z.string().min(1, "the automation must have a title"),
    description: z.string(),
    type: AutomationTypeSchema,
    lifecycle: LifecycleSchema,
    fracteraPro: FracteraProSchema.nullable(),
  })
  .strict();

// STATE — whether a node or an edge is shown on the diagram.
export const StateSchema = z.enum(["hidden", "visible"]);

// BUILD STATUS — still being built, or built and standing. One vocabulary for nodes and components
// alike: the same fact must never be spelled two different ways.
export const BuildStatusSchema = z.enum(["in-development", "materialized"]);

// Anything that gets BUILT is described the same way: the raw instruction that arrived BEFORE the
// work, the summary written AFTER it, and the status in between.
const buildRecord = {
  instruction: z.string(),
  summary: z.string().max(TEXT_LIMIT, `the summary must be at most ${TEXT_LIMIT} characters`),
  status: BuildStatusSchema,
};

// A NODE FUNCTION — what it does, what it takes, what it gives back.
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

// PORTS — the node's inputs and outputs in full: port name -> value type.
// Stored here entirely: a node must be understandable without reaching outside its own object.
export const PortsSchema = z.record(z.string(), z.string());

// THE THREE PORT STATES — there are no others:
//   required  — at least one port must be declared;
//   optional  — it may be there, it may not;
//   forbidden — not a single port may be declared.
const required = (what: string) => PortsSchema.refine((p) => Object.keys(p).length > 0, `${what} is required for this kind of node`);
const optional = (_what: string) => PortsSchema;
const forbidden = (what: string) => PortsSchema.refine((p) => Object.keys(p).length === 0, `${what} cannot exist on this kind of node`);

// NODE KINDS. The kind fixes the state of both ports — required / optional / forbidden, nothing else.
// This is the table by which a model knows what may connect to what before reading any node content.
//
//   kind               in          out
//   input-connector    required    required     in chained: one of the incoming data variants
//   output-connector   required    optional     in chained: one of the outgoing channels
//   input              forbidden   required     a primary data channel into the automation
//   output             required    forbidden    the automation's result
//   transform          required    required     the ordinary middle working node
//   condition-success  required    required     the successful logical branch
//   condition-failure  required    forbidden    the failing branch — the flow ends here
export const NodeKindSchema = z.enum([
  "input-connector",
  "output-connector",
  "input",
  "output",
  "transform",
  "condition-success",
  "condition-failure",
]);

// Fields every node carries, whatever its kind.
const nodeBase = {
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  state: StateSchema,
  // the node's channel / surface (control-panel, telegram, dashboard …) — not every kind has one
  ioType: z.string().nullable(),
  // instruction (raw, before the work) + summary (written after it) + status
  ...buildRecord,
  functions: z.array(NodeFunctionSchema),
  run: z.enum(["sequential", "parallel"]),
  estDurationMs: z.number().int().positive(),
};

const nodeOf = (kind: z.infer<typeof NodeKindSchema>, ports: { in: z.ZodTypeAny; out: z.ZodTypeAny }) =>
  z.object({ ...nodeBase, kind: z.literal(kind), in: ports.in, out: ports.out }).strict();

export const NodeSchema = z.discriminatedUnion("kind", [
  nodeOf("input-connector", { in: required("an input"), out: required("an output") }),
  nodeOf("output-connector", { in: required("an input"), out: optional("an output") }),
  nodeOf("input", { in: forbidden("an input"), out: required("an output") }),
  nodeOf("output", { in: required("an input"), out: forbidden("an output") }),
  nodeOf("transform", { in: required("an input"), out: required("an output") }),
  nodeOf("condition-success", { in: required("an input"), out: required("an output") }),
  nodeOf("condition-failure", { in: required("an input"), out: forbidden("an output") }),
]);

export const EdgeSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    state: StateSchema,
  })
  .strict();

// Kinds that can never be an edge's source (no output) or its target (no input).
const KINDS_WITHOUT_OUT = new Set(["output", "condition-failure"]);
const KINDS_WITHOUT_IN = new Set(["input"]);

// how many ports a node declares — the union widens port types, so accept unknown here
const portCount = (ports: unknown): number =>
  ports && typeof ports === "object" ? Object.keys(ports as Record<string, unknown>).length : 0;

// THE GRAPH. Beyond the shape of nodes and edges it checks what a single node's schema cannot see:
// unique ids, both ends of an edge existing, and the direction being lawful for the kind.
export const GraphSchema = z
  .object({
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema),
  })
  .strict()
  .superRefine((graph, ctx) => {
    const byId = new Map<string, z.infer<typeof NodeSchema>>();
    graph.nodes.forEach((node, i) => {
      if (byId.has(node.id)) {
        ctx.addIssue({ code: "custom", path: ["nodes", i, "id"], message: `node "${node.id}" is declared twice` });
        return;
      }
      byId.set(node.id, node);
    });

    graph.edges.forEach((edge, i) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);

      if (!from) {
        ctx.addIssue({ code: "custom", path: ["edges", i, "from"], message: `node "${edge.from}" does not exist` });
      } else if (KINDS_WITHOUT_OUT.has(from.kind) || portCount(from.out) === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "from"],
          message: `node "${edge.from}" of kind "${from.kind}" has no output — an edge out of it is impossible`,
        });
      }

      if (!to) {
        ctx.addIssue({ code: "custom", path: ["edges", i, "to"], message: `node "${edge.to}" does not exist` });
      } else if (KINDS_WITHOUT_IN.has(to.kind)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "to"],
          message: `node "${edge.to}" of kind "${to.kind}" has no input — an edge into it is impossible`,
        });
      }

      if (edge.from === edge.to) {
        ctx.addIssue({ code: "custom", path: ["edges", i], message: "an edge cannot lead a node into itself" });
      }
    });

    // An automation must have something to start from and something to finish with.
    const canStart = graph.nodes.some((n) => n.kind === "input" || n.kind === "input-connector");
    const canFinish = graph.nodes.some((n) => n.kind === "output" || n.kind === "output-connector");
    if (graph.nodes.length > 0 && !canStart) {
      ctx.addIssue({ code: "custom", path: ["nodes"], message: "no node accepts incoming data (input or input-connector)" });
    }
    if (graph.nodes.length > 0 && !canFinish) {
      ctx.addIssue({ code: "custom", path: ["nodes"], message: "no node delivers a result (output or output-connector)" });
    }
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
    id: z.string().min(1),
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
      if (seen.has(entity.id)) {
        ctx.addIssue({ code: "custom", path: ["entities", i, "id"], message: `entity "${entity.id}" is declared twice` });
      }
      seen.add(entity.id);
    });
  });

export const ComponentsSchema = z
  .object({
    tabs: z.array(TabSchema),
  })
  .strict();

// THE CORE as a whole — three objects.
export const AutomationSchema = z
  .object({
    passport: PassportSchema,
    graph: GraphSchema,
    components: ComponentsSchema,
  })
  .strict();

// Editor types — inferred from the schemas, never written by hand.
export type AutomationType = z.infer<typeof AutomationTypeSchema>;
export type Lifecycle = z.infer<typeof LifecycleSchema>;
export type ParallelPage = z.infer<typeof ParallelPageSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type FracteraPro = z.infer<typeof FracteraProSchema>;
export type Passport = z.infer<typeof PassportSchema>;
export type State = z.infer<typeof StateSchema>;
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
export type Automation = z.infer<typeof AutomationSchema>;

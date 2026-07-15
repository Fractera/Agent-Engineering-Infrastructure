// FROZEN STANDARD — the node → functions contract (step 223.C; spec in app/(projects)/README.md,
// "The node → functions contract"). A node is a TYPED CONTAINER of the application's own functions:
// it stores name + description + typed input/output + conditions, and an ordered/parallel set of
// functions. A node's functions are DETERMINISTIC application code — the AI is allowed only as an
// explicit external tool-call step, never as the app thinking for itself. Co-location invariant
// (README §5): a node's real functions live only in projects/<cat>/<slug>/_nodes/<nodeId>/ — delete
// the automation and they vanish with zero technical debt.

/** An illustrative type reference of a parameter, e.g. "Article" | "string" | "ISODate". At this stage
 *  it is a label the panel shows and the agent honours; 223.C later binds it to real generated types. */
export type TypeSpec = string;

// ─── NODE ROLE (the three-part node taxonomy, 2026-07-15 owner) ────────────────────────────────────────────
// Every node plays one of three canonical ROLES in the automation's flow — the SAME vocabulary the Tests
// standard already uses for probes (`ProbeStage` in _shared/tests.ts: input | intermediate | output), reused
// here so nodes and tests speak one language. CUSTOM roles are explicitly allowed: `role` is an OPEN string
// union (`(string & {})`) — any other value is honoured and shown as its own badge on the diagram. The three
// canonical roles are what a fresh automation is born with and what a coding agent picks from by default when
// deciding which node is the entry and which is the exit. Absent → treated as `intermediate`.
export type NodeRole = "input" | "intermediate" | "output" | (string & {});

/** ≤10-word plain-language description of each CANONICAL node role — a deterministic dictionary in code (no
 *  model call), the SAME pattern as the automation-type descriptions (available_types_and_descriptions). It is
 *  emitted into the architecture bundle (iteration 2) so a coding agent instantly knows which role to choose;
 *  custom roles are allowed beyond these three. */
export const NODE_ROLE_DESCRIPTIONS: Record<"input" | "intermediate" | "output", string> = {
  input: "Where the automation receives its work — the entry point.",
  intermediate: "The deterministic middle — turns input into the result.",
  output: "Where the automation delivers its result — the exit point.",
};

/** One function of a node — deterministic application work with typed inputs and a typed return. */
export type NodeFunction = {
  name: string;
  paramsIn: Record<string, TypeSpec>;
  returns: TypeSpec;
  /** Control rules the agent must honour when implementing / running the function. */
  rules?: string[];
  /** If this function makes an EXTERNAL AI call (the ONLY allowed use of AI — never inside the app),
   *  the FULL system instruction passed to that AI at runtime (step 223.C). The panel shows it in FULL
   *  (never truncated) so it is clear WHAT is invoked and HOW the result maps back to the formed
   *  request. `resultMapping` states how the AI's answer is bound back to the function's typed return.
   *  Absent = a plain deterministic function with no AI. */
  externalAi?: {
    systemInstruction: string;
    resultMapping?: string;
  };
};

/** Per-node runtime status (used by the run model in a later 223.C slice). */
export type NodeRunStatus = "idle" | "running" | "ok" | "fail";

/** A node = the unit that appears on the diagram. Its `functions` are the physical work behind it. */
export type NodeContract = {
  id: string;
  /** Stable global identity (CUID, step 224). The join key for the DB canvas index + version history —
   *  survives a folder rename (unlike `id`/the slug). Weak models mangle the UUID format, so CUID.
   *  Required at runtime (the DB column is NOT NULL, the create route always supplies one); optional in
   *  the type during the 224 migration until every existing file node carries it (L2). */
  cuid?: string;
  name: string;
  description: string;
  /** This node's ROLE in the flow (2026-07-15) — `input` | `intermediate` | `output`, or a CUSTOM string.
   *  Drives the diagram badge and (iteration 2) the grouping of nodes in the architecture bundle. Absent →
   *  treated as `intermediate`. Lives in the node's own meta.ts, like every other descriptive fact. */
  role?: NodeRole;
  /** The node's own typed inputs / outputs. */
  in: Record<string, TypeSpec>;
  out: Record<string, TypeSpec>;
  conditions?: string[];
  /** How the function set runs. */
  run: "sequential" | "parallel";
  functions: NodeFunction[];
  /** The system instruction that generated the functions (co-located per node, see below). */
  instruction?: string;
  /** Builder DRAFT (step 224): a not-yet-built node — empty `functions`, a free-form `spec` instead of an
   *  instruction, a red frame, ignored by execution (a project with any draft auto-stops). */
  draft?: boolean;
  /** The owner's free-form brief for a draft node (co-located `_nodes/<slug>/spec.md`), from which the
   *  coder materializes the real functions. Present only while `draft`. */
  spec?: string;
  /** ESTIMATED process time of this node in milliseconds (step 230, the Processes/Gantt timeline). The model
   *  guesses it when the node is designed — no precision needed; it can be ms, seconds, minutes or days. The
   *  fork timeline sums these across the nodes (sequential) to draw a fork's length; it is refined against
   *  actual execution (automation_runs). Lives in meta.ts (Model B) — never a column on the existing
   *  automation_nodes table (lesson 225 G4). Absent → the default estimate. */
  estDurationMs?: number;
};

/** A node's metadata — everything in the contract except the function set, the instruction and the spec
 *  (each co-located in its own file). Lives in the node's own `_nodes/<slug>/meta.ts`. */
export type NodeMeta = Omit<NodeContract, "functions" | "instruction" | "spec">;

/** The default node process-time estimate (step 230) — one minute, used when a node carries no estDurationMs
 *  (e.g. nodes created before 230). Deliberately coarse: the timeline is an estimate refined against reality. */
export const DEFAULT_NODE_DURATION_MS = 60_000;

export function nodeDurationMs(meta: Pick<NodeContract, "estDurationMs">): number {
  const v = meta.estDurationMs;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : DEFAULT_NODE_DURATION_MS;
}

/** Assemble a node's full contract from its co-located parts (step 223.C.2 / 224). Each node folder
 *  `_nodes/<slug>/` holds meta.ts (NodeMeta), functions.ts (NodeFunction[]), instruction.ts (string) and,
 *  for a draft, spec.md (string); the project's `_data/diagram.ts` composes the Master's nodes from these. */
export function assembleNode(
  meta: NodeMeta,
  functions: NodeFunction[],
  instruction?: string,
  spec?: string,
): NodeContract {
  return { ...meta, functions, instruction, spec };
}

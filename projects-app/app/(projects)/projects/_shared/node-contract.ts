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

/** One function of a node — deterministic application work with typed inputs and a typed return. */
export type NodeFunction = {
  name: string;
  paramsIn: Record<string, TypeSpec>;
  returns: TypeSpec;
  /** Control rules the agent must honour when implementing / running the function. */
  rules?: string[];
};

/** Per-node runtime status (used by the run model in a later 223.C slice). */
export type NodeRunStatus = "idle" | "running" | "ok" | "fail";

/** A node = the unit that appears on the diagram. Its `functions` are the physical work behind it. */
export type NodeContract = {
  id: string;
  name: string;
  description: string;
  /** The node's own typed inputs / outputs. */
  in: Record<string, TypeSpec>;
  out: Record<string, TypeSpec>;
  conditions?: string[];
  /** How the function set runs. */
  run: "sequential" | "parallel";
  functions: NodeFunction[];
  /** The system instruction that generated the functions (from _nodes/<id>/instruction.md). */
  instruction?: string;
};

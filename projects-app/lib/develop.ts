import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildArchitecture } from "@/lib/entity-architecture";
import {
  ENTITY_TYPES, setSummary, setWarning, listWarnings, archiveAndClearTransport, setLifecycleState,
  type EntityType, type EntityWarning,
} from "@/lib/entity-store";
import { materializeNode } from "@/lib/node-materialize";
import {
  createDraftNode, listNodes, patchNode, softDeleteNode, writeDiagramEdge,
  type NodeRow, type ResolvedProject,
} from "@/lib/nodes";
import { openAiKey } from "@/lib/quiz";
import { NODE_STUB_SPEC, type WaveItem } from "@/lib/wave";

// THE IN-PRODUCT DEVELOP AGENT (step 250) — the "Запустить разработку" button no longer hands a copyable
// task to an external coding agent: it drives an OpenAI Chat Completions TOOL-CALLING loop right here.
// The owner's reasoning (2026-07-17 test): with the architecture bundle as the law there is nothing to
// research — a bundled model solved in seconds what a cold external agent burned an hour on. The model
// receives the FULL bundle (stateless — resent on every launch, input is cheap) and answers only in
// DELTAS: seven narrow tools that create/patch/wire/materialize nodes and close/flag entities through the
// SAME lib write paths the HTTP routes use (phase 1 extraction), so the two entry points can never drift.
//
// THE CUTOFF IS THE FIRST DUTY (law 2b in AGENT_INSTRUCTION_CORE): a task bigger than the node budget
// (§2.1: 25/30) means ZERO changes — the model must instead `finish` with a decomposition recommendation,
// persisted as an owner-decision warning on `general`. That outcome is a SUCCESS, not an error.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_TURNS = 8;
const MAX_MS = 8 * 60 * 1000;

const WARNING_KINDS = ["hermes-scout", "owner-decision", "external-service", "missing-credentials"] as const;

// ─── The model of an automation (per-automation env key, step 208 pattern) ─────────────────────────────

/** The automation's OWN model: env `<SLUG>_MODEL` (live env → .env.local fallback, the 207.16 quirk) →
 *  the default. Same key the Settings modal's ModelKeySettings writes. */
export function automationModel(projectSlug: string): { envKey: string; model: string } {
  const envKey = `${projectSlug.toUpperCase().replace(/-/g, "_")}_MODEL`;
  const fromEnv = process.env[envKey];
  if (fromEnv) return { envKey, model: fromEnv };
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    const m = raw.match(new RegExp(`^${envKey}=(.+)$`, "m"));
    if (m) return { envKey, model: m[1].trim() };
  } catch { /* no .env.local — the default below */ }
  return { envKey, model: "gpt-4o-mini" };
}

// ─── The run lock (one develop run per automation) ─────────────────────────────────────────────────────

const running = new Set<string>();

export function tryAcquireDevelop(automation: string): boolean {
  if (running.has(automation)) return false;
  running.add(automation);
  return true;
}

export function releaseDevelop(automation: string): void {
  running.delete(automation);
}

// ─── The event protocol (SSE payloads the modal renders) ───────────────────────────────────────────────

export type DevelopEvent =
  | { type: "phase"; staged: number; model: string }
  | { type: "turn"; n: number }
  | { type: "delta"; text: string }
  | { type: "tool"; name: string }
  | { type: "tool-result"; name: string; ok: boolean; detail?: string }
  | { type: "done"; report: string; outcome: "implemented" | "decomposition" }
  | { type: "error"; code: string };

// ─── The seven tools (delta-only: there is deliberately NO "return everything" tool) ───────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "upsert_node",
      description:
        "Create a new DRAFT node (omit slug) or edit an existing node's fields (pass its slug). Editing a live node's instruction here does NOT restage it — this is your own work, not an owner request.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "The existing node's slug. Omit to create a new draft node." },
          name: { type: "string", description: "The node's display name." },
          role: { type: "string", description: "input | output | intermediate." },
          ioType: { type: "string", description: "The per-role type (transform | condition | a channel/surface key | a custom name)." },
          parentSlug: { type: "string", description: "The slug of the node this one branches off (the diagram parent)." },
          instruction: { type: "string", description: "The node's system instruction (for a new node this becomes its brief)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_node_functions",
      description:
        "Write a node's functions.ts (full file source) and materialize it: the node is compiled and goes LIVE instantly. A compile error comes back as this tool's result — fix the source and call again.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string" },
          functionsTs: { type: "string", description: "The COMPLETE functions.ts source." },
          instruction: { type: "string", description: "Optionally (re)write the node's instruction.ts in the same call." },
          summary: { type: "string", description: "≤300 chars, the owner's language: what the node does now." },
        },
        required: ["slug", "functionsTs", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "connect_nodes",
      description: "Add (or with remove:true delete) one diagram edge between two nodes, by slug.",
      parameters: {
        type: "object",
        properties: {
          fromSlug: { type: "string" },
          toSlug: { type: "string" },
          remove: { type: "boolean" },
        },
        required: ["fromSlug", "toSlug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_node",
      description: "Soft-delete a node by slug (tombstoned row, removed folder, purged edges, regenerated diagram).",
      parameters: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "close_entity",
      description:
        "Close a NON-node staged object after implementing it: writes its ≤300-char summary (owner's language) and archives its brief. A node is closed by write_node_functions instead. Refused while the object carries an open warning.",
      parameters: {
        type: "object",
        properties: {
          entityType: { type: "string", description: `One of: ${ENTITY_TYPES.join(", ")}.` },
          ref: { type: "string", description: "The instance ref ('' for automation-wide entities; a node's slug is accepted)." },
          summary: { type: "string" },
        },
        required: ["entityType", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "raise_warning",
      description:
        "Escalate a hard external blocker to the owner instead of hopeless retries. subject ≤120 chars (≤10 plain words, owner's language), blocker ≤500 chars (1-3 plain sentences). kind hermes-scout requires hermesInstruction; kind missing-credentials requires keys.",
      parameters: {
        type: "object",
        properties: {
          entityType: { type: "string" },
          ref: { type: "string" },
          subject: { type: "string" },
          blocker: { type: "string" },
          kind: { type: "string", description: `One of: ${WARNING_KINDS.join(", ")}.` },
          hermesInstruction: { type: "string" },
          keys: { type: "array", items: { type: "string" } },
        },
        required: ["entityType", "subject", "blocker", "kind"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finish",
      description:
        "End the run with the final report (owner's language). If the task exceeded the node budget (law 2b), pass `decomposition` INSTEAD of making any changes — that is a successful outcome.",
      parameters: {
        type: "object",
        properties: {
          report: { type: "string", description: "The final report for the owner, in the owner's language." },
          decomposition: {
            type: "object",
            description: "ONLY for the scale cutoff: the recommendation persisted for the owner's decision.",
            properties: {
              subject: { type: "string", description: "≤120 chars naming the oversized request." },
              overview: { type: "string", description: "≤500 chars, 1-3 plain sentences: why it must be split." },
              plan: {
                type: "string",
                description: "The FULL plan: the list of automations, a ready creation instruction for each, and how to group them.",
              },
            },
            required: ["subject", "overview", "plan"],
          },
        },
        required: ["report"],
      },
    },
  },
];

// ─── Tool executors (each atomic per-object; all through the phase-1 lib write paths) ──────────────────

type ExecResult = { ok: boolean; detail?: string; payload: unknown };

/** Find a node by slug OR cuid — the first live run proved the model copies CUIDS out of the bundle (its
 *  node refs are cuids) even when told to speak slugs, so the executor accepts both. A miss returns the
 *  live slug list in the error: the self-heal loop only converges when the error TEACHES. */
async function findNode(
  automation: string, key: string,
): Promise<{ row: NodeRow | undefined; notFound: string }> {
  const all = await listNodes(automation);
  const row = all.find((n) => n.slug === key || n.cuid === key);
  return {
    row,
    notFound: `node "${key}" not found — the existing nodes (by slug): ${all.map((n) => n.slug).join(", ") || "(none)"}`,
  };
}

/** close_entity / raise_warning accept a node's SLUG as ref (the model speaks slugs); the store speaks cuids. */
async function resolveRef(automation: string, entityType: EntityType, ref: string): Promise<string> {
  if (entityType !== "node" || !ref) return ref;
  const { row } = await findNode(automation, ref);
  return row ? row.cuid : ref;
}

async function execTool(proj: ResolvedProject, name: string, args: Record<string, unknown>): Promise<ExecResult> {
  const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : "");

  if (name === "upsert_node") {
    let parentCuid: string | null | undefined;
    if (str("parentSlug")) {
      const p = await findNode(proj.automation, str("parentSlug"));
      if (!p.row) return { ok: false, detail: `parent ${p.notFound}`, payload: { error: `parent ${p.notFound}` } };
      parentCuid = p.row.cuid;
    }
    if (!str("slug")) {
      const created = await createDraftNode(proj, {
        name: str("name"),
        spec: str("instruction").trim() || NODE_STUB_SPEC,
        parentCuid: parentCuid ?? null,
      });
      const fresh = await findNode(proj.automation, created.slug);
      if (fresh.row && (str("role") || str("ioType"))) {
        await patchNode(proj, fresh.row, { role: str("role") || undefined, ioType: str("ioType") || undefined }, false);
      }
      return { ok: true, detail: `draft ${created.slug}`, payload: { ok: true, slug: created.slug, cuid: created.cuid, draft: true } };
    }
    const found = await findNode(proj.automation, str("slug"));
    if (!found.row) return { ok: false, detail: found.notFound, payload: { error: found.notFound } };
    const row = found.row;
    const res = await patchNode(proj, row, {
      name: str("name") || undefined,
      role: str("role") || undefined,
      ioType: str("ioType") || undefined,
      instruction: str("instruction") || undefined,
      parentCuid,
    }, false);
    if (!res.ok) return { ok: false, detail: res.error, payload: { error: res.error } };
    return { ok: true, detail: row.slug, payload: { ok: true, slug: row.slug } };
  }

  if (name === "write_node_functions") {
    const found = await findNode(proj.automation, str("slug"));
    if (!found.row) return { ok: false, detail: found.notFound, payload: { error: `${found.notFound}; create a new node with upsert_node first` } };
    const row = found.row;
    const summary = str("summary").trim();
    if (!summary || summary.length > 300) {
      return { ok: false, detail: "summary must be 1..300 chars", payload: { error: `summary must be 1..300 characters (got ${summary.length})` } };
    }
    const nodeDir = join(proj.projectDir, "_nodes", row.slug);
    await writeFile(join(nodeDir, "functions.ts"), str("functionsTs"), "utf8");
    if (str("instruction")) {
      await writeFile(join(nodeDir, "instruction.ts"), `export const INSTRUCTION = ${JSON.stringify(str("instruction"))};\n`, "utf8");
    }
    const res = await materializeNode(proj, row, summary);
    if (!res.ok) return { ok: false, detail: res.error, payload: { error: res.error } };
    return { ok: true, detail: `${row.slug} live (v${res.version})`, payload: { ok: true, slug: row.slug, version: res.version, live: true } };
  }

  if (name === "connect_nodes") {
    const from = await findNode(proj.automation, str("fromSlug"));
    if (!from.row) return { ok: false, detail: from.notFound, payload: { error: from.notFound } };
    const to = await findNode(proj.automation, str("toSlug"));
    if (!to.row) return { ok: false, detail: to.notFound, payload: { error: to.notFound } };
    const res = await writeDiagramEdge(proj.automation, from.row.cuid, to.row.cuid, Boolean(args.remove));
    if (!res.ok) return { ok: false, detail: res.error, payload: { error: res.error } };
    return { ok: true, detail: `${from.row.slug} → ${to.row.slug}${args.remove ? " removed" : ""}`, payload: { ok: true } };
  }

  if (name === "delete_node") {
    const found = await findNode(proj.automation, str("slug"));
    if (!found.row) return { ok: false, detail: found.notFound, payload: { error: found.notFound } };
    await softDeleteNode(proj, found.row);
    return { ok: true, detail: found.row.slug, payload: { ok: true } };
  }

  if (name === "close_entity") {
    const entityType = str("entityType") as EntityType;
    if (!ENTITY_TYPES.includes(entityType)) {
      return { ok: false, detail: "unknown entityType", payload: { error: `unknown entityType (expected one of: ${ENTITY_TYPES.join(", ")})` } };
    }
    const summary = str("summary").trim();
    if (!summary || summary.length > 300) {
      return { ok: false, detail: "summary must be 1..300 chars", payload: { error: `summary must be 1..300 characters (got ${summary.length}) — compress it` } };
    }
    const storeAutomation = entityType === "edge" ? "" : proj.automation;
    const ref = await resolveRef(proj.automation, entityType, str("ref"));
    // Mirror of the entity-summary route's 409: done is incompatible with an open warning on the object.
    const open = await listWarnings(storeAutomation);
    if (open.some((w) => w.entityType === entityType && w.ref === ref)) {
      return { ok: false, detail: "open warning on this object", payload: { error: "this object carries an OPEN warning — a summary and a warning are mutually exclusive; resolve the warning first" } };
    }
    await setSummary(storeAutomation, entityType, ref, summary);
    await archiveAndClearTransport(storeAutomation, entityType, ref);
    if (entityType !== "edge") await setLifecycleState(proj.automation, "real-automation");
    return { ok: true, detail: `${entityType}${ref ? ` ${str("ref")}` : ""} closed`, payload: { ok: true, closed: true } };
  }

  if (name === "raise_warning") {
    const entityType = str("entityType") as EntityType;
    if (!ENTITY_TYPES.includes(entityType)) {
      return { ok: false, detail: "unknown entityType", payload: { error: `unknown entityType (expected one of: ${ENTITY_TYPES.join(", ")})` } };
    }
    const subject = str("subject").trim();
    const blocker = str("blocker").trim();
    const kind = str("kind") as EntityWarning["kind"];
    if (!subject || subject.length > 120) return { ok: false, detail: "subject must be 1..120 chars", payload: { error: "warning subject must be 1..120 characters — a short plain name of the need" } };
    if (!blocker || blocker.length > 500) return { ok: false, detail: "blocker must be 1..500 chars", payload: { error: "warning blocker must be 1..500 characters — 1-3 plain sentences; move technical detail into hermesInstruction" } };
    if (!WARNING_KINDS.includes(kind)) return { ok: false, detail: "unknown kind", payload: { error: `warning kind must be one of: ${WARNING_KINDS.join(", ")}` } };
    const hermesInstruction = str("hermesInstruction").trim();
    if (kind === "hermes-scout" && !hermesInstruction) {
      return { ok: false, detail: "hermes-scout needs hermesInstruction", payload: { error: "kind hermes-scout requires hermesInstruction — the full ready first-person brief for the Hermes agent" } };
    }
    const keys = Array.isArray(args.keys) ? (args.keys as unknown[]).map((k) => String(k).trim()).filter(Boolean) : [];
    if (kind === "missing-credentials" && !keys.length) {
      return { ok: false, detail: "missing-credentials needs keys", payload: { error: "kind missing-credentials requires keys — the UPPER_SNAKE env key names the owner must fill in Settings" } };
    }
    const ref = await resolveRef(proj.automation, entityType, str("ref"));
    await setWarning(proj.automation, entityType, ref, {
      subject, blocker, kind,
      hermesInstruction: hermesInstruction || undefined,
      keys: keys.length ? keys : undefined,
    });
    return { ok: true, detail: subject, payload: { ok: true } };
  }

  return { ok: false, detail: `unknown tool ${name}`, payload: { error: `unknown tool ${name}` } };
}

// ─── The system prompt ─────────────────────────────────────────────────────────────────────────────────

function stagedList(items: WaveItem[], slugByCuid: Map<string, string>): string {
  return items
    .map((i, k) => {
      const where = i.ref
        ? `${i.entityType} ${i.entityType === "node" ? (slugByCuid.get(i.ref) ?? i.ref) : i.ref}`
        : `the automation's ${i.entityType}`;
      return `${k + 1}. ${i.label} — ${where}\n${i.task.trim() || "(no brief given)"}`;
    })
    .join("\n\n");
}

async function systemPrompt(proj: ResolvedProject, items: WaveItem[]): Promise<string> {
  // WITHOUT history (the false flag) — the archive would only burn input tokens; the live state is the law.
  const bundle = await buildArchitecture(proj.automation, false);
  const nodes = await listNodes(proj.automation);
  const slugByCuid = new Map(nodes.map((n) => [n.cuid, n.slug]));
  // Law (2b) is stated NUMERICALLY here — the first live run proved a small model over-triggers the cutoff
  // when left to "assess scale" in the abstract (a 1-node task on a 6-node automation got "decompose").
  return `You are the in-product developer of the automation "${proj.automation}" in the Fractera projects app.

THE ARCHITECTURE BUNDLE BELOW IS THE LAW — its agent_instruction is your contract. Apply law (2b) SCALE
ASSESSMENT numerically, as arithmetic, not as a feeling: this automation currently has ${nodes.length} nodes;
the budget is 25 (30 is the absolute cap). Estimate how many nodes the staged items below actually require.
If ${nodes.length} + that estimate stays within 25 and this remains ONE automation's job — a decomposition is
FORBIDDEN: implement the work. Only a request that exceeds the budget or inherently needs SEVERAL automations
ends with \`finish\` + a decomposition recommendation instead of changes (that outcome is then a SUCCESS).

HOW YOU WORK (delta-only):
- You change the automation ONLY through the tools. There is no "return everything" — every call is one
  narrow delta. Address nodes by SLUG (a node's cuid from the bundle is accepted too).
- A node goes LIVE through write_node_functions: it compiles instantly (no rebuild). A compile error comes
  back as the tool result — fix the source and call it again.
- Closing semantics are PER-OBJECT: write_node_functions closes the node it materializes; close_entity
  closes any other staged object; raise_warning marks an object blocked (leave its brief in place and
  continue with the rest).
- When every staged item is closed or blocked, call \`finish\`. Write the report — and every summary,
  subject and blocker — in the OWNER'S language (the language of the staged briefs below).

THE ARCHITECTURE (JSON):
${JSON.stringify(bundle)}

THE STAGED ITEMS TO DEVELOP (${items.length}):
${stagedList(items, slugByCuid)}`;
}

// ─── The loop ──────────────────────────────────────────────────────────────────────────────────────────

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

type ToolCallAcc = { id: string; name: string; args: string };

/** One develop run: streams the model's text and tool activity through `send`, executes every tool call
 *  in-process, and ends with a `done` or `error` event. The caller owns the lock and the SSE plumbing. */
export async function runDevelop(
  proj: ResolvedProject,
  model: string,
  items: WaveItem[],
  signal: AbortSignal,
  send: (e: DevelopEvent) => void,
): Promise<void> {
  const key = openAiKey();
  const deadline = Date.now() + MAX_MS;
  const messages: ChatMessage[] = [
    { role: "system", content: await systemPrompt(proj, items) },
    { role: "user", content: "Develop the staged items now." },
  ];
  send({ type: "phase", staged: items.length, model });

  const decoder = new TextDecoder();
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    if (signal.aborted || Date.now() > deadline) { send({ type: "error", code: signal.aborted ? "aborted" : "time-limit" }); return; }
    send({ type: "turn", n: turn });

    let upstream: Response;
    try {
      upstream = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: "auto", stream: true }),
        signal,
      });
    } catch {
      send({ type: "error", code: signal.aborted ? "aborted" : "openai-unreachable" });
      return;
    }
    if (!upstream.ok || !upstream.body) { send({ type: "error", code: `openai-${upstream.status}` }); return; }

    // Parse the OpenAI SSE stream: content deltas go to the ribbon live; tool_calls accumulate by index
    // (the name arrives whole in the first fragment → the `tool` event fires immediately, the arguments
    // keep assembling until the stream ends).
    let content = "";
    let finishReason = "";
    const calls: ToolCallAcc[] = [];
    const reader = upstream.body.getReader();
    let buf = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith("data:")) continue;
          const payload = s.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload) as {
              choices?: {
                delta?: { content?: string; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] };
                finish_reason?: string | null;
              }[];
            };
            const choice = j.choices?.[0];
            if (!choice) continue;
            if (choice.finish_reason) finishReason = choice.finish_reason;
            const delta = choice.delta;
            if (delta?.content) { content += delta.content; send({ type: "delta", text: delta.content }); }
            for (const tc of delta?.tool_calls ?? []) {
              if (!calls[tc.index]) {
                calls[tc.index] = { id: tc.id ?? `call_${turn}_${tc.index}`, name: tc.function?.name ?? "", args: "" };
                if (calls[tc.index].name) send({ type: "tool", name: calls[tc.index].name });
              }
              if (tc.id) calls[tc.index].id = tc.id;
              if (tc.function?.name && !calls[tc.index].name) { calls[tc.index].name = tc.function.name; send({ type: "tool", name: tc.function.name }); }
              if (tc.function?.arguments) calls[tc.index].args += tc.function.arguments;
            }
          } catch { /* skip a partial frame */ }
        }
      }
    } catch {
      send({ type: "error", code: signal.aborted ? "aborted" : "stream-broken" });
      return;
    }

    if (finishReason === "tool_calls" && calls.length) {
      messages.push({
        role: "assistant",
        content: content || null,
        tool_calls: calls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.args } })),
      });
      // Execute sequentially — each tool is atomic per-object; a started tool finishes even on abort.
      for (const c of calls) {
        let args: Record<string, unknown> = {};
        let result: ExecResult;
        try {
          args = c.args.trim() ? (JSON.parse(c.args) as Record<string, unknown>) : {};
        } catch (e) {
          // Broken argument JSON is self-healing material, not a crash: the model reads the error and retries.
          result = { ok: false, detail: "invalid tool arguments", payload: { error: `invalid JSON in tool arguments: ${e}` } };
          send({ type: "tool-result", name: c.name, ok: false, detail: result.detail });
          messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result.payload) });
          continue;
        }

        if (c.name === "finish") {
          const report = typeof args.report === "string" ? args.report : "";
          const d = args.decomposition as { subject?: string; overview?: string; plan?: string } | undefined;
          if (d && typeof d.subject === "string" && typeof d.plan === "string") {
            // THE CUTOFF LANDING (law 2b): the recommendation is persisted as an owner-decision warning on
            // `general` — the warning panel shows and copies the plan; nothing else was changed.
            await setWarning(proj.automation, "general", "", {
              subject: d.subject.trim().slice(0, 120),
              blocker: (d.overview ?? "").trim().slice(0, 500) || d.subject.trim().slice(0, 500),
              kind: "owner-decision",
              hermesInstruction: d.plan.trim(),
            });
            send({ type: "done", report, outcome: "decomposition" });
          } else {
            send({ type: "done", report, outcome: "implemented" });
          }
          return;
        }

        try {
          result = await execTool(proj, c.name, args);
        } catch (e) {
          result = { ok: false, detail: String(e), payload: { error: String(e) } };
        }
        send({ type: "tool-result", name: c.name, ok: result.ok, detail: result.detail });
        messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result.payload) });
      }
      continue;
    }

    // finish_reason "stop" without a `finish` call — graceful: the text IS the report.
    if (content.trim()) { send({ type: "done", report: content.trim(), outcome: "implemented" }); return; }
    send({ type: "error", code: "empty-response" });
    return;
  }
  send({ type: "error", code: "turn-limit" });
}

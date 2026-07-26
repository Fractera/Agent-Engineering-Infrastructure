# External capabilities — when a node's function is done by an outside tool, not your code

Most nodes are plain native code in `_lib/nodes/`. Some are not: their function is **fulfilled by an
external tool** — an MCP server, an agent skill, a third-party API. That is a CAPABILITY, and the node
records it in one field: `capability`.

**Most automations never touch this.** Read this page only when the owner's use cases need something the
platform does not do natively — "translate into ten languages", "clone the author's voice", "sync the lips
to the new audio". Each of those is a node whose work happens in the world, through a named tool.

## The field — `node.capability`

`null` (the default) means "this node is our own code". An object means "this node reaches out through a
tool":

```ts
capability: {
  type: "mcp" | "skill" | "api" | null,  // the kind of tool; null while the need is only PREDICTED (needed)
  reason: string,                        // WHY this node needs an outside tool ("it must do 123") — always set
  ref: string,                           // the id the tool is known by; "" while status is "needed"
  tool: string,                          // the exact tool / method / endpoint; "" while status is "needed"
  status: "needed" | "candidate" | "bound" | "proven",
  fallback: string,                      // another ref to try if this one is unavailable; "" = none
  attempts: Attempt[],                   // the ordered log of tools tried — kept for training (see below)
}
```

### It does NOT repeat what the node already says
The same fact never lives twice. Before you fill `capability`, know that the node already carries:

| The question | Where it already lives | NOT in `capability` |
|---|---|---|
| What goes in / what comes out | `function.accepts` / `function.returns` | the io-contract |
| Which key it needs, and is it present | `envKeys` (`present` / `missing` / `error`) | the credentials |

`capability` adds only the four facts above — `type`, `ref`, `tool`, `status`, `fallback`.

### `status` — the binding's own lifecycle
- **needed** — the PLATFORM predicted this node cannot be built with our own code and MUST reach an outside
  tool, but no tool is chosen yet. `type`/`ref`/`tool` are still blank; only `reason` is filled. This state
  PAUSES development — the tool is not yours to guess, it is the owner's to supply (see the flow below).
- **candidate** — a tool has been named (from the owner's reply), but the node's code does not call it yet.
- **bound** — the code in `_lib/nodes/<fn>.ts` actually calls it.
- **proven** — a real `api/run` reached it and came back with a real result.

A binding can sit at `bound` and never reach `proven` (the code calls it, but no run confirmed it works).
This is a different question from the build status: `materialized` means "the code is written", `proven`
means "it worked in a real run".

### THE FLOW — you predict the need, the OWNER supplies the tool
You do NOT hunt the internet for the right MCP/skill and you do NOT improvise an integration. Your job is to
RECOGNISE the need and describe it; the owner, who can search the world, chooses the tool.

1. **Predict.** While designing, you find a node that cannot be done with our own code — it must reach an
   outside service (generate video, clone a voice, sync lips). Do not build it and do not fake it.
2. **Declare the need.** Set the node's `capability` to `{ status: "needed", reason: "…why an outside tool
   is required…", type: null, ref: "", tool: "", fallback: "", attempts: [] }` via `api/patch`, and write a
   `warning` on the node saying plainly what it must do and that a tool is needed.
3. **Pause.** Development stops on that node. Green `check:core` does not mean it works.
4. **The owner replies.** The owner searches, finds a tool, and writes it into that warning's `reply` field
   (the answer lives right next to the question). 
5. **Bind and prove.** Read the reply, move the capability to `candidate` (fill `type`/`ref`/`tool`), write
   the calling code (`bound`), then a real run (`proven`). Record what happened in `attempts` (below).

**The rule that keeps this reliable:** the test is not "can I pull this off?" — it is *"does the function's
core work reach an outside service?"*. If yes, it is a capability; if the owner has not supplied the tool,
you STOP and warn. When in doubt, warn — never improvise an external integration the owner did not authorise.
A needless warning costs a moment; a silent fake corrupts the automation and poisons the training data.

### `attempts[]` — the choosing, kept for training
The owner's path is rarely straight: *tried tool A → disliked the result → asked for tool B → came back to
A*. Record each try so the choosing is not thrown away — it is the exact signal a future Fractera model is
trained on. Each attempt: `{ ref, tool, outcome: "chosen" | "rejected" | "failed", note }`. The array is
ordered; its order IS the sequence. Keep `note` short (why this try, in the owner's terms).

## It is orthogonal to the node's KIND
A capability is not tied to input / output / transform. A `transform` that calls a translation MCP carries
one; a `transform` that only glues two payloads together does not. Put it on whatever node reaches into the
world, wherever it sits in the graph.

## When you write the calling code (`candidate → bound → proven`)
Once the owner has supplied the tool (the flow above), the code side is ordinary:
- **The function stays deterministic-looking to the graph** — it takes `accepts`, returns `returns`, and
  throws loudly on failure so the `condition-failure` branch handles it. The code lives, as always, in
  `_lib/nodes/<function-name>.ts`.
- **The key the tool needs goes in `envKeys`**, read from the environment (§5.4 of AGENTS.md — a secret is
  configuration, never code) and written through `api/env`. `capability` never repeats the key; `envKeys`
  already carries it and its `present`/`missing`/`error` status.
- **Prove it** with a real `api/run`; on a real result, move status to `proven` and record the try in
  `attempts` with `outcome: "chosen"`.

## Constraint — the tool must actually be present where this automation runs
Naming a tool does not make it reachable. The external MCP/skill/API must be present and authorised on the
server this automation runs on. When it is not, degrade honestly: the `envKey` reads `missing`, and a
`warning` on the node tells the owner what to configure — never a silent failure or a fake result.

*(A world catalogue of vetted external tools — indexed in the agent's vector memory, so `ref` becomes a
catalogue id and the builder can search "is there already a lip-sync tool?" — is a future step. Today `ref`
is a plain name you write.)*

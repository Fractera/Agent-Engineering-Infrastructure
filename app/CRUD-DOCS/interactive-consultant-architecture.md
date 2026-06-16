# Interactive Consultant — Full Technical Architecture & Decision Record

> Knowledge-base document for the deployed workspace. Intended for LightRAG (Company
> Memory) ingestion via the **Documents** tab. Written for completeness, NOT brevity:
> every file path, function name, environment variable, port, wire-protocol detail,
> design decision and rejected alternative ("fork in thinking") is recorded so the vector
> base can answer any later question about how and why this feature is built. Product
> layer (ships in `ai-workspace`). English by project convention for product docs.

---

## 1. What the Interactive Consultant is

The Interactive Consultant is a **floating AI chat widget on the public site** of a deployed
Fractera workspace. A visitor clicks a fixed button (bottom-right, like the Fractera Easy
Starter site), a modal chat opens, and the visitor can ask questions OR request actions in
natural language. The agent answers and may return **clickable action buttons**; clicking a
button performs the action in the visitor's own browser (e.g. switch the site language,
toggle theme, navigate to a page).

### Product vision / why it exists
- **Zero-control-panel onboarding.** After deploying, a non-technical owner lands on a
  working site and can start by pressing one button and talking to the AI — no admin panel
  knowledge required. Long-term goal: ~99% of users never need the control panel.
- **Agentic web.** An ordinary anonymous visitor must be able to tell the agent "switch the
  site to Spanish" or "what languages do you support?", and an authenticated buyer must be
  able to ask "show my purchases from last year." This is treated as an architectural given,
  not an edge case.
- **MCP test surface.** The widget doubles as a live test bench for every L2-MCP tool: any
  new/renamed tool can be exercised by simply talking to the consultant. This unblocks the
  broader MCP refactoring work (each refactor step involves creating + testing MCP tools).

---

## 2. The core architectural truth (the reason the design looks the way it does)

A **server-side MCP cannot change a live browser tab.** When the owner-Hermes agent calls a
tool that writes the *server default* theme (e.g. `footer_slot_owner_set_theme_mode`), it
honestly changes the on-disk default — but the visitor's already-open tab does not change,
because (a) the server has no handle to an open browser, (b) the browser keeps its own theme
in `localStorage`, which overrides the server default, and (c) no reload happened. This was
observed in practice: "I asked Hermes to change the theme, it returned success, but my tab
stayed dark." That is **by design**, not a bug — verify in an incognito tab where a fresh
load picks up the new server default.

Therefore a per-visitor view action (my language / my theme / my page) is **only possible
when an agent lives inside the browser.** The split that resolves everything:

- **Brain + data = server (Hermes).** Knows what is possible, reads config, converses,
  and **proposes** an action.
- **Per-visitor execution = browser.** A client handler runs `router.push('/fr')`, calls a
  theme setter, etc. — instantly, no reload. A per-visitor view action NEVER writes shared
  server state.
- **owner-global state** (default theme for everyone, create a page, config) stays a
  server-side MCP mutation.

Consequence: the finished consultant is NOT the existing Hermes web chat embedded in an
iframe, because (1) that chat is owner/session-token authorized (not tier-scoped for an
anonymous visitor), and (2) an iframe cannot drive the PARENT public site's router
(`router.push('/fr')`), which is the whole point of per-visitor actions. So the consultant
is our own widget in `app/` plus a client-action execution layer.

---

## 3. Access tiers (MCP-REGISTRY §8.3) and the actor model

Three tiers, cumulative inheritance `public ⊆ user ⊆ owner`:

- **public** — anonymous site visitor. Acts only on their own session/view. No private data,
  no shared config, no other users' data, no destructive action. Example: per-visitor theme,
  language, navigation.
- **user** — authenticated end-user (a buyer). Access ONLY to their own records, row-level
  scoped by the caller's identity (never by a supplied argument). Example: "show my orders."
- **owner** — workspace operator. Config, branding, GLOBAL defaults, deploy, delegation,
  destructive actions.
- (future **team/admin** between user and owner.)

Two channels to an agent:
- **owner-hermes** — Telegram/pairing operator channel (step 87). Tier ceiling owner.
- **public-consultant** — the public-site chat widget (this feature). Tier ceiling user.

---

## 4. Defense by construction (the security boundary)

The primary enforcement is NOT a runtime check — it is **toolset membership**: a privileged
tool simply does not exist in a channel's process. Two layers:

1. **Separate public Hermes process** with a strict-subset toolset. owner bridges
   (ports 3210–3218) are absent from its config, so an anonymous visitor physically cannot
   reach owner tools. `fractera-platforms` (owner delegation) and the Company Brain memory
   provider are also absent — owner knowledge never reaches an anonymous visitor.
2. **Runtime ceiling (2nd rubezh):** the `fractera-access-control` Hermes plugin reads
   `bridges/platforms/mcp-access-manifest.json` and, on the `pre_tool_call` hook, blocks any
   tool whose required tier exceeds the process ceiling set by env
   **`FRACTERA_AGENT_MAX_TIER`** (`owner|user|public`, default `owner`). The public process
   sets `FRACTERA_AGENT_MAX_TIER=user`. Strict default: a tool absent from the manifest is
   owner-only.

Rejected alternative (fork): **per-request tier downgrade on the single owner-Hermes**
(`:9119`). Rejected because (a) it would discard the already-built process-ceiling model of
§8.6; (b) the Hermes core gives no way to bind identity to a single tool-call — `pre_tool_call`
carries `session_id` without identity, `pre_gateway_dispatch` carries identity without
`session_id`; (c) on an internet-facing path the only honest protection from escalation to
owner-destructive tools is that those tools do not exist in the process. So: a separate
public process (option "a"), not per-request downgrade (option "b").

---

## 5. Component inventory (every file + its role)

### Phase A — server MCP foundation (`bridges/platforms`)
- **`bridges/platforms/mcp-access-manifest.json`** (version 2). Authoritative machine-readable
  manifest of ALL first-party L2 tools. Per tool: `tier`, `first_party`, `mutating`, and the
  new field **`execution`** (`"server"` = runs on the server | `"client"` = a per-visitor
  view action the BROWSER executes; the server tool returns a deferred envelope). Servers map
  includes `client-actions-bridge` at port 3220 with `max_tier: public`. L1 deploy-MCP is
  intentionally NOT listed (frozen public contract).
- **`bridges/platforms/client-actions-mcp-server.js`** (`ClientActionsMcpServer`, port 3220).
  A public-tier MCP whose tools the consultant PROPOSES but the browser EXECUTES. Each tool's
  handler does NOT do work — it returns a deferred envelope. Tools:
  - `public_view_navigate_page` (arg `to`) → envelope `{ "__client_action__": true, tool, args }`
  - `public_view_set_locale` (arg `locale`)
  - `public_view_set_theme` (arg `mode`: light|dark|system)
  - `public_view_set_width` (arg `width`: narrow|wide)
  - `public_request_authentication` (arg `kind`: personal|role) → DIFFERENT envelope
    `{ "__auth_required__": true, kind }` (R6 signal — surfaced as `authRequired`, not executed
    as a view action). The agent learns when to call each tool from the tool DESCRIPTION text
    (the §8.2 pattern — the description is visible to the agent; no separate prompt file).
  - Instantiated in `bridges/platforms/server.js` (env `CLIENT_ACTIONS_MCP_PORT`, default 3220),
    next to `PublicConsultantMcpServer` (:3219, `public_footer_list_pages`).

### Phase B — public Hermes process (provisioning in `fractera-easy-starter/lib/bootstrap.sh`)
- A SECOND Hermes instance with its own `HERMES_HOME=/root/.hermes-public`.
- `bootstrap.sh` generates `/root/.hermes-public/config.yaml` as a STRICT SUBSET:
  - `model`: `openai-api` / `gpt-5-mini`, default `gpt-5-mini`, fallback `anthropic` /
    `claude-opus-4.7` (its OWN credential pool / `.env`).
  - **NO `memory` block** (no Company Brain / LightRAG — owner knowledge is private).
  - `plugins.enabled = [fractera-access-control]` only (NO `fractera-platforms`).
  - `mcp_servers`: ONLY `public-consultant-bridge` (:3219) and `client-actions-bridge` (:3220).
    No owner bridges (:3210–3218).
- PM2 step `start_hermes_public`:
  `HERMES_HOME=/root/.hermes-public FRACTERA_AGENT_MAX_TIER=user
  HERMES_DASHBOARD_SESSION_TOKEN=$HERMES_MCP_SECRET hermes dashboard --host 127.0.0.1
  --port 9129 --no-open --insecure`, process name `fractera-hermes-public`, health-poll :9129.
  Binds loopback (127.0.0.1) — the visitor never hits it directly, only via the Shell's
  `/api/consultant`.
- Copies ONLY the `fractera-access-control` plugin into `/root/.hermes-public/plugins`.
- The Shell process `fractera-app` is started with env `PUBLIC_HERMES_URL=http://127.0.0.1:9129`
  and `PUBLIC_HERMES_TOKEN=$HERMES_MCP_SECRET` so `/api/consultant` can authenticate.
- This produces an 8th brain-related PM2 process (fractera-hermes, -gateway, -webui, -public).

### Phase C — server bridge (`ai-workspace/app`)
- **`app/lib/consultant/tier.ts`** — `resolveTier(req)`: server-side tier from the session
  via `getSession` (`lib/auth/get-session.ts`). No session → `public`; roles include
  `admin`/`agent` → `owner`; otherwise → `user`. Tier is NEVER trusted from the client.
- **`app/lib/consultant/client-actions.ts`** — PURE shared contract (no runtime deps), imported
  by both server and browser:
  - `ClientActionName` union + `CLIENT_ACTION_NAMES` allowlist.
  - `ClientActionEnvelope`, `ClientAction` ({id, tool, args, label}).
  - `isClientActionName`, `parseClientActionEnvelope` (detect `__client_action__` in a tool
    result), `validateActionArgs` (static-shape validation shared by server and browser;
    e.g. `to` must start with `/`, `mode` ∈ light|dark|system, `width` ∈ narrow|wide),
    `defaultActionLabel`.
- **`app/lib/consultant/hermes-ws.ts`** — `runConsultantTurn({ url, token, message, sessionId })`.
  WebSocket transport to the public Hermes process using **undici `WebSocket`** (no new
  dependency). Returns `HermesTurn { sessionId, text, actions, keyError?, authRequired? }`.
- **`app/app/api/consultant/route.ts`** — `runtime = 'nodejs'`.
  - `GET` → `{ available, tier, keyConfigured }`. `available` = the public Hermes
    (`PUBLIC_HERMES_URL`) answered a 2s health probe; the floating button renders only when
    `available` is true.
  - `POST { message, sessionId? }` → `ConsultantTurn { sessionId, text, actions[],
    authRequired?, keyError? }`. Gated on a token (`PUBLIC_HERMES_TOKEN` or `HERMES_MCP_SECRET`);
    if absent, returns an honest "not connected" turn (no faked reply).

### Phase D — browser widget (`ai-workspace/app`)
- **`app/components/consultant/consultant-widget.client.tsx`** — the floating fixed button
  (animated ping + `Bot` icon) + docked modal. Mounted GLOBALLY in `app/app/[lang]/layout.tsx`
  inside the providers (so it appears on every page, independent of parallel routing / slots).
  Resolves the widget language from `usePathname` first segment + `DEFAULT_LANGUAGE`. Renders
  the header tier badge ("You: Guest/User/Owner") and a neutral persistent sign-in affordance
  for non-owner tiers. Self-hides when `available` is false.
- **`app/components/consultant/consultant-chat.client.tsx`** — chat surface. Sends a turn to
  `/api/consultant`, renders assistant text, renders proposed `actions[]` as buttons (click →
  `useClientActionRunner`), renders the `authRequired` escalation block (kind-aware message +
  sign-in), and shows the key block when needed.
- **`app/components/consultant/client-action-registry.client.tsx`** — `useClientActionRunner()`.
  The ONLY place that executes a client-action, and only a KNOWN name mapped to a KNOWN handler
  after re-validating args (static `validateActionArgs` + live config: `locale` ∈
  `getAvailableLanguages()`): `public_view_navigate_page` → `router.push`,
  `public_view_set_locale` → `router.replace('/<locale>/...')` (strips an existing lang prefix),
  `public_view_set_theme` → `setTheme(mode)`, `public_view_set_width` → `setWidth(w)`. This is
  the client-side security boundary — an anonymous chat can never make the browser run an
  arbitrary instruction.
- **`app/components/consultant/consultant-key-block.client.tsx`** — reusable key block (E3/R8):
  shown when no key is configured OR a turn reports a key error; carries the consent notice and
  posts to `/api/consultant/key`.
- **Provider additions (additive):**
  - `app/providers/theme-provider.client.tsx` — added `setTheme(mode: ThemeMode)` (previously
    only `cycleTheme`); persists to `localStorage` (`fractera-theme`) and applies.
  - `app/providers/width-toggle-provider.client.tsx` — added `setWidth(w: 'narrow'|'wide')`
    (previously only `toggleWidth`).

### Phase D4 — widget i18n (`app/lib/consultant/i18n.ts`)
- Self-contained FIXED 6-language bundle: **en, es, fr, de, it, ru** (~22 strings each).
  `ConsultantStrings` type, `CONSULTANT_LANGS`, `resolveConsultantLang(current, appDefault)`
  (current ∈ 6 → it; else appDefault ∈ 6 → it; else `en`), `getConsultantStrings(lang)`.
- IMPORTANT: these dialog strings are INDEPENDENT of the admin's site-language config and the
  `[lang]` locale system — they do NOT go into the site locale files. A fixed set baked into
  the project (developer decision).

### Phase E — API-key lifecycle (`ai-workspace/app`)
- **`app/lib/consultant/public-key.ts`** — the public consultant's OWN key (isolated pool in
  `HERMES_HOME=/root/.hermes-public`, so anonymous traffic never drains the owner's key/quota):
  - `publicKeyConfigured()` reads `/root/.hermes-public/.env` `OPENAI_API_KEY`.
  - `setPublicKey(key, allowReplace)`: validates `sk-` prefix; **set-if-empty** — refuses with
    409 when a key already exists unless `allowReplace`; writes `.env`; registers in the public
    credential pool via `hermes auth add openai-api --label fractera-openai-public` with
    `HERMES_HOME=/root/.hermes-public`; restarts `fractera-hermes-public` (`pm2 restart
    --update-env`).
- **`app/app/api/consultant/key/route.ts`** — `GET { configured }` + `POST { apiKey }`.
  `allowReplace = (resolveTier === 'owner')`. Anonymous visitors may set the FIRST key
  (set-if-empty); the owner may REPLACE it. This mitigates anonymous overwrite of a working key
  while honoring "anyone may set a key" for the empty case (decision flagged for confirmation).
- Consent notice (developer requirement): the key block shows "This key is saved on the server
  and used in this project" before submit.

---

## 6. The Hermes chat WebSocket contract (pinned from source, NOT guessed)

Pinned by reading the Hermes/Nous core on the server (`/usr/local/lib/hermes-agent`):
`tui_gateway/server.py`, `tui_gateway/ws.py`, `hermes_cli/web_server.py`,
`hermes_cli/dashboard_auth/ws_tickets.py`. The live `:9119` could not be connected to for a
black-box capture because its `_SESSION_TOKEN` is random and not in env; the source is the
authoritative equivalent.

- Endpoint: **`@app.websocket("/api/ws")`** → `tui_gateway.ws.handle_ws`. Wire protocol is
  **newline-delimited JSON-RPC** (identical to the Ink stdio transport).
- Auth (browsers cannot set Authorization on a WS upgrade) — three credential shapes:
  - `?ticket=<single-use>` — SPA-minted, 30s TTL, consumed against the dashboard-auth ticket
    store (`POST /api/auth/ws-ticket`).
  - `?internal=<per-process>` — multi-use, process-lifetime, for server-spawned loopback links.
  - `?token=<_SESSION_TOKEN>` — legacy, loopback-only. `_SESSION_TOKEN =
    os.environ["HERMES_DASHBOARD_SESSION_TOKEN"] or secrets.token_urlsafe(32)`. We give the
    public process a KNOWN token via `HERMES_DASHBOARD_SESSION_TOKEN=$HERMES_MCP_SECRET`, so
    `/api/consultant` connects with `?token=`.
- On connect the server emits `{ "jsonrpc":"2.0", "method":"event", "params":{ "type":
  "gateway.ready" } }`.
- Create a session: JSON-RPC `@method("session.create")` → `result.session_id`.
- Submit a user turn: JSON-RPC `@method("prompt.submit")` with `params:{ session_id, text }`.
- Streamed events arrive as `{ jsonrpc, method:"event", params:{ type, ... } }`:
  - `message.start`
  - `message.delta { text }` — incremental assistant text (accumulate).
  - `message.complete { text }`
  - `reasoning.delta`
  - `tool.start { tool_id, name, args }`
  - `tool.complete { tool_id, name, args, result }` — `result` is already `json.loads`'d. For
    our client-action tools this is the `{ __client_action__, tool, args }` envelope; for the
    auth signal it is `{ __auth_required__, kind }`.
- `runConsultantTurn` flow: open WS → on `gateway.ready` → if `sessionId` send `prompt.submit`,
  else `session.create` then `prompt.submit` on the `result.session_id` → accumulate
  `message.delta` text → on each `tool.complete` run `collectAction` (envelope → validate →
  ClientAction, or `__auth_required__` → `authRequired{kind}`) → on `message.complete` arm a
  1.5s quiet timer that resolves the turn. Timeouts: connect 8s, hard cap 45s. Key errors
  (matching "api key/quota/401/unauthorized/credential/init failed") set `keyError`.

---

## 7. R6 — role / authentication escalation (refined decision)

The agent itself PREDETERMINES which of two escalation variants applies (it understands the
request); the widget renders the localized message + a sign-in button. NO capability catalog
(rejected as token-wasteful with no economics). NO binary "always admin" (rejected as wrong —
there are three tiers plus a personal-data axis).

Two kinds (arg of `public_request_authentication`):
- **personal** — the visitor asked about THEIR OWN data (purchases, profile, subscription,
  orders). Needs the user's identity → tier `user`. After login the session carries the
  identifier; `resolveTier` becomes `user`; a future `user_*` MCP scopes data by that identity
  (§8.3 п.3). Message: "To access the personal information you requested, you need to be signed
  in to your account."
- **role** — the visitor asked for a capability/action not registered for their current role
  (may exist for a signed-in user or the administrator). Message: "The function you requested
  isn't registered for your role…"

Both → "Please sign in to continue", using `registerRedirectUrl(currentUrl, 'user')` from
`app/lib/runtime-urls.ts` → opens `<authBase>/register?callbackUrl=<url>&requireRole=user` →
after authentication the auth flow redirects back → the visitor retries. `requireRole='user'`
means "just authenticate" (admins are a superset; the real tier applies after login, so an
admin is not blocked). The agent emits the signal via the `public_request_authentication`
tool; the envelope `{ __auth_required__, kind }` flows through `hermes-ws.ts` to
`authRequired{kind}` on the turn, and the chat renders the matching message + button. A
neutral persistent sign-in affordance (no false "admin") also sits in the widget footer for
non-owner tiers.

---

## 8. The client-action protocol (P2/P2a — chosen over assistant-ui directives)

Decision: a small OWN protocol (`actions[]`) rather than reusing Hermes' assistant-ui
`Unstable_Directive*` system. Rejected assistant-ui directives because: the `Unstable_` API is
volatile across forks; its directive vocabulary is operator/coding-oriented
(file/terminal/session), not per-visitor; its triggers call back INTO Hermes, not the parent
site's router; and it pulls a heavy dependency into a small public widget.

Single source of truth = the manifest, with the `execution` field. Three consumers of the one
source:
1. **public Hermes toolset** — `client-actions-bridge` declares the tools; the handler does not
   execute, it returns the deferred envelope; the access-control plugin enforces the tier.
2. **`/api/consultant`** (via `hermes-ws.ts`) — detects the envelope in the stream and forwards
   it as `actions[]` (allowlist = the contract; unknown names are not forwarded).
3. **browser** (`useClientActionRunner`) — an allowlist registry mapping name → handler, with
   arg validation (static + live config). Executes only names that are both in the allowlist
   and bound to a handler.

§8.2 confirm-before-mutation comes for free: the button click IS the confirmation, so no heavy
"do I understand you correctly" ritual for public cosmetics.

---

## 9. End-to-end trace of the canonical case

Visitor (anonymous) asks: "what languages does this site support, and can you switch to
Spanish?"
1. Floating button is visible (GET `/api/consultant` returned `available:true`).
2. Modal opens; POST `/api/consultant { message }`.
3. `/api/consultant` resolves tier = public, opens the public Hermes WS, sends `prompt.submit`.
4. The public agent calls the read tool `public_footer_list_pages` (or a future
   `list_languages`), sees configured languages are EN/DE/FR, notices Spanish is not present.
5. It proposes `public_view_set_locale` for the configured languages (FR/DE) → each returns a
   `{ __client_action__, tool:"public_view_set_locale", args:{locale} }` envelope on
   `tool.complete`.
6. `runConsultantTurn` accumulates the assistant text ("Admin configured EN/DE/FR; Spanish is
   not available, switch to:") and builds `actions[]` for FR/DE.
7. The chat renders the text + two buttons ("FR", "DE").
8. The visitor clicks "FR" → `useClientActionRunner` validates `fr ∈ getAvailableLanguages()` →
   `router.replace('/fr/...')`. The site is now French. The "magic" is plain client-side
   navigation; the server only knew and proposed.

---

## 10. Ports, env vars, process names (quick reference)

- Ports: owner Hermes dashboard `:9119`, owner gateway (no inbound port), Hermes web UI
  `:9120`, public Hermes dashboard `:9129` (loopback), LightRAG `:9621`, Shell `:3000`, auth
  `:3001`, admin `:3002`, data `:3300`, platform bridges `:3210–3214`, deployments `:3215`,
  readiness `:3216`, parallel-routing `:3217`, app-settings `:3218`, public-consultant `:3219`,
  client-actions `:3220`.
- Env: `FRACTERA_AGENT_MAX_TIER` (public process = `user`), `HERMES_DASHBOARD_SESSION_TOKEN`
  (public process = `$HERMES_MCP_SECRET`), `PUBLIC_HERMES_URL`
  (`http://127.0.0.1:9129` on `fractera-app`), `PUBLIC_HERMES_TOKEN` (`$HERMES_MCP_SECRET`),
  `CLIENT_ACTIONS_MCP_PORT` (default 3220), `PUBLIC_HERMES_HOME` (default `/root/.hermes-public`).
- PM2: `fractera-hermes`, `fractera-hermes-gateway`, `fractera-hermes-webui`,
  `fractera-hermes-public`, `fractera-app`, `fractera-bridge`, `fractera-auth`,
  `fractera-admin`, `fractera-data`, `fractera-rag`.

---

## 11. Decision log / rejected forks (so nothing is lost)

- **Entry point: floating button, NOT a parallel-routing `@left` slot.** A slot is fragile —
  the owner may not enable parallel routing or may not use the left slot, which would lose
  browser control entirely. The button mounts in the root `[lang]` layout and is always present.
- **Brain = Hermes only, NOT a client-side LLM call.** From the client we cannot be sure the
  user is an active subscriber (too many intermediate steps; fine inside the admin flow, not in
  an external tool). Using Hermes also reuses the tier enforcement + manifest. Hermes is itself
  a custom tool — if it is not connected, the button is not rendered.
- **Tier × process = separate public process (option a), NOT per-request downgrade (option b).**
  See §4.
- **client-action protocol = own `actions[]` (P2/P2a), NOT assistant-ui directives.** See §8.
- **client-action registry source of truth = the manifest with `execution` field.** Not a
  separate registry.
- **public process config = strict subset (no owner bridges, no `fractera-platforms`, no
  Company Brain memory).** Defense by construction.
- **R6 = agent-predetermined two-variant escalation (personal/role), NOT a capability catalog
  and NOT binary-to-admin.** See §7.
- **Public key entry = set-if-empty; owner replaces.** Mitigates anonymous overwrite of a
  working key while keeping the smooth "land → paste key → go" flow.
- **Widget i18n = fixed 6-language bundle independent of the site locale system.**
- **WS transport pinned from source, isolated behind `hermes-ws.ts` adapter** so Hermes upgrades
  don't ripple into the widget.

---

## 12. Deferred / open items

- **E2 admin panel UI** for the public-consultant key (a "key required" surface + replace) is
  deferred; the replace capability already exists at the API level (`tier === 'owner'`).
- **user-tier data tools** (e.g. "show my orders") are future: they require authenticated
  end-user identity + row-level data-scoping by identity. R6 sets up the authentication gate
  that those tools will build on.
- **Live E2E** requires a fresh deploy that provisions the public Hermes process (Phase B);
  until then the widget self-hides (public Hermes unreachable) and `/api/consultant` returns an
  honest "not connected" turn.
- **Public agent prompt/personality** for `/root/.hermes-public` is steered primarily via tool
  descriptions today; a dedicated public SOUL/instruction is a possible later refinement.

---

## 13. How new MCP tools and skills are created (this IS part of the architecture)

The consultant is not a fixed set of tools — **growing the toolset is a first-class part of
the architecture**, and optimizing how MCP tools/skills are authored is a core design
concern, not an afterthought. New capabilities (including new consultant client-actions and
public/user/owner MCP tools) come into existence through the **AI Draft Settings** flow:

- The architect opens the **`/ai-draft-settings`** page (a filesystem-backed staging layer,
  no database) and writes a free-form wish — a new instruction, skill, or **MCP connector** —
  to *supplement* or *replace* an agent's real file, WITHOUT editing the originals.
- For an MCP draft the page captures the **access decision that makes the draft useful**: the
  **tier** (`public` / `user` / `owner`), whether it is **read-only or mutating**, a live
  preview of the §8.1 tool name (`<tier>_<area>_<action>_<object>`), and the derived channel
  (`public`/`user` → public-consultant; `owner` → owner-hermes). These map 1:1 onto the future
  `mcp-access-manifest.json` row and the tool name. Default tier is `owner` (strict).
- A specialized AI agent later reads the draft and turns it into a REAL tool / skill / config
  on the server, registering its manifest row and channel membership. The originals are only
  ever written by that agent, never by the page.
- If the draft path is not enough, the workspace always ships with **source code**, a
  **terminal**, and local-development access, so the owner can extend the platform without
  limits — the project is built to grow and scale.

This is exactly how a new consultant tool (e.g. a future `user_*` "my orders" tool, or a new
`public_view_*` client-action) is meant to be introduced: draft it with its tier on
`/ai-draft-settings` → an agent materializes it → it joins the right channel's toolset → the
consultant can propose it. The tier/mutating/execution model of THIS document and the
authoring model of the draft page are two halves of the same architecture.

**Related knowledge-base documents (query these for depth):**
- `workspace-standards/ai-draft-settings.md` — the AI Draft Settings file format & contract:
  how MCP/skill/instruction drafts are authored, the tier/mutating/execution fields, and how
  an agent applies a draft to the real files (manifest row, channel toolset, §8.2 confirm).
- `ai-workspace-architecture.md` — the overall workspace architecture (Hermes, LightRAG, the
  five coding agents, the layers).
- `fractera-project-overview.md` — the product overview.

## 14. Security boundary summary

- Network: the public Hermes binds loopback `:9129`; the visitor only reaches the Shell's
  `/api/consultant`, which holds the Hermes token server-side.
- Toolset: owner tools are absent from the public process (defense by construction); the
  access-control plugin caps the process at tier `user`.
- Identity: tier is resolved server-side from the session, never trusted from the client;
  user-tier data must be scoped by the caller's identity.
- Client execution: the browser runs only allowlisted client-action names mapped to known
  handlers, after arg validation.
- Key isolation: the public consultant uses its own credential pool/quota, separate from the
  owner's key.

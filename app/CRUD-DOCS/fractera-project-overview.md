# Fractera — Project Overview & Reference

> Seed knowledge document. Source: the public `/mcp-info` project reference on fractera.ai (curated
> English sections). The complete machine-readable version (incl. the full landing copy, FAQ and legal
> texts) is served at https://www.fractera.ai/llms-full.txt. Activate this document on the /documents
> page to ingest it into Company Memory (LightRAG).

## What is Fractera

Fractera is an open-source platform that turns a bare Ubuntu VPS into a complete, self-hosted, AI-native development environment in about 10 minutes — with one click or a short chat.

On your own server you get: five AI coding platforms (Claude Code, Codex, Gemini CLI, Qwen Code, Kimi Code), the **Hermes** orchestrator, **LightRAG** persistent memory, authentication, a database, and file storage — all pre-wired. No Clerk, no Supabase, no Vercel. One bill (your VPS), one place, full ownership of code and data.

You can install the full stack, or pick only the components you need — down to a plain server with a database and sign-in and no AI at all.

## How deployment works

1. You provide a server (IP + root password) — or buy a VPS first (see "VPS & pricing").
2. You choose what to install — the full stack or only the components you need.
3. Fractera's automated setup service configures everything on your server for you: it installs the tools you selected and sets up the database, authentication, file storage, and web routing, then brings all services online. You never run any commands yourself.
4. In ~8–14 minutes the workspace is live. You get email notifications when setup starts and when it finishes.

The result is **IP-first**: when it finishes, your workspace is live on plain HTTP at `http://<your-IP>:3002` — that is the Admin workspace where you start coding. Attaching your own domain with HTTPS is an optional later step you do yourself, inside the workspace (Admin → Personal Domain).

Three ways to start: the one-click form on the website, a partner/embed widget, or by chatting with an AI agent through the Fractera MCP connector.

## Zero-Ops deployment — from a bare VPS to a full stack in ~10 minutes

Traditional self-hosting is plagued by DevOps friction — hours spent configuring an Nginx reverse proxy, wrestling with Let's Encrypt SSL renewals, securing the database, and wiring up authentication gates. Fractera removes that barrier.

You provide nothing more than your bare Ubuntu server credentials, and an automated orchestration layer configures the entire infrastructure from scratch — with no terminal commands on your end.

Better still, you don't even need to open a browser: you can trigger the whole deployment — and check its status on demand — programmatically through our custom MCP (Model Context Protocol) connector, right inside your AI coding environment. It's the simplicity of Vercel, brought natively to your own private hardware.

## Components you can choose

You decide what gets installed (a lighter, cheaper server). Selectable components:

- **Claude Code** — Anthropic coding agent
- **Codex** — OpenAI Codex CLI
- **Gemini CLI** — Google coding agent
- **Qwen Code** — Alibaba Qwen coding agent
- **Kimi Code** — Moonshot Kimi coding agent
- **Memory** — LightRAG vector knowledge base
- **Brain** — Hermes orchestration agent

Always installed (the core, never optional): the web app, authentication, database, object/file storage, the admin panel, and the admin panel's own **system terminal**. Unchecking every box above gives you a plain server with a database and sign-in — no AI.

You are never locked in: any recommended or custom tool can be installed later from the terminal built into your admin panel.

## The five AI coding platforms

Claude Code, Codex, Gemini CLI, Qwen Code, and Kimi Code — all preconfigured on your server, each driven through a WebSocket bridge.

Key principle: they run on your existing **subscriptions**, not pay-per-token API keys. Sign in to each platform once (standard browser-based login, like a local CLI). No API keys to manage, no per-token billing surprises. You can switch platforms mid-task without losing your project context — LightRAG keeps the thread.

"Bridge online" means the process is alive and the WebSocket handshake works; logging into each platform's subscription is a separate one-time step after that.

## Subscriptions vs. API keys — what you actually pay

Two separate billing models — do not conflate them:

- **The five coding platforms (Claude Code, Codex, Gemini CLI, Qwen Code, Kimi Code) run on YOUR existing subscriptions.** You sign in once with your normal account (standard browser login, like a local CLI) — no API keys, no per-token billing. This is where the heavy AI work happens, and it costs you nothing beyond the subscription you already pay the AI vendor.
- **Brain (Hermes) and Memory (LightRAG) use one small OpenAI API key** — the cheap gpt-5-mini (about 1 cent per hour) is plenty to start, or a Codex subscription if your usage is heavy. This is the only per-token piece, and it is tiny and auxiliary.

So: **a Claude Code user pays through their Claude subscription, not per token.** Per-token API spend, if any, is limited to the small Brain/Memory model — not the coding platforms.

**Track Brain and Memory spend separately (optional).** Brain and Memory keep their OpenAI keys in two independent places, so you can meter each one on its own. Create **two separate API keys** in OpenAI and paste one into the Memory key field and the other into the Brain key field. One key works fine for both — but two keys let you watch each line item independently in the Usage dashboard at platform.openai.com.

## Memory (LightRAG)

Memory is a persistent vector knowledge base (LightRAG by HKUDS) shared across all your coding platforms. Feed it your codebase, documents, and architectural decisions; the agents query it to stay grounded in your context.

Why it matters: without persistent memory, every AI session starts from scratch — tokens spent re-explaining "where is the navbar?" are tokens not spent on your feature. Memory compounds with every iteration, so tasks that take 10–20 back-and-forth messages in a vanilla chat often resolve in 2–3. It does not auto-learn — it stores only what agents explicitly push. Activating it needs an OpenAI API key (used economically — the embedding model is among the cheapest), set in Admin → Memory settings.

## Brain (Hermes orchestrator)

Brain is the Hermes Agent (by Nous Research) deployed and configured on your VPS — the thinking centre of the workspace. It coordinates the connected AI subscriptions through shared context and can run autonomous, multi-step pipelines where each loop refines the next ("let Claude do this and Codex do that" — in parallel).

You talk to Brain through its **built-in web chat**, which opens automatically in the admin panel and is the primary way you use the system — just add a model to start. Talking to Brain from your phone via a Telegram bot is an optional secondary channel.

## How authentication blankets the whole layer

Authentication is not a single login screen bolted on — it is a layer-wide gate. A dedicated Auth service is the **only** component that issues the session, and every other service and page checks that session before serving anything.

- **One session authority.** The Auth service (NextAuth) is the sole writer of the session cookie. Providers: email + password (bcrypt) and Google OAuth / magic link. Client code never calls the auth service directly — pages ask a single `/api/me` endpoint, which resolves the current session.
- **Per-service gate.** The user-facing app and the admin workspace each run a request gate ("proxy") that runs BEFORE any page or API handler: no valid session → redirect or 401.
- **Gate for the non-web services too.** The database/storage service, Memory, and Brain don't serve web pages, so in secure mode the web server (Nginx) enforces an auth check (`auth_request`) on each of their subdomains — every authenticated host requires a valid session, closing any side door.
- **Roles.** Each user has roles (default `user`). `user` can use the app; `admin` has full access to the admin workspace and the coding platforms. The **first person to register on a fresh server becomes the admin**; admins can promote others.
- **Modes.** In open/IP onboarding mode the gates are intentionally relaxed for friction-free first access; once you attach a domain (secure mode) the cookie becomes `Secure`, scoped to your domain, and every gate strictly enforces.

## How the database and object storage live in the layer

Both the database and the file/object storage run on your own server as part of the layer — there is no external Supabase, no S3 bill.

- **Database.** A single SQLite database file (`app.db`) holds the application data. The schema is defined in ONE place and applied automatically at startup, so the local and remote paths always agree — there are no migration files to juggle and no "run migration" button. A dedicated data service owns the database and exposes it over an authenticated HTTP API; the app talks to it through that service.
- **Object / file storage.** The same data service stores media and files on the server's local disk and handles image work (icon generation, thumbnails, crops). Uploaded media is served back through the app, never from a third-party bucket.
- **Ownership.** Because both live on your VPS, your records and files never leave your server. Back them up (export) and restore (import) whenever you like; pausing the project never deletes your data.

## How Brain (Hermes) drives the coding agents via MCP

Each of the five coding platforms runs on your server behind its own WebSocket bridge — a live process you can drive interactively. Brain (Hermes) sits above them as the orchestrator.

- **Delegation over MCP.** Brain reaches each coding agent through a per-platform MCP delegation tool (each platform gets its own MCP endpoint on its own port). Through these tools Brain can hand a task to Claude Code, Codex, Gemini CLI, Qwen, or Kimi — individually or several at once.
- **Parallel, multi-step work.** Because delegation is tool-based, Brain can run autonomous pipelines: split a job, run them in parallel, collect results, and decide the next step — each loop refining the next.
- **Shared context.** The agents share project context (and Memory), so switching an in-flight task from one agent to another does not lose the thread.
- **You talk to Brain, Brain talks to the agents.** There is no separate chat UI for each agent in normal use — you direct Brain through its built-in web chat in the admin panel (or, optionally, a Telegram bot) and Brain coordinates the rest.

## The Product Loop — a deployments table that goes beyond Vercel

Inside the admin panel there is a **Deployments** table that logs every development deployment — the running journal of *how your project gets built*. It deliberately mirrors the familiar Vercel deployments list, then adds the columns a generic cloud host cannot have.

A standard cloud platform shows you *that* a deploy happened: commit, status, branch, duration. Fractera shows you the whole story of the change:

- **Result** — a 1–3 star quality rating (first column). Hermes records each row with a default of three stars; you can change the rating at any time.
- **Platform** — which AI coding agent actually did the work (Claude Code, Codex, Gemini, Qwen, Kimi).
- **Model** — the exact model used.
- **Tokens** — the real token cost of producing the change, captured straight from the agent's run (not estimated).
- **Page** — the URL where you review the change, alongside a **Created** timestamp and the familiar commit / status / duration / branch / author cells. Every column sorts, and you can split deployments by **project** and filter the table by one or more of them.

**Why this is the loop.** Hermes takes a decision, delegates the coding to one or more agents, deploys, then records the result and hands you the page link to review. You rate it. Over time the table becomes a feedback record of agent-driven development — which agent and model produce the best results for your project, at what token cost. It is the visible heart of Fractera's "product loop": build, deploy, review, rate, improve.

## How Memory accumulates knowledge and how Brain & agents use it

Memory (LightRAG) is the shared accumulator of the whole layer — one vector knowledge base that every agent reads from and writes to, so context compounds instead of resetting each session.

- **Shared accumulator.** There is a single Memory for the server. Whatever any agent stores there becomes available to every other agent. Knowledge accrues over time rather than living in one chat's history.
- **How information gets in.** Memory does **not** auto-learn. Agents (and you) push content into it explicitly through an ingest endpoint; each write is tagged with the identity of the agent that made it.
- **How Brain and each agent use it.** When working a task, Brain and the coding agents **query** Memory to ground their answer in your accumulated context before acting. Brain in particular leans on Memory to coordinate: it pulls shared context, then delegates with that context in hand.
- **Practical effect.** Tasks that take 10–20 back-and-forth messages in a vanilla chat often resolve in 2–3, because the model arrives already grounded. Activating Memory requires an OpenAI API key (used economically), set in the admin panel.

## Two modes: IP (open) and Secure (your domain + HTTPS)

**IP / insecure mode** (the default right after deploy): the workspace is reachable at `http://<IP>:port` over plain HTTP, with open onboarding. This gets you into your workspace in seconds, with no DNS or certificate wait. Your browser will show a "Not secure" warning — that is normal until you attach a domain.

**Secure mode** (after you attach your own domain): everything runs on `https://<your-domain>` with a free Let's Encrypt certificate (auto-renewed), strict role-based sign-in, and a host firewall that closes all service ports except 80/443. For regions or compliance rules where Let's Encrypt is unavailable, you can upload your own certificate.

You switch from IP to Secure yourself, inside the workspace (Admin → Personal Domain), whenever you want — and you can switch back.

## Connecting your domain: the IP → Secure transition in detail

A fresh deploy is IP/insecure by default. Moving to secure mode is a guided wizard in Admin → Personal Domain, run entirely from your own server:

1. **DNS.** Point your domain's A-records — the apex plus the service subdomains (www, auth, admin, data, hermes, lightrag, and **chat** for the built-in web chat) — at the server IP. The wizard verifies they resolve.
2. **Certificate.** The admin app runs certbot on the server to issue a single Let's Encrypt certificate covering all those hostnames. Alternatively you **upload your own certificate** — a first-class path for regions where Let's Encrypt is unavailable or where compliance requires specific (e.g. national / GOST) certs.
3. **Activate.** The workspace switches every service into secure mode at once: the mode flag flips in all services, the session cookie becomes `Secure` and scoped to your domain, Nginx is rewritten for HTTPS, and a host firewall closes every inbound port except 80/443. A safety watch probes the new domain and auto-rolls-back if it doesn't come up.

**How the coding-platform bridges connect.** In IP mode the browser talks to each platform's bridge directly over `ws://<host>:<port>`. In secure mode they move to path-based **wss** under the cert-covered admin host — `wss://admin.<domain>/ws/...` — so the interactive terminals keep working over TLS with no mixed-content blocking.

**Reading the Step 3 health-check (200 / 307 / 404 are all fine).** A host is **healthy** when DNS resolves to your server, the TLS certificate is valid, and the service answers with any normal code in 200–499 (not a timeout, not a 5xx). 200 = serves a page at `/`; 307 = redirects at `/` (auth → sign-in; lightrag → its UI); 404 = no page at `/` (data — a media/DB API). Only a real failure blocks the switch.

**Reversible.** A "switch back to IP / demo mode" option restores the previous configuration and reopens the service ports. Certificates auto-renew (~every 60 days); a warning email is sent before expiry.

## Data ownership & cloud exit

Everything your application needs — authentication, database, file storage, AI memory — lives on a server you own. No third party has access to your data. No dependency on someone else's uptime, pricing changes, or terms.

This is the cloud-exit promise: no Clerk subscription, no Supabase invoice, no Vercel bill that scales with traffic; one server, one bill. If you pause your business, your data does not disappear — back it up and restore when ready. Your application code lives on GitHub, so recovery is always possible, and the built-in AI assistants can help rebuild even when dependencies have aged.

## The admin panel (Bridges) and its default functions

The admin workspace — also called Bridges — is the control panel that runs on your server. It requires the admin role (the first person to register on a fresh server). By default it gives you:

- **A carousel of your installed coding platforms.** Click one to open its live interactive terminal; an always-present **system terminal** is the last card.
- **Brain and Memory canvases** (if those components are installed) — open the Hermes and LightRAG interfaces inline.
- **Settings menu:** Users (accounts and roles), Upload media, Database browser, Environment variables, Personal Domain (the IP → secure wizard), Hermes / Memory settings (API keys), Export / Import data, and Help.
- **Footer actions:** Deploy (rebuild the open app layer after changes), GitHub connect with one-click Pull / Push, Info (README), links to Skills and Product Loop, and the current build version.

Everything an agent or you build lives behind this panel, and every part of it is gated by authentication.

## The system terminal

The admin panel includes a system terminal — a plain project-level shell on the server, always present as the last card in the carousel. Unlike the AI platforms it can never be disabled, because it is part of the core.

Use it to install extra tooling, run one-off commands, link your Telegram bot to Brain, install your own copy of a coding agent, or anything else the server level needs. It opens at the project root where the services live.

## VPS, specs & pricing

Fractera is free. There are **no plans and no tiers** — the platform is always free to use. The only money involved is the VPS you run it on (paid to your hosting provider, never to Fractera) and **optional, voluntary sponsorship** ($1 / $5 / $20).

For full AI-coding workloads the recommended minimum is **4–6 cores and 6–8 GB RAM**; storage depends on your project (75 GB is a solid baseline). Once active AI development wraps up, you can downgrade to ~2 cores / 4 GB RAM — often just a couple of euros per month. A plain server with no AI needs even less.

You bring your own VPS from any provider.

## Who it is for & use cases

- **Vibe-coders and solo founders** who want a production stack (auth, DB, storage, AI) without wiring ten cloud services together.
- **Experienced developers** who want to offload cloud-resource management and DevOps — deploy a plain server, sync it with a local IDE (e.g. VS Code) over GitHub, and treat their own VPS as a self-hosted alternative to Vercel.
- **Teams needing data sovereignty** — keep user data, auth, and database on infrastructure they control.
- **Builders bringing an existing project** — connect a GitHub repo and continue AI-assisted development on the server.
- **People who want autonomous AI workflows** — let Hermes coordinate multiple agents on multi-step tasks.

The same server can be used purely as a self-hosted backend (database + object storage + optional auth) with no AI at all.

## Real-world use cases — what founders & teams actually build

Because the architecture enforces a strict split between the public-facing application (open layer) and the authenticated admin panel (guarded layer), builders use it to solve asymmetric operational problems with minimal token spend.

1. **The Collaborative Content Engine (private internal workspace).** A high-traffic blogger needed a unified workspace where a distributed team of editors could collaborate on content planning and asset management without exposing the system to the public. Deployed entirely in secure mode, the team uses the built-in SQLite database and file storage to manage the publishing pipeline.
2. **The Local Service Dispatcher & Smart Kanban.** A custom-furniture salon manager automated dispatching for measurement requests — ingesting inbound emails and routing them to field engineers by geographic proximity. A background service turns emails into structured data; the local database acts as the state machine behind a secure, internal-only Kanban board.
3. **Adaptive AI Tutor (hybrid public/private EdTech).** A parent wanted a hyper-personalized programming course for a child that adapts daily. The child uses an unauthenticated public page for daily challenges; results pipe to the backend DB; the parent uses a private dashboard and a Telegram bot connected to Hermes, issuing voice commands that restructure the next day's lesson database.
4. **Viral Trend Scraper & Autonomous Blog Loop.** A scheduled script monitors trending Telegram channels, feeds hot topics to Hermes, expands them with real-time search (e.g. Exa API), and publishes enriched long-form posts via external APIs. The public site is a static, fast SEO blog; traffic metrics return to the creator's Telegram bot.
5. **Dynamic School Timetable.** The agent generates availability surveys, sends each teacher a private page, forms a baseline timetable, and dynamically rebuilds it as teachers request changes — even suggesting the best substitute when someone falls ill.

## Browser-first development & voice commands

Production AI development happens entirely in your browser, from the first second — no VS Code, no local environment, no database to spin up, no deployment pipeline to debug. You open a tab and the server is already live, the domain registered, the database running, and the coding platforms wait for your first command.

- **Voice commands.** Issue coding commands and navigate hands-free via microphone; agents respond to natural voice input in real time.
- **Instant production.** One click deploys your changes live — no CI pipeline, no hosting config.
- **Any device.** All computation runs on the VPS, so a laptop, tablet, or phone is enough.

## What Fractera can and cannot do (ownership & trust)

This is your software on your servers. Fractera helps install it — and nothing more.

- **Change your password after install.** Immediately after installation completes, change the password for access to your server.
- **No access, no control.** Fractera does not gain control over your code, and we have no access to your servers. There is no backdoor — the deployed product cannot push to our repositories (verified by a security audit).
- **Always recoverable, always portable.** Your code lives on GitHub and your data on your VPS; you can inspect it, back it up, export it, or walk away at any time. Nothing locks you in.

## MCP connector — security, data & trust (FAQ)

- **Does Fractera store my server's root password?** No. It is used only transiently, inside the single deployment SSH session, and is never written to our database. A placeholder is stored in its place; the dashboard shows a "password is never stored" indicator. We strongly recommend changing the server password immediately after installation.
- **Can Fractera access or control my server after deployment?** No. Because we do not retain the password — and recommend rotating it — Fractera holds no standing administrative access. There is no backdoor (verified by a security audit). You can have your own AI agent audit every installed file against the public source at https://github.com/Fractera/ai-workspace.
- **What data does the connector collect and keep?** Only what is needed: your **email** (install/completion/recovery notifications) and your **server IP** (TLS-expiry reminders and health notices), plus your component selection. The root password is NOT kept. Your application data never leaves your server.
- **Does the connector require authentication?** No. It is an open connector. Authorization for the destructive action is implicit: a deploy only ever touches the specific server whose IP and credentials the user explicitly provides in that conversation.
- **What does each tool do, and which are destructive?** `register_and_deploy` and `retry_deploy` are **destructive** (wipe + install). `check_status`, `get_subdomain`, `get_vps_recommendation`, and `get_project_info` are read-only and safe to test without a server.
- **Does it move money or chain services?** No to both. It acts only on the user's own VPS, never transfers money, and the deployment is always free.
- **Is the connection encrypted?** Yes — HTTPS/TLS (streamable-http transport); the SSH session during deployment is likewise encrypted.

## System anatomy — the services on your server

On your VPS the product runs as seven cooperating services (kept alive by a process manager) behind one web server (Nginx):

- **Shell app** — the main user-facing application and iframe host; the open layer where your product is built.
- **Auth** — the only service that issues the login session.
- **Admin / Bridges** — the control panel (carousel, settings, domain wizard, deploy) and the Memory (RAG) proxy.
- **Bridges** — the WebSocket bridges to the five coding platforms, and the always-on system terminal.
- **Data** — the SQLite database plus media / file storage.
- **Memory** — the LightRAG vector knowledge base.
- **Brain** — the Hermes orchestration agent.

Only ports 22/80/443 are public. No external Postgres/MySQL, no S3/MinIO, no Docker; the database is a file and storage is local disk, all on your server.

## Open layer vs guarded layers

The product exists so AI agents can build YOUR app, so the layers have different access rules:

- **Open layer (the app):** where the in-VPS coding agents work freely — this is your product.
- **Guarded layers (auth, data, memory, bridges):** soft-protected from accidental agent edits; advanced users can still extend them.

The whole product on your server is open-source-ready. A security audit confirmed a deployed server cannot push to Fractera's own repositories — your instance is isolated and yours.

## Security model — why a raw port can't bypass secure mode

In secure mode access is protected by two independent layers:

- **Per-process authentication.** The mode flag is per-service; in secure mode every service enforces login. The session cookie is Secure and scoped to your domain, so it is never sent to a bare-IP address.
- **Host firewall.** Secure mode closes every inbound port except 80/443, so the service ports (database, Memory, Brain, etc.) are unreachable from the internet. Nginx on 443 becomes the only entrance.

In onboarding (IP) mode the ports stay open on purpose for zero-friction first access; only secure mode locks down.

## Is it safe to install? Audit the code yourself

You are installing **open-source** software, so you can verify everything.

- **Audit before going live.** At any time you can ask an AI agent to run a detailed audit of the files installed on your own server and confirm they match the public reference on Fractera's GitHub.
- **Go as deep as you want.** You can ask the agent to analyze every file on your server, not just ours.
- **Why ours stands up to it.** The packages we install are all open source and can be inspected by any security team. Source of truth: https://github.com/Fractera/ai-workspace.

In short: don't take our word for it — have your AI agent check, before and after deployment.

## Hermes Web Chat — the main way you talk to Brain

Brain (Hermes) ships with a built-in **web chat** — the **primary way you interact with the system**. The moment your workspace opens, the chat is already there: it **opens automatically** in the admin panel. The only thing you need to add is a model.

- **How it works.** The chat is a thin front-end around the same Hermes agent on your server. Your messages go to Brain, which thinks, queries Memory, coordinates the coding agents, then replies. It reads the same single credential pool as everything else.
- **Where it lives.** Inside the admin panel it opens automatically. On a custom domain it also gets its own auth-protected subdomain — **chat.<your-domain>** — a standalone "Remote Command Post" you can open from a phone. In IP mode it is reachable at `http://<your-ip>:9120`.
- **Login.** The chat has **no separate login** — its built-in setup wizard is deliberately off (one credential store). On a fresh IP server it is open like the rest of onboarding; once you attach a domain, it is protected by Fractera's own authentication.
- **Telegram is secondary and optional.** Use the built-in web chat as your main tool; add a @BotFather token in Settings → Telegram only if you want a phone channel too.
- **Recommended model.** Start with **gpt-5-mini via the OpenAI API** for both Brain and Memory (~a cent per hour). Switch to a Codex subscription only once usage would exceed ~$20/month.

## Free daily model quotas — keep agents running at no cost (optional)

Many providers offer a **free daily quota** on some models. You can optionally configure these so that when one model's free limit for the day runs out, the agents **fall back to another** and keep working — without paying anything. This is an extra option the rich multi-model setup makes possible; it is not required.

## Emails you receive

At key moments Fractera emails you (your server reaches the Fractera service, which sends the mail). Typical messages: installation started; installation progress; a recovery token; your server is ready (with the links); domain activated; certificate-expiry warning; deploy failed (with recovery options); and subscription / sponsorship notices. Always use a real address you control.

## Your dashboard

You manage everything from your Fractera dashboard at fractera.ai/dashboard: your servers — each with direct links to its app and admin panel — and your subscription / sponsorship status. The links adapt to whether a server is on a bare IP (plain HTTP) or a real domain (HTTPS).

## How Fractera (the service) connects to your server

A clear split. The product runs on **your** server (open-source, all the layers above). An external Fractera service — operated by us — **provisions** it, **delivers** it and its updates, **sends** your emails, **powers** the dashboard and the MCP chat-deploy, and handles **billing / sponsorship**.

You interact only with the RESULTS of that service — the deploy, the dashboard, the emails, the MCP agent — and your code and data always stay on your server.

## Security & passwords — does Fractera keep access to my server?

- **Does Fractera store my server password?** No. The root password is used only in memory, for the few minutes of installation. It is never written to Fractera's database — records keep only a masked placeholder ("*****"). This is enforced in code at every place a server record is created.
- **So can Fractera access my server later?** No. Because the real password is never stored, Fractera has no credential to authenticate with once installation finishes. No hidden key, no backdoor, no "support access".
- **Then why must I change the password?** Basic hygiene (you typed it to start the install) and your own guarantee: once you set a new password only you know, it is provably impossible for anyone — including Fractera — to reach the server with the original. It is your responsibility and a Terms-of-Service condition.
- **Could I be hacked "because the password was with Fractera"?** No — Fractera does not store the password and requires you to change it. Any compromise would have another cause (a weak/reused password, an exposed service, malware, a third party you shared access with).
- **Who is Fractera, legally?** Fractera, Inc. — a registered Delaware C-Corporation (USA) with a real legal address, bound by its published Terms of Service and Privacy Policy.
- **Best practice — deploy on a clean server.** For complete peace of mind, install onto a fresh VPS that holds none of your existing data; after you change the password the server is exclusively yours.

## Open source & what runs where

The workspace that runs on your server is open and available as open source on GitHub — every layer: the web app, authentication, database/storage service, the coding-platform bridges, the memory (LightRAG) and orchestrator (Hermes) integrations. You own it and can inspect, extend, or self-host it entirely.

Provisioning, billing, and the automated setup/delivery are handled by an external Fractera service that we operate. So: the product on your server = open; the service that delivers and bills it = operated by Fractera. Your code and data always stay on your server.

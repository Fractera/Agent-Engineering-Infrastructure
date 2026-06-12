# Fractera AI Workspace — Architecture

> Seed knowledge document. Source: the public `/ai-workspace-architect` reference on fractera.ai.
> Open-source: https://github.com/Fractera/ai-workspace. Activate this document on the /documents page
> to ingest it into Company Memory (LightRAG) so every agent can recall it.

## How Fractera works

Fractera turns one bare VPS into a complete AI development workspace. Here it is in plain words.

**You drive it through middle layers, never raw infrastructure.** As the admin you have two ways in. You can manage the project **through Hermes** — the brain — in **natural language** using the **Hermes chat Web UI** inside your workspace, and you can also reach the same brain from **Telegram** or any other messenger. Or you can work **directly with the coding agents** in their terminals.

**It keeps working even without an API subscription.** Between you and a coding agent sits a small **modal sign-in layer**: you authenticate your existing subscription there, and the same window is used to send commands and receive results. **Hermes talks to the coding agents through the Model Context Protocol (MCP)** that drives that very window — so work stays resilient even when a third-party subscription tool is rate-limited.

**LightRAG is the central memory — this is where the token savings come from.** Every tool reads and writes a shared **vector database** through its own connector. Recalling exactly the right context instead of re-sending everything cuts token spend dramatically. That is why **LightRAG is the central memory** — a **Knowledge Graph RAG** shared by every agent and every session.

**Hermes is the brain; the coding agents do the heavy lifting.** We call Hermes the central brain, but the hardest work — generating code — is done by the **coding agents** such as Claude Code. Hermes is a light **multi-agent orchestrator**: it tracks each platform's token use, picks the right platform for a task, dispatches the work, launches deployments, and talks to GitHub.

**It also runs locally.** Without a paid subscription you can still use AI models — Hermes can run automatically, or you use the manual tools. This **open-source, self-hosted AI platform** runs on **Next.js** on a standard **VPS**, with a built-in local **database** and **object storage**, plus many tools that streamline the work; it can also use the vector database to accumulate experience with your users and admins, steadily growing useful business data.

**The output is a secure web app.** On the way out the project is served over a **secure HTTPS connection** when you run it on your own domain, or it runs on a local machine over a plain **IP address** — in which case you secure the connection with one of the available options.

## What the AI Workspace looks like

This is what you get inside Fractera right after you deploy — a rich workspace that starts on its own.

**It starts ready.** The workspace opens on the **Hermes chat Web UI**, ready to go. To activate Hermes you set your own key — and the **same key** can activate your **Memory**. Open the **Brain** tab, then the **Memory** tab, and press **Activate** in Memory to start embedding the starter documentation, so it is available at any time — used both as a help desk and by the coding agents.

**Pick your coding models.** The top row lists the **five coding platforms**. Choose one or several you want to work with, open it, and activate its subscription — just follow the prompts; it looks almost exactly like the standard interface. The far-right card is the **Terminal**, handy for watching the development process, and where you can add another code-generation platform if you like.

**Everything is one panel.** On the left, the **Settings** tab opens full control over your app and tools. In the footer you will find buttons to connect your **GitHub** repository, trigger a **deploy** by hand, and buttons that switch on later — when the marketplace of skills and ready-made digitized businesses goes live. Top-right, **Preview** shows the current state of the page you are building and the service pages that let you watch development. Unlike the main app, this view can highlight code and helps you find the right element — routing a request from a selected element straight to the Hermes chat or Telegram.

**It explains and improves itself.** The project ships fully **open-source**, so Hermes — or any model — can read this very codebase and give you a complete, detailed explanation of any feature: how it works and how it is built. You can just as easily ask a model to improve not only your end apps but the **admin panel** itself. A word of caution: experiment on a **secondary account**, and keep your main one on reliable, proven solutions. If you want to add something, or you found a bug, please open a **pull request**.

**One click.** This whole complex setup on your **own server** takes literally one click. Enter your server credentials, start the deployment, make no settings and no choices — and in about **10 minutes** you get a fully configured app. After that you change your server access and connect a domain, and the security certificates assemble themselves automatically.

## Hermes — the orchestrator (Company Brain)

**Hermes** is the **multi-agent orchestrator** at the centre of the workspace (`fractera-hermes`, dashboard on `:9119`). It reads its identity and memory at every wake-up and drives the five coding platforms through their MCP bridges — this is the **AI agent orchestration** that makes Fractera a true multi-agent system.

Hermes is deliberately **light**: it does not write the hard code itself. It tracks how many tokens each platform is spending, chooses the platform that fits a task, dispatches the work to specialized coding assistants, records every build into the Product Loop journal, launches deployments, and integrates with GitHub. Its wiring lives in `config.yaml` (what it can reach); its personality lives in `SOUL.md` (who it is).

### Hermes Chat Web UI

The chat window inside your workspace (`fractera-hermes-webui`, `:9120`) where you talk to Hermes in plain language. You brief the brain like a teammate and it drives the five coding platforms for you — no commands to memorise. This is the primary way most people use the system.

### Telegram and messengers

A gateway process (`fractera-hermes-gateway`) lets you reach the same brain from **Telegram** on your phone, and the design extends to any other messenger. Start, check on, or steer work away from the keyboard; the workspace keeps building while you are out.

## LightRAG — the central memory

**LightRAG** (`fractera-rag`, `:9621`) is the shared long-term memory of the whole workspace — not just Hermes. It is a **Knowledge Graph RAG** implementation: every agent queries the same graph and writes back to it — Hermes and all five coding platforms.

That shared memory is the reason Fractera spends so few tokens. Instead of pasting the whole codebase into every prompt, each agent recalls exactly the relevant entities, relations and decisions. Ingest a document once and every agent can use it forever. It needs an embedding/LLM key to be active; without one it stays wired but silent.

## Coding agents

Five subscription **AI coding assistants** run preconfigured on your server and do the heavy lifting of **automated code generation**. Each is driven through a bridge that keeps it alive over WebSocket and exposes it to Hermes as an MCP server (ports `3210–3214`). You run them on your **existing subscriptions** — no API keys, no per-token billing — and you can switch platform mid-task without losing context, because LightRAG keeps the thread.

### Claude Code

Anthropic's coding agent. Its primary project-context file is `CLAUDE.md`. Strong at architecture, planning and careful multi-file changes — often the platform Hermes hands the hardest work to.

### Codex

OpenAI's coding CLI. Its primary project-context file is `AGENTS.md`. A fast generalist for implementation and iteration.

### Gemini CLI

Google's coding agent. Its primary project-context file is `GEMINI.md`. Large context window — useful for sweeping over big codebases and reviews.

### Qwen Code

Alibaba's coding agent. Its primary project-context file is `QWEN.md`. Another subscription option in the rotation Hermes can delegate to.

### Kimi Code

Moonshot's coding agent. Its primary project-context file is `AGENTS.md`. Rounds out the five platforms so Hermes always has an alternative when one subscription is busy or limited.

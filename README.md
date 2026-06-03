<p align="center">
  <img src="https://www.fractera.ai/section-step-by-step-images/Step1.png" alt="Fractera AI Workspace" width="100%"/>
</p>

<h1 align="center">Fractera AI Workspace</h1>

<p align="center"><strong>Your own private AI coding workspace — on your own server, in 10 minutes.</strong></p>

<p align="center">
  <a href="https://github.com/Fractera/ai-workspace/stargazers">
    <img src="https://img.shields.io/github/stars/Fractera/ai-workspace?style=for-the-badge&logo=github&color=black&labelColor=1a1a2e" alt="Stars"/>
  </a>
  &nbsp;
  <a href="https://github.com/Fractera/ai-workspace/fork">
    <img src="https://img.shields.io/badge/Fork-1a1a2e?style=for-the-badge&logo=github" alt="Fork"/>
  </a>
  &nbsp;
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Self--Hosted-success?style=for-the-badge" alt="Self-Hosted"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Anthropic-d4a017?style=flat-square" alt="Claude Code"/>
  <img src="https://img.shields.io/badge/Codex-OpenAI-412991?style=flat-square" alt="Codex"/>
  <img src="https://img.shields.io/badge/Gemini_CLI-Google-4285F4?style=flat-square" alt="Gemini CLI"/>
  <img src="https://img.shields.io/badge/Qwen_Code-Alibaba-FF6A00?style=flat-square" alt="Qwen Code"/>
  <img src="https://img.shields.io/badge/Kimi_Code-Moonshot-00C6FF?style=flat-square" alt="Kimi Code"/>
  <img src="https://img.shields.io/badge/Hermes-Orchestrator-6e40c9?style=flat-square" alt="Hermes"/>
  <img src="https://img.shields.io/badge/LightRAG-Memory-22c55e?style=flat-square" alt="LightRAG"/>
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square" alt="SQLite"/>
  <img src="https://img.shields.io/badge/Media_Storage-S3--compatible-f59e0b?style=flat-square" alt="Media Storage"/>
  <img src="https://img.shields.io/badge/Auth-NextAuth_v5-ef4444?style=flat-square" alt="Auth"/>
  <img src="https://img.shields.io/badge/Telegram-Gateway-229ED9?style=flat-square" alt="Telegram"/>
</p>

---

## ✨ What is Fractera?

Fractera is an open-source self-hosted platform that turns a bare Ubuntu VPS into a complete AI coding workspace — 5 AI engines, an autonomous orchestrator, private graph memory, auth, database, and file storage — all configured automatically, no DevOps required.

You bring a server. We configure everything.

---

## 🚀 Quick Start — two ways

### 1. Via website (no terminal needed)

Go to **[fractera.ai](https://www.fractera.ai)** and deploy your workspace in one click.
Enter your VPS credentials — the platform handles the rest (Nginx, HTTPS, auth, services). Done in ~10 minutes.

### 2. Via MCP connector (from your AI chat)

Add the Fractera MCP connector to Claude, Cursor, or any MCP-compatible client:

```json
{
  "mcpServers": {
    "fractera": {
      "url": "https://www.fractera.ai/api/mcp"
    }
  }
}
```

Then tell your AI agent: *"Deploy Fractera on my server"* — provide your VPS IP and credentials.
The agent registers you, runs the full deploy, and reports back when your workspace is live at `http://<your-ip>:3002`.

> **MCP connector:** `https://www.fractera.ai/api/mcp` · Open, no auth required  
> **Listed on:** [Smithery](https://smithery.ai/servers/admin-add5/fractera) · [mcp.so](https://mcp.so) · [Glama](https://glama.ai/mcp/servers) · [Official MCP Registry](https://registry.modelcontextprotocol.io) (`io.github.Fractera/deploy`)

---

## What you get

| Component | Description |
|---|---|
| **5 AI coding engines** | Claude Code, Codex, Gemini CLI, Qwen Code, Kimi Code — parallel terminals, switch without losing context |
| **Hermes orchestrator** | Autonomous AI agent that works in the background and connects to Telegram |
| **LightRAG memory** | Private graph memory shared across all agents and sessions |
| **Auth** | Email/password, guest mode, role-based access (Architect / User / Guest) |
| **SQLite database** | Built-in database browser — no external DB required |
| **Media storage** | S3-compatible local object storage — images, videos, documents |
| **Telegram gateway** | Chat with Hermes from your phone, get notifications, issue commands |
| **Custom domain** | Attach your own domain with HTTPS in one click (optional) |
| **Auto-updates** | Pull latest version from GitHub without SSH |

---

## Real-world use cases

**Private team workspace** — editors collaborate on content planning in a secure authenticated environment, nothing exposed publicly.

**Lead dispatch Kanban** — inbound emails from a website form auto-create Kanban cards, routed to field engineers by proximity to minimize travel.

**Adaptive AI tutor** — child completes coding challenges on a public page; parent sees results in a private dashboard and adjusts lessons via Telegram.

**Autonomous content loop** — agent monitors Telegram channels for trending topics, enriches them via web search, publishes to a blog, and reports traffic stats back to Telegram.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Fractera Workspace                  │
│                                                     │
│  fractera-app    :3000  Shell (Next.js)              │
│  fractera-auth   :3001  Auth (NextAuth v5)           │
│  fractera-admin  :3002  Admin (bridges/app)          │
│  fractera-bridge :3200–3206  AI platform bridges     │
│  fractera-data   :3300  Media + SQLite               │
│  fractera-rag    :9621  LightRAG memory              │
│  fractera-hermes :9119  Hermes orchestrator          │
│  fractera-hermes-gateway  Telegram/messaging         │
└─────────────────────────────────────────────────────┘
```

**Tech stack:** Next.js 16.2 · React 19 · Tailwind v4 · shadcn/ui · SQLite · NextAuth v5 · Node.js · PM2

---

## ⭐ Support the project

If Fractera is useful to you — a star makes a real difference. It helps others find the project and motivates continued development.

<p align="center">
  <a href="https://github.com/Fractera/ai-workspace/stargazers">
    <img src="https://img.shields.io/badge/⭐_Star_this_repo_—_it_helps_a_lot-black?style=for-the-badge&logo=github&logoColor=white" alt="Star on GitHub"/>
  </a>
</p>

**Free skills from the marketplace** — send proof to `admin@fractera.ai`:

| Action | Reward |
|---|---|
| ⭐ Star this repo | +1 skill |
| 🍴 Fork this repo | +1 skill |
| ✍️ Write on Medium | +2 skills |
| 📝 Write on dev.to or any dev blog | +2 skills |
| 🐦 Post on X with a link | +1 skill |
| ⭐ Leave a review on fractera.ai | +1 skill |

---

## FAQ

**Do I need to know DevOps?**  
No. The installer configures Nginx, HTTPS, auth, database, and all services automatically.

**What server do I need?**  
Any Ubuntu 22.04/24.04 VPS with at least 2 GB RAM. A €4–5/month VPS works fine.

**Is it free?**  
Yes. Fractera never charges for the deployment. It runs on your own hardware. You pay only for the VPS (directly to the provider).

**Can I use my own domain?**  
Yes. Attach a custom domain with HTTPS in one click from Admin → Personal Domain.

**Can I connect external services?**  
No restrictions. Connect any external database, API, or service via environment variables from Admin → Settings.

**What AI models does it use?**  
Claude Code (Anthropic subscription), Codex (OpenAI subscription), Gemini CLI (Google), Qwen Code (Alibaba), Kimi Code (Moonshot). Models run under your own subscriptions — no middleman fees.

---

## Links

- **Website & deploy:** [fractera.ai](https://www.fractera.ai)
- **Knowledge base for AI agents:** [fractera.ai/mcp-info](https://www.fractera.ai/mcp-info)
- **MCP connector:** `https://www.fractera.ai/api/mcp`
- **Contact:** [admin@fractera.ai](mailto:admin@fractera.ai)

---

<p align="center">Built for developers who value independence.</p>

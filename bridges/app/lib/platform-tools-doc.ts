// Генератор `PLATFORM-TOOLS.md` (шаг 501, решение владельца 2026-08-09).
//
// 🔒 ДОКУМЕНТ СОБИРАЕТСЯ, А НЕ ПИШЕТСЯ РУКАМИ. Ручное редактирование у него
// убрано намеренно: он обязан описывать то, что в проекте ДЕЙСТВИТЕЛЬНО стоит, а
// написанный руками текст расходится с реальностью на первой же установке — и
// расходится молча. Установил инструмент — документ пересобрался.
//
// Источник — `TOOL_DOCS`: одно описание на инструмент, из него получают и
// страница в панели, и этот файл. Два отдельных текста разошлись бы.
//
// ЧТО ПОПАДАЕТ В ДОКУМЕНТ. Службы платформы — всегда: они есть у каждого проекта.
// Инструменты — ТОЛЬКО УСТАНОВЛЕННЫЕ: агент читает документ, чтобы узнать, чем
// располагает, и строка про то, чего в проекте нет, посылает его импортировать
// несуществующий файл.

import { TOOLS, toolById, type ToolId } from "@/lib/tools-registry";
import { TOOL_DOCS } from "@/lib/tools-doc";
import { toolState, SLOT_TOOLS_DIR } from "@/lib/tools-install";

const PREAMBLE = `# PLATFORM-TOOLS.md — what you already have

> **Generated file — do not edit by hand.** It is rebuilt by the control panel every time a tool is
> installed, so anything written here manually disappears at the next install. What it describes is what
> the project actually has.

You have no access to external tools. This file is the only way you learn what the platform under this app
already provides. **Read it before designing anything that stores, searches, sends, locates or displays.**
Almost every wrong answer here is a second copy of something listed below.

The rule for all of them: **you call these, you do not rebuild them.** They are shared with the deployed
app, they are backed up as one, and a second copy splits the data so that neither half is complete.

---

## One door

Everything below is reached through the **data service** on \`:3300\`, behind a single secret. Not a port
per service — one address, one key, and a route per capability. Ready clients sit next to you in
\`lib/fractera/\`.

| What | How you reach it | Use it for |
|---|---|---|
| **Rows / tables** | \`lib/fractera/data-service.ts\` | Any structured data your app owns. There is already a database — do not add Postgres, Neon or Supabase. |
| **Uploaded files** | media routes of the same service | Images, documents, video. Stored once, referenced by URL. |
| **Vector store** | \`lib/fractera/vectors.ts\` | Meaning-based search: "find things similar to this". Lives beside the rows it describes. |
| **Knowledge graph** | \`/service/rag\` via \`lib/fractera/knowledge.ts\` | Questions over a body of documents where the answer is spread across several of them. |
| **Map and routing** | \`/service/geo\` | Address ↔ coordinates, driving routes, distance matrices, visiting order. Own engines, no third-party keys. |
| **Channels** | \`/service/channels\` | Messaging out and in — Telegram first. |

## Not through that door

| What | Where | Note |
|---|---|---|
| **Accounts, sessions, roles** | auth service on \`:3001\` | Never write a second login. Adding a sign-in provider is a platform setting, not app code. |
| **Settings of this app** | control panel on \`:3002\` | Name, description, branding, SEO, analytics. Read them with \`npm run read:app-config\`; change them in the panel. |

### Choosing between the vector store and the knowledge graph

They look similar and are not. **Vector store** answers "what resembles this?" — one item at a time,
cheap, exact about similarity. **Knowledge graph** answers "what does this body of text say about X?" —
it connects facts across documents, costs more per question and needs an OpenAI key to be useful.

Reach for the vector store first. Move to the graph when the answer genuinely lives in the links between
documents rather than in any single one.

---

## Why this file exists when you could just look in \`tools/\`

You could. You would see the folder names and nothing else — and that is exactly where the difficulty
starts, because there will not be one cropper. There will be several: one that returns a JPEG and loses
transparency, one that keeps PNG, one that crops on the server for large files, one built for avatars with
a locked square. From the folder they are four similar names.

**Choosing between near-identical tools is the whole problem, and only a contract solves it.** What each
one accepts, what it gives back, what it refuses to do — that is the difference between picking the right
one and discovering the wrong one three hours later, when the logo has lost its transparent background.

So every entry below carries the same four sections, in the same order:

| Section | Answers |
|---|---|
| **How it works** | The mechanics — where the work happens, what is authoritative, what the tool protects you from. Read it to know the tool's *shape*. |
| **Import and signature** | The exact import line and every prop with its type and whether it is required. Copy from here; do not infer it. |
| **Returns** | What comes back and when — a value, a callback, or a side effect on the server. |
| **Example** | Code that compiles as written. |
| **Limits** | What the tool does **not** do. Usually the deciding section: two tools differ in their limits far more often than in their purpose. |

### How a tool gets into this file

1. The owner installs it from the panel's *Tools* section. Files are copied into \`${SLOT_TOOLS_DIR}/<id>/\`.
2. The panel immediately regenerates this document from the tool descriptions it holds.
3. The entry appears below, with the same contract the panel's own page shows — one source, so the two
   cannot drift apart.

**Tools that are not installed are not described here.** A contract for something absent would send you
importing a file that does not exist. If you need a capability and find nothing for it below, say so —
the panel's *Add a tool* page is where a new one is requested.
`;

function renderTool(id: ToolId): string {
  const tool = toolById(id);
  const doc = TOOL_DOCS[id];
  const state = toolState(id);

  const params = doc.params
    .map((p) => `| \`${p.name}\` | \`${p.type}\` | ${p.required ? "yes" : "no"} | ${p.about} |`)
    .join("\n");

  const deps = tool.npmDeps.length
    ? `\n**Requires a package.** Run \`npm install ${tool.npmDeps.join(" ")}\` — without it the project will not build.\n`
    : "";

  return `### \`${id}\` — ${doc.purpose}

Installed ${state.installedAt ? `on ${state.installedAt.slice(0, 10)}` : ""} into \`${SLOT_TOOLS_DIR}/${id}/\`.
${deps}
**How it works**

${doc.mechanics.map((m) => `- ${m}`).join("\n")}

**Import**

\`\`\`ts
${doc.importLine}
\`\`\`

**Signature** — \`${doc.signature}\`

| Prop | Type | Required | What it is |
|---|---|---|---|
${params}

**Returns.** ${doc.returns}

**Example**

\`\`\`tsx
${doc.example}
\`\`\`

**Limits**

${doc.limits.map((l) => `- ${l}`).join("\n")}
`;
}

/** Собрать документ целиком по текущему состоянию проекта. */
export function renderPlatformToolsDoc(): string {
  const installed = TOOLS.filter((t) => toolState(t.id).installed);

  const toolsSection = installed.length
    ? `---

## Micro-tools installed in this project

Finished pieces taken from the panel instead of written again. They are **copies**: ordinary project code
now, yours to change, travelling with a push like any other file. Re-installing from the panel overwrites
a copy and loses local edits.

**Check \`${SLOT_TOOLS_DIR}/\` before building anything of these shapes.** A cropper or a code viewer
written from scratch beside an installed one is duplicated work that then has to be maintained twice.

${installed.map((t) => renderTool(t.id)).join("\n---\n\n")}`
    : `---

## Micro-tools

None installed yet. The panel's *Tools* section offers ready pieces — image crop, video trim, voice input,
code view — that install as copies into \`${SLOT_TOOLS_DIR}/\`. When one is installed, its full contract
appears in this file automatically.`;

  const tail = `

---

## When something is missing

Say so plainly and name the layer it belongs to. Do not improvise a local imitation: a hand-rolled store,
a second login, or your own geocoder will work in your session and break the moment the platform's own
version is used somewhere else in the project.

*Generated by the control panel on ${new Date().toISOString().slice(0, 10)}.*
`;

  return `${PREAMBLE}\n${toolsSection}${tail}`;
}

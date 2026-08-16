# Glossary

> Term map of this project — so every agent and every document reads the same words the same way.
> Edited from the control panel; this file is the source of truth inside your repository.

## 🪦 Removed 2026-08-16 — terms that described a subsystem that no longer exists

This file used to define `Automation (Rule)`, `Trigger`, `Hook`, `Router`, `Step`, `Integration`, `State`,
`Run` and `Record` — the vocabulary of the Projects layer, which was deleted with the coding agents and
Hermes. A glossary describing a subsystem that does not exist is worse than an empty one: the next session
builds by it. If you meet those words in an old document, they are history, not instructions.

## Product — the unit of work inside one server

One server carries many products: a landing page today, a store tomorrow, a company brain next month.
The register is `PRODUCTS-CONFIG/products-config.json`.

| Term | Meaning |
|---|---|
| **product** | one of the things this server carries. `id` never changes and means nothing (`p1`, `p2`); the title is the owner's and may be renamed freely |
| **structure** | one of the twelve directions picked on the use-cases page (`store`, `landing`, `company-brain`, …). Decides the seven opening questions and the default surface |
| **surface** | `public` — own address · `private` — a tab in the control panel · `headless` — channels and schedule only |
| **the four roots** | pages · logic · tables · use cases. Derived from the product record, never invented — and they are the boundary: work on a product's use case writes inside them and nowhere else |
| **pages plan** (`PAGES.md`) | what the product should have, proposed from its use cases. What exists is counted from the folders and never stored |

## Machine layer and human layer

| Term | Meaning |
|---|---|
| **machine layer** | every JSON in the project, ids, slugs, file names, `PAGES.md`. **English only** — the agent loads it at the start of every session, and a second language there is paid for in tokens forever |
| **human layer** | the title and the scenario **inside** a use-case file — the one thing a person reads and confirms, written in their language |
| **control panel** | `:3002`, outside your repository. It speaks 82 languages on its own; the repository never carries its translations |

import type { Probe } from "../../../_shared/tests";

// This automation's TESTS (step 220 standard — see _shared/tests.ts and app/(projects)/README.md).
// Every probe is DECLARED here with its own prepared success/error text; the Tests modal renders these
// cards and calls each binding. Channel-type probes reuse the frozen shared route
// (/api/projects/tests/<kind>); the database probe hits THIS project's own records route by the same
// { ok, detail } contract. This replaces the old hardcoded PROBES array + the free-form "custom test".
export const PROBES: Probe[] = [
  {
    id: "openai",
    label: "AI key",
    hint: "OpenAI key authorizes",
    stage: "input",
    binding: { type: "shared", kind: "openai" },
    successText: "The OpenAI key is configured and authorizes requests.",
    errorText: "OpenAI key missing or invalid — set it in Settings → Input channels.",
  },
  {
    id: "telegram",
    label: "Telegram bot",
    hint: "Bot token is valid",
    stage: "input",
    binding: { type: "shared", kind: "telegram" },
    successText: "Your Telegram bot token is valid and the bot is reachable.",
    errorText: "Bot token missing or rejected — set it in Settings → Input channels.",
  },
  {
    id: "image",
    label: "Image reading",
    hint: "Receipt vision (uses the AI key)",
    stage: "input",
    binding: { type: "shared", kind: "openai" },
    successText: "Vision works — receipts and photos can be read (uses the AI key).",
    errorText: "The AI key is needed for image reading — set it in Settings → Input channels.",
  },
  {
    id: "memory",
    label: "Vector memory",
    hint: "LightRAG is reachable",
    stage: "input",
    binding: { type: "shared", kind: "lightrag" },
    successText: "Vector memory (LightRAG) is reachable.",
    errorText: "The memory service is unreachable.",
  },
  {
    id: "calendar",
    label: "Calendar",
    hint: "External calendar connector",
    stage: "input",
    binding: { type: "shared", kind: "google-calendar" },
    successText: "Google Calendar credentials are configured.",
    errorText: "No Google Calendar credentials — this connector is optional.",
  },
  {
    id: "database",
    label: "Database",
    hint: "Records store responds",
    stage: "output",
    binding: { type: "project", route: "/api/projects/personal/telegram-notes/records?offset=0", method: "GET" },
    successText: "The records store responds.",
    errorText: "The records store did not respond.",
  },
];

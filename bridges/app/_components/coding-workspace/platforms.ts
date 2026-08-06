// Step 500 — the five coding agents (Claude Code, Codex, Gemini CLI, Qwen Code,
// Kimi Code) were removed from the product. The `Platform` type is kept as an
// empty union so the terminal machinery below still type-checks, but no agent
// card is ever rendered and no agent terminal can be opened. The always-on
// system terminal (a plain project shell, CORE) is unaffected.
export type Platform = never;

export type TerminalStatus = 'unavailable' | 'connecting' | 'connected' | 'disconnected' | 'unauthorized';

export const PLATFORMS: { id: Platform; label: string; active: boolean; docsUrl: string; agentPrompt: string }[] = [];

export const COMING_SOON: { id: string; label: string; version: string; tooltip: string }[] = [];

// Embed cards rendered first in the carousel (left of AI platforms).
// They occupy a slot in the same horizontal scroller as the platforms,
// but instead of starting a terminal session they activate an iframe
// canvas (Hermes / LightRAG). Selecting one with no config triggers
// the onboarding flow (opens the matching Settings panel).
// Step 500 — the 'brain' card (Hermes chat) and the 'hermes-dashboard' target
// are gone together with Hermes. Only Memory (LightRAG) remains.
export type EmbedCardId = 'memory';

export type EmbedTarget = EmbedCardId;

export type EmbedCard = {
  id: EmbedCardId;
  label: string;
  iconKey: 'Brain' | 'BrainCircuit';
  // Endpoint that returns { configured: boolean, ... } — we only need the flag.
  configCheckEndpoint: string;
  // Footer panel ID to surface when the user clicks the card and config is missing.
  settingsPanelId: 'lightrag';
};

export const EMBED_CARDS: EmbedCard[] = [
  { id: 'memory', label: 'Memory', iconKey: 'BrainCircuit', configCheckEndpoint: '/api/config/rag',    settingsPanelId: 'lightrag' },
];

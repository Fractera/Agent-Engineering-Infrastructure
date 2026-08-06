// Step 500 — the five coding agents (Claude Code, Codex, Gemini CLI, Qwen Code,
// Kimi Code) were removed from the product. The `Platform` type is kept as an
// empty union so the terminal machinery below still type-checks, but no agent
// card is ever rendered and no agent terminal can be opened. The always-on
// system terminal (a plain project shell, CORE) is unaffected.
export type Platform = never;

export type TerminalStatus = 'unavailable' | 'connecting' | 'connected' | 'disconnected' | 'unauthorized';

export const PLATFORMS: { id: Platform; label: string; active: boolean; docsUrl: string; agentPrompt: string }[] = [];

export const COMING_SOON: { id: string; label: string; version: string; tooltip: string }[] = [];

// Embed cards used to render an iframe canvas in the carousel (Hermes chat,
// the Hermes dashboard, the LightRAG web UI). (step 500) All three are gone:
// Hermes was removed and LightRAG's vectors moved into the data service
// (:3300), which has no web UI. The catalog is empty and no canvas ever mounts.
export type EmbedCardId = never;

export type EmbedTarget = EmbedCardId;

export type EmbedCard = {
  id: EmbedCardId;
  label: string;
  iconKey: 'Brain' | 'BrainCircuit';
  // Endpoint that returns { configured: boolean, ... } — we only need the flag.
  configCheckEndpoint: string;
  // Footer panel ID to surface when the user clicks the card and config is missing.
  settingsPanelId: 'openai';
};

export const EMBED_CARDS: EmbedCard[] = [

];

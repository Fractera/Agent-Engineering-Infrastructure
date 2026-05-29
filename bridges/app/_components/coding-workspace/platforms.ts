export type Platform =
  | 'claude-code'
  | 'codex'
  | 'gemini-cli'
  | 'qwen-code'
  | 'kimi-code';

export type TerminalStatus = 'unavailable' | 'connecting' | 'connected' | 'disconnected';

export const PLATFORMS: { id: Platform; label: string; active: boolean; docsUrl: string; agentPrompt: string }[] = [
  { id: 'claude-code', label: 'Claude Code', active: true,  docsUrl: 'https://code.claude.com/docs/en/quickstart', agentPrompt: '' },
  { id: 'codex',       label: 'Codex',       active: true,  docsUrl: 'https://developers.openai.com/codex/cli', agentPrompt: 'Install Codex CLI: read the documentation in ../docs/platforms/codex/ (start with AGENTS.md), then follow the install instructions exactly as written there. After successful install, verify with `codex --version` and set active: true for codex in app/@codeWorkspaceSlot/_components/coding-workspace/platforms.ts' },
  { id: 'gemini-cli',  label: 'Gemini CLI',  active: true,  docsUrl: 'https://geminicli.com/docs/get-started/installation/', agentPrompt: '' },
  { id: 'qwen-code',   label: 'Qwen Code',   active: true,  docsUrl: 'https://qwen.ai/qwencode', agentPrompt: '' },
  { id: 'kimi-code',   label: 'Kimi Code',   active: true,  docsUrl: 'https://moonshotai.github.io/kimi-cli/en/guides/getting-started.html', agentPrompt: '' },
];

export const COMING_SOON: { id: string; label: string; version: string; tooltip: string }[] = [];

// Embed cards rendered first in the carousel (left of AI platforms).
// They occupy a slot in the same horizontal scroller as the platforms,
// but instead of starting a terminal session they activate an iframe
// canvas (Hermes / LightRAG). Selecting one with no config triggers
// the onboarding flow (opens the matching Settings panel).
export type EmbedCardId = 'brain' | 'memory';

export type EmbedCard = {
  id: EmbedCardId;
  label: string;
  iconKey: 'Brain' | 'BrainCircuit';
  // Endpoint that returns { configured: boolean, ... } — we only need the flag.
  configCheckEndpoint: string;
  // Footer panel ID to surface when the user clicks the card and config is missing.
  settingsPanelId: 'hermes' | 'lightrag';
};

export const EMBED_CARDS: EmbedCard[] = [
  { id: 'brain',  label: 'Brain',  iconKey: 'Brain',        configCheckEndpoint: '/api/config/hermes', settingsPanelId: 'hermes'   },
  { id: 'memory', label: 'Memory', iconKey: 'BrainCircuit', configCheckEndpoint: '/api/config/rag',    settingsPanelId: 'lightrag' },
];

// ⚠ COPY-PAIR (263.1, the XtermTerminal convention): the CANON of this file lives in
// bridges/app/_components/coding-workspace/auth-flow-descriptors.ts (:3002). Edit them AS A PAIR —
// the same subscription-auth pipeline must fire in the admin coding window and in the dev console.
export type AuthFlowDescriptor = {
  platformId: 'claude-code' | 'codex' | 'codex-device' | 'gemini-cli' | 'qwen-code' | 'kimi-code'
  platformLabel: string
  // terminal-paste: user pastes code from browser → sent to PTY stdin
  // url-relay:      user pastes localhost callback URL → server relays to localhost:1455
  // device-code:    user opens static URL and enters one-time code on the site; Codex polls automatically
  flow: 'terminal-paste' | 'url-relay' | 'device-code'
  detectUrl: RegExp
  detectCode?: RegExp  // device-code only: extracts the one-time code from PTY buffer
  detectSuccess?: RegExp
  modalTitle: string
  modalDescription: string
}

export const AUTH_FLOW_DESCRIPTORS: AuthFlowDescriptor[] = [
  {
    platformId: 'claude-code',
    platformLabel: 'Claude Code',
    flow: 'terminal-paste',
    detectUrl: /https:\/\/claude\.com\/cai\/oauth\/authorize.*?&state=[A-Za-z0-9][A-Za-z0-9_\-]*[A-Za-z0-9]/,
    modalTitle: 'Claude Code — Authorization',
    modalDescription: 'Open the link in your browser and sign in to your Claude account',
  },
  {
    platformId: 'codex',
    platformLabel: 'Codex',
    flow: 'url-relay',
    detectUrl: /https:\/\/auth\.openai\.com\/oauth\/authorize.*?&state=[A-Za-z0-9][A-Za-z0-9_\-]*[A-Za-z0-9]/,
    modalTitle: 'Codex — Browser Authorization',
    modalDescription: 'Open the link and sign in. The browser will fail with a localhost error — copy the full URL from the address bar and paste it below',
  },
  {
    platformId: 'codex-device',
    platformLabel: 'Codex',
    flow: 'device-code',
    detectUrl: /https:\/\/auth\.openai\.com\/codex\/device/,
    detectCode: /[A-Z][A-Z0-9]{1,7}-[A-Z0-9]{2,8}/,
    modalTitle: 'Codex — Device Authorization',
    modalDescription: 'Copy the code below → Open the link → Paste the code on the OpenAI page → Click Continue',
  },
  {
    platformId: 'gemini-cli',
    platformLabel: 'Gemini CLI',
    flow: 'terminal-paste',
    detectUrl: /https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth[A-Za-z0-9%_.~+\-=&?:/]+\.apps\.googleusercontent\.com/,
    modalTitle: 'Gemini CLI — Authorization',
    modalDescription: 'Open the link in your browser and sign in to your Google account',
  },
  {
    platformId: 'qwen-code',
    platformLabel: 'Qwen Code',
    flow: 'terminal-paste',
    detectUrl: /https:\/\/modelstudio\.console\.alibabacloud\.com\S*/,
    modalTitle: 'Qwen Code — API Key',
    modalDescription: 'Visit the site, register, and click the API Key button to generate your key (format: sk-...). Paste it in the field below and press Send.',
  },
  {
    platformId: 'kimi-code',
    platformLabel: 'Kimi Code',
    flow: 'device-code',
    detectUrl: /https:\/\/www\.kimi\.com\/code\/authorize_device\S+/,
    detectCode: /[A-Z0-9]{4}-[A-Z0-9]{4}/,
    modalTitle: 'Kimi Code — Device Authorization',
    modalDescription: 'Open the link in your browser and authorize Kimi Code. The verification code is already included in the URL — Kimi will detect your approval automatically.',
  },
]

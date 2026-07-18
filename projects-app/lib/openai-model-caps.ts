// Model capability check (step 250) — the in-product develop agent runs on OpenAI TOOL CALLING, so a model
// without tools support cannot drive it. A small DENYLIST, not an allowlist: every current chat model
// supports tools, and new families should work the day they appear — only the known exceptions are barred.
const NO_TOOLS = [/^o1-mini/, /^o1-preview/, /^chatgpt-/];

export function modelSupportsTools(id: string): boolean {
  return !NO_TOOLS.some((re) => re.test(id));
}

// The env keys this project's automation needs (step 186.3). Generated at compose
// time from the project's DECLARED integrations ([{"name":"Telegram","envKeys":["TELEGRAM_BOT_TOKEN","TELEGRAM_ALLOWED_CHAT_ID"]},{"name":"Fractera AI (OpenAI)","envKeys":["OPENAI_API_KEY"]}] — the same
// JSON that goes into the README fractera:meta block). The native missing-keys modal
// (missing-keys-modal.client.tsx) reads REQUIRED_ENV_KEYS on mount: any declared key
// absent from the runtime env prompts the user to supply it through the slot env
// setter (/api/project-config/env). Empty array → the modal renders nothing.
export type ProjectIntegration = { name: string; envKeys: string[] };

export const PROJECT_INTEGRATIONS: ProjectIntegration[] = [{"name":"Telegram","envKeys":["TELEGRAM_BOT_TOKEN","TELEGRAM_ALLOWED_CHAT_ID"]},{"name":"Fractera AI (OpenAI)","envKeys":["OPENAI_API_KEY"]}];

// Keys that are OPTIONAL — declared for discoverability but not needed for the
// automation to run, so an empty value must NOT trigger the missing-keys modal.
// TELEGRAM_ALLOWED_CHAT_ID empty = accept all chats (the default), not "missing".
export const OPTIONAL_ENV_KEYS: Set<string> = new Set(["TELEGRAM_ALLOWED_CHAT_ID"]);

// The keys whose absence genuinely blocks the automation — the modal checks these.
export const REQUIRED_ENV_KEYS: string[] = Array.from(
  new Set(PROJECT_INTEGRATIONS.flatMap((integration) => integration.envKeys ?? [])),
).filter((key) => !OPTIONAL_ENV_KEYS.has(key));

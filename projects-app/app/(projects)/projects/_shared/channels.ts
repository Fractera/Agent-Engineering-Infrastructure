// FROZEN STANDARD — an automation's INPUT CHANNELS (step 219).
//
// Why this exists: a frozen automation template cannot predict what a given automation talks to.
// One starts on Telegram, the next on YouTube, the next polls an inbox. So we do NOT freeze the
// channels themselves — we freeze the SHAPE of declaring them: a channel has a name and the
// connection keys it needs, and a key has a name of its own (some connectors need several — a
// Google Calendar connection needs BOTH a client id and a client secret).
//
// This is the same shape the project already uses for its integrations
// (_data/required-keys.ts: PROJECT_INTEGRATIONS = {name, envKeys[]}), given a name and a home so
// every automation — and the frozen skeleton — declares its inputs identically instead of each
// growing its own private convention.
export type ChannelKey = {
  /** The runtime env key that holds the value, e.g. "TELEGRAM_BOT_TOKEN". */
  env: string;
  /** WHAT the user must supply, in plain words, e.g. "Bot token". */
  label: string;
  /** WHERE / how to get it (step 220): the per-field hint the Settings modal shows so the
   *  form is self-explaining without a hard-coded instruction in the component, e.g.
   *  "Message @BotFather → /newbot → copy the token". Declared once, in data. */
  help?: string;
  /** An empty value is legitimate (a default), not a missing key — e.g. "accept all chats". */
  optional?: boolean;
  /** A credential: rendered as a masked input; its value is never echoed back by the env route. */
  secret?: boolean;
};

/** Optional OAuth handshake for a channel that needs one (step 220): the project's own
 *  connect / status / disconnect endpoints + the callback path to register in the provider
 *  console. Declared per-project (the paths live under the project's api folder); when present,
 *  the Settings input-channels accordion renders the connect/disconnect row for this channel. */
export type ChannelOAuth = {
  connectPath: string;
  statusPath: string;
  disconnectPath: string;
  callbackPath: string;
};

export type InputChannel = {
  /** The channel as a human names it: "Telegram", "Google Calendar", "YouTube". */
  name: string;
  /** One line: what this automation receives (or publishes) through this channel. */
  description: string;
  /** Every key needed to connect it. Several is normal (Google Calendar needs two). */
  keys: ChannelKey[];
  /** Optional OAuth handshake (step 220) — set for channels connected by authorization, not
   *  just a pasted key (Google Calendar). Absent for plain key channels. */
  oauth?: ChannelOAuth;
};

/** The keys of a channel set that genuinely block the automation when absent. */
export function requiredEnvKeys(channels: InputChannel[]): string[] {
  return Array.from(
    new Set(channels.flatMap((c) => c.keys.filter((k) => !k.optional).map((k) => k.env))),
  );
}

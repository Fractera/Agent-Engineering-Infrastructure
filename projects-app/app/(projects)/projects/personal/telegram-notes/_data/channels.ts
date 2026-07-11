import type { InputChannel } from "../../../_shared/channels";

// This automation's INPUT CHANNELS (step 219 standard — see _shared/channels.ts).
// Declared from what the code ACTUALLY uses, not from a wish list: the workflow reads
// TELEGRAM_BOT_TOKEN / TELEGRAM_ALLOWED_CHAT_ID, calls OpenAI with OPENAI_API_KEY, and the
// calendar connector needs BOTH Google OAuth values — the case that proves a channel may
// carry more than one key.
export const INPUT_CHANNELS: InputChannel[] = [
  {
    name: "Telegram",
    description:
      "The automation's own bot: it reads the messages you send it (text, voice, photos, locations) and replies in the same chat.",
    keys: [
      { env: "TELEGRAM_BOT_TOKEN", label: "Bot token from @BotFather" },
      {
        env: "TELEGRAM_ALLOWED_CHAT_ID",
        label: "Restrict the bot to one chat id (empty = answer anyone)",
        optional: true,
      },
    ],
  },
  {
    name: "Fractera AI (OpenAI)",
    description:
      "Classifies each message, summarizes notes, reads receipts and photos, and answers questions from memory.",
    keys: [{ env: "OPENAI_API_KEY", label: "OpenAI API key" }],
  },
  {
    name: "Google Calendar",
    description:
      "Optional: mirrors each timed reminder into your calendar. Inert until connected — never blocks the automation.",
    keys: [
      { env: "GOOGLE_OAUTH_CLIENT_ID", label: "Google OAuth client id", optional: true },
      { env: "GOOGLE_OAUTH_CLIENT_SECRET", label: "Google OAuth client secret", optional: true },
    ],
  },
];

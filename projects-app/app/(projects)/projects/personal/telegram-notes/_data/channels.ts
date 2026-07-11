import type { InputChannel } from "../../../_shared/channels";

// This automation's INPUT CHANNELS (step 219 standard, extended step 220 with per-field `help` +
// an OAuth handshake — see _shared/channels.ts). Declared from what the code ACTUALLY uses:
// the workflow reads TELEGRAM_BOT_TOKEN / TELEGRAM_ALLOWED_CHAT_ID, calls OpenAI with OPENAI_API_KEY,
// and the calendar connector needs BOTH Google OAuth values (the case that proves a channel may carry
// more than one key) plus an authorization step. The Settings modal renders this list; each `help`
// line tells the user WHERE to get the value, so the form is self-explaining with no hard-coded hint.
const CAL = "/api/projects/personal/telegram-notes/calendar";

export const INPUT_CHANNELS: InputChannel[] = [
  {
    name: "Telegram",
    description:
      "The automation's own bot: it reads the messages you send it (text, voice, photos, locations) and replies in the same chat.",
    keys: [
      {
        env: "TELEGRAM_BOT_TOKEN",
        label: "Bot token",
        help: "In Telegram, message @BotFather → /newbot → pick a name ending in _bot → copy the token it gives you.",
        secret: true,
      },
      {
        env: "TELEGRAM_ALLOWED_CHAT_ID",
        label: "Allowed chat id",
        help: "Leave empty to answer anyone. To restrict to one chat, message @userinfobot and copy the numeric id.",
        optional: true,
      },
    ],
  },
  {
    name: "Fractera AI (OpenAI)",
    description:
      "Classifies each message, summarizes notes, reads receipts and photos, and answers questions from memory.",
    keys: [
      {
        env: "OPENAI_API_KEY",
        label: "OpenAI API key",
        help: "platform.openai.com → API keys → Create new secret key. One global key powers every automation.",
        secret: true,
        setter: "openai-key",
      },
    ],
  },
  {
    name: "Google Calendar",
    description:
      "Optional: mirrors each timed reminder into your calendar. Inert until connected — never blocks the automation.",
    keys: [
      {
        env: "GOOGLE_OAUTH_CLIENT_ID",
        label: "Google OAuth client id",
        help: "Google Cloud console → APIs & Services → Credentials → OAuth client (Web application). Register the redirect URI shown in the connector.",
        optional: true,
      },
      {
        env: "GOOGLE_OAUTH_CLIENT_SECRET",
        label: "Google OAuth client secret",
        help: "The same OAuth client — copy its client secret.",
        optional: true,
        secret: true,
      },
    ],
    oauth: {
      connectPath: `${CAL}/connect`,
      statusPath: `${CAL}/status`,
      disconnectPath: `${CAL}/disconnect`,
      callbackPath: `${CAL}/callback`,
    },
  },
];

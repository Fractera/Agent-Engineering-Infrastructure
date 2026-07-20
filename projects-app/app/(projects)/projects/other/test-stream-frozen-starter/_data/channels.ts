import type { InputChannel } from "../_types/channels";

// This automation's INPUT CHANNELS (frozen standard — see _shared/channels.ts).
// EMPTY BY DESIGN: a fresh skeleton talks to nothing yet. Declare a channel when the
// automation actually uses it — never before (a declared-but-unused channel is a lie the
// missing-keys modal will nag the user about).
//
// The shape, with the Google Calendar case that proves a channel may need SEVERAL keys:
//
//   export const INPUT_CHANNELS: InputChannel[] = [
//     {
//       name: "Google Calendar",
//       description: "Reads and writes the owner's calendar events.",
//       keys: [
//         { env: "GOOGLE_OAUTH_CLIENT_ID", label: "Google OAuth client id",
//           help: "Google Cloud console → Credentials → OAuth client (Web)." },
//         { env: "GOOGLE_OAUTH_CLIENT_SECRET", label: "Google OAuth client secret",
//           help: "The same OAuth client — copy its secret.", secret: true },
//       ],
//     },
//   ];
export const INPUT_CHANNELS: InputChannel[] = [];

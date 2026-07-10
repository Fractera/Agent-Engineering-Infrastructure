// Use cases (step 207.10 items 4 & 6; extended step 207.16 with the image-linking "editing state",
// point money questions, follow-ups with history, and the "how to update the logic" instruction) —
// plain-language scenarios that replace the abstract "About" text. Each is one thing the owner can
// actually DO with this automation, written as: what you say to the bot → what it does. Rendered as one
// accordion item per scenario (use-cases-accordion.client.tsx). Data only.
export type UseCase = { id: string; title: string; summary: string; steps: string[] };

export const USE_CASES: UseCase[] = [
  {
    id: "save",
    title: "Remember something",
    summary: "Tell the bot a fact and it keeps it for you.",
    steps: [
      "Message the bot, e.g. “remember the wifi password is sunflower42”.",
      "It saves the note (you’ll see it in Records).",
      "Later ask “what’s the wifi password?” and it finds the answer.",
    ],
  },
  {
    id: "remind",
    title: "Set a reminder",
    summary: "Say when, and it pings you at the right time.",
    steps: [
      "Say “remind me to call mom today at 19:00”.",
      "It schedules the reminder (it shows on the Calendar).",
      "At 19:00 the bot messages you.",
    ],
  },
  {
    id: "money-voice",
    title: "Track money by voice",
    summary: "Speak a spend or an income; it files it with a category.",
    steps: [
      "Say “spent 12 on lunch” or “got paid 1000”.",
      "It records the movement in Finances and tags a category.",
      "Everything is grouped as income vs expense.",
    ],
  },
  {
    id: "receipt",
    title: "Digitize a receipt",
    summary: "Send a photo; it reads the amount and files it.",
    steps: [
      "Take a photo of a receipt and send it to the bot.",
      "It reads the total and adds a finance record with the image attached.",
      "Ask for the image back any time with /photo and the record number.",
    ],
  },
  {
    id: "photo-then-words",
    title: "Photo and words — in any order",
    summary: "Send a photo first and the story later (or the other way round) — the bot links them.",
    steps: [
      "Send a photo the bot can’t read an amount from (a dish, a thing you bought) — it keeps the photo and asks for the story.",
      "Then tell it, e.g. “a meat pie for 5.50 at the cafeteria” — the record is created WITH that photo attached.",
      "Or the other way round: record the purchase by voice first, then send the photo with “attach this photo / that same one…” — it attaches to the record.",
      "A bare photo right after a photo-less purchase attaches automatically.",
    ],
  },
  {
    id: "money-question",
    title: "Ask a money question",
    summary: "From “did Petya return the debt?” to a full break-even.",
    steps: [
      "Ask about a specific purchase or person — “how much was the chicken?”, “did Petya return the debt?” — it answers with the actual records (and offers the receipt photo when there is one).",
      "Ask “how much did I spend on food this week?” — it adds it up.",
      "Ask for everything at once — it reports income, expense and the net balance separately.",
      "Ask to balance income vs expense (“help me break even”) — it walks you through period and categories, then shows a dated checklist and the total.",
    ],
  },
  {
    id: "follow-up",
    title: "Follow up on the last answer",
    summary: "The bot remembers the last ~10 messages of the conversation.",
    steps: [
      "After any answer you can say “repeat that in Russian”, “translate it”, “more detail?” — it understands what “it” is.",
      "A pause longer than 15 minutes starts a fresh conversation (old context is not spent on).",
    ],
  },
  {
    id: "return",
    title: "Get something back in the chat",
    summary: "Pull a saved note or receipt image back to Telegram.",
    steps: [
      "Ask in plain words — “show the receipt”, “show the chicken I bought” — it finds the record and sends the photo.",
      "Or send /note followed by the record number to get a saved note’s full text.",
      "Or /photo followed by the number to get a receipt image (plus a clickable link).",
    ],
  },
  {
    id: "beyond",
    title: "Do something beyond the defaults",
    summary: "Ask for a new capability and it shows you how.",
    steps: [
      "Ask for something the automation can’t do yet.",
      "It replies with how to hand your change to a coding agent — see “How to update the logic” below for the full walkthrough.",
    ],
  },
  {
    id: "photo-proof",
    title: "Ask what a saved photo actually shows",
    summary: "Every photo gets its own stored description — answers come from it, never from guessing.",
    steps: [
      "Send a photo (say, a chicken you bought) with or without words — the bot stores what the image shows.",
      "Later ask in ANY language: “was that chicken raw or roasted?”",
      "It answers from the photo’s stored description — and honestly says so when the records don’t specify a detail.",
    ],
  },
  {
    id: "remember-where",
    title: "Remember WHERE it happened",
    summary: "Attach a location once — get a tappable map link whenever you ask “where?”.",
    steps: [
      "After a note or purchase, share a location (attach → Location) or paste a Google Maps link.",
      "The place pins itself to your latest record (or to the next one you make).",
      "Ask “where did I eat those potato-and-meat pies?” — the answer carries a 📍 link that opens the map.",
    ],
  },
  {
    id: "idea-spot",
    title: "Pin an idea to a place",
    summary: "A photo of a great sign or spot + a location = a findable idea on the map.",
    steps: [
      "Snap the sign, add words like “great marketing idea”, and share the location right after.",
      "Photos never carry coordinates in Telegram — if you forget the location, the bot reminds you how to add it.",
      "Ask “where did I see that cool sign?” — you get the note, the photo and the 📍 map link.",
    ],
  },
  {
    id: "place-note",
    title: "Save a whole moment in one message",
    summary: "Photo + words + location — one message becomes one connected record.",
    steps: [
      "Send “wonderful restaurant” with a photo, then share the location.",
      "The note, the image description and the place link into a single record across all storages.",
      "Any later question — what, where, how it looked — pulls the full picture back.",
    ],
  },
  {
    id: "remind-here",
    title: "Set a reminder tied to a place",
    summary: "“Remind me to come back HERE for dinner on Saturday.”",
    steps: [
      "Share a location and say “remind me to come here for dinner next Saturday at 19:00”.",
      "If the time is unclear, the bot asks when exactly.",
      "At the right moment the reminder arrives WITH the 📍 map link — no searching where “here” was.",
    ],
  },
];

// "How to update the logic" (step 207.16; English-only page — step 207.19): the owner's canonical
// walkthrough translated in FULL (nothing shortened — owner requirement). Shown by the button as-is;
// the accordion item carries the fuller step-by-step version plus the automation's real Telegram link.
export const UPDATE_LOGIC_TEXT =
  "Logic updates are performed by coding agents such as Claude Code, Codex and others inside " +
  "Fractera. First find the service page linked to this project, then open the todo list and add " +
  "comments describing how the change should work. After that, in the left column, hover over the " +
  "project name — a rocket icon appears; click it to hand your todo-list notes over to development. " +
  "The coding agent starts working immediately. Note: you must have an active subscription and be " +
  "signed in to the corresponding coding agent — the agent's button at the top must show a green " +
  "indicator. You can then follow the development steps on the Development Steps service page. To " +
  "learn more about how the architecture works, open the Brain tab and ask the Hermes agent — or " +
  "message its Telegram chat.";

// The fuller accordion version — the same canonical text, step by step (nothing dropped, details added).
export const UPDATE_LOGIC_STEPS: string[] = [
  "Logic updates are performed by coding agents such as Claude Code, Codex and others inside Fractera — you do not edit code by hand, you hand the task to an agent.",
  "First find the service page linked to this project (the Continue button at the bottom of this page opens it: Admin → Service → Architecture, focused on this project).",
  "Open the project's todo list and add comments: describe how the new logic should work — the more detail, the more precise the result.",
  "In the left column, hover over the project name — a rocket icon appears. Click it to hand your todo-list notes over to development.",
  "The coding agent starts working immediately.",
  "Note: you must have an active subscription and be signed in to the corresponding coding agent — that agent's button at the top must show a green indicator.",
  "You can follow the development steps on the Development Steps service page.",
  "To learn more about how the architecture works, open the Brain tab and ask the Hermes agent — or message its Telegram chat (link below).",
];

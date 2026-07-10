// Project description shown on the page. Plain data — edit these strings to
// describe the real project; the components never change.
export const PROJECT_DESCRIPTION = {
  title: "Telegram Notes",
  category: "personal",
  // Why this project exists.
  purpose:
    "Free-form personal notes and reminders in Telegram through spoken hook phrases: one phrase turns a message into a saved memory, a date reminder, or an answer recalled from memory.",
  // What is automated.
  automation:
    "Captures your Telegram messages that begin with a registered hook phrase and, without any manual bookkeeping, files each one as a note, a scheduled reminder, or a memory lookup — then replies in the chat.",
  // How the automation works.
  how:
    "A hook phrase you send in Telegram is detected from its first words, summarized by a cheap model, and saved to the project database plus LightRAG vector memory; \"remind me …\" schedules a date push, and \"what did I save about …\" runs a semantic search — each outcome is answered back in the same chat.",
} as const;

// The "About this project" accordion (step 188) was replaced by the plain-language Use-cases accordion
// (step 207.10 items 4 & 6) — see _data/use-cases.ts. PROJECT_DESCRIPTION above still names the page.

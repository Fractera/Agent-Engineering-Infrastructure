// Map a hook action to the record type shown as a colored badge in the results table
// (step 188 Phase 3). Pure module — imported by both the server endpoint and the client
// table. "record" = a saved note (save), "reminder" = a date reminder (remind),
// "request" = a memory query (recall).
export type NoteType = "record" | "reminder" | "request" | "other";

export function noteType(hookAction: string): NoteType {
  if (hookAction === "save") return "record";
  if (hookAction === "remind") return "reminder";
  if (hookAction === "recall") return "request";
  return "other";
}

export const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  record: "Record",
  reminder: "Reminder",
  request: "Request",
  other: "Other",
};

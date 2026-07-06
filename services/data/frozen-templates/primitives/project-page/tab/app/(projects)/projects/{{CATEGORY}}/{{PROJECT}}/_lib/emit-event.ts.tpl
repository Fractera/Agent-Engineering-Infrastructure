import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

// Inter-automation pub/sub emitter (ontology §D, step 195). A workflow step of an Action with an
// `emits` calls this to PUBLISH a named event: it appends to the substrate automation_events queue
// (the fractera-cron dispatcher drains it and fires every subscriber's /run), records the touch on
// the subject's append-only history, and — when a target status is given — moves the subject's
// status through its declared state machine (canTransition, _data/subject.ts). Fire-and-forget:
// the publisher never names a target automation; 0..N automations may subscribe to the event name.
//
// This is the ONE way an automation hands work to another — never copy a row between tables.

const THIS_AUTOMATION = "{{CATEGORY}}/{{PROJECT}}";

export type EmitInput = {
  event: string; // the published event name (matches subscribers' events.json)
  subjectId?: string; // the shared subject this event is about (id only travels — §D)
  toStatus?: string; // optional Subject status to move to (must be a declared transition)
  payload?: Record<string, unknown>; // free-form context stored on the history row
};

// Ensure a subject row exists (upsert by id) — an automation may be the FIRST to see a subject.
export function upsertSubject(input: {
  id: string;
  kind: string;
  status?: string;
  attributes?: Record<string, unknown>;
}): void {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO subjects (id, kind, status, owner_automation, attributes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       kind = excluded.kind, owner_automation = excluded.owner_automation, updated_at = excluded.updated_at`,
  ).run(
    input.id,
    input.kind,
    input.status ?? "",
    THIS_AUTOMATION,
    JSON.stringify(input.attributes ?? {}),
    now,
    now,
  );
}

// Publish an event. Best-effort on the subject side (a missing subject never blocks the publish);
// the automation_events insert is what actually hands work over.
export function emitEvent(input: EmitInput): void {
  const now = Math.floor(Date.now() / 1000);
  if (input.subjectId && input.toStatus) {
    // Move the subject's status (the state-machine guard lives in _data/subject.ts at author time;
    // here we simply record the transition the Action declared).
    db.prepare(`UPDATE subjects SET status = ?, updated_at = ? WHERE id = ?`).run(
      input.toStatus,
      now,
      input.subjectId,
    );
  }
  if (input.subjectId) {
    db.prepare(
      `INSERT INTO subject_events (id, subject_id, event, from_automation, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      input.subjectId,
      input.event,
      THIS_AUTOMATION,
      JSON.stringify(input.payload ?? {}),
      now,
    );
  }
  db.prepare(
    `INSERT INTO automation_events (id, event, subject_id, from_automation, payload, published_at, dispatched)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
  ).run(
    randomUUID(),
    input.event,
    input.subjectId ?? "",
    THIS_AUTOMATION,
    JSON.stringify(input.payload ?? {}),
    now,
  );
}

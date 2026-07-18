// THE ENTITY SECTION MANIFEST (step 254.1, ROUTE-V3 law 2) — the ONE shape every page entity declares.
//
// `presence` is a single ENUM, never two booleans: "expanded" (on the page, open), "collapsed" (on the
// page, folded into its accordion), "hidden" (not rendered). Two booleans could express the contradictory
// "hidden but expanded"; the enum makes the invalid state unrepresentable (owner's ruling, 2026-07-18).
//
// TWO TRUTHS, TWO HOMES (never mixed): the manifest carries the CODE DEFAULT an automation is born with;
// the owner's runtime choice lives in his settings (the step-237 live store) and WINS. resolvePresence()
// is the one place the two meet.

export type EntityPresence = "expanded" | "collapsed" | "hidden";

export type EntitySectionManifest = {
  /** The entity id — MUST equal the architecture-bundle entity id (dashboard / calendar / cron / …),
   *  so warnings, summaries, briefs and UI sections speak one vocabulary. */
  id: string;
  /** Render rank among the page's sections (the owner's drag-order override wins at runtime). */
  order: number;
  /** The presence this entity is BORN with — the code default only. */
  presence: EntityPresence;
};

/** The owner's runtime override, layered over the manifest default.
 *  - `boolean` — the existing step-237 visibility switch: `false` → hidden; `true` → the manifest's own
 *    default (the switch only says "show it", the manifest still decides open vs folded).
 *  - `EntityPresence` — a full tri-state override (the future settings upgrade writes these directly).
 *  - `undefined`/`null` — no override: the manifest default stands. */
export function resolvePresence(
  manifest: Pick<EntitySectionManifest, "presence">,
  override?: boolean | EntityPresence | null,
): EntityPresence {
  if (override === undefined || override === null) return manifest.presence;
  if (override === false) return "hidden";
  if (override === true) return manifest.presence === "hidden" ? "collapsed" : manifest.presence;
  return override;
}

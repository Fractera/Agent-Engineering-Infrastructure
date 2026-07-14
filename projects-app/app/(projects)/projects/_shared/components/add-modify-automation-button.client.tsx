"use client";

// RETIRED (step 241 E3.1, owner's requirement).
//
// This was the "Add or modify automation" button under a project's title and description (step 220): it
// opened a dialog explaining that changes are requested through the Architecture page's to-do list. The owner
// asked for it to go, and the product no longer needs it:
//   • development is launched in exactly ONE place — the development-wave banner (step 240),
//   • the automation is designed in the diagram's Builder and in the entity panels (steps 224 / 238 / 239),
//   • and the "amend a brief that was already sent" path — the Architecture page's to-do list — is exactly
//     what the wave's LOCK modal already offers, at the moment it is actually relevant.
//
// It renders NOTHING, deliberately, instead of being deleted: a project's page is GENERATED code, and every
// automation created before this change still imports this component. Emptying it removes the button from
// those pages too — deleting the file would break their build. New pages (skeleton v8+) no longer import it.
export function AddModifyAutomationButton(_props: { category: string; slug: string }) {
  return null;
}

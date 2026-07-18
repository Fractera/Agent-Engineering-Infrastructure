"use client";

import type { UseCase } from "../../use-cases";
import { UseCasesPanel } from "../../components/use-cases-panel.client";
import { UseCasesListView } from "./view/list";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// the CONTAINER is the ONLY place view and admin compose; never import another entity.
//
// THE USE CASES ENTITY CONTAINER (step 254.8):
//   mode="view"  — the read-only FAQ list (number + title + summary + status badge);
//   mode="admin" — the full owner panel (pencils, delete, the Quiz, the review gate machinery) —
//                  the existing UseCasesPanel, unchanged (its review gate stays mandatory, step 231).
export type UseCasesMode = "view" | "admin";

export function UseCasesEntity({
  automation, cases, mode,
}: { automation?: string; cases: UseCase[]; mode: UseCasesMode }) {
  if (mode === "view") {
    return (
      <div className="space-y-3" data-entity-mode="view" data-entity-section="usecases">
        <UseCasesListView automation={automation} seed={cases} />
      </div>
    );
  }
  return (
    <div className="space-y-3" data-entity-mode="admin" data-entity-section="usecases">
      <UseCasesPanel cases={cases} automation={automation} />
    </div>
  );
}

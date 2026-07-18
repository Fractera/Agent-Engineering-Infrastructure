"use client";

import type { DashboardConfig } from "../../table-config";
import type { UseCase } from "../../use-cases";
import { AppPagesPanel } from "../../components/app-pages-panel.client";
import { AppPagePreview } from "../../components/app-page-preview.client";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3): the container composes only; never import another entity
// directly — the page preview is a BASE-LAYER composition (components/app-page-preview.client.tsx),
// which is the one kind of file allowed to assemble several entities' view cores.
//
// THE APPLICATION PAGES ENTITY CONTAINER (step 254.8d, owner's spec):
//   mode="view"  — the page-stub PREVIEW: hero → framed AI request console → the table → the use cases
//                  as a Q&A accordion (the format of a future public page — never a hole);
//   mode="admin" — the owner's declaration panel (folders, Add page, per-page to-dos) + the same preview
//                  below it, so the owner always sees what the format looks like.
export function AppPagesEntity({
  automation, dashboard, cases, mode,
}: { automation: string; dashboard?: DashboardConfig; cases: UseCase[]; mode: "view" | "admin" }) {
  if (mode === "view") {
    return (
      <div className="space-y-3" data-entity-mode="view" data-entity-section="apppages">
        <AppPagePreview automation={automation} dashboard={dashboard} cases={cases} />
      </div>
    );
  }
  return (
    <div className="space-y-4" data-entity-mode="admin" data-entity-section="apppages">
      <AppPagesPanel automation={automation} />
      <AppPagePreview automation={automation} dashboard={dashboard} cases={cases} />
    </div>
  );
}

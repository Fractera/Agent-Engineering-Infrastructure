"use client";

import { useEffect, useState } from "react";
import { adminBase } from "@/lib/runtime-urls";
import { projectTabStrings } from "../_data/tab-i18n";

// A PROMINENT continuation link right under the description (step 195): most people never find the
// footer icon, so the same "continue development" destination — the architecture cockpit focused on
// THIS project — is surfaced as a plain text link at the top. Same target as the footer SquarePen
// icon (/service/architecture?project=<cat>/<project>). Client-side because the admin host is derived
// from window.location (adminBase) so both IP and domain modes work with one build; the anchor stays
// inert until mount (no hydration mismatch), which is fine — this is an architect-only cockpit link.
export function ContinueBanner({ lang }: { lang: string }) {
  const [admin, setAdmin] = useState("");
  useEffect(() => {
    setAdmin(adminBase());
  }, []);
  const t = projectTabStrings(lang);
  const en = projectTabStrings("en");
  // EN fallback by key — the two banner strings are authored for EN/RU; other languages reuse EN.
  const lead = t.continueLead ?? en.continueLead ?? "";
  const linkWord = t.continueLinkWord ?? en.continueLinkWord ?? "";
  const href = admin
    ? `${admin}/service/architecture?project={{CATEGORY}}/{{PROJECT}}`
    : undefined;

  return (
    <p className="rounded-md border border-dashed bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
      {lead}{" "}
      {href ? (
        <a href={href} className="font-medium text-foreground underline underline-offset-4">
          {linkWord}
        </a>
      ) : (
        <span className="font-medium">{linkWord}</span>
      )}
      .
    </p>
  );
}

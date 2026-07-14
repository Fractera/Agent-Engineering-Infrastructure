"use client";

// REMOVED by owner (step 241): the frozen-skeleton blurb ("This is a frozen automation skeleton…") no longer
// appears on any automation page. The component is kept as a NO-OP rather than deleted because pages generated
// before this step still import it — emptying it here removes the blurb from every EXISTING page too, not only
// from freshly created ones (the same "neuter, don't delete" move used for the old "Add or modify" button, so
// already-generated pages keep compiling). The block was also removed from the starter template, so new pages
// never include it.
export function SkeletonIntro(_props: { automation: string; children: React.ReactNode }) {
  return null;
}

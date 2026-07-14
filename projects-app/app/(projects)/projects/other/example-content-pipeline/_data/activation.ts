import type { ActivationSchema } from "../../../_shared/activation";

// THIS AUTOMATION'S ACTIVATION (step 241 E3) — what ONE run of it takes.
//
// It is an INSTANCED automation: every run is a fork with its own settings. These four keys are exactly what
// its nodes ask for by name (find-sources' `topic`/`count`, publish's `slug`/`publishAt`), which is the whole
// wiring: the executor puts these into the run's context bag, and each node's functions pull their arguments
// out of it by the names their `paramsIn` declare.
//
// This file is what a coding agent writes when it designs an instanced automation's fork activation. The
// launch control panel renders itself from it — no UI is written per automation.
export const ACTIVATION: ActivationSchema = {
  title: "Publish an article",
  description: "One run researches a topic, drafts an article from real sources, and publishes it.",
  params: [
    {
      key: "topic",
      label: "Topic (the keyword to research)",
      type: "text",
      required: true,
      help: "The keyword this run is about — it decides which sources are found, e.g. \"cats\".",
    },
    {
      key: "count",
      label: "How many sources to use",
      type: "number",
      required: true,
      default: 5,
      help: "The upper bound; duplicates are dropped, so a run may end up with fewer.",
    },
    {
      key: "slug",
      label: "URL slug of the published page",
      type: "text",
      required: true,
      help: "Lower-case, dashes instead of spaces, e.g. \"cats-article\".",
    },
    {
      key: "publishAt",
      label: "Publish at",
      type: "datetime",
      help: "Leave empty to publish immediately. This is a PARAMETER of this automation — the product does not impose any schedule of its own.",
    },
  ],
};

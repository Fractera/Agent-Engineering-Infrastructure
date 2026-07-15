import type { ActivationSchema } from "../../../_shared/activation";

// THIS AUTOMATION'S ACTIVATION (step 243) — what ONE ask takes. It is a STREAM automation: no fork, no
// instance — the launch console (generalized in step 243) POSTs this single param straight to
// /api/projects/run and shows the result inline. The key below is exactly what the "parse-request" node's
// first function expects by name (its `paramsIn`) — that is the whole wiring, same contract as instanced.
export const ACTIVATION: ActivationSchema = {
  title: "Ask for a stock price",
  description: "Name a public company (e.g. \"how much is Apple stock\") and get its current price.",
  params: [
    {
      key: "query",
      label: "Your question",
      type: "longtext",
      required: true,
      help: "Type or speak a company name — e.g. Apple, Tesla, SpaceX.",
    },
  ],
};

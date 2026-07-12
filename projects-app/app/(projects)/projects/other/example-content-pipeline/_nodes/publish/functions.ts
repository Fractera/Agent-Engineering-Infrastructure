import type { NodeFunction } from "../../../../_shared/node-contract";

// Deterministic functions of "publish" (step 223.C.2) — all application code, no AI.
export const FUNCTIONS: NodeFunction[] = [
  {
    name: "createSitePage",
    paramsIn: { article: "Article", slug: "string" },
    returns: "{ pageId: string }",
    rules: ["deterministic; no AI inside the app"],
  },
  {
    name: "schedulePublication",
    paramsIn: { pageId: "string", publishAt: "ISODate" },
    returns: "{ jobId: string }",
  },
  {
    name: "publishNow",
    paramsIn: { pageId: "string" },
    returns: "{ url: string; publishedAt: ISODate }",
  },
];

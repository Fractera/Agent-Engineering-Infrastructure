import type { NodeMeta } from "../../../../_shared/node-contract";

// Node "publish" — co-located (step 223.C.2). The last step of the article process.
export const META: NodeMeta = {
  id: "publish",
  cuid: "cxa3publish0baselinevers1",
  name: "Publish the article",
  description: "Creates the site page and publishes the finished article on its scheduled date.",
  in: { article: "Article", slug: "string", publishAt: "ISODate" },
  out: { url: "string", publishedAt: "ISODate" },
  conditions: ["publishAt is in the future", "the article passed the previous nodes"],
  run: "sequential",
};

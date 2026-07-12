import { randomBytes } from "node:crypto";

// Cuid-style collision-resistant id (step 224, Builder mode). The owner asked for CUID instead of a UUID
// because weak models mangle the UUID format (hyphen groups) and recursively raise the error rate. This is
// a DEPENDENCY-FREE cuid-style generator (not the @paralleldrive/cuid2 package — kept zero-dep like the
// auto-layout, and to avoid a cross-environment install step): a leading letter + base36 time + a per-call
// counter + random entropy, all lowercase alphanumeric. Letter-first (never all-digits, safe as an
// identifier) and hyphen-free, so an LLM can echo it without the UUID pitfalls. Collision-resistant enough
// for per-automation node identity (the join key for the DB canvas index + version history).
let counter = Math.floor(Math.random() * 0xffffff);

export function createNodeId(): string {
  const time = Date.now().toString(36);
  const count = (counter++ & 0xffffff).toString(36);
  const rand = randomBytes(8).toString("hex"); // 16 lowercase hex chars
  return `c${time}${count}${rand}`;
}

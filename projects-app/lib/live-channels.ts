import { stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

// LIVE CHANNELS (263.1 round 7, owner's finding) — read an automation's _data/channels.ts FROM DISK.
//
// The root cause this fixes (proven live on automation-q86vo): the Settings modal's channels come as a
// build-time prop (the page imports _data/channels.ts at `next build`). The coding agent DECLARES the
// Telegram channel during development — on disk, through the gated apply — but the served page still
// carries the old (empty) import, so the "enter your bot token" field never appears until a full
// rebuild. Same disk↔canvas split as the 263.1 meta.ts finding, now on the credentials path where it
// blocks the owner outright.
//
// Approach: bundle channels.ts with esbuild (the compileNode pattern — the _types import is type-only
// and drops out) into the OS temp dir, import it with an mtime cache-bust, hand back INPUT_CHANNELS.
// Best-effort by contract: any failure returns null and the caller keeps the build-time seed.
export type LiveChannelKey = { env: string; label: string; help?: string; secret?: boolean };
export type LiveChannel = { name: string; description?: string; keys: LiveChannelKey[] };

export async function readLiveChannels(projectDir: string): Promise<LiveChannel[] | null> {
  const entry = join(projectDir, "_data", "channels.ts");
  let mtime: number;
  try {
    mtime = (await stat(entry)).mtimeMs;
  } catch {
    return null; // no channels.ts — nothing declared
  }
  const outfile = join(
    tmpdir(),
    `fractera-channels-${projectDir.replace(/[^a-z0-9]/gi, "_")}.mjs`,
  );
  try {
    const esbuild = await import("esbuild");
    await esbuild.build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      target: "node20",
      sourcemap: false,
      logLevel: "silent",
      alias: { "@": process.cwd() },
      external: ["better-sqlite3"],
    });
    // An indirect import defeats the app bundler's static analysis (the node-compile.ts lesson —
    // a direct dynamic import silently failed inside the built Next server, proven live round 7).
    const importer = new Function("u", "return import(u)") as (u: string) => Promise<{ INPUT_CHANNELS?: unknown }>;
    const mod = await importer(`${pathToFileURL(outfile).href}?v=${mtime}`);
    const list = mod.INPUT_CHANNELS;
    if (!Array.isArray(list)) return null;
    // Shape-check defensively: the file is agent-authored.
    return list
      .filter((c): c is LiveChannel => Boolean(c && typeof (c as LiveChannel).name === "string"))
      .map((c) => ({
        name: c.name,
        description: typeof c.description === "string" ? c.description : undefined,
        keys: Array.isArray(c.keys)
          ? c.keys.filter((k): k is LiveChannelKey => Boolean(k && typeof k.env === "string" && typeof k.label === "string"))
          : [],
      }));
  } catch {
    return null;
  }
}

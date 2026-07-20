import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { authorize, resolveProject } from "@/lib/nodes";
import { buildProjection } from "@/lib/projection";

// THE OWNER'S DOWNLOAD DOOR (owner 2026-07-20) — "покажи, что именно уходит агенту".
//
// The owner cannot audit a hand-off he cannot see: the room lives on the server, in a folder he never
// opens, and the task text lives inside a dialog. This route answers the whole question in one file — it
// streams the room back as a ZIP with the agent's task text on top as _TASK.txt.
//
// IT OBSERVES, IT DOES NOT REBUILD (see the guard in GET): an existing room is archived exactly as it
// stands, so pressing the button mid-session is safe and, better, shows what the agent has written so far.
//
// LOOKING IS NOT LAUNCHING. This route deliberately does NOT pass launchGate: the gates (confirmed use
// cases, stub nodes, wave lock) decide whether DEVELOPMENT may start, not whether the owner may read his
// own automation. Nothing here is written to the automation and no development is started.
//
// NO DEPENDENCY: the archive is written by hand, STORED (no compression). A zip is a flat sequence of
// [local header + bytes] followed by a central directory — ~60 lines, and it spares the platform a new
// npm package for one button. Text files are small; compression would buy little.
export const runtime = "nodejs";

type Entry = { name: string; body: Buffer; crc: number };

// CRC-32 by hand rather than node:zlib's crc32 — that export only exists from Node 20.12/22, and this
// platform must not depend on the exact runtime a given server happens to have installed.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const DOS_TIME = (d: Date) =>
  ((d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2))) & 0xffff;
const DOS_DATE = (d: Date) =>
  (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;

function zip(entries: Entry[]): Buffer {
  const now = new Date();
  const time = DOS_TIME(now);
  const date = DOS_DATE(now);
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8 names
    local.writeUInt16LE(0, 8); // method: stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(e.crc, 14);
    local.writeUInt32LE(e.body.length, 18);
    local.writeUInt32LE(e.body.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    locals.push(local, name, e.body);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); // central directory signature
    dir.writeUInt16LE(20, 4); // version made by
    dir.writeUInt16LE(20, 6); // version needed
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(time, 12);
    dir.writeUInt16LE(date, 14);
    dir.writeUInt32LE(e.crc, 16);
    dir.writeUInt32LE(e.body.length, 20);
    dir.writeUInt32LE(e.body.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30); // extra
    dir.writeUInt16LE(0, 32); // comment
    dir.writeUInt16LE(0, 34); // disk
    dir.writeUInt16LE(0, 36); // internal attrs
    dir.writeUInt32LE(0, 38); // external attrs
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);

    offset += 30 + name.length + e.body.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, end]);
}

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const automation = (req.nextUrl.searchParams.get("automation") ?? "").trim();
  // The task text the console already holds is passed back in, so the archive shows the OWNER the exact
  // words his agent got — not a second rendering that could drift from it.
  const task = req.nextUrl.searchParams.get("task") ?? "";

  // ⚠ NEVER REBUILD A ROOM THAT EXISTS. buildProjection() starts with `rm -rf <room>` and re-copies from
  // the sources — so rebuilding while an agent is working there DESTROYS everything it has authored but
  // not yet applied (its TARGET-GRAPH.md, half-written functions). This button is an OBSERVER: it archives
  // the room AS IT IS. Only when no room exists yet (the owner audits before any hand-off) does it build
  // one — there is nothing to lose in that case.
  const proj = resolveProject(automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const room = join(process.cwd(), "..", "agent-rooms", proj.category, proj.slug);

  let root = room;
  let built = false;
  if (!(await exists(room))) {
    const projection = await buildProjection(automation);
    if (!projection.ok) return NextResponse.json({ error: projection.error }, { status: 400 });
    root = projection.root;
    built = true;
  }

  const files = await walk(root);
  let bytes = 0;
  for (const f of files) bytes += (await stat(f)).size;
  const entries: Entry[] = [];

  const header =
    `КОМНАТА АГЕНТА — ${automation}\n` +
    `Снято: ${new Date().toISOString()}\n` +
    (built
      ? `Состояние: комнаты не было, собрана заново из исходников (работы агента в ней ещё нет).\n`
      : `Состояние: СНИМОК ЖИВОЙ КОМНАТЫ как она есть сейчас — включая всё, что агент уже написал.\n`) +
    `Файлов: ${files.length}   Байт: ${bytes}   Примерно токенов: ${Math.round(bytes / 4)}\n` +
    `Путь на сервере: ${root}\n\n` +
    `Это ровно то, что видит агент-программист: документы-законы, исходники узлов, типы, api-двери.\n` +
    `Скомпилированные модули (*.compiled.mjs) сюда не входят — они рантайм-истина и комнату не покидают.\n` +
    `\n${"=".repeat(78)}\nЗАДАНИЕ, КОТОРОЕ ПОЛУЧАЕТ АГЕНТ\n${"=".repeat(78)}\n\n` +
    (task || "(в этот момент задание ещё не выдано — комната собрана для осмотра)");
  const headerBuf = Buffer.from(header, "utf8");
  entries.push({ name: "_TASK.txt", body: headerBuf, crc: crc32(headerBuf) });

  for (const full of files) {
    const body = await readFile(full);
    entries.push({
      name: relative(root, full).split(sep).join("/"),
      body,
      crc: crc32(body),
    });
  }

  const archive = zip(entries);
  const filename = `${automation.replace(/\//g, "-")}-room.zip`;
  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(archive.length),
      "Cache-Control": "no-store",
    },
  });
}

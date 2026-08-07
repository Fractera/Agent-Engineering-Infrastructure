import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { requireAuth } from "@/lib/require-auth";
import { BACKUP_PARTS } from "@/lib/backup-parts";

// GET ?parts=db,files,knowledge,config — build the archive from the chosen parts.
// With no `parts` the defaults are used, so an old link or script still works.
export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("parts");
  const wanted = raw
    ? new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))
    : new Set(BACKUP_PARTS.filter((p) => p.defaultOn).map((p) => p.id));

  try {
    const zip = new AdmZip();
    const included: string[] = [];

    for (const part of BACKUP_PARTS) {
      if (!wanted.has(part.id)) continue;
      let added = false;
      for (const p of part.paths) {
        if (!fs.existsSync(p.from)) continue;
        if (p.dir) {
          // Recursive on purpose: the previous version copied only the top level,
          // so anything inside a subfolder was silently left out of the backup.
          zip.addLocalFolder(p.from, p.to);
        } else {
          zip.addLocalFile(p.from, path.dirname(p.to) === "." ? "" : path.dirname(p.to), path.basename(p.to));
        }
        added = true;
      }
      if (added) included.push(part.id);
    }

    // A note travelling with the archive, so a year from now its contents are not
    // a guess — and so import knows what it is looking at.
    zip.addFile("fractera-backup.json", Buffer.from(JSON.stringify({
      createdAt: new Date().toISOString(),
      parts: included,
      note: "Restore this archive from Admin -> Import data. Map data is never included: the map panel re-downloads its region.",
    }, null, 2)));

    const date = new Date().toISOString().slice(0, 10);
    const buf = zip.toBuffer();

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="fractera-backup-${date}.zip"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

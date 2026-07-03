import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { readSlotRouteMeta } from "@/lib/slot-meta"

// Runtime route manifest for the /service/architecture page. In the slot this was a
// build-time static import (routes.generated.ts) bundled into the client; the admin
// app cannot statically import a foreign, swappable slot's _meta.ts, so the client
// fetches the descriptors from here — read live from the slot filesystem via slot-meta
// (keyed by URL path). Degrades to {} when the slot is empty/absent.
export async function GET(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const meta = await readSlotRouteMeta()
  return NextResponse.json({ meta })
}

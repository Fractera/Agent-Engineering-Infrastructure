import { NextResponse } from "next/server"
import { listSteps, type Step } from "@/lib/dev-steps/step-file"

// One filesystem snapshot for the live-polling /development-steps list, mirroring
// the architecture signature route (step 106/108). Scans DEVELOPMENT-STEPS/ (no DB)
// and returns the full new + completed steps plus a per-step signature (importance
// + task count + file mtime) so the client blinks ONLY the step that changed —
// a new step, an importance change, or an edited task all flip the signature.
function sig(s: Step): string {
  return `${s.importance}:${s.tasks.length}:${s.completedAt ?? ""}:${s.mtime}`
}

export async function GET() {
  const { new: news, completed } = await listSteps()
  const signature: Record<string, string> = {}
  for (const s of [...news, ...completed]) signature[s.id] = sig(s)
  return NextResponse.json({ new: news, completed, signature })
}

import { NextRequest, NextResponse } from "next/server";
import { automationModel, runDevelop, tryAcquireDevelop, releaseDevelop, type DevelopEvent } from "@/lib/develop";
import { authorize, resolveProject } from "@/lib/nodes";
import { modelSupportsTools } from "@/lib/openai-model-caps";
import { openAiKey } from "@/lib/quiz";
import { launchGate } from "@/lib/wave";

// THE DEVELOP RUN (step 250) — the "Запустить разработку" button POSTs here and the in-product agent
// builds the staged items live. Every refusal happens BEFORE the stream starts, as ordinary JSON with the
// reason codes the launch dialog already speaks (plus the three new ones: no-key / model-no-tools /
// already-running) — so the client branches on Content-Type: JSON = a gate, event-stream = a run.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; force?: boolean } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  // `force` (owner 2026-07-19): the dialog's "launch anyway" — the stub-node check becomes advisory.
  const gate = await launchGate(proj.automation, { force: body?.force === true });
  if (!gate.ok) {
    return NextResponse.json(
      gate.nodes ? { reason: gate.reason, nodes: gate.nodes } : { reason: gate.reason },
      { status: 409 },
    );
  }
  if (!openAiKey()) return NextResponse.json({ reason: "no-key" }, { status: 409 });
  const { model } = automationModel(proj.slug);
  if (!modelSupportsTools(model)) {
    return NextResponse.json({ reason: "model-no-tools", model }, { status: 409 });
  }
  if (!tryAcquireDevelop(proj.automation)) {
    return NextResponse.json({ reason: "already-running" }, { status: 409 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: DevelopEvent) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch { /* closed */ }
      };
      try {
        // Closing the modal aborts req.signal → the loop stops between turns/tools (a started tool
        // finishes — each is atomic per-object), and the lock is released below either way.
        await runDevelop(proj, model, gate.items, req.signal, send);
      } catch (e) {
        send({ type: "error", code: `run-failed: ${e}` });
      } finally {
        releaseDevelop(proj.automation);
        try { controller.enqueue(encoder.encode("data: [DONE]\n\n")); } catch { /* closed */ }
        try { controller.close(); } catch { /* closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

import { type NextRequest } from "next/server";
import { authorize } from "@/lib/nodes";
import {
  autoMessages,
  defaultLanguage,
  openAiKey,
  type Turn,
} from "@/app/(projects)/projects/_shared-v2/components/use-cases/server/quiz-brain";

// v2-QUIZ КЕЙСОВ — АВТОКВИЗ (стрим). Модель описывает сценарии вслух, потоково; владелец читает вживую,
// может редактировать текст, а из него потом синтезируются кейсы. SSE: `data: {"delta":"..."}` → `[DONE]`.
// Stateless: seed-инструкция и разговор приходят от клиента.
export const runtime = "nodejs";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return new Response("forbidden", { status: 403 });
  const body = (await req.json().catch(() => null)) as { instruction?: string; turns?: Turn[] } | null;
  const key = openAiKey();
  if (!key) return new Response("OPENAI_API_KEY is not set", { status: 400 });

  const messages = autoMessages(defaultLanguage(), body?.instruction ?? "", body?.turns ?? []);
  const upstream = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.5, stream: true }),
  });
  if (!upstream.ok || !upstream.body) return new Response(`OpenAI ${upstream.status}`, { status: 502 });

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const s = line.trim();
            if (!s.startsWith("data:")) continue;
            const payload = s.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
              const delta = j.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            } catch { /* partial frame */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
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

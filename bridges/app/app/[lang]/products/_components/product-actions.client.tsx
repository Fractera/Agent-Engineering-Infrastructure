"use client";

// Действия шапки продукта: публикация и переход фазы (2026-08-18).
//
// Островок ради двух нажатий. Слова приходят с сервера пропсами: словарь панели —
// 82 языка, ему в браузере не место.
//
// 🔒 ПУБЛИКАЦИЯ И ФАЗА — РАЗНЫЕ КНОПКИ, И ЭТО НЕ ДУБЛИРОВАНИЕ. Продукт бывает
// завершён и никому не показан; свести их в одну означало бы, что «готово»
// автоматически значит «покажите миру», чего никто не заказывал.
//
// 🔒 В АНАЛИЗ ПЕРЕВОДИТ ЧЕЛОВЕК. Остальные фазы система считает по данным досье —
// есть кейсы, есть шаги, закрыты ли они. «Мы изучаем результат» вывести из файлов
// неоткуда, поэтому кнопка одна и она здесь.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ProductActions(
  { productId, published, canAnalyse, labels }: {
    productId: string;
    published: boolean;
    /** Переход в анализ предлагается, только когда работа действительно закрыта. */
    canAnalyse: boolean;
    labels: {
      publish: string; unpublish: string; publishedYes: string; publishedNo: string;
      toAnalysis: string; phaseMoved: string; phaseFailed: string; saving: string; failed: string;
    };
  },
) {
  const router = useRouter();
  const [busy, setBusy] = useState<"publish" | "phase" | null>(null);

  async function send(op: string, payload: Record<string, unknown>, done: string) {
    setBusy(op === "publish" ? "publish" : "phase");
    try {
      const res = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ op, productId, ...payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      toast.success(done);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={published ? "outline" : "default"}
        disabled={busy !== null}
        onClick={() => send("publish", { published: !published }, published ? labels.publishedNo : labels.publishedYes)}
      >
        {busy === "publish" ? <Loader2 size={13} className="animate-spin" />
          : published ? <EyeOff size={13} /> : <Eye size={13} />}
        {published ? labels.unpublish : labels.publish}
      </Button>

      {canAnalyse && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => send("phase", { phase: "analysis" }, labels.phaseMoved)}
        >
          {busy === "phase" ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
          {labels.toAnalysis}
        </Button>
      )}
    </div>
  );
}

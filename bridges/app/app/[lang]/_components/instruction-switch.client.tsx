"use client";

// Выключатель одной инструкции (2026-08-10).
//
// Один островок на все места: карта документов и страница самого документа.
// Второй экземпляр этой логики разошёлся бы с первым при первой же правке.
//
// 🔒 ЧТО ОБЯЗАН СКАЗАТЬ КАЖДЫЙ ЩЕЛЧОК. Инструкция уезжает в контекст агента ОДИН
// раз, на входе в сессию. Переключатель, щёлкнутый посреди работы, НЕ отменяет
// того, что агент уже прочитал: в полной мере он вступает в силу со следующей
// сессии. Без этой фразы владелец решит, что механизм не работает.
//
// Второе, что обязан сказать щелчок: правка сделана на СЕРВЕРЕ. Чтобы она
// доехала до машины владельца, нужны «Отправить» в подвале и `git pull` у себя.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export type InstructionSwitchLabels = {
  on: string; off: string;
  effect: string; delivery: string;
  failed: string;
  instructionAdded: string; instructionMissing: string;
  docCreated: string;
  /** Возможность ещё не открыта — сообщение вместо включения. */
  inDevelopment: string;
};

export function InstructionSwitch(
  { docKey, enabled, labels, srLabel }:
  { docKey: string; enabled: boolean; labels: InstructionSwitchLabels; srLabel: string },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    setOn(next);
    try {
      const res = await fetch("/api/config/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: docKey, enabled: next }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      // Отказ «возможность ещё не открыта» — НЕ ошибка, и красным его показывать
      // нельзя: владелец не сделал ничего неправильного, он спросил, работает ли
      // это. Отвечаем сообщением и возвращаем тумблер на место.
      if (res.status === 409 && data?.error === "in_development") {
        setOn(!next);
        toast.info(labels.inDevelopment, { duration: 10000, closeButton: true });
        return;
      }

      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));

      // Одно уведомление с двумя фразами, которые владелец обязан прочитать:
      // когда это подействует и как довезти до своей машины.
      toast.success(next ? labels.on : labels.off, {
        description: `${labels.effect} ${labels.delivery}`,
        duration: 12000,
        closeButton: true,
      });

      if (Array.isArray(data.created) && data.created.length > 0) {
        toast.info(labels.docCreated, { duration: 10000 });
      }
      const ins = data.instruction as { ok: boolean; added: boolean } | undefined;
      if (ins && !ins.ok) toast.error(labels.instructionMissing, { duration: 12000 });
      else if (ins?.added) toast.info(labels.instructionAdded, { duration: 12000 });

      startTransition(() => router.refresh());
    } catch (e) {
      setOn(!next);
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {busy && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
      <Switch checked={on} disabled={busy} onCheckedChange={toggle} aria-label={srLabel} />
    </span>
  );
}

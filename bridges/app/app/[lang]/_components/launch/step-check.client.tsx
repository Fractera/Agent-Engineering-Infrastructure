"use client";

// ДЕЙСТВИЕ ШАГА, ЗАКРЫВАЕМОГО ЧЕЛОВЕКОМ (28-23, 2026-08-27).
//
// 🔒 ТРЕТИЙ ВИД ДЕЙСТВИЯ ПУТИ, И ОН НУЖЕН ИМЕННО ТРЕТЬИМ. Форма (`StepForm`)
// сохраняет введённое; кнопка проверки (`VerifyStep`) спрашивает сервер; здесь
// человек СООБЩАЕТ факт, который панель проверить не может. Втиснуть это в форму
// значило бы завести форму без поля, а в проверку — назвать проверкой то, что
// ничего не спрашивает.
//
// 🔒 ГАЛОЧКА И КНОПКА — ДВА РАЗНЫХ ДЕЙСТВИЯ, И ЭТО НЕ ЛИШНИЙ ШАГ. Галочка
// объявляет намерение, кнопка его записывает. Сохранять по щелчку галочки
// значило бы писать на сервер от случайного касания и лишить человека
// возможности передумать до нажатия.
//
// 🔒 ОТМЕТКА СНИМАЕМАЯ: снял галочку, нажал — шаг снова открыт. Подписка
// кончается, программу сносят; отметка «когда-то стояло» врёт.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Small } from "@/components/ui/typography";

export type StepCheckLabels = {
  checkLabel: string;
  cta: string;
  busy: string;
  successTitle: string;
  successHint: string;
  failureTitle: string;
  failureFix: string;
};

const ADVANCE_MS = 3000;
const TOAST_MS = 5000;

const fill = (t: string, v: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => String(v[k] ?? m));

export function StepCheck({
  index,
  total,
  mark,
  marked,
  labels,
  nextHref,
}: {
  index: number;
  total: number;
  /** Ключ отметки в состоянии пути. */
  mark: string;
  /** Стоит ли отметка сейчас — приходит с сервера. */
  marked: boolean;
  labels: StepCheckLabels;
  nextHref?: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(marked);
  const [busy, setBusy] = useState(false);

  // Нажимать есть смысл, только когда галочка отличается от сохранённого:
  // кнопка, записывающая то, что уже записано, — работа без результата.
  const ready = checked !== marked;

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch("/api/config/launch-flow/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark, done: checked }),
        credentials: "include",
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean };
      if (!r.ok || !d.ok) {
        toast.error(labels.failureTitle, { description: labels.failureFix, duration: TOAST_MS });
        setBusy(false);
        return;
      }
    } catch {
      toast.error(labels.failureTitle, { description: labels.failureFix, duration: TOAST_MS });
      setBusy(false);
      return;
    }

    // Снятие отметки — не повод поздравлять: человек откатил шаг назад.
    if (checked) {
      toast.success(fill(labels.successTitle, { n: index, total }), {
        description: labels.successHint,
        duration: TOAST_MS,
      });
      setTimeout(() => {
        if (nextHref) router.push(nextHref);
        else { router.refresh(); setBusy(false); }
      }, ADVANCE_MS);
      return;
    }

    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex cursor-pointer items-center gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
          disabled={busy}
          data-step-mark
        />
        <Small className="text-foreground">{labels.checkLabel}</Small>
      </label>

      <Button
        type="button"
        onClick={submit}
        disabled={!ready || busy}
        data-step-cta
        className="h-11 w-full text-[length:var(--fs-small)]"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {busy ? labels.busy : labels.cta}
      </Button>
    </div>
  );
}

"use client";

// Переключатель режима дизайна — рекомендованный против кастомного (шаг 539).
//
// 🔒 ПОЧЕМУ ЭТО ЖИВЁТ НА КАРТЕ ДИЗАЙНА, А НЕ НА СТРАНИЦЕ НАСТРОЙКИ. Решение
// касается не одного значения, а всего слоя оформления: с кастомным режимом
// страницы уходят из-под меню, подвала и палитры. Место такому решению — там же,
// где владелец видит состояние дизайна целиком, а не в ряду цветов и шрифтов.
//
// 🔒 ВКЛЮЧЕНИЕ ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ, ВЫКЛЮЧЕНИЕ — НЕТ. Несимметрично намеренно:
// уход из рекомендованного режима — это работа, которую владелец берёт на себя, и
// он обязан прочитать, что теряет. Возврат ничего не ломает и спрашивать не о чем.
//
// 🔒 ЧУЖИЕ КЛЮЧИ КОНФИГА СОХРАНЯЮТСЯ. Пишем в тот же файл, где живут цвета,
// шрифты и формы: отправить один только режим значило бы стереть остальное.

import { useState } from "react";
import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type CustomDesignLabels = {
  recommendedTitle: string;
  recommendedBody: string;
  customTitle: string;
  customBody: string;
  /** Что владелец теряет — по строке на пункт. */
  costTitle: string;
  cost: string[];
  responsibility: string;
  turnOn: string;
  turnOff: string;
  confirmTitle: string;
  confirmBody: string;
  confirmYes: string;
  confirmNo: string;
  saving: string;
  savedOn: string;
  savedOff: string;
  failed: string;
};

export function CustomDesignSwitch(
  { config, initial, labels }: {
    config: Record<string, unknown>;
    initial: boolean;
    labels: CustomDesignLabels;
  },
) {
  const [on, setOn] = useState(initial);
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);

  async function apply(next: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/config/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config: { ...config, customDesign: next } }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d?.error) throw new Error(String(d?.error ?? labels.failed));
      setOn(next);
      setAsking(false);
      toast.success(next ? labels.savedOn : labels.savedOff);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  // Рекомендованный режим: спокойная плашка, без тревоги. Тревожить того, у кого
  // всё правильно, — значит приучить не читать предупреждения вовсе.
  if (!on) {
    return (
      <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-800 dark:text-emerald-200">
          <ShieldCheck size={13} />{labels.recommendedTitle}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/90 dark:text-emerald-200/90">
          {labels.recommendedBody}
        </p>

        {!asking ? (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="mt-2 text-[11px] font-medium text-emerald-800/80 underline underline-offset-2 transition-colors hover:text-emerald-900 dark:text-emerald-200/80 dark:hover:text-emerald-100"
          >
            {labels.turnOn}
          </button>
        ) : (
          // 🔒 ЦЕНА ПОКАЗЫВАЕТСЯ ДО НАЖАТИЯ, А НЕ ПОСЛЕ. Владелец читает список
          // потерь и только потом соглашается: предупреждение после включения —
          // это уже не предупреждение, а объяснение случившегося.
          <div className="mt-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-900 dark:text-amber-100">
              <TriangleAlert size={13} />{labels.confirmTitle}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
              {labels.confirmBody}
            </p>

            <p className="mt-2 text-[11px] font-medium text-amber-900 dark:text-amber-100">{labels.costTitle}</p>
            <ul className="mt-1 space-y-0.5">
              {labels.cost.map((line) => (
                <li key={line} className="flex gap-1.5 text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
                  <span aria-hidden>—</span>{line}
                </li>
              ))}
            </ul>

            <p className="mt-2 text-[11px] font-medium leading-relaxed text-amber-900 dark:text-amber-100">
              {labels.responsibility}
            </p>

            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" onClick={() => apply(true)} disabled={saving}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <TriangleAlert size={13} />}
                {saving ? labels.saving : labels.confirmYes}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAsking(false)} disabled={saving}>
                {labels.confirmNo}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Кастомный режим включён — вот теперь плашка тревожная, и она стоит первой на
  // странице: это состояние, о котором владелец обязан помнить.
  return (
    <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-900 dark:text-amber-100">
        <TriangleAlert size={13} />{labels.customTitle}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
        {labels.customBody}
      </p>
      <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-amber-900 dark:text-amber-100">
        {labels.responsibility}
      </p>
      <Button size="sm" variant="outline" className="mt-2.5" onClick={() => apply(false)} disabled={saving}>
        {saving ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        {saving ? labels.saving : labels.turnOff}
      </Button>
    </div>
  );
}

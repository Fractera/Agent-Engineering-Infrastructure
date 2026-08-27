"use client";

// ДЕЙСТВИЕ РЕАЛЬНОГО ШАГА МАСТЕРА (шаг 28-9, 2026-08-27).
//
// 🔒 ЭТО НЕ ТОТ ЖЕ ФАЙЛ, ЧТО У ОБРАЗЦА, И РАЗЛИЧИЕ СОДЕРЖАТЕЛЬНОЕ. У образца
// (`github/example/_components/step-action.client.tsx`) есть переключатель
// «показать удачу / показать отказ» — там он нужен, чтобы владелец увидел оба
// исхода, не подстраивая среду. На реальном шаге такого переключателя быть не
// может: исход решает сервер, и тумблер рядом с настоящей кнопкой был бы ложью о
// работе шага.
//
// 🔒 ОДИН ШАГ — ОДНО ДЕЙСТВИЕ (закон владельца 2026-08-27: «one step for one
// step»). Здесь ровно одно поле и ровно одна кнопка. Живой мастер сегодня внутри
// «шага 1 из 13» требует четырёх действий подряд — владелец назвал это дефектом
// словами «it must to be 4 steps , not 1». Второе действие сюда положить некуда,
// и это не оплошность конструкции, а сама конструкция.
//
// 🔒 ПРАВИЛО ГОТОВНОСТИ И ДВЕ ДЛИТЕЛЬНОСТИ — СТАНДАРТ, ПРИНЯТЫЙ НА ОБРАЗЦЕ.
// Кнопка активна, когда поле заполнено (`trim()`: один пробел заполнением не
// считается) либо отмечена галочка. Тост удачи живёт пять секунд, переход —
// через три: тост обязан пережить переход, иначе поздравление исчезает раньше,
// чем человек успел прочесть, ради чего он это делал.
//
// 🔒 ТОСТ ОТКАЗА БЕЗ УКАЗАНИЯ, ЧТО ДЕЛАТЬ, ЗАПРЕЩЁН. «Не удалось» — сообщение о
// состоянии программы; человеку нужно следующее действие.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Small } from "@/components/ui/typography";

export type StepFormLabels = {
  inputLabel: string;
  inputPlaceholder: string;
  /** Подпись под полем: чего от значения ждут. */
  inputHint?: string;
  cta: string;
  busy: string;
  successTitle: string;
  successHint: string;
  /** Заголовок отказа, когда сервер не назвал причину сам. */
  failureTitle: string;
  /** Что делать — показывается, когда причины нет. */
  failureFix: string;
};

const ADVANCE_MS = 3000;
const TOAST_MS = 5000;

const fill = (t: string, v: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => String(v[k] ?? m));

export function StepForm({
  index,
  total,
  labels,
  nextHref,
}: {
  index: number;
  total: number;
  labels: StepFormLabels;
  /** Куда вести после удачи. Пусто — шаг последний, перехода нет. */
  nextHref?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔒 Таймер снимается при уходе со страницы: иначе переход случается у
  // человека, которого здесь уже нет.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const ready = value.trim().length > 0;

  function submit() {
    setBusy(true);

    // 🔒 ДВЕРЬ ПОКА НЕ ПОДКЛЮЧЕНА, И ЭТО НАЗВАНО ЗДЕСЬ, А НЕ СПРЯТАНО.
    // Настоящее подключение репозитория пишет `USER_LAUNCH_*` в `.env.local`
    // слота и двигает состояние ЖИВОГО мастера — того самого, который владелец
    // запретил трогать до отдельного слова. Поэтому шаг сегодня показывает свой
    // путь целиком: поле, кнопку, тост, переход, — но состояние не меняет.
    // Строка ниже — единственное место, куда встанет вызов
    // `POST /api/config/launch/step`, когда владелец скажет.
    toast.success(fill(labels.successTitle, { n: index, total }), {
      description: labels.successHint,
      duration: TOAST_MS,
    });

    timer.current = setTimeout(() => {
      if (nextHref) router.push(nextHref);
      else setBusy(false);
    }, ADVANCE_MS);
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <Small className="text-foreground">{labels.inputLabel}</Small>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={labels.inputPlaceholder}
          disabled={busy}
          className="h-11"
        />
        {labels.inputHint && <Small>{labels.inputHint}</Small>}
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

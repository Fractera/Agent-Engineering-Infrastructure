"use client";

// ДЕЙСТВИЕ ШАГА: ПОЛЕ · ГАЛОЧКА · ОДНА КНОПКА (шаги 28-4 и 28-5, 2026-08-27).
//
// 🔒 КНОПКА ОДНА. Не «основная и вторичная»: вторая кнопка на шаге — это второй
// путь, и человек начинает выбирать вместо того, чтобы делать. Ровно из-за
// выбора на входе настройку и бросали.
//
// 🔒 ПРАВИЛО ГОТОВНОСТИ — ИЛИ, А НЕ И. Владелец: «кнопка становится активной если
// чекбокс был нажат или Input был заполнен». У шага бывает либо поле, либо
// галочка, редко оба; когда есть оба — хватает любого. Прочтение через И сделало
// бы шаг с одной галочкой незакрываемым.
//
// 🔒 ПУСТАЯ СТРОКА И ПРОБЕЛЫ — НЕ ЗАПОЛНЕННОЕ ПОЛЕ. `trim()`: иначе кнопка
// загорается от случайного пробела, и человек закрывает шаг, ничего не введя.
//
// 🔒 ДВЕ ДЛИТЕЛЬНОСТИ, И ПУТАТЬ ИХ НЕЛЬЗЯ. Три секунды — задержка перехода; пять
// — жизнь тоста. Тост обязан пережить переход, иначе поздравление исчезает
// раньше, чем человек успел прочесть, ради чего он это делал.
//
// 🔒 ТОСТ ОТКАЗА БЕЗ УКАЗАНИЯ, ЧТО ДЕЛАТЬ, ЗАПРЕЩЁН. «Не удалось» — сообщение о
// собственном состоянии программы; человеку нужно следующее действие. Тот же
// закон, по которому дверь `launch/verify` отвечает `422` с названной причиной.
//
// 🔒 ТАЙМЕРЫ СНИМАЮТСЯ ПРИ РАЗМОНТИРОВАНИИ. Иначе уход со страницы за эти три
// секунды двигает шаг у отсутствующего человека.
//
// 🔒 ИСХОД НА ОБРАЗЦЕ ФЕЙКОВЫЙ И ВЫБИРАЕТСЯ ПЕРЕКЛЮЧАТЕЛЕМ. Ни одной двери не
// зовётся: владелец обязан увидеть ОБА исхода, не подстраивая среду под отказ.

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Small } from "@/components/ui/typography";

export type StepActionLabels = {
  /** Подпись поля. Не задана — поля у шага нет. */
  inputLabel?: string;
  inputPlaceholder?: string;
  /** Подпись галочки «я это сделал». Не задана — галочки нет. */
  checkLabel?: string;
  cta: string;
  /** Тост удачи: «Вы завершили шаг {n} из {total}». */
  successTitle: string;
  /** Вторая строка тоста удачи: «перейдёте к следующему шагу через несколько секунд». */
  successHint: string;
  /** Тост отказа: что именно не вышло. */
  failureTitle: string;
  /** Тост отказа: ЧТО НУЖНО СДЕЛАТЬ. Обязателен. */
  failureFix: string;
  /** Переключатель исхода — только для образца. */
  outcomeLabel: string;
  outcomeSuccess: string;
  outcomeFailure: string;
};

/** Три секунды до открытия следующего шага. */
const ADVANCE_MS = 3000;
/** Пять секунд жизни тоста: он обязан пережить переход. */
const TOAST_MS = 5000;

const fill = (t: string, v: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => String(v[k] ?? m));

export function StepAction({
  index,
  total,
  labels,
  onDone,
}: {
  index: number;
  total: number;
  labels: StepActionLabels;
  /** Зовётся через три секунды после удачи — открыть следующий шаг. */
  onDone: () => void;
}) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [willFail, setWillFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const hasInput = labels.inputLabel !== undefined;
  const hasCheck = labels.checkLabel !== undefined;
  const ready = (hasInput && value.trim().length > 0) || (hasCheck && checked);

  function submit() {
    if (willFail) {
      toast.error(labels.failureTitle, { description: labels.failureFix, duration: TOAST_MS });
      return;
    }
    setBusy(true);
    toast.success(fill(labels.successTitle, { n: index, total }), {
      description: labels.successHint,
      duration: TOAST_MS,
    });
    timer.current = setTimeout(() => {
      console.log(`[example-flow] advance from ${index} to ${index + 1}`);
      onDone();
    }, ADVANCE_MS);
  }

  return (
    <div className="flex flex-col gap-5">
      {hasInput && (
        <label className="flex flex-col gap-2">
          <Small className="text-foreground">{labels.inputLabel}</Small>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={labels.inputPlaceholder}
            className="h-11"
          />
        </label>
      )}

      {hasCheck && (
        <label className="flex cursor-pointer items-center gap-3">
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
          />
          <Small className="text-foreground">{labels.checkLabel}</Small>
        </label>
      )}

      {/* 🔒 ПЕРЕКЛЮЧАТЕЛЬ ИСХОДА ЖИВЁТ ТОЛЬКО НА ОБРАЗЦЕ и подписан так, чтобы его
          нельзя было принять за часть мастера. В живой вкладке исход решает
          сервер, и подменять его тумблером было бы ложью о работе шага. */}
      <div
        data-example-only
        className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2"
      >
        <Small className="text-muted-foreground">{labels.outcomeLabel}</Small>
        <button
          type="button"
          onClick={() => setWillFail(false)}
          className={`text-[length:var(--fs-small)] underline underline-offset-2 ${!willFail ? "text-foreground" : "text-muted-foreground"}`}
        >
          {labels.outcomeSuccess}
        </button>
        <button
          type="button"
          onClick={() => setWillFail(true)}
          className={`text-[length:var(--fs-small)] underline underline-offset-2 ${willFail ? "text-foreground" : "text-muted-foreground"}`}
        >
          {labels.outcomeFailure}
        </button>
      </div>

      <Button
        type="button"
        onClick={submit}
        disabled={!ready || busy}
        data-step-cta
        className="h-11 w-full text-[length:var(--fs-small)]"
      >
        {labels.cta}
      </Button>
    </div>
  );
}

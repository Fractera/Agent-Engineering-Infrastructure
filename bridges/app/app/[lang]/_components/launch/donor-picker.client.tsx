"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Small } from "@/components/ui/typography";
import { CommandCard } from "./command-card";

// ВЫБОР РЕКОМЕНДОВАННОГО ДОНОРА (35-1а, 2026-08-31).
//
// 🔒 КАРТОЧКА ЗДЕСЬ ЧУЖАЯ, И ЭТО ГЛАВНОЕ СВОЙСТВО ФАЙЛА. Рисует `CommandCard` —
// тот самый элемент анатомии «значок → заголовок → описание → действие», который
// стоит на карточках команд. ✗ Дважды за прошлую сессию я рисовал свою кнопку и
// свои карточки рядом с существующими; признак ошибки всегда один и тот же —
// комментарий, объясняющий, почему ЗДЕСЬ нужно иначе, чем у соседа. Такого
// комментария в этом файле нет, потому что иначе здесь не нужно.
//
// 🔒 НАЖАТИЕ ПОДСТАВЛЯЕТ, А НЕ СОХРАНЯЕТ. Сохранение остаётся отдельным
// движением человека: карточка, молча записавшая адрес, лишает его возможности
// передумать между выбором и решением. Тот же закон, по которому на шагах-
// отметках разделены галочка и кнопка.
//
// 🔒 ОБЕЩАНИЕ ОСЛАБЛЕНО НАМЕРЕННО, И ЭТО НЕ РЕДАКТУРА СЛОВ ВЛАДЕЛЬЦА. Он сказал
// «проект, который запустится на 100%». Наш собственный пример упадёт при другой
// версии Node, при незаполненных ключах, при чужих настройках сервера. Поэтому
// сказано «собрано нами из этого шаблона» — обещание, которого продукт не
// держит, человек проверяет в свой худший день (✗ оплачено шагом 65).
//
// 🔒 ПОЧЕМУ ЭТО НЕ ОТДЕЛЬНЫЙ ОСТРОВОК НА СТРАНИЦЕ. Поле адреса живёт в состоянии
// `StepForm`; второй островок рядом дотянулся бы до него только через DOM. Здесь
// он ребёнок формы и получает `onPick` пропсом — состояние остаётся в одном месте.

export type DonorPickerLabels = {
  /** Заголовок блока: чем эти проекты являются. */
  title: string;
  /** Обещание — что именно мы утверждаем об этих адресах. */
  promise: string;
  /** Подпись кнопки карточки. */
  pick: string;
  /** Строка про своё поле: рекомендация ничего не запрещает. */
  ownHint: string;
};

export type DonorPick = { url: string; name: string; note: string };

export function DonorPicker({
  picks,
  labels,
  onPick,
  disabled = false,
}: {
  picks: readonly DonorPick[];
  labels: DonorPickerLabels;
  /** Что делать с выбранным адресом. Подставить — и только. */
  onPick: (url: string) => void;
  disabled?: boolean;
}) {
  // Пусто — блока нет вовсе. Не пустая рамка и не надпись «скоро»: названная,
  // но не обеспеченная возможность хуже её отсутствия.
  if (picks.length === 0) return null;

  return (
    <div data-donor-picker className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Small className="font-medium text-foreground">{labels.title}</Small>
        <Small>{labels.promise}</Small>
      </div>

      <div className="flex flex-col gap-2">
        {picks.map((p) => (
          <CommandCard
            key={p.url}
            icon={Sparkles}
            title={p.name}
            body={p.note}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                data-donor-pick={p.url}
                onClick={() => onPick(p.url)}
                className="h-8 text-[11px]"
              >
                {labels.pick}
              </Button>
            }
          />
        ))}
      </div>

      {/* Своё поле ничем не ограничено, и сказано это рядом с рекомендацией, а не
          где-то ниже: человек, у которого свой проект, обязан увидеть, что путь
          для него открыт, в ту же секунду, что и список наших. */}
      <Small>{labels.ownHint}</Small>
    </div>
  );
}

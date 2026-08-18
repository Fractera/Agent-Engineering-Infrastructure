"use client";

// Завести ВТОРОЙ продукт (партия 5, владелец 2026-08-15).
//
// 🔒 ВТОРОЙ ПРОДУКТ НАЧИНАЕТСЯ ТАК ЖЕ, КАК ПЕРВЫЙ: выбор направления из того же
// списка, те же его вопросы, свои кейсы. Другого пути нет и не должно быть —
// иначе у владельца появилось бы два разных опыта для одного действия, и второй
// продукт вышел бы описанным хуже первого.
//
// 🔒 ОТЛИЧИЕ ОТ ВЫБОРА НА ПЕРВОМ ЭКРАНЕ — ОДНО ПОЛЕ `newProduct`. Без него запрос
// был бы неотличим от «передумал про структуру текущего»: та же дверь, тот же
// ответ, а результат — либо новый продукт, либо переписанный старый. Догадываться
// об этом на сервере нельзя, поэтому намерение называется явно.
//
// После создания открывается страница кейсов НОВОГО продукта: человек
// нажал «добавить» — он ждёт, что окажется в новом, а не останется в старом.
//
// 🪦 ЗДЕСЬ БЫЛО ДВА МОДАЛЬНЫХ ОКНА, ОТКРЫТЫХ ОДНОВРЕМЕННО (снято 2026-08-16).
// Список направлений жил в одном, описание выбранного — во втором, поверх
// первого. Внешнее окно перехватывало нажатия внутреннего, и кнопки «выбрать» и
// «отмена» не работали вовсе. Теперь окно одно (`TypeChooserDialog`), а разметка
// описания общая с первым экраном — прежде она стояла здесь копией.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TypeChooserDialog } from "./type-dialog.client";
import type { ProjectTypeCard, PickerLabels } from "./project-type-picker.client";

export function AddProductCard(
  { types, labels, lang }:
  { types: ProjectTypeCard[]; labels: PickerLabels & { addProduct: string; addHint: string }; lang: string },
) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create(type: ProjectTypeCard) {
    setBusy(true);
    try {
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "project-type", newProduct: true, typeId: type.id, typeTitle: type.title,
        }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      setOpen(false);
      // 🔒 ОТВЕТ НА ДЕЙСТВИЕ ОБЯЗАТЕЛЕН. Окно закрывалось, страница тихо
      // перерисовывалась — и человек не получал ни одного признака, что его
      // услышали. Действие, не ответившее ничем, читается как поломка.
      toast.success(labels.started.replace("{title}", type.title));
      router.push(`/${lang}/products/${d.product.id}/use-cases`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-[11rem] flex-1 flex-col justify-center gap-1 rounded-lg border border-dashed border-border p-2.5 text-left text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <span className="flex items-center gap-1.5 text-[12px] font-medium">
          <Plus size={11} className="shrink-0" />{labels.addProduct}
        </span>
        <span className="text-[10px] leading-snug">{labels.addHint}</span>
      </button>

      <TypeChooserDialog
        open={open}
        onOpenChange={setOpen}
        types={types}
        labels={labels}
        busy={busy}
        onChoose={create}
        listTitle={labels.addProduct}
      />
    </>
  );
}

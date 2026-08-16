"use client";

// Действия над карточкой продукта: правка имени с описанием и удаление
// (владелец 2026-08-16).
//
// 🔒 ПОЧЕМУ ОБА ДЕЙСТВИЯ В ОДНОМ ОСТРОВКЕ. Они делят карточку, оба открывают
// окно и оба заканчиваются `router.refresh()`. Разведи их по двум файлам — и
// получится два способа обновить одну и ту же секцию, которые разойдутся на
// первой правке.
//
// 🔒 ДЕЙСТВИЯ ЕСТЬ ТОЛЬКО У ТЕКУЩЕГО ПРОДУКТА, и это про безопасность, а не про
// экономию места. Удалить чужой продукт, не открыв его, — ровно та ошибка, от
// которой нет отката: страница показывает кейсы одного, а корзина стоит у
// другого. Чтобы удалить соседний, его надо сперва выбрать; это один лишний
// щелчок и целый класс несделанных ошибок.
//
// 🔒 ИМЯ ПО-АНГЛИЙСКИ, ОПИСАНИЕ НА ЯЗЫКЕ ВЛАДЕЛЬЦА — разделение объявлено в
// `products-config.ts` и повторено здесь подписями полей: имя уезжает в
// машинный слой (отчёты, план страниц, разговор с агентом), описание читает
// только человек.
//
// 🔒 ПЕРЕИМЕНОВАНИЕ БЕЗОПАСНО ПО ПОСТРОЕНИЮ, и это стоит знать тому, кто сюда
// заглянет: `productPaths()` собирает все четыре корня из `id` и `route`, имя в
// них не участвует вовсе. Поэтому владельцу разрешено называть продукт как
// угодно — сломать этим нечего.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type ProductActionLabels = {
  editTitle: string; editAction: string; editName: string; editNameHint: string;
  editDesc: string; editDescHint: string; editSave: string; editCancel: string;
  editSaved: string; editFailed: string; editNameRequired: string;
  delAction: string; delTitle: string; delDanger: string; delGoes: string;
  delStays: string; delConfirm: string; delWorking: string; delDone: string;
  delFailed: string; delArchive: string;
};

export function ProductCardActions(
  { productId, title, description, casesCount, descriptionMax, labels }:
  {
    productId: string;
    title: string;
    description: string;
    casesCount: number;
    descriptionMax: number;
    labels: ProductActionLabels;
  },
) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "edit" | "delete">(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(title);
  const [desc, setDesc] = useState(description);

  function open(next: "edit" | "delete") {
    // Поля наполняются при КАЖДОМ открытии, а не один раз при создании островка:
    // владелец мог отменить правку, и в следующий раз обязан увидеть то, что
    // сохранено, а не свой брошенный черновик.
    if (next === "edit") { setName(title); setDesc(description); }
    setMode(next);
  }

  async function send(body: Record<string, unknown>, okText: string, failText: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...body }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? failText));
      setMode(null);
      // Адрес архива показывается в самом уведомлении: «удалено» без него
      // читается как «стёрто безвозвратно», а это неправда.
      toast.success(d.archive ? `${okText} · ${labels.delArchive}: ${d.archive}` : okText, { duration: 8000 });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : failText);
    } finally {
      setBusy(false);
    }
  }

  const save = () => {
    if (!name.trim()) { toast.error(labels.editNameRequired); return; }
    return send({ op: "rename-product", title: name, description: desc }, labels.editSaved, labels.editFailed);
  };

  const remove = () => send({ op: "delete-product" }, labels.delDone, labels.delFailed);

  return (
    // 🔒 `relative z-10` — КАРТОЧКА ЦЕЛИКОМ ССЫЛКА, и без этого кнопки оказались
    // бы ПОД растянутой ссылкой: нажатие на карандаш переключало бы продукт
    // вместо открытия окна. Кнопки при этом соседи ссылки, а не вложены в неё —
    // ссылка внутри ссылки недопустима и ведёт себя в браузерах по-разному.
    <div className="relative z-10 flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={() => open("edit")}
        title={labels.editAction}
        aria-label={labels.editAction}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Pencil size={11} />
      </button>
      <button
        type="button"
        onClick={() => open("delete")}
        title={labels.delAction}
        aria-label={labels.delAction}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
      >
        <Trash2 size={11} />
      </button>

      {mode === "edit" && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-16 w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-2xl">
            <p className="text-[13px] font-medium text-foreground">{labels.editTitle}</p>

            <label className="mt-3 block text-[11px] font-medium text-foreground">{labels.editName}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{labels.editNameHint}</p>

            <label className="mt-3 block text-[11px] font-medium text-foreground">{labels.editDesc}</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, descriptionMax))}
              rows={3}
              className="mt-1 w-full resize-y rounded-md border border-border bg-background p-2 text-[12px] leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.editDescHint}</p>
              {/* Счётчик знаков — не украшение: предел режется молча при вводе,
                  и без числа человек не понимает, почему текст перестал
                  набираться. */}
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {desc.length}/{descriptionMax}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setMode(null)} disabled={busy}>
                {labels.editCancel}
              </Button>
              <Button size="sm" className="text-[11px]" onClick={save} disabled={busy}>
                {busy && <Loader2 size={11} className="animate-spin" />}{labels.editSave}
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === "delete" && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-16 w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-2xl">
            <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <AlertTriangle size={14} className="shrink-0 text-destructive" />
              {labels.delTitle.replace("{title}", title)}
            </p>

            {/* Три врезки отвечают на три разных вопроса, и порядок их —
                порядок мыслей нажимающего: чем это опасно → что исчезнет →
                что уцелеет. Последняя зелёная намеренно: главный страх здесь —
                «не сотру ли я приложение», и ответ на него обязан быть виден
                до того, как палец дойдёт до кнопки. */}
            <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-[11px] leading-relaxed text-destructive">
              {labels.delDanger}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {labels.delGoes.replace("{n}", String(casesCount))}
            </p>
            <p className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
              {labels.delStays}
            </p>

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setMode(null)} disabled={busy}>
                {labels.editCancel}
              </Button>
              <Button size="sm" variant="destructive" className="text-[11px]" onClick={remove} disabled={busy}>
                {busy ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                {busy ? labels.delWorking : labels.delConfirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

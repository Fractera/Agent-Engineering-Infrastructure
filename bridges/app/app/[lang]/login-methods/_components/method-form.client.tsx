"use client";

// Ввод учётных данных способа входа (шаг 501, Ф2, партия 10).
//
// Островок, и он неизбежен: сюда вводят СЕКРЕТЫ. Форма без JS отправила бы их
// обычным `POST` с перезагрузкой — значит секрет попал бы в историю навигации, а
// при ошибке пришлось бы набирать заново. Здесь он уходит запросом и в поле не
// остаётся.
//
// Один компонент на оба способа: у Google и у почтовой ссылки одинаковая форма —
// два поля, «сохранить», «удалить», состояние с маской. Разное только имена полей
// и адрес, куда их отправить; выносить это в два почти одинаковых файла значило бы
// потом править дважды.
//
// Показ маски вместо секрета — правило маршрута, не моё: он отдаёт уже
// замаскированное. Маскировать на клиенте значило бы сначала отправить секрет в
// браузер.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MethodFormLabels = {
  save: string; saving: string; remove: string; removeConfirm: string;
  saved: string; removed: string; failed: string;
};

type Field = {
  key: string;
  placeholder: string;
  secret?: boolean;
  /** Заполнено значением с сервера (адрес отправителя), а не пустое. */
  initial?: string;
};

export function MethodForm(
  { fields, clearKey, configured, labels }: {
    fields: Field[];
    /** Что послать, чтобы стереть настройку: { clearGoogle: true } и т. п. */
    clearKey: string;
    configured: boolean;
    labels: MethodFormLabels;
  },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, f.initial ?? ""])),
  );
  const [busy, setBusy] = useState<null | "save" | "clear">(null);

  // Есть что сохранять? Пустая отправка ничего бы не изменила, но перезапустила
  // бы службу входа — поэтому кнопка заперта.
  const dirty = fields.some((f) => {
    const v = (values[f.key] ?? "").trim();
    return v !== "" && v !== (f.initial ?? "");
  });

  async function send(payload: Record<string, unknown>, okMessage: string, tag: "save" | "clear") {
    setBusy(tag);
    try {
      const r = await fetch("/api/config/auth-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.error) throw new Error(String(d?.error ?? labels.failed));
      toast.success(okMessage);
      // Секрет в поле не остаётся: он сохранён, и повторно показывать его нечем.
      setValues(Object.fromEntries(fields.map((f) => [f.key, f.initial ?? ""])));
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {fields.map((f) => (
        <Input
          key={f.key}
          type={f.secret ? "password" : "text"}
          value={values[f.key] ?? ""}
          onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
          placeholder={f.placeholder}
          autoComplete="off"
          className="h-8 font-mono text-[11px]"
        />
      ))}

      <div className="flex items-center gap-2">
        <Button size="sm" className="text-[11px]" disabled={busy !== null || !dirty}
          onClick={() => send(Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? ""])), labels.saved, "save")}
        >
          {busy === "save" && <Loader2 size={11} className="animate-spin" />}
          {busy === "save" ? labels.saving : labels.save}
        </Button>

        {configured && (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-[10px] text-destructive hover:bg-destructive/10"
            disabled={busy !== null}
            onClick={() => {
              // Удаление скрывает кнопку на публичной странице входа — это видят
              // посетители, поэтому спрашиваем.
              if (!confirm(labels.removeConfirm)) return;
              void send({ [clearKey]: true }, labels.removed, "clear");
            }}
          >
            {busy === "clear" ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
            {labels.remove}
          </Button>
        )}
      </div>
    </div>
  );
}

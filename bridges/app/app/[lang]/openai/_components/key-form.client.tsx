"use client";

// Ввод ключа OpenAI (шаг 501, Ф2, партия 12). Островок: ключ — секрет, и форма без
// JS отправила бы его перезагрузкой, оставив в истории навигации.
//
// Сохранение перезапускает слой данных (он читает окружение один раз при старте),
// поэтому после успеха ждём и обновляем состояние с сервера, а не рисуем «готово»
// сразу. Старая панель показывала карточку «сохранено» с кнопкой перезагрузки
// страницы — здесь то же честнее: обновление приходит само, когда служба поднялась.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type KeyFormLabels = {
  placeholder: string; placeholderReplace: string;
  save: string; saving: string; restarting: string;
  saved: string; invalid: string; failed: string;
};

export function KeyForm({ configured, labels }: { configured: boolean; labels: KeyFormLabels }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [key, setKey] = useState("");
  const [phase, setPhase] = useState<null | "saving" | "restarting">(null);

  async function save() {
    const value = key.trim();
    // Проверка формы ключа до отправки: сервер тоже проверит, но сказать об этом
    // сразу дешевле, чем перезапускать службу из-за опечатки.
    if (!value.startsWith("sk-")) { toast.error(labels.invalid); return; }

    setPhase("saving");
    try {
      const r = await fetch("/api/config/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: value }),
      });
      const d = await r.json().catch(() => ({}));
      // 400 — единственная настоящая ошибка: ключ не той формы. Прочее почти
      // всегда гонка перезапуска: ключ УЖЕ записан, служба ещё поднимается.
      if (r.status === 400) { toast.error(String(d?.error ?? labels.invalid)); return; }

      setKey("");
      toast.success(labels.saved);
      // Слой данных перезапускается около десяти секунд; спрашиваем состояние
      // после этого, чтобы показанное совпадало с действительным.
      setPhase("restarting");
      setTimeout(() => {
        startTransition(() => router.refresh());
        setPhase(null);
      }, 11000);
    } catch {
      toast.error(labels.failed);
      setPhase(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={configured ? labels.placeholderReplace : labels.placeholder}
          autoComplete="off"
          className="h-8 flex-1 font-mono text-[11px]"
        />
        <Button size="sm" onClick={save} disabled={phase !== null || !key.trim()} className="text-[11px]">
          {phase !== null && <Loader2 size={11} className="animate-spin" />}
          {phase === "saving" ? labels.saving : phase === "restarting" ? labels.restarting : labels.save}
        </Button>
      </div>
    </div>
  );
}

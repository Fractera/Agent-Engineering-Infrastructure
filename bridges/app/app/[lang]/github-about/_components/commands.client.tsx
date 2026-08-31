"use client";

// ТРИ КОМАНДЫ РАЗДЕЛА «GITHUB КОМАНДЫ» (28-12, 2026-08-31).
//
// Владелец: «внутри есть карточки, представляющие сейчас из себя информационные
// блоки; эти кнопки должны нажиматься и выполнять свои действия либо выдавать
// ошибку в формате тоста, если это невозможно».
//
// 🔒 НОВЫХ ДВЕРЕЙ НЕ ЗАВЕДЕНО НИ ОДНОЙ, И ЭТО ГЛАВНОЕ РЕШЕНИЕ ПОДШАГА. План
// допускал их создание «если существующих нет». Они есть и работают ровно с тем,
// о чём говорит страница: `config/git-push` и `config/git-pull` ходят в
// `/opt/fractera/app` — гостевой слот, — а `api/deploy` пересобирает уже лежащие
// там файлы. Три вопроса, которые план оставлял владельцу, сняты чтением
// исходника: двери работают со СЛОТОМ, а «развернуть» есть СБОРКА.
//
// 🔒 ПОЭТОМУ КНОПКА НАЗЫВАЕТСЯ «СОБРАТЬ», А НЕ «РАЗВЕРНУТЬ». Сборка пересобирает
// код уже стоящей службы; развёртывание сносит и ставит заново. Дверь делает
// первое — и кнопка обязана называть то, что делает. Объяснение под ней и так
// говорит «собирает приложение и перезапускает его; репозиторий не затрагивается».
//
// 🔒 «ЗАБРАТЬ» СПРАШИВАЕТ ПОДТВЕРЖДЕНИЕ, ОСТАЛЬНЫЕ ДВЕ — НЕТ. Забрать значит
// заменить то, что лежит на сервере, тем, что лежит в репозитории: несохранённое
// исчезает. Подтверждение сделано вторым нажатием, а не окном: второе модальное
// окно в панели завело бы второй стандарт окна ради одной кнопки, а окно у
// панели одно.
//
// 🔒 ТОСТ ГОВОРИТ, ЧТО СДЕЛАТЬ, А НЕ ТОЛЬКО ЧТО СЛУЧИЛОСЬ (стандарт 28-10).
// Причина отказа приходит от двери машинным словом; если она есть — показываем
// её, если нет — говорим, где чинить. Отказ ничего не двигает на странице.

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const TOAST_MS = 5000;
/** Сколько живёт согласие на второе нажатие. Дольше — и оно перестаёт быть согласием. */
const CONFIRM_MS = 4000;

export type CommandId = "push" | "pull" | "deploy";

export type CommandLabels = {
  run: string;
  running: string;
  confirm: string;
  confirmHint: string;
  okTitle: string;
  okHint: string;
  failTitle: string;
  failHint: string;
};

const DOOR: Record<CommandId, string> = {
  push: "/api/config/git-push",
  pull: "/api/config/git-pull",
  deploy: "/api/deploy",
};

export function CommandButton({ id, labels }: { id: CommandId; labels: CommandLabels }) {
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const needsConfirm = id === "pull";

  async function run() {
    // Первое нажатие необратимой команды только предупреждает.
    if (needsConfirm && !armed) {
      setArmed(true);
      toast(labels.confirm, { description: labels.confirmHint, duration: CONFIRM_MS });
      timer.current = setTimeout(() => setArmed(false), CONFIRM_MS);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    setBusy(true);

    try {
      const r = await fetch(DOOR[id], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      const d = (await r.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!r.ok || d.success === false) {
        toast.error(labels.failTitle, {
          description: d.error?.trim() || labels.failHint,
          duration: TOAST_MS,
        });
        return;
      }
      toast.success(labels.okTitle, { description: labels.okHint, duration: TOAST_MS });
    } catch {
      // Сеть не ответила — это не «плохой токен». Назвать причину, которой не
      // проверяли, значит отправить человека чинить исправное (урок 28-19).
      toast.error(labels.failTitle, { description: labels.failHint, duration: TOAST_MS });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={armed ? "destructive" : "outline"}
      onClick={run}
      disabled={busy}
      data-command={id}
      className="h-8 w-full text-[11px]"
    >
      {busy && <Loader2 size={12} className="animate-spin" />}
      {busy ? labels.running : armed ? labels.confirm : labels.run}
    </Button>
  );
}

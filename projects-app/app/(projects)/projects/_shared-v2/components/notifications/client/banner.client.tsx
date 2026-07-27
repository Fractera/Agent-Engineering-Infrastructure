"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, ChevronDown, CheckCircle2, ClipboardList, Clock, MessageSquareReply, PlusCircle, Rocket, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NoticeCategory } from "../types/notifications";
import { notificationStrings } from "./i18n";
import { useNotices } from "./provider.client";

// ПОЛОСА-УВЕДОМЛЕНИЕ (дев-слой) — потребитель ПРОВАЙДЕРА: список поводов берёт из контекста (единый
// источник), сама ничего не считает. Стоит под статус-баром кокпита. ТОЛЬКО shadcn (правило владельца):
// Button/Badge + иконки lucide, раскрытие через состояние (не самописный <details>). Оранжевая — заметность.
//
// КНОПКА «ЗАПУСТИТЬ РАЗРАБОТКУ». ГЕЙТ: пока кейсы не подтверждены (нет повода `ready`) — кнопка приглушена;
// клик показывает красный тост с кнопкой «Детали», которая прокручивает к секции кейсов и открывает
// подтверждение.

const ORDER: NoticeCategory[] = ["warning", "answered", "task", "unbuilt", "ready", "new-case"];

const TONE: Record<NoticeCategory, string> = {
  warning: "text-amber-600 dark:text-amber-400",
  unbuilt: "text-blue-600 dark:text-blue-400",
  answered: "text-violet-600 dark:text-violet-400",
  ready: "text-emerald-600 dark:text-emerald-400",
  "new-case": "text-emerald-600 dark:text-emerald-400",
  task: "text-indigo-600 dark:text-indigo-400",
};

const ICON: Record<NoticeCategory, typeof TriangleAlert> = {
  warning: TriangleAlert,
  unbuilt: Clock,
  answered: MessageSquareReply,
  ready: CheckCircle2,
  "new-case": PlusCircle,
  task: ClipboardList,
};

function automationFromPath(): string {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  return parts.length >= 3 && parts[0] === "projects" ? `${parts[1]}/${parts[2]}` : "";
}

/** Прокрутить к секции кейсов и открыть подтверждение — общий приём гейта запуска. */
function goToUseCases() {
  document.querySelector('[data-section="use-cases"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.dispatchEvent(new CustomEvent("usecases:review"));
}

export function NotificationBanner({ lang }: { lang: string }) {
  const { notices } = useNotices();
  const [open, setOpen] = useState(false);
  if (notices.length === 0) return null;
  const L = notificationStrings(lang);
  const counts = ORDER.map((category) => ({ category, n: notices.filter((x) => x.category === category).length })).filter((g) => g.n > 0);
  const canDevelop = notices.some((n) => n.category === "ready");

  const launch = () => {
    if (!canDevelop) {
      // Красный тост с переведённой кнопкой «Детали»: по клику скроллим вниз к кейсам и открываем подтверждение.
      toast.error(L.blocked, { duration: 10000, action: { label: L.details, onClick: goToUseCases } });
      return;
    }
    const automation = automationFromPath();
    if (automation) window.dispatchEvent(new CustomEvent("fractera:launch-development", { detail: { automation } }));
  };

  return (
    <div data-chrome="notifications" className="mt-2 rounded-lg border border-orange-500/50 bg-orange-500/10">
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Bell className="size-4 shrink-0 text-orange-600 dark:text-orange-400" />
        <span className="flex flex-wrap items-center gap-1.5">
          {counts.map((g) => {
            const Icon = ICON[g.category];
            return (
              <Badge key={g.category} variant="outline" className={cn("gap-1 font-medium", TONE[g.category])}>
                <Icon className="size-3.5" /> {g.n}
              </Badge>
            );
          })}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={launch}
          variant={canDevelop ? "default" : "secondary"}
          disabled={false}
          title={canDevelop ? undefined : L.blocked}
          className={cn("ml-auto h-7", !canDevelop && "opacity-60")}
        >
          <Rocket className="size-3.5" /> {L.launch}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setOpen((v) => !v)}>
          {L.details}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {open ? (
        <ul className="space-y-1.5 border-t px-3 py-2 text-sm">
          {notices.map((notice, i) => {
            const Icon = ICON[notice.category];
            return (
              <li key={i} className="flex items-start gap-2">
                <Icon className={cn("mt-0.5 size-3.5 shrink-0", TONE[notice.category])} />
                <span className="min-w-0">
                  {notice.category === "new-case" ? (
                    <span className="font-medium text-foreground">№{notice.name}</span>
                  ) : notice.category === "answered" ? (
                  <>
                    <span className="text-muted-foreground">{L.answered}: </span>
                    <span className="font-medium text-foreground">{notice.name}</span>
                  </>
                ) : notice.category === "ready" ? (
                    <span className="font-medium text-foreground">{L.ready}</span>
                  ) : notice.category === "task" ? (
                    <span className="font-medium text-foreground">{L.task}</span>
                  ) : (
                    <>
                      <span className="text-muted-foreground">{notice.category === "warning" ? L.warning : L.unbuilt}: </span>
                      <span className="font-medium text-foreground">{notice.name}</span>
                    </>
                  )}
                  {notice.text ? <span className="text-muted-foreground"> — {notice.text}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Провайдер + полоса одним монтажом — то, что дев-слот вставляет в кокпит под статус-баром. */
export { NotificationProvider } from "./provider.client";

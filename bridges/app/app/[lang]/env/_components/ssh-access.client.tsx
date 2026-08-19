"use client";

// Доступ к собственному серверу по SSH — короткая строка на странице и окно с
// процедурой (владелец 2026-08-19).
//
// 🔒 ЗАЧЕМ ОКНО, А НЕ ТЕКСТ НА СТРАНИЦЕ. Страница «Переменные окружения» решает
// одну задачу — перенести файл и править значения. Полный разбор второго канала
// превратил бы её в трактат, а без разбора строка про SSH читалась бы как реклама
// возможности. Окно оставляет странице абзац, а тому, кто хочет проверить, отдаёт
// весь порядок.
//
// 🔒 РАЗМЕТКИ ТУТ НЕТ — ТОЛЬКО ГОТОВЫЕ СТРОКИ. Словарь панели живёт на сервере
// (82 языка × ~600 ключей), и клиентский островок не имеет права его импортировать:
// текст приезжает пропсами. Тот же закон, что у всех островков шага 501.
//
// Письмо о правке платформы НЕ ПЕРЕПИСЫВАЕТСЯ ЗАНОВО: сюда приходит тот же
// компонент и те же слова, что стоят последним абзацем страницы «Как построить
// этот проект». Два текста об одном разошлись бы, и разошлись бы молча.

import { useState } from "react";
import { Terminal } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  PlatformChangeRequest, type PlatformChangeUi,
} from "../../how-to-build/_components/platform-change-request.client";

export type SshUi = {
  lead: string;
  open: string;
  title: string;
  whyTitle: string; why: string;
  allowedTitle: string; allowed: string;
  forbiddenTitle: string; forbidden: string;
  howTitle: string; how: string;
};

export function SshAccess({ ui, change, to }: { ui: SshUi; change: PlatformChangeUi; to: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-[12px] leading-relaxed text-foreground">{ui.lead}</p>
        <DialogTrigger asChild>
          <button
            type="button"
            className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Terminal size={11} className="shrink-0" />
            {ui.open}
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[14px]">{ui.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-[12px] leading-relaxed text-foreground">
          <p><strong className="font-semibold">{ui.whyTitle}</strong> {ui.why}</p>
          <p><strong className="font-semibold">{ui.allowedTitle}</strong> {ui.allowed}</p>
          <p><strong className="font-semibold">{ui.forbiddenTitle}</strong> {ui.forbidden}</p>
          <p><strong className="font-semibold">{ui.howTitle}</strong> {ui.how}</p>
        </div>

        <PlatformChangeRequest ui={change} to={to} />
      </DialogContent>
    </Dialog>
  );
}

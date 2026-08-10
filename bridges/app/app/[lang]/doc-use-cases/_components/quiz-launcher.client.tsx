"use client";

// Кнопка, открывающая Quiz. Отдельным крошечным островком, чтобы сам диалог не
// заставлял страницу быть клиентской: список кейсов и состояние гейта рисует
// сервер, и они читаются без JS.

import { useState } from "react";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizDialog, type QuizLabels } from "./quiz-dialog.client";

export function QuizLauncher(
  { lang, label, labels }: { lang: string; label: string; labels: QuizLabels },
) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" className="text-[11px]" onClick={() => setOpen(true)}>
        <MessagesSquare size={11} />{label}
      </Button>
      <QuizDialog open={open} lang={lang} labels={labels} onClose={() => setOpen(false)} />
    </>
  );
}

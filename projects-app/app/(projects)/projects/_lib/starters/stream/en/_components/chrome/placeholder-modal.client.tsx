"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chromeStrings } from "./i18n";

// ЗАГЛУШКА — для записей меню, чьи бэкенды v1 в самодостаточном v2 ещё не построены (Тесты, Переименовать,
// Клонировать, Удалить). Запись выглядит один-в-один как в v1 (решение владельца «переноси по виду»), но
// пока честно сообщает, что появится в шаблоне позже — не притворяется рабочей.
//
// 🔒 НА shadcn `Dialog` (шаг 298): прежде это был самодельный оверлей `fixed inset-0` со своей кнопкой
// закрытия и ручным `stopPropagation`. Теперь фокус-ловушка, Esc, клик вне окна и крестик — от примитива.
export default function PlaceholderModal({
  lang,
  title,
  open,
  onClose,
}: {
  lang: string;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const L = chromeStrings(lang);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{L.placeholderNote}</p>
      </DialogContent>
    </Dialog>
  );
}

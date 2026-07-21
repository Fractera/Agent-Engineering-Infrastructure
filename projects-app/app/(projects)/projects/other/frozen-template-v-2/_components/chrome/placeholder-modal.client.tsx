"use client";

import { chromeStrings } from "./i18n";
import { CloseIcon } from "./icons";

// ЗАГЛУШКА — для записей меню, чьи бэкенды v1 в самодостаточном v2 ещё не построены (Настройки, Тесты,
// Переименовать, Клонировать, Удалить). Запись выглядит один-в-один как в v1 (решение владельца
// «переноси по виду»), но пока честно сообщает, что появится в шаблоне позже — не притворяется рабочей.
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
  if (!open) return null;
  const L = chromeStrings(lang);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-lg border bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">{title}</span>
          <button type="button" onClick={onClose} aria-label={L.cancel} className="text-muted-foreground hover:text-foreground">
            <CloseIcon className="size-4" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">{L.placeholderNote}</p>
        </div>
      </div>
    </div>
  );
}

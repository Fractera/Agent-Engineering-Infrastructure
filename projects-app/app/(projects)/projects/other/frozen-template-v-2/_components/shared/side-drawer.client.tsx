"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CloseIcon } from "../chrome/icons";

// ЯЩИК СПРАВА — общий примитив. Механика целиком взята у ящика навигации витрины
// (`chrome/nav-drawer.client.tsx`): выезд с анимацией, затемнение, начало ПОД шапкой (`top-14`),
// закрытие крестиком и кликом по пространству за ящиком.
//
// ПОЧЕМУ ОН В `shared/`, А НЕ В ПАПКЕ КАЛЕНДАРЯ. Ящик навигации левый и намертво связан с оглавлением
// страницы — переиспользовать его нельзя. Ящик справа нужен уже календарю, а по смыслу («открыть
// подробности того, на что нажали, не уходя со страницы») понадобится и другим вкладкам. Второй
// реализации выдвижной панели в папке быть не должно — тот же закон, что у тоста и голосового ввода.
//
// Управляется СНАРУЖИ (`open` + `onClose`): что именно открыто — знание вызывающего, а не ящика.
export default function SideDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false); // в DOM (нужен, чтобы отыграть анимацию закрытия)
  const [shown, setShown] = useState(false); // доехал до края — то, что анимируется

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 200); // столько же длится переход
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex justify-end" role="dialog" aria-label={title}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`relative h-full w-96 max-w-[90vw] overflow-y-auto border-l bg-background p-4 shadow-xl transition-transform duration-200 ease-out ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

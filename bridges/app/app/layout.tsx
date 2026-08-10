import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fractera Admin — AI Workspace",
};

// Корневой каркас панели.
//
// 🔒 `h-screen overflow-hidden` НА `<body>` ОСТАЁТСЯ — и это не наследство
// старой оболочки. Проверено при переключении (Ф3): на нём стоит раскладка
// нового слоя. `app/[lang]/layout.tsx` строит колонку `flex h-full flex-col`,
// где прокручивается ТОЛЬКО содержимое (`main` с `min-h-0 flex-1
// overflow-y-auto`), а шапка и подвал остаются на местах. Убрать эти классы —
// значит уронить высоту колонки до высоты содержимого: подвал уедет вверх на
// коротких страницах, а на длинных появится вторая полоса прокрутки (страницы
// и `main` одновременно).
//
// ДОЛГ: `<html lang>` жёстко "en" при любом языке страницы. Здесь его не
// исправить — корневой макет стоит НАД сегментом `[lang]` и параметра не видит,
// а прочитать язык из заголовков нельзя: это сделало бы динамическим весь слой
// и стоило бы статики всех 26 разделов. Настоящее лечение — перенести
// `<html>/<body>` в `[lang]/layout.tsx`, оставив корню только страницу-вход
// (несколько корневых макетов через группы маршрутов). Отдельная задача.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground h-screen overflow-hidden">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

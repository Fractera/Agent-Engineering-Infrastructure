// Каркас нового слоя панели (шаг 501, фаза Ф1).
//
// ЧТО ЭТО. Второе дерево маршрутов, живущее РЯДОМ со старой панелью на том же
// порту :3002. `/` по-прежнему отдаёт сегодняшнюю оболочку байт в байт;
// `/en/<раздел>` — новую страницу. Пересечения нет: статический сегмент `api`
// в Next имеет приоритет над динамическим `[lang]`, поэтому 58 маршрутов API
// этот layout не перехватывает.
//
// ПОЧЕМУ ЗДЕСЬ НЕТ НИ ОДНОГО КЛИЕНТСКОГО КОМПОНЕНТА. Ради этого весь шаг:
// слова 82 языков остаются на сервере, страница приезжает готовым HTML и
// работает с выключенным JS. Гамбургер сделан на `<details>` — родная
// раскрывашка браузера, ей JS не нужен.
//
// ДОЛГ НА ВРЕМЯ СТРОЙКИ. `<html lang>` задаётся корневым `app/layout.tsx` и
// равен "en" для всех языков: владеть `<html>` может только один корневой
// layout, а он сейчас общий со старой панелью. На переключении (фаза Ф3) этот
// файл станет корневым и получит честный `<html lang={lang}>`.

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getAdminStrings, isAdminLanguage, adminLanguages } from "@/lib/i18n/admin-strings";
import { AdminHeader } from "./_components/admin-header";
import { AdminFooter } from "./_components/admin-footer";

// Предрендерим ВСЕ языки, которые есть в словаре. Сейчас их два — английский
// (по умолчанию) и русский, оба уезжают в сборку целиком. Никакого определения
// языка по браузеру нет и не будет: язык берётся из адреса, точка.
// `dynamicParams = true` оставлен на будущее — когда словарь дорастёт до 82
// языков, лишние отрендерятся по первому обращению, а не 82 × 26 на сборке.
export function generateStaticParams() {
  return adminLanguages().map((lang) => ({ lang }));
}

export const dynamicParams = true;

export default async function AdminLangLayout(
  { children, params }: { children: ReactNode; params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  // Незнакомый язык — честный 404, а не молчаливая подмена: адрес обязан
  // говорить правду о том, что отдаётся.
  if (!isAdminLanguage(lang)) notFound();

  const s = getAdminStrings(lang);

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <AdminHeader lang={lang} s={s} />
      {/* Прокручивается содержимое, а не страница: тело документа держит
          h-screen overflow-hidden, поэтому подвал остаётся на месте. */}
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <AdminFooter s={s} lang={lang} />
    </div>
  );
}

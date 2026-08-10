// Раздел «top-menu» (шаг 501, каркас). Серверная страница: берёт слова из словаря
// по языку из адреса и отдаёт их своей разметке. Логики пока нет.
//
// Куда что поедет дальше:
//   _lib/server.ts            — чтение и запись данных этого раздела (серверно)
//   _components/*.client.tsx  — остров взаимодействия, слова приезжают пропсами
// Словарь остаётся ОДНИМ файлом на всю панель: его заменяет владелец целиком
// после внешней модели, поэтому по папкам он не разъезжается.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { TopMenuPanel } from "./_components/top-menu-panel";

// 🔒 ДИНАМИЧЕСКАЯ НЕ РАДИ САМОЙ СТРАНИЦЫ, А РАДИ ШАПКИ (2026-08-11).
// Шапка живёт в общем макете и считает ЖИВОЕ состояние: область предупреждений,
// гейт кейсов, набор выключенных разделов. У статически предрендеренной страницы
// макет запекается на сборке вместе с шапкой — а сборка идёт ДО того, как
// владелец что-либо настроил. Поэтому «нет своего домена» горело в меню и после
// того, как домен был подключён и HTTPS работал: страница показывала снимок,
// сделанный на сборке. Любая новая страница под этим макетом обязана быть
// динамической по той же причине.
export const dynamic = "force-dynamic";

export default async function TopMenuPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["top-menu"];

  return (
    <PageShell lang={lang} slug="top-menu" s={s} title={page.title} hint={page.hint} notice={s.skeletonNotice}>
      <TopMenuPanel />
    </PageShell>
  );
}

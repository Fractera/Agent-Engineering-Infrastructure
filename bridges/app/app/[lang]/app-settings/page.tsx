// Раздел «app-settings» (шаг 501, каркас). Серверная страница: берёт слова из словаря
// по языку из адреса и отдаёт их своей разметке. Логики пока нет.
//
// Куда что поедет дальше:
//   _lib/server.ts            — чтение и запись данных этого раздела (серверно)
//   _components/*.client.tsx  — остров взаимодействия, слова приезжают пропсами
// Словарь остаётся ОДНИМ файлом на всю панель: его заменяет владелец целиком
// после внешней модели, поэтому по папкам он не разъезжается.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { AppSettingsPanel } from "./_components/app-settings-panel";

export default async function AppSettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["app-settings"];

  return (
    <PageShell title={page.title} hint={page.hint} notice={s.skeletonNotice}>
      <AppSettingsPanel />
    </PageShell>
  );
}

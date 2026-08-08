// Раздел «env» (шаг 501, каркас). Серверная страница: берёт слова из словаря
// по языку из адреса и отдаёт их своей разметке. Логики пока нет.
//
// Куда что поедет дальше:
//   _lib/server.ts            — чтение и запись данных этого раздела (серверно)
//   _components/*.client.tsx  — остров взаимодействия, слова приезжают пропсами
// Словарь остаётся ОДНИМ файлом на всю панель: его заменяет владелец целиком
// после внешней модели, поэтому по папкам он не разъезжается.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { EnvPanel } from "./_components/env-panel";

export default async function EnvPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["env"];

  return (
    <PageShell title={page.title} hint={page.hint} notice={s.skeletonNotice}>
      <EnvPanel />
    </PageShell>
  );
}

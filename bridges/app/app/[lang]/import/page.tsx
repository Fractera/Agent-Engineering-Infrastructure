// Раздел «import» (шаг 501, каркас). Серверная страница: берёт слова из словаря
// по языку из адреса и отдаёт их своей разметке. Логики пока нет.
//
// Куда что поедет дальше:
//   _lib/server.ts            — чтение и запись данных этого раздела (серверно)
//   _components/*.client.tsx  — остров взаимодействия, слова приезжают пропсами
// Словарь остаётся ОДНИМ файлом на всю панель: его заменяет владелец целиком
// после внешней модели, поэтому по папкам он не разъезжается.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { ImportPanel } from "./_components/import-panel";

export default async function ImportPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["import"];

  return (
    <PageShell title={page.title} hint={page.hint} notice={s.skeletonNotice}>
      <ImportPanel />
    </PageShell>
  );
}

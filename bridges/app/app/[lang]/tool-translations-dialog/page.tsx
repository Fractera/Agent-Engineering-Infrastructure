// Инструмент «translations-dialog» — своя страница (шаг 529).
//
// Всё общее (описание, требования, установка, адрес назначения, справка) держит
// каркас `ToolPage`: пять копий этой разметки разошлись бы при первой правке.
//
// Динамическая: состояние установки живое.

import { Languages } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { ToolPage } from "../_components/tool-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  return <ToolPage id="translations-dialog" lang={lang} s={s} icon={Languages} />;
}

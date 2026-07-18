"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { DashboardConfig } from "../table-config";
import type { UseCase } from "../use-cases";
import type { ActivationSchema } from "../activation";
import { useUiLang } from "../use-ui-lang";
import { resolveLocalized } from "../localized-text";
import { StreamAskConsole } from "../entities/controlpanel/view/console";
import { DashboardTableView } from "../entities/dashboard/view/table";
import { UseCasesListView } from "../entities/usecases/view/list";

// THE APPLICATION PAGE PREVIEW (step 254.8d, owner's spec) — the page-stub that SHOWS the format of a
// future public application page, never a hole: a modern page design on top (hero → a beautifully framed
// control panel where a user asks the AI by voice or words → the live table), closed by the use cases as
// a Q&A accordion. BASE-LAYER composition (like automation-accordions): it composes several entities'
// VIEW cores, which only a container/base-layer file may do (ROUTE-V3 law 3).
const I18N: Record<string, { badge: string; notDesigned: string }> = {
  en: { badge: "Page preview — the format of a future application page", notDesigned: "The request console appears here once the activation is designed." },
  ru: { badge: "Предпросмотр страницы — формат будущей страницы приложения", notDesigned: "Консоль запроса появится здесь, когда активация будет спроектирована." },
  es: { badge: "Vista previa — el formato de una futura página de la aplicación", notDesigned: "La consola de solicitudes aparecerá aquí cuando se diseñe la activación." },
  fr: { badge: "Aperçu — le format d'une future page d'application", notDesigned: "La console de requête apparaîtra ici une fois l'activation conçue." },
  it: { badge: "Anteprima — il formato di una futura pagina dell'applicazione", notDesigned: "La console delle richieste apparirà qui quando l'attivazione sarà progettata." },
  de: { badge: "Seitenvorschau — das Format einer künftigen Anwendungsseite", notDesigned: "Die Anfragekonsole erscheint hier, sobald die Aktivierung entworfen ist." },
  pt: { badge: "Pré-visualização — o formato de uma futura página da aplicação", notDesigned: "A consola de pedidos aparecerá aqui quando a ativação for desenhada." },
  pl: { badge: "Podgląd strony — format przyszłej strony aplikacji", notDesigned: "Konsola zapytań pojawi się tutaj, gdy aktywacja zostanie zaprojektowana." },
  tr: { badge: "Sayfa önizlemesi — gelecekteki uygulama sayfasının biçimi", notDesigned: "Etkinleştirme tasarlandığında istek konsolu burada görünecek." },
  nl: { badge: "Paginavoorbeeld — het formaat van een toekomstige applicatiepagina", notDesigned: "De aanvraagconsole verschijnt hier zodra de activering is ontworpen." },
};

export function AppPagePreview({
  automation, dashboard, cases,
}: { automation: string; dashboard?: DashboardConfig; cases: UseCase[] }) {
  const lang = useUiLang();
  const T = I18N[lang] ?? I18N.en;
  const [hero, setHero] = useState<{ title: string; description: string }>({ title: "", description: "" });
  const [schema, setSchema] = useState<ActivationSchema | null>(null);
  const [designed, setDesigned] = useState(false);
  const [isStream, setIsStream] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/projects/global`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { projects?: { automation: string; title?: string; description?: string }[] } | null) => {
        if (!alive) return;
        const p = d?.projects?.find((x) => x.automation === automation);
        setHero({ title: p?.title ?? automation.split("/")[1] ?? automation, description: p?.description ?? "" });
      })
      .catch(() => { /* the slug fallback stands */ });
    fetch(`/api/projects/activation?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { designed: boolean; schema: ActivationSchema; type: string } | null) => {
        if (!alive || !d) return;
        setSchema(d.schema);
        setDesigned(d.designed);
        setIsStream(d.type === "stream");
      })
      .catch(() => { /* console placeholder stands */ });
    return () => { alive = false; };
  }, [automation]);

  const table = dashboard?.tables?.[0];

  return (
    <div className="space-y-8 rounded-xl border bg-background p-6" data-apppages-view="page-preview">
      <p className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3" /> {T.badge}
      </p>

      {/* HERO — centered, as a real application page opens. */}
      <section className="mx-auto max-w-2xl space-y-3 py-6 text-center" data-apppages-section="hero">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{hero.title || "…"}</h1>
        {hero.description && <p className="text-base text-muted-foreground">{hero.description}</p>}
      </section>

      {/* THE CONTROL PANEL — the same interaction plane the product runs on (voice + words), framed. */}
      <section className="mx-auto max-w-2xl" data-apppages-section="console">
        {designed && isStream && schema ? (
          <div className="rounded-xl border bg-muted/20 p-1 shadow-sm">
            <StreamAskConsole automation={automation} schema={schema} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {T.notDesigned}
          </div>
        )}
      </section>

      {/* THE TABLE — the automation's first declared table, read-only. */}
      {table && (
        <section className="mx-auto max-w-3xl space-y-2" data-apppages-section="table">
          <h2 className="text-lg font-semibold">{resolveLocalized(table.title, lang)}</h2>
          <DashboardTableView automation={automation} table={table} />
        </section>
      )}

      {/* THE USE CASES — the closing Q&A accordion. */}
      <section className="mx-auto max-w-3xl" data-apppages-section="cases">
        <UseCasesListView automation={automation} seed={cases} />
      </section>
    </div>
  );
}

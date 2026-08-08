// Раздел «Настройки карты» (шаг 501, Ф2, партия 7).
//
// Разделение честное: полосу показаний — живут ли движки, какой регион активен,
// идёт ли загрузка — читает СЕРВЕР, поэтому состояние карты видно и с выключенным
// JS. Подбор региона (беседа, карта Leaflet, чекбоксы) остаётся клиентским,
// потому что это взаимодействие; без JS выбрать регион действительно нельзя, и
// страница этого не скрывает.
//
// Динамическая: состояние движков и прогресс загрузки — живые.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readGeoState } from "./_lib/geo";
import { RegionPicker } from "./_components/region-picker.client";

export const dynamic = "force-dynamic";

export default async function MapPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const g = s.map;

  const state = await readGeoState();
  const busy = state.provision.state === "downloading" || state.provision.state === "processing";

  const Dot = ({ up }: { up: boolean }) => (
    <span className={`inline-block size-2 rounded-full ${up ? "bg-emerald-500" : "bg-rose-500"}`} />
  );

  return (
    <PageShell title={s.pages.map.title} hint={g.intro}>
      {!state.reachable ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{g.loadError}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border px-3 py-2 text-[12px]">
            <span className="flex items-center gap-1.5"><Dot up={state.health.osrm} /> {g.osrm}</span>
            <span className="flex items-center gap-1.5"><Dot up={state.health.geocoder} /> {g.geocoder}</span>
            {state.config && (
              <span className="text-muted-foreground">
                {g.currentRegion}: <span className="font-mono text-foreground">{state.config.region}</span>
              </span>
            )}
            <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">{g.serviceNote}</span>
          </div>

          {busy && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              {g.downloading} {state.provision.region} — {state.provision.step}
            </div>
          )}

          <div className="mt-3">
            <RegionPicker
              lang={lang}
              busy={busy}
              labels={{
                assistant: g.assistant, greeting: g.quizGreeting, askPh: g.askPh, thinking: g.thinking,
                checkLabel: g.checkLabel, noneFound: g.noneFound, download: g.download,
                provisioningNote: g.provisioningNote, loadError: g.loadError, noKey: g.noKey,
                sizeGb: g.sizeGb, sizeMb: g.sizeMb, hours: g.hours, minutes: g.minutes,
              }}
            />
          </div>
        </>
      )}

      <HelpDetails label={g.helpLabel}>
        <p><strong>{g.helpWhatTitle}</strong> {g.helpWhat}</p>
        <p><strong>{g.helpAnswersTitle}</strong> {g.helpAnswers}</p>
        <p><strong>{g.helpWorthTitle}</strong> {g.helpWorth}</p>
        <p><strong>{g.helpWhyOwnTitle}</strong> {g.helpWhyOwn}</p>
        <p><strong>{g.helpCostTitle}</strong> {g.helpCost}</p>
        <p><strong>{g.helpWeakTitle}</strong> {g.helpWeak}</p>
      </HelpDetails>
    </PageShell>
  );
}

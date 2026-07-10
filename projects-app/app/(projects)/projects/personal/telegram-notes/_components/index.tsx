import Link from "next/link";
import { getAppConfig } from "@/config/app-config";
import { PROJECT_DESCRIPTION } from "../_data/description";
import { PROJECT_INTERFACE } from "../_data/interface";
import { PROJECT_COLUMNS } from "../_data/columns";
import { projectTabStrings } from "../_data/tab-i18n";
import { getCronJobs, getRecords, getCalendarEvents, getFinanceRecords, getImageRecords, getGeoRecords } from "../_lib/project-data";
import { UseCasesAccordion } from "./use-cases-accordion.client";
import { CollapsibleSection } from "./collapsible-section.client";
import { AutoRefresh } from "./auto-refresh.client";
import { CalendarSection } from "./calendar-section.client";
import { CronJobsTable } from "./cron-jobs-table.server";
import { MissingKeysModal } from "./missing-keys-modal.client";
import { RecordsFinancesPanel } from "./records-finances-panel.client";
import { DiagramAccordion } from "./diagram-accordion.client";
import { ProjectFooter } from "./project-footer.client";
import { TestsPanel } from "./tests-panel.client";
import { SettingsAccordion } from "./settings-accordion.client";
import { StatusIndicator } from "./status-indicator.client";

// The Projects zone renders in English for now (owner, step 188 — multilingual is a
// separate later step). The canvas + settings were always English.
const LANG = "en";

// The project's standalone page (contract R9), reshaped for step 188 Phase 2: a status
// pill by the title, the "About" accordion, the process canvas (R6), a run panel with a
// countdown to the next scheduled run, the Hooks layer, and the scheduled-runs queue.
// The two repetitive process/results tables are replaced by one unified table in Phase 3.
export default async function TelegramNotesProjectEntry() {
  const [cronJobs, records, calendarEvents, financeRecords, imageRecords, geoRecords] = await Promise.all([
    getCronJobs(),
    getRecords(),
    getCalendarEvents(),
    getFinanceRecords(),
    getImageRecords(),
    getGeoRecords(),
  ]);
  const d = PROJECT_DESCRIPTION;
  const t = projectTabStrings(LANG);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Live cockpit (step 207.x — item 9): periodic router.refresh() re-runs the (now
          force-dynamic) server components so records / finances / calendar update without a
          manual reload. Renders nothing. */}
      <AutoRefresh intervalMs={8000} />
      {/* Native missing-keys modal (186.3): prompts for any declared integration
          key absent from the runtime env; renders nothing when none are required. */}
      <MissingKeysModal lang={LANG} category="personal" project="telegram-notes" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/projects/personal"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← personal
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">{d.title}</h1>
        </div>
        {/* Running / degraded / broken pill on the breadcrumb row (shared store). */}
        <StatusIndicator />
      </div>

      {/* I/O boundary (§E, ontology entity 14 Port): the automation's typed Inputs → Outputs,
          shown in the header so the contract is visible at a glance. From _data/interface.ts. */}
      {(PROJECT_INTERFACE.inputs.length > 0 || PROJECT_INTERFACE.outputs.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="font-medium text-muted-foreground">Inputs</span>
          {PROJECT_INTERFACE.inputs.map((p, i) => (
            <span key={`in-${i}`} className="rounded border px-2 py-0.5 font-mono text-xs">
              {p.type}
              {p.endpoint ? ` · ${p.endpoint}` : ""}
            </span>
          ))}
          <span className="text-muted-foreground">→</span>
          <span className="font-medium text-muted-foreground">Outputs</span>
          {PROJECT_INTERFACE.outputs.map((p, i) => (
            <span key={`out-${i}`} className="rounded border px-2 py-0.5 font-mono text-xs">
              {p.type}
              {p.endpoint ? ` · ${p.endpoint}` : ""}
              {p.external ? " · external" : ""}
              {p.autonomous ? " · autonomous" : ""}
            </span>
          ))}
        </div>
      )}

      {/* Process diagram — collapsed accordion at the top (step 205 §G). */}
      <DiagramAccordion label={t.diagram} />

      {/* THE WORKING SURFACES FIRST (step 207.19, owner layout rule): the tables are the main
          workspace and must not sit below the settings/use-cases blocks. */}
      {/* The FOUR integrated storages (owner contract, step 207.20): Records · Finances · Images · GEO —
          one section, a right-aligned toggle, one table at a time (Records by default). Images and GEO
          are the registries every record links to (record_images / record_geo, many-to-many). */}
      <section className="space-y-3">
        <RecordsFinancesPanel
          columns={PROJECT_COLUMNS}
          records={records}
          finances={financeRecords}
          images={imageRecords}
          geo={geoRecords}
        />
      </section>

      {/* Calendar (step 205 §H): time-based automations put reminders on dates; the calendar marks
          them and lists the selected date's events. */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Calendar</h2>
        <CalendarSection events={calendarEvents} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.scheduled}</h2>
        <CronJobsTable jobs={cronJobs} />
      </section>

      {/* Use cases — ONE parent accordion; open it to see the per-case accordions inside. */}
      <CollapsibleSection title="Use cases">
        <UseCasesAccordion />
      </CollapsibleSection>

      {/* Settings — ONE parent accordion carrying the settings accordions AND the Tests block
          (incl. Custom test), per the owner's layout rule. */}
      <CollapsibleSection title="Settings">
        <SettingsAccordion />
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-medium">Tests</h3>
          <TestsPanel />
        </div>
      </CollapsibleSection>

      {/* Per-project footer (186.2): brand + deep-links + day/night theme toggle. */}
      <ProjectFooter shortName={getAppConfig().short_name} lang={LANG} />
    </main>
  );
}

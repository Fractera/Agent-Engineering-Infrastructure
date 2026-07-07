import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppConfig } from "@/config/app-config";
import { DEFAULT_LANGUAGE } from "@/config/translations/translations.config";
import { PROJECT_DESCRIPTION } from "../_data/description";
import { DEFAULT_HOOKS } from "../_data/hooks";
import { projectTabStrings } from "../_data/tab-i18n";
import { getCronJobs, getHooks, getProcessQueue, getRecords } from "../_lib/project-data";
import { getSubjects, getActivity } from "../_lib/subject-data";
import { PROJECT_COLUMNS } from "../_data/columns";
import { SUBJECT_KIND } from "../_data/subject";
import { SUBJECT_COLUMNS, ACTIVITY_COLUMNS } from "../_data/subject-view";
import { ContinueBanner } from "./continue-banner.client";
import { CronJobsTable } from "./cron-jobs-table.server";
import { HooksPanel } from "./hooks-panel.client";
import { MissingKeysModal } from "./missing-keys-modal.client";
import { ProcessFlow } from "./process-flow.client";
import { ProjectFooter } from "./project-footer.client";
import { ProcessQueueTable } from "./process-queue-table.server";
import { RecordsTable } from "./records-table.client";
import { RunPanel } from "./run-panel.client";

// The project's standalone page — the result contract (R9): presentation text,
// the process canvas (the execution schema, R6), the admin launch panel, the
// runs dashboard with results, and the scheduled cron queue. Reshape the
// diagram in _data/flow.ts; the tables fill from _lib/project-data.ts.
export default async function {{PROJECT_PASCAL}}ProjectEntry() {
  const [runs, records, cronJobs, hooks] = await Promise.all([
    getProcessQueue(),
    getRecords(),
    getCronJobs(),
    getHooks(),
  ]);
  // Inter-automation (§D, step 195): the Subjects table + activity log show ONLY for automations that
  // declare a cross-automation subject (SUBJECT_KIND set). Otherwise they are skipped entirely.
  const hasSubject = SUBJECT_KIND !== "";
  const [subjects, activity] = hasSubject
    ? await Promise.all([getSubjects(), getActivity()])
    : [[], []];
  // The Hooks layer (187.4) shows only for automations that use spoken triggers —
  // either the project seeded default phrases or hooks are already registered.
  const showHooks = DEFAULT_HOOKS.length > 0 || hooks.length > 0;
  const d = PROJECT_DESCRIPTION;
  // Monolingual zone (§3.12): all reusable tab strings render in the slot's default
  // language, English fallback for unlisted languages (187.5). The canvas + settings
  // stay English by design.
  const t = projectTabStrings(DEFAULT_LANGUAGE);
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Native missing-keys modal (186.3): prompts for any declared integration
          key absent from the runtime env; renders nothing when none are required. */}
      <MissingKeysModal lang={DEFAULT_LANGUAGE} />
      <div>
        <Link
          href="/projects/{{CATEGORY}}"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {{CATEGORY}}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">{d.title}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t.about}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            <span className="font-medium">Why: </span>
            {d.purpose}
          </p>
          <p>
            <span className="font-medium">Automation: </span>
            {d.automation}
          </p>
          <p>
            <span className="font-medium">How it works: </span>
            {d.how}
          </p>
        </CardContent>
      </Card>
      {/* Prominent continuation link (195) — the same destination as the footer icon, surfaced
          right under the description so it is actually found: continue in the architecture cockpit. */}
      <ContinueBanner lang={DEFAULT_LANGUAGE} />
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.diagram}</h2>
        <ProcessFlow />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.run}</h2>
        <RunPanel />
      </section>
      {showHooks && (
        <section className="space-y-3">
          <h2 className="text-xl font-medium">{t.hooks}</h2>
          <HooksPanel initialHooks={hooks} />
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.processes}</h2>
        <ProcessQueueTable runs={runs} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.results}</h2>
        <RecordsTable columns={PROJECT_COLUMNS} initialRows={records} />
      </section>
      {/* Inter-automation (§D, step 195): the shared subjects this automation drives + the
          cross-automation activity that touched them. Shown only when a subject is declared. */}
      {hasSubject && (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-medium">Subjects</h2>
            <RecordsTable
              columns={SUBJECT_COLUMNS}
              initialRows={subjects}
              apiBase="/api/projects/{{CATEGORY}}/{{PROJECT}}/subjects"
              storageKey="subjects-cols:{{CATEGORY}}/{{PROJECT}}"
            />
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-medium">Inter-automation activity</h2>
            <RecordsTable
              columns={ACTIVITY_COLUMNS}
              initialRows={activity}
              apiBase="/api/projects/{{CATEGORY}}/{{PROJECT}}/subjects?view=activity"
              storageKey="activity-cols:{{CATEGORY}}/{{PROJECT}}"
            />
          </section>
        </>
      )}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.scheduled}</h2>
        <CronJobsTable jobs={cronJobs} />
      </section>
      {/* Per-project footer (186.2): brand + deep-links to continue development
          (/service/architecture focused on this project) and to the env editor. */}
      <ProjectFooter shortName={getAppConfig().short_name} lang={DEFAULT_LANGUAGE} />
    </main>
  );
}

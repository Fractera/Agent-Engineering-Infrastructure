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
import { projectTabStrings } from "../_data/tab-i18n";
import { getCronJobs, getProcessQueue, getResults } from "../_lib/project-data";
import { CronJobsTable } from "./cron-jobs-table.server";
import { MissingKeysModal } from "./missing-keys-modal.client";
import { ProcessFlow } from "./process-flow.client";
import { ProjectFooter } from "./project-footer.client";
import { ProcessQueueTable } from "./process-queue-table.server";
import { ResultsTable } from "./results-table.server";
import { RunPanel } from "./run-panel.client";

// The project's standalone page — the result contract (R9): presentation text,
// the process canvas (the execution schema, R6), the admin launch panel, the
// runs dashboard with results, and the scheduled cron queue. Reshape the
// diagram in _data/flow.ts; the tables fill from _lib/project-data.ts.
export default async function {{PROJECT_PASCAL}}ProjectEntry() {
  const [runs, results, cronJobs] = await Promise.all([
    getProcessQueue(),
    getResults(),
    getCronJobs(),
  ]);
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
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.diagram}</h2>
        <ProcessFlow />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.run}</h2>
        <RunPanel />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.processes}</h2>
        <ProcessQueueTable runs={runs} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t.results}</h2>
        <ResultsTable results={results} />
      </section>
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

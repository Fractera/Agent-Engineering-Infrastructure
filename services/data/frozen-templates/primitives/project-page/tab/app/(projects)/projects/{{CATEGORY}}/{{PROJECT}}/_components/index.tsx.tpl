import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PROJECT_DESCRIPTION } from "../_data/description";
import { getCronJobs, getProcessQueue, getResults } from "../_lib/project-data";
import { CronJobsTable } from "./cron-jobs-table.server";
import { ProcessFlow } from "./process-flow.client";
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
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
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
          <CardTitle>About this project</CardTitle>
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
        <h2 className="text-xl font-medium">Process diagram</h2>
        <ProcessFlow />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Run the automation</h2>
        <RunPanel />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Current processes</h2>
        <ProcessQueueTable runs={runs} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Results</h2>
        <ResultsTable results={results} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Scheduled runs</h2>
        <CronJobsTable jobs={cronJobs} />
      </section>
    </main>
  );
}

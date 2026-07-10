import type { CronJob } from "../_lib/types";

// Scheduled runs (contract R9): the queue of cron events declared in this
// project's cron.json — what fractera-cron will fire and when. Rows come from
// _lib/project-data.ts (a plain file read of the co-located cron.json).
export function CronJobsTable({ jobs }: { jobs: CronJob[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-4 py-2 font-medium">Job</th>
            <th className="px-4 py-2 font-medium">Schedule (cron)</th>
            <th className="px-4 py-2 font-medium">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="px-4 py-6 text-center text-muted-foreground"
              >
                No scheduled runs — declare jobs in this project&apos;s
                cron.json to run the automation on a schedule.
              </td>
            </tr>
          ) : (
            jobs.map((job) => (
              <tr key={job.id} className="border-b last:border-0">
                <td className="px-4 py-2">{job.title}</td>
                <td className="px-4 py-2">
                  <code>{job.schedule}</code>
                </td>
                <td className="px-4 py-2">{job.enabled ? "yes" : "no"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

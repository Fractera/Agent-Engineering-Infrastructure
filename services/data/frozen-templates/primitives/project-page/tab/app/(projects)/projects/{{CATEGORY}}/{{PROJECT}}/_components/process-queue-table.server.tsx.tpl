import type { ProcessRun } from "../_lib/types";

// Current processes (the cron queue): in progress / completed / failed. Rows
// come from _lib/project-data.ts once the cron infrastructure records runs.
export function ProcessQueueTable({ runs }: { runs: ProcessRun[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-4 py-2 font-medium">Process</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Started</th>
            <th className="px-4 py-2 font-medium">Finished</th>
          </tr>
        </thead>
        <tbody>
          {runs.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-6 text-center text-muted-foreground"
              >
                No processes yet — the cron queue fills this table when the
                project runs.
              </td>
            </tr>
          ) : (
            runs.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-2">{r.process}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">{r.startedAt}</td>
                <td className="px-4 py-2">{r.finishedAt ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

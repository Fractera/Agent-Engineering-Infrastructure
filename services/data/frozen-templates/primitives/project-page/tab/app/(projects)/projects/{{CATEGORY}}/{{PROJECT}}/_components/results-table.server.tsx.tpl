import type { ProjectResult } from "../_lib/types";

// Results the project produced, each linking to its artifact (e.g. a published
// page). Rows come from _lib/project-data.ts once the cron infrastructure
// records results.
export function ResultsTable({ results }: { results: ProjectResult[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-4 py-2 font-medium">Result</th>
            <th className="px-4 py-2 font-medium">Artifact</th>
            <th className="px-4 py-2 font-medium">Produced</th>
          </tr>
        </thead>
        <tbody>
          {results.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="px-4 py-6 text-center text-muted-foreground"
              >
                No results yet — finished runs list their artifacts here.
              </td>
            </tr>
          ) : (
            results.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">
                  <a
                    href={r.artifactUrl}
                    className="underline underline-offset-4"
                  >
                    Open
                  </a>
                </td>
                <td className="px-4 py-2">{r.producedAt}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

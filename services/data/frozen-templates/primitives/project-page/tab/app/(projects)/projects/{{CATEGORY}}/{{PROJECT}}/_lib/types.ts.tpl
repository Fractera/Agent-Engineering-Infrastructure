// Data contracts of the project page tables.
export type ProcessRun = {
  id: string;
  process: string;
  status: "in-progress" | "completed" | "failed";
  startedAt: string; // ISO date-time
  finishedAt: string | null;
};

export type ProjectResult = {
  id: string;
  title: string;
  artifactUrl: string; // link to the produced artifact (e.g. a published page)
  producedAt: string; // ISO date-time
};

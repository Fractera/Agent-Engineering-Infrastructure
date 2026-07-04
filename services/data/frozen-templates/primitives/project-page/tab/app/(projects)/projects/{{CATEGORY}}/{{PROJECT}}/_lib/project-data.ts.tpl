import type { ProcessRun, ProjectResult } from "./types";

// Providers for the two tables of the project page. They return empty lists
// until the cron infrastructure (Projects layer) creates the substrate tables;
// wiring the real reads means replacing ONLY these two bodies — the page and
// tables are already connected.
export async function getProcessQueue(): Promise<ProcessRun[]> {
  return [];
}

export async function getResults(): Promise<ProjectResult[]> {
  return [];
}

// Single source of truth for the Projects-zone's whitelisted cron schedules → their
// period in seconds (step 218). Was implicitly duplicated between each automation's
// settings/route.ts (ALLOWED_SCHEDULES) and interval-settings.client.tsx (OPTIONS) —
// consolidated here so the cron-progress slider and any future consumer read the exact
// same 8 values, never a hand-kept parallel list.
export const SCHEDULE_PERIOD_SEC: Record<string, number> = {
  "* * * * *": 60,
  "*/5 * * * *": 300,
  "*/15 * * * *": 900,
  "*/30 * * * *": 1800,
  "0 * * * *": 3600,
  "0 */6 * * *": 21600,
  "0 */12 * * *": 43200,
  "0 0 * * *": 86400,
};

// Unknown/custom schedule → fall back to the 1-minute default (the frozen skeleton's
// own default) rather than guessing.
export function periodSecFromSchedule(schedule: string | null | undefined): number {
  return (schedule && SCHEDULE_PERIOD_SEC[schedule]) ?? 60;
}

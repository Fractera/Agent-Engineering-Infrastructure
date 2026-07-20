// This automation's CONFIG (frozen standard v4, step 222; toggles reversed in 237 — see
// app/(projects)/README.md, "The automation entities standard"). `entities` is the SEED for the
// hamburger menu's visibility switches (Control panel/Diagram/Calendar/Cron/Map/Dashboard/Processes/
// Analytics/User cases/Application pages) — the owner's live overrides win at runtime, no rebuild involved
// (see use-entities-live.ts). EVERYTHING defaults ON (owner, 2026-07-16): a fresh automation shows every
// surface it has, and the owner switches OFF what he does not need — never the other way round (an unseen
// switch is a surface the owner never discovers). The User cases review gate (step 231) stays mandatory
// before any Development Step regardless of this switch — this only toggles its accordion.
export const PROJECT_CONFIG = {
  entities: {
    controlpanel: true,
    diagram: true,
    dashboard: true,
    calendar: true,
    cron: true,
    map: true,
    processes: true,
    analytics: true,
    usecases: true,
    apppages: true,
  },
} as const;

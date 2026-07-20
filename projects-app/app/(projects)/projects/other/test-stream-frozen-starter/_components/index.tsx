import { PROJECT_DESCRIPTION } from "../_data/description";
import { INPUT_CHANNELS } from "../_data/channels";
import { PROBES } from "../_data/tests";
import { AUTOMATION_TYPE } from "../_data/automation";
import { AutomationStatusBar } from "../../../_shared/components/automation-status-bar.client";
import { CronProgressBar } from "../../../_shared/components/cron-progress-bar.client";
import { DevelopmentWaveBanner } from "../../../_shared/components/development-wave-banner.client";
import { ActivationLayer } from "../../../_shared/components/activation-layer.client";
import { ActivationQuiz } from "../../../_shared/components/activation-quiz.client";
import { AutomationAccordions } from "../../../_shared/components/automation-accordions.client";
import { DiagramSection } from "../../../_shared/components/diagram-section.client";
import { GroupDetailSection } from "../../../_shared/components/group-detail-section.client";
import { PROJECT_CONFIG } from "../_data/config";
import { USE_CASES } from "../_data/use-cases";
import { PROJECT_DASHBOARD } from "../_data/dashboard";
import { DIAGRAM_NODES } from "../_data/diagram";

// Frozen automation skeleton — VERSION 11. Header/footer come from the Projects-zone layout (step 213).
// A project is BORN with the automation menu (top right): Settings (AI model + input channels) and
// Tests — BOTH declaration-driven, so a model developing this automation sees and learns the standard
// from the first minute, BEFORE adapting anything to a real scenario. Grow it by filling
// _data/channels.ts and _data/tests.ts, then adding real nodes — see app/(projects)/README.md
// "The settings & tests declaration standard".
export default function AutomationEntry() {
  const d = PROJECT_DESCRIPTION;
  // A CHAINED automation (step 238) is a canvas-only container, not a workflow — it has nothing of its own
  // to build, so the generic Input/Logic/Output draft diagram below is meaningless for it. Its own page
  // shows GroupDetailSection instead: the same chain-brief editor + expanded member-automation nodes the
  // root canvas's eye icon and side panel already use — never a second implementation of either.
  const isGroup = AUTOMATION_TYPE === "chained";
  return (
    // PAGE ORDER (owner's requirement, step 243.1): status bar (breadcrumb/indicator/menu) FIRST, then the
    // development-wave NOTIFICATION, then the launch console, THEN the title — in that order, every time.
    // The banner/console used to be mounted by the projects-zone layout, ABOVE this whole file (step 241
    // E3.1) — that put them ABOVE the status bar, which the owner rejected. They are rendered HERE now, so
    // this exact order is what EVERY future automation is born with; the layout only provides the
    // WaveLockProvider context (one poll for the whole page) — see automation-page-chrome.client.tsx.
    <>
      {/* The cron slider (owner, 2026-07-15) — a 2px full-bleed orange bar at the very top that shrinks
          left→right over one cron period, then resets. It renders ONLY while this automation's cron is
          ACTIVE (the Cron accordion's enabled switch); off = no bar. It updates live when the switch flips.
          Full-bleed on purpose, so it sits ABOVE the centered <main>. */}
      <CronProgressBar automation="other/test-stream-frozen-starter" />
      <main className="mx-auto w-[85vw] max-w-full space-y-4 px-4 pt-8">
        <AutomationStatusBar
          category="other"
          categoryLabel="Other"
          modelEnvKey="TEST_STREAM_FROZEN_STARTER_MODEL"
          defaultModel="gpt-4o-mini"
          channels={INPUT_CHANNELS}
          probes={PROBES}
          automation="other/test-stream-frozen-starter"
          type={AUTOMATION_TYPE}
          entitiesSeed={PROJECT_CONFIG.entities}
        />
        {/* The ONLY launcher of development (step 240): appears the moment anything is staged. */}
        <DevelopmentWaveBanner automation="other/test-stream-frozen-starter" />
        {/* PHASE 2 (step 227) — on the FIRST visit the activation Quiz opens and brainstorms the owner's
            instruction into nodes: one quiz step = one node + one development step for the coding agent. */}
        <ActivationQuiz automation="other/test-stream-frozen-starter" />
        {/* Title + description. The "Add or modify automation" button that used to sit here is GONE (owner's
            requirement, step 240): development is launched in exactly ONE place — the wave banner above — and
            the automation is designed in the diagram's Builder and the entity panels. */}
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold">{d.title}</h1>
          <p className="max-w-3xl text-muted-foreground">{d.description}</p>
        </div>
      </main>
      {/* The launch control panel (step 241 E3, generalized to `stream` in step 243) — renders itself only
          for an INSTANCED or STREAM automation whose activation is declared; empty (null) otherwise. Its own
          full-width section, so it sits OUTSIDE the `<main>` above (not nested inside it). */}
      <ActivationLayer automation="other/test-stream-frozen-starter" />
      {/* The Diagram is ALWAYS visible — full screen width, 80vh — NOT an accordion (owner design,
          step 223.C). It is the automation's centerpiece; the node panel opens on click. A CHAINED
          automation shows GroupDetailSection here instead (step 238) — see the isGroup comment above. */}
      {isGroup ? (
        <GroupDetailSection automation="other/test-stream-frozen-starter" />
      ) : (
        <DiagramSection nodes={DIAGRAM_NODES} automation="other/test-stream-frozen-starter" />
      )}
      <main className="mx-auto w-[85vw] max-w-full space-y-8 px-4 py-8">
        {/* The OTHER entity accordions (step 222) + the mandatory Use cases. The Diagram is above,
            outside the accordion series. Driven by _data/config.ts + _data/use-cases.ts. */}
        <AutomationAccordions
          config={PROJECT_CONFIG.entities}
          cases={USE_CASES}
          automation="other/test-stream-frozen-starter"
          dashboard={PROJECT_DASHBOARD}
          type={AUTOMATION_TYPE}
        />
        {/* The "This is a frozen automation skeleton" intro blurb was REMOVED here (owner, step 241). */}
      </main>
    </>
  );
}

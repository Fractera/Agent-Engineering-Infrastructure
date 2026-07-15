import type { LocalizedText } from "./localized-text";

// FROZEN STANDARD — an automation's ACTIVATION (step 241 E3). The third member of the declaration family:
// _data/channels.ts (219) declares WHAT the automation talks to, _data/tests.ts (220) declares WHAT it probes,
// and _data/activation.ts declares WHAT ONE RUN OF IT TAKES.
//
// TEXT FIELDS ARE LocalizedText (step 243.2): a plain string for a real automation a coding agent writes in
// the owner's own language (never forced to translate); a `{en,ru,...}` map for content WE author ourselves
// that must ship in all ten (the frozen starter's own default activation). The panel resolves it via
// `resolveLocalized(text, lang)` — see _shared/localized-text.ts.
//
// WHY IT EXISTS (owner's rule): an INSTANCED automation runs as a FORK — every run carries its own settings
// (the article's keyword, how many sources, when to publish…). Those settings are CUSTOM TO EACH AUTOMATION:
// the product cannot know them, and must never presume them. The coding agent determines them while it
// designs that automation's architecture, and writes them down HERE. The launch control panel then renders
// itself from this file — a new automation gets a working control panel by writing DATA, never UI.
//
// DELIBERATELY NOT IN THIS SHAPE: rate limits, "at most one per day", cron policies, any scheduling rule.
// Those are not universal truths about automations — they are just parameters some automation happens to
// want. An automation that publishes at a chosen time simply declares a `datetime` param (e.g. `publishAt`);
// the product presumes nothing.
//
// THE CONTRACT WITH THE EXECUTOR (lib/executor.ts): a param's `key` is the name the executor puts into the
// run's context bag, and the nodes pick their arguments out of that bag BY NAME (their `paramsIn`). So a key
// declared here must match the name the nodes expect — that is the whole wiring, and there is no second one.

export type ActivationParamType =
  | "text"       // one line
  | "longtext"   // several lines (voice input is offered on these)
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "select";

export type ActivationParam = {
  /** The name the executor puts in the run context — must match what the nodes' paramsIn expect. */
  key: string;
  /** What the owner sees on the control panel, in plain words. */
  label: LocalizedText;
  type: ActivationParamType;
  /** A run cannot start without it: the executor refuses with `missing-params`, never a silent default. */
  required?: boolean;
  /** Prefilled on the panel (and used when the owner leaves an optional field alone). */
  default?: unknown;
  /** The per-field hint the panel shows — the same idea as ChannelKey.help (step 220): the form explains
   *  itself from data, instead of a hard-coded instruction living in the component. */
  help?: LocalizedText;
  /** `select` only — the closed set of choices. */
  options?: { value: string; label: LocalizedText }[];
};

export type ActivationSchema = {
  /** The control panel's own heading, e.g. "Launch an article". */
  title?: LocalizedText;
  /** One line: what ONE run of this automation actually does. */
  description?: LocalizedText;
  /** The settings one run takes. EMPTY means: not designed yet (the panel says so honestly). */
  params: ActivationParam[];
};

/** What a fresh automation is born with: nothing declared yet. The control panel renders an honest empty
 *  state and points at the fork-activation design surface (step 239) — never a dead end. */
export const EMPTY_ACTIVATION: ActivationSchema = { params: [] };

/** Is this automation's launch actually designed? (One place to ask — the panel and the executor agree.) */
export function isActivationDesigned(schema: ActivationSchema | undefined): boolean {
  return Boolean(schema?.params?.length);
}

/** The required keys a run must carry. The executor validates a fork's params against exactly this. */
export function requiredParamKeys(schema: ActivationSchema | undefined): string[] {
  return (schema?.params ?? []).filter((p) => p.required).map((p) => p.key);
}

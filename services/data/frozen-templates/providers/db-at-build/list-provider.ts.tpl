import type { {{TAB_PASCAL}}Data } from './post'

// SEAM — LIST PROVIDER (Slot A), source = db-at-build. DECLARED roadmap brick (not
// implemented). Contract is identical to the files provider: `getChildren()` returns
// the child list in the same {{TAB_PASCAL}}Data[] shape, but read FROM THE DATABASE
// AT BUILD TIME — so the output stays STATIC (no per-request DB call). When this brick
// is harvested (proven by live development), the constructor copies THIS file in place
// of the files provider for --source=db-at-build; nothing else in the tab changes.
// Static-first canon: DB-at-build → static; per-request DB is a different axis value.
export function getChildren(): {{TAB_PASCAL}}Data[] {
  throw new Error('list-provider db-at-build: not implemented (roadmap brick — see frozen-template-constructor.md §4.1)')
}

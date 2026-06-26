import type { {{TAB_PASCAL}}Data } from './post'

// Alternative list source: query the database AT BUILD TIME (output stays static).
// Not implemented yet — same getChildren() contract as the files provider.
export function getChildren(): {{TAB_PASCAL}}Data[] {
  throw new Error('list-provider db-at-build: not implemented (roadmap brick — see frozen-template-constructor.md §4.1)')
}

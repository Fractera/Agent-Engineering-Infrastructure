import { POSTS } from '../_list.generated'
import type { {{TAB_PASCAL}}Data } from './post'

// SEAM — LIST PROVIDER (Slot A), source = files. The constructor copies this into
// the tab's _lib/list-provider.ts when --source=files. It is the build-time
// filesystem scan: parser-fs generates _list.generated.ts from the co-located
// document folders; this exposes it behind the stable contract `getChildren()`.
// Static output. Swapping --source swaps ONLY this file — the index never changes.
export function getChildren(): {{TAB_PASCAL}}Data[] {
  return POSTS
}

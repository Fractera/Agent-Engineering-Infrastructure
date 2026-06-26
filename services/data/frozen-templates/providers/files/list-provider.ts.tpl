import { POSTS } from '../_list.generated'
import type { {{TAB_PASCAL}}Data } from './post'

// Where the document list comes from: the build-time filesystem scan. parser-fs
// generates _list.generated.ts from the document folders; getChildren() returns it.
export function getChildren(): {{TAB_PASCAL}}Data[] {
  return POSTS
}

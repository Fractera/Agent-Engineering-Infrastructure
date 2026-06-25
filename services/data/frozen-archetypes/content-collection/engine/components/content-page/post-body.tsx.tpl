import type { Block } from '@/lib/content/blocks/types'
import { getPostBodyUi } from '@/lib/content/post-body-ui'
import { renderBlocks } from '@/lib/content/blocks/registry'

// PostBody is now a thin dispatcher over the shared block registry
// (lib/content/blocks/registry). The actual per-kind renderers live in the
// catalog so any content surface (news, blog, documentation, StandardContentPage)
// renders blocks identically and new block kinds are added in one place.
// `headingId` is re-exported for the table-of-contents builders that import it
// from here, keeping their import paths unchanged.
export { headingId } from '@/lib/content/blocks/inline'

export function PostBody({ blocks, lang = 'en' }: { blocks: Block[]; lang?: string }) {
  const ui = getPostBodyUi(lang)
  return <div className="flex flex-col gap-6">{renderBlocks(blocks, lang, ui)}</div>
}

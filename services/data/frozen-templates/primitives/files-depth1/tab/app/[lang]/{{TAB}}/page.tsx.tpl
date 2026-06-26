// FROZEN ARCHETYPE TEMPLATE — content-collection. Thin router page for /{{TAB}} —
// renders the index entry from _components and nothing else. The post list is
// auto-discovered (parser-fs -> _list.generated.ts). Standard route shape:
// page.tsx thin + _components + posts.
import Index, { generateMetadata } from './_components'

export { generateMetadata }
export default Index

import { createContentPost } from '@/lib/content/create-content-post'
import { {{TAB_CAMEL}}Post } from '../../_lib/post'
import { get{{TAB_PASCAL}}Ui } from '../../_data'
import { BRAND } from '@/lib/brand'
import { data } from '../_data'

// Renders this document's _data through the shared post factory (format '{{FORMAT}}').
const post = createContentPost({
  format: '{{FORMAT}}',
  subPath: `/{{TAB}}/${data.meta.slug}`,
  resolve: lang => {{TAB_CAMEL}}Post(data, lang),
  chrome: (lang, p) => {
    const ui = get{{TAB_PASCAL}}Ui(lang)
    return {
      breadcrumbs: [
        { label: BRAND.name, href: `/${lang}` },
        { label: ui.breadcrumb, href: `/${lang}/{{TAB}}` },
        { label: p.title },
      ],
      backHref: `/${lang}/{{TAB}}`,
      backLabel: ui.back,
    }
  },
  titleSuffix: lang => get{{TAB_PASCAL}}Ui(lang).titleSuffix,
  minLabel: lang => get{{TAB_PASCAL}}Ui(lang).minRead,
})

export const generateMetadata = post.generateMetadata
export default post.Page

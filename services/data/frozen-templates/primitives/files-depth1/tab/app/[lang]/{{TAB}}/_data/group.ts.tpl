import type { GroupManifest } from '@/lib/content/group-manifest'

// Group manifest — menu placement + envelope echo, read by the site's menu system to
// show/sort this group in the top, footer, and left/right drawer menus. Registration
// metadata, NOT a structural aspect. Edit enabled/order to surface the group; flip
// childrenAsDropdown to expand its child pages as a dropdown instead of linking to the index.
export const group: GroupManifest = {
  slug: '{{TAB}}',
  languages: {{GROUP_LANGUAGES}},
  roles: {{GROUP_ROLES}},
  childrenAsDropdown: {{CHILDREN_AS_DROPDOWN}},
  menus: {
    top:    { enabled: {{MENU_TOP_ENABLED}}, order: {{MENU_TOP_ORDER}} },
    footer: { enabled: {{MENU_FOOTER_ENABLED}}, order: {{MENU_FOOTER_ORDER}} },
    left:   { enabled: {{MENU_LEFT_ENABLED}}, order: {{MENU_LEFT_ORDER}} },
    right:  { enabled: {{MENU_RIGHT_ENABLED}}, order: {{MENU_RIGHT_ORDER}} },
  },
}

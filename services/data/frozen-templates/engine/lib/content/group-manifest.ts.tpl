// Group manifest types — how a composed content group registers itself in the site's
// menus (top / footer / left & right drawers). One record per group, read by the menu
// system. This is REGISTRATION metadata, not a list-provider or a uniform aspect — it
// lives beside the group's data, decoupled from how the structure is composed.
export type MenuPlacement = {
  // show the group as a button in this menu
  enabled: boolean
  // sort position among the other buttons (lower = earlier)
  order: number
}

export type GroupMenus = {
  top: MenuPlacement
  footer: MenuPlacement
  left: MenuPlacement
  right: MenuPlacement
}

export type GroupManifest = {
  // URL + folder slug of the group (e.g. 'news')
  slug: string
  // languages this group ships (echo of the envelope, for the menu to filter by)
  languages: string[]
  // access shape (echo): 'public' | 'public+guest' | a role descriptor
  roles: string
  // true → the menu expands the group's child pages as a dropdown list; false → the
  // button just navigates to the group index route. The menu decides how to render it.
  childrenAsDropdown: boolean
  menus: GroupMenus
}

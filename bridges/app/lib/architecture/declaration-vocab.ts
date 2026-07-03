// Placement & access vocabulary of a declaration — the SAME words the frozen-
// pipeline confirm layer uses (frozen-templates registry.json confirm.labels):
// menus top/footer/left/right, visibility public / publicGuest / rolesOnly,
// admin, dashboard. One vocabulary, two entry points (Hermes order-sheet and
// the declare panel). Lives in its own module with no fs imports so CLIENT
// components can import the constants (readme-file.ts is server-only).
export type MenuSlot = "top" | "footer" | "left" | "right"
export type Visibility = "public" | "publicGuest" | "rolesOnly"
// A project's external automation: env keys are RECORDED in the declaration; the
// executor materializes them into app/.env.local via the env setter + rebuild
// (build-time env contract, step 143).
export type Integration = { name: string; envKeys: string[] }

export const MENU_SLOTS: MenuSlot[] = ["top", "footer", "left", "right"]
export const VISIBILITIES: Visibility[] = ["public", "publicGuest", "rolesOnly"]

"use server"

import { getMenuCategories } from "@/lib/db/get-menu-categories";
import type { MenuCategory } from "@/lib/types/menu-category";

// Server-action wrapper around getMenuCategories. Same role as the 22slots reference
// (src/features/route/get-menu-categories-action.ts), sourced from OUR storage.
export async function getMenuCategoriesAction(slotName: string): Promise<MenuCategory[]> {
  return getMenuCategories(slotName);
}

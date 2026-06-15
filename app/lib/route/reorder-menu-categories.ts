"use server"

import { db } from "@/lib/db";

// Persist a new order for menu categories (order_index = position in the array). Same contract
// as the 22slots reference reorder-menu-categories.
export async function reorderMenuCategories(
  categoryIds: string[],
  _slotName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    for (let i = 0; i < categoryIds.length; i++) {
      await db
        .prepare("UPDATE menu_categories SET order_index = ? WHERE id = ?")
        .run(i, categoryIds[i]);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

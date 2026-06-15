"use server"

import { db } from "@/lib/db";

// Delete a menu category and its translations + any footer page content keyed off its route_id.
// Same contract as the 22slots reference delete-menu-category.
export async function deleteMenuCategory(
  categoryId: string,
  _slotName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cat = (await db
      .prepare("SELECT route_id FROM menu_categories WHERE id = ?")
      .get(categoryId)) as Record<string, unknown> | null;

    await db.prepare("DELETE FROM menu_category_translations WHERE category_id = ?").run(categoryId);
    if (cat?.route_id) {
      await db.prepare("DELETE FROM footer_page_contents WHERE route_id = ?").run(cat.route_id as string);
    }
    await db.prepare("DELETE FROM menu_categories WHERE id = ?").run(categoryId);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

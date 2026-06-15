"use server"

import { randomUUID } from "crypto";
import { db } from "@/lib/db";

// Update a footer link's path + its per-language label (upsert the translation row). Same
// contract as the 22slots reference update-footer-link.
export async function updateFooterLink(params: {
  categoryId: string;
  routeId: string;
  label: string;
  path: string;
  lang: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .prepare("UPDATE menu_categories SET path = ? WHERE id = ?")
      .run(params.path, params.categoryId);

    const existing = (await db
      .prepare("SELECT id FROM menu_category_translations WHERE category_id = ? AND lang = ? LIMIT 1")
      .get(params.categoryId, params.lang)) as Record<string, unknown> | null;

    if (existing) {
      await db
        .prepare("UPDATE menu_category_translations SET label = ? WHERE id = ?")
        .run(params.label, existing.id as string);
    } else {
      await db
        .prepare("INSERT INTO menu_category_translations (id, category_id, lang, label) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), params.categoryId, params.lang, params.label);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

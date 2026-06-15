"use server"

import { randomUUID } from "crypto";
import { db } from "@/lib/db";

// Create a footer nav link = one menu_category (slot 'footer') + its label translation. The
// route_id is a generated identifier the footer page content keys off (footer pages are drawer
// overlays, not URL routes). Same contract as the 22slots reference create-footer-link.
export async function createFooterLink(params: {
  label: string;
  path: string;
  lang: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const categoryId = randomUUID();
    const routeId = randomUUID();
    const row = (await db
      .prepare("SELECT MAX(order_index) AS m FROM menu_categories WHERE slot_name = 'footer'")
      .get()) as Record<string, unknown> | null;
    const nextOrder = ((row?.m as number) ?? -1) + 1;

    await db
      .prepare("INSERT INTO menu_categories (id, slot_name, order_index, route_id, path) VALUES (?, 'footer', ?, ?, ?)")
      .run(categoryId, nextOrder, routeId, params.path);
    await db
      .prepare("INSERT INTO menu_category_translations (id, category_id, lang, label) VALUES (?, ?, ?, ?)")
      .run(randomUUID(), categoryId, params.lang, params.label);

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

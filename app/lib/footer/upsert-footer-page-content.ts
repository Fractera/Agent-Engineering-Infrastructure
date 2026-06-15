"use server"

import { randomUUID } from "crypto";
import { db } from "@/lib/db";

// Upsert the HTML body of a footer page (per route_id + lang). Optionally updates the owning
// menu_category's path (suggestedPath from the AI instruction flow). Same contract as the
// 22slots reference upsert-footer-page-content.
export async function upsertFooterPageContent(params: {
  routeId: string;
  lang: string;
  title: string;
  description: string;
  content: string;
  suggestedPath?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = (await db
      .prepare("SELECT id FROM footer_page_contents WHERE route_id = ? AND lang = ? LIMIT 1")
      .get(params.routeId, params.lang)) as Record<string, unknown> | null;

    if (existing) {
      await db
        .prepare("UPDATE footer_page_contents SET title = ?, description = ?, content = ? WHERE id = ?")
        .run(params.title, params.description, params.content, existing.id as string);
    } else {
      await db
        .prepare("INSERT INTO footer_page_contents (id, route_id, lang, title, description, content) VALUES (?, ?, ?, ?, ?, ?)")
        .run(randomUUID(), params.routeId, params.lang, params.title, params.description, params.content);
    }

    if (params.suggestedPath) {
      await db
        .prepare("UPDATE menu_categories SET path = ? WHERE route_id = ?")
        .run(params.suggestedPath, params.routeId);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

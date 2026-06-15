"use server"

import { randomUUID } from "crypto";
import { db } from "@/lib/db";

// Upsert the redirect flag/path of a footer page (per route_id + lang). Same contract as the
// 22slots reference upsert-footer-page-redirect.
export async function upsertFooterPageRedirect(params: {
  routeId: string;
  lang: string;
  useRedirect: boolean;
  redirectPath: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = (await db
      .prepare("SELECT id FROM footer_page_contents WHERE route_id = ? AND lang = ? LIMIT 1")
      .get(params.routeId, params.lang)) as Record<string, unknown> | null;

    if (existing) {
      await db
        .prepare("UPDATE footer_page_contents SET use_redirect = ?, redirect_path = ? WHERE id = ?")
        .run(params.useRedirect ? 1 : 0, params.redirectPath, existing.id as string);
    } else {
      await db
        .prepare("INSERT INTO footer_page_contents (id, route_id, lang, use_redirect, redirect_path) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), params.routeId, params.lang, params.useRedirect ? 1 : 0, params.redirectPath);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

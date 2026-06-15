"use server"

import { db } from "@/lib/db";

// Footer nav links = menu_categories joined with their per-language label. Same shape as the
// 22slots reference (src/features/footer/get-footer-links-action.ts); sourced from OUR storage.
// Footer pages are drawer overlays (not URL routes), so route_id/path live on menu_categories.

export type FooterLinkData = {
  categoryId: string;
  routeId: string;
  label: string;
  path: string;
  orderIndex: number;
};

export async function getFooterLinksAction(lang: string): Promise<FooterLinkData[]> {
  try {
    const categories = (await db
      .prepare("SELECT id, route_id, path, order_index FROM menu_categories WHERE slot_name = 'footer' ORDER BY order_index")
      .all()) as Record<string, unknown>[];
    if (!categories.length) return [];

    const translations = (await db
      .prepare("SELECT category_id, lang, label FROM menu_category_translations")
      .all()) as Record<string, unknown>[];

    return categories.map((cat) => {
      const cid = cat.id as string;
      const trans =
        translations.find((t) => t.category_id === cid && t.lang === lang) ??
        translations.find((t) => t.category_id === cid);
      return {
        categoryId: cid,
        routeId: (cat.route_id as string) ?? "",
        label: (trans?.label as string) ?? "",
        path: (cat.path as string) ?? "",
        orderIndex: (cat.order_index as number) ?? 0,
      };
    });
  } catch {
    return [];
  }
}

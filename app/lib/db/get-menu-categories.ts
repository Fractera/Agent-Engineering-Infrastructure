import { cache } from "react";
import { db } from "@/lib/db";
import type { MenuCategory } from "@/lib/types/menu-category";

// Footer/slot menu categories + their per-language labels. Same shape as the 22slots
// reference (lib/db/get-menu-categories.ts) but sourced from OUR storage (the
// menu_categories + menu_category_translations tables in SCHEMA) instead of Supabase.
// Empty by default (no seed) — the footer nav simply renders nothing until categories exist.
export const getMenuCategories = cache(async (slotName: string): Promise<MenuCategory[]> => {
  try {
    const categories = (await db
      .prepare("SELECT * FROM menu_categories WHERE slot_name = ? ORDER BY order_index")
      .all(slotName)) as Record<string, unknown>[];
    if (!categories.length) return [];

    const translations = (await db
      .prepare("SELECT * FROM menu_category_translations")
      .all()) as Record<string, unknown>[];

    const transByCategory = new Map<string, { id: string; categoryId: string; lang: string; label: string }[]>();
    for (const t of translations) {
      const cid = t.category_id as string;
      const list = transByCategory.get(cid) ?? [];
      list.push({ id: t.id as string, categoryId: cid, lang: t.lang as string, label: t.label as string });
      transByCategory.set(cid, list);
    }

    return categories.map((c) => {
      let allowedRoles: string[] = [];
      try { allowedRoles = JSON.parse((c.allowed_roles as string) ?? "[]"); } catch { allowedRoles = []; }
      return {
        id: c.id as string,
        slotName: c.slot_name as string,
        imageUrl: (c.image_url as string | null) ?? null,
        textDirection: ((c.text_direction as "ltr" | "rtl" | "auto") ?? "ltr"),
        allowedRoles,
        orderIndex: (c.order_index as number) ?? 0,
        translations: transByCategory.get(c.id as string) ?? [],
      };
    });
  } catch {
    return [];
  }
});

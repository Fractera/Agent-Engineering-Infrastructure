import { db } from "@/lib/db";
import type { FooterPageContent } from "@features/footer/get-footer-page-content";

// Same shape as the 22slots reference (src/features/footer/get-all-footer-page-contents.ts),
// sourced from OUR footer_page_contents table instead of Supabase.
export async function getAllFooterPageContents(lang: string): Promise<FooterPageContent[]> {
  try {
    const rows = (await db
      .prepare("SELECT * FROM footer_page_contents WHERE lang = ?")
      .all(lang)) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: row.id as string,
      routeId: row.route_id as string,
      lang: row.lang as string,
      title: (row.title as string) ?? "",
      description: (row.description as string) ?? "",
      content: (row.content as string) ?? "",
      useRedirect: !!row.use_redirect,
      redirectPath: (row.redirect_path as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}

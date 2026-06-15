import { db } from "@/lib/db";

// Same shape as the 22slots reference (src/features/footer/get-footer-page-content.ts),
// sourced from OUR footer_page_contents table instead of Supabase.

export type FooterPageContent = {
  id: string;
  routeId: string;
  lang: string;
  title: string;
  description: string;
  content: string;
  useRedirect: boolean;
  redirectPath: string | null;
};

function mapRow(row: Record<string, unknown>): FooterPageContent {
  return {
    id: row.id as string,
    routeId: row.route_id as string,
    lang: row.lang as string,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    content: (row.content as string) ?? "",
    useRedirect: !!row.use_redirect,
    redirectPath: (row.redirect_path as string | null) ?? null,
  };
}

export async function getFooterPageContent(routeId: string, lang: string): Promise<FooterPageContent | null> {
  try {
    const row = (await db
      .prepare("SELECT * FROM footer_page_contents WHERE route_id = ? AND lang = ? LIMIT 1")
      .get(routeId, lang)) as Record<string, unknown> | null;
    return row ? mapRow(row) : null;
  } catch {
    return null;
  }
}

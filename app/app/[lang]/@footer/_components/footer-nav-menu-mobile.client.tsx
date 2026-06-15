'use client';

import { useState } from 'react';
import { PanelTopOpen, PanelTopClose, X } from 'lucide-react';
import { Z_INDEX } from '@/config/ui/z-index.config';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { MenuCategory } from '@/lib/types/menu-category';
import type { RouteEntry } from '@/config/ui/initial-app-config';
import type { FooterPageContent } from '@features/footer/get-footer-page-content';

type Props = {
  categories: MenuCategory[];
  routes: readonly RouteEntry[];
  lang: string;
  routeIdsWithContent: Set<string> | null;
  pageContents: FooterPageContent[];
};

export function FooterNavMenuMobile({ categories, routes, lang, routeIdsWithContent, pageContents }: Props) {
  const [open, setOpen] = useState(false);

  if (categories.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md border border-current text-inherit opacity-60 hover:opacity-100 hover:bg-white/10 transition-colors"
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <PanelTopOpen size={18} /> : <PanelTopClose size={18} />}
      </button>

      {/* overlay */}
      <div
        className="fixed inset-0 transition-opacity duration-300"
        style={{
          zIndex: Z_INDEX.MOBILE_NAV_MENU - 1,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={() => setOpen(false)}
      />

      {/* sheet */}
      <div
        className="fixed left-0 right-0 bottom-10 bg-background text-foreground border border-border shadow-lg flex flex-col transition-transform duration-300 ease-out"
        style={{
          zIndex: Z_INDEX.MOBILE_NAV_MENU,
          transform: open ? 'translateY(0)' : 'translateY(calc(100% + 40px))',
          maxHeight: '60vh',
        }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
          <span className="text-xs font-semibold">Footer pages</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* accordion list */}
        <div className="overflow-y-auto flex-1">
          <Accordion
            type="single"
            defaultValue={
              categories.find((cat) => {
                const route = routes.find((r) => r.menuCategoryId === cat.id);
                return route && pageContents.some((c) => c.routeId === route.id);
              })?.id
            }
          >
            {categories.map((cat) => {
              const label = cat.translations.find((t) => t.lang === lang)?.label
                ?? cat.translations[0]?.label
                ?? cat.id;
              const route = routes.find((r) => r.menuCategoryId === cat.id);
              if (!route) return null;
              const pageContent = pageContents.find((c) => c.routeId === route.id);

              if (!pageContent) return null;

              return (
                <AccordionItem key={cat.id} value={cat.id}>
                  <AccordionTrigger className="px-4 text-sm" dir={cat.textDirection}>
                    {label}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div
                      className="px-4 py-2 text-sm text-foreground"
                      dangerouslySetInnerHTML={{ __html: pageContent.content }}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </>
  );
}

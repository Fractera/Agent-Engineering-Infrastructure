'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { MenuCategory } from '@/lib/types/menu-category';
import type { RouteEntry } from '@/config/ui/initial-app-config';
import type { FooterPageContent } from '@features/footer/get-footer-page-content';

type Props = {
  categories: MenuCategory[];
  routes: readonly RouteEntry[];
  lang: string;
  routeIdsWithContent: Set<string> | null;
  onLinkClick: (routeId: string) => void;
  pageContents: FooterPageContent[];
};

const arrowBtnClass =
  'shrink-0 flex items-center justify-center rounded-full border border-current opacity-50 hover:opacity-100 transition-opacity';

const linkClass =
  'inline-flex items-center h-7 px-2.5 text-[11px] font-semibold rounded-md whitespace-nowrap select-none transition-all opacity-60 hover:opacity-100 hover:bg-white/10';

const linkDisabledClass =
  'inline-flex items-center h-7 px-2.5 text-[11px] font-semibold rounded-md whitespace-nowrap select-none opacity-25 pointer-events-none cursor-default';

export function FooterNavMenuClient({ categories, routes, lang, routeIdsWithContent, onLinkClick, pageContents }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const viewport = containerRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;
    const { scrollLeft, scrollWidth, clientWidth } = viewport;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const viewport = containerRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;
    updateScrollState();
    viewport.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(viewport);
    return () => {
      viewport.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, categories]);

  const scrollTo = (direction: 'left' | 'right') => {
    const viewport = containerRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;
    viewport.scrollTo({ left: direction === 'left' ? 0 : viewport.scrollWidth, behavior: 'smooth' });
  };

  if (categories.length === 0) return null;

  return (
    <div className="hidden sm:flex items-center gap-1 w-full" ref={containerRef}>
      <button
        className={arrowBtnClass}
        style={{ width: 20, height: 20, opacity: canScrollLeft ? 1 : 0.3, pointerEvents: canScrollLeft ? 'auto' : 'none' }}
        onClick={() => scrollTo('left')}
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-2.5 w-2.5" />
      </button>

      <ScrollArea className="flex-1 min-w-0">
        <div className="flex items-center gap-0.5 w-max">
          {categories.map((cat) => {
            const label = cat.translations.find((t) => t.lang === lang)?.label
              ?? cat.translations[0]?.label
              ?? cat.id;
            const route = routes.find((r) => r.menuCategoryId === cat.id);
            if (!route) return null;
            const hasContent = pageContents.some((c) => c.routeId === route.id);
            return (
              <button
                key={cat.id}
                type="button"
                disabled={!hasContent}
                onClick={() => onLinkClick(route.id)}
                className={hasContent ? linkClass : linkDisabledClass}
                dir={cat.textDirection}
              >
                {label}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-0" />
      </ScrollArea>

      <button
        className={arrowBtnClass}
        style={{ width: 20, height: 20, opacity: canScrollRight ? 1 : 0.3, pointerEvents: canScrollRight ? 'auto' : 'none' }}
        onClick={() => scrollTo('right')}
        aria-label="Scroll right"
      >
        <ChevronRight className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

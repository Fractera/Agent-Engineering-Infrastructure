'use client';

import { useState } from 'react';
import { FolderTree } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCodeGenerator } from '@/providers/code-generator-provider.client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FooterNavMenuClient } from './footer-nav-menu-client.client';
import { FooterNavMenuMobile } from './footer-nav-menu-mobile.client';
import { FooterMenuDialog } from './footer-menu-dialog.client';
import { FooterToolbar } from './footer-toolbar.client';
import { FooterPageDrawer } from './footer-page-drawer.client';
import type { MenuCategory } from '@/lib/types/menu-category';
import type { RouteEntry } from '@/config/ui/initial-app-config';
import type { FooterPageContent } from '@features/footer/get-footer-page-content';
import { useFooterTranslation, FOOTER_TRANSLATIONS_EN } from '../_translations/get-footer-translation';
import type { FooterTranslations } from '../_translations/footer-enum.translations';

type FooterPanelProps = {
  lang: string;
  categories: MenuCategory[];
  routes: readonly RouteEntry[];
  bgColor?: string | null;
  bgClass?: string | null;
  pageContents: FooterPageContent[];
  logoPath?: string | null;
  companyName?: string;
  showDarkModeToggle?: boolean;
  showWidthToggle?: boolean;
  showFooterPages?: boolean;
  translations?: FooterTranslations;
};

export function FooterPanel({ lang, categories, routes, bgColor, bgClass, pageContents, logoPath, companyName = 'Fractera', showDarkModeToggle, showWidthToggle, showFooterPages, translations }: FooterPanelProps) {
  const t = useFooterTranslation(translations ?? FOOTER_TRANSLATIONS_EN);
  const { data: session } = useSession();
  const userRoles = ((session?.user as { roles?: string[] })?.roles ?? []);
  const isArchitect = userRoles.includes('architect');
  const { codeGeneratorOpen } = useCodeGenerator();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerRouteId, setDrawerRouteId] = useState<string | null>(null);


  return (
    <>
    <div className={`flex items-center h-full px-4 gap-2 border-t border-border min-w-0 ${bgColor === 'bg-primary' ? 'text-primary-foreground' : 'text-foreground'} ${bgColor && bgColor !== 'bg-background' ? bgColor : 'bg-background'} ${bgClass ?? ''}`}>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {showFooterPages && isArchitect && codeGeneratorOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="p-1.5 rounded-md hover:bg-white/10 opacity-60 hover:opacity-100 transition-all"
              >
                <FolderTree size={19} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t("footer.footer_pages")}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Avatar className="size-[26px]">
                {logoPath ? (
                  <img src={logoPath} alt={companyName} className="size-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                    {companyName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("footer.go_home")}</TooltipContent>
        </Tooltip>
        <span className="text-[12px] font-semibold select-none tracking-tight">
          {companyName}
        </span>
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        {showFooterPages && (
          <FooterNavMenuClient
            categories={categories}
            routes={routes}
            lang={lang}
            routeIdsWithContent={null}
            onLinkClick={setDrawerRouteId}
            pageContents={pageContents}
          />
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {showFooterPages && (
          <div className="flex sm:hidden">
            <FooterNavMenuMobile categories={categories} routes={routes} lang={lang} routeIdsWithContent={null} pageContents={pageContents} />
          </div>
        )}
        <FooterToolbar showDarkModeToggle={showDarkModeToggle} showWidthToggle={showWidthToggle} translations={translations ?? FOOTER_TRANSLATIONS_EN} lang={lang} />
      </div>
    </div>

    {showFooterPages && isArchitect && (
      <FooterMenuDialog
        open={menuOpen}
        onOpenChange={setMenuOpen}
        lang={lang}
        translations={translations ?? FOOTER_TRANSLATIONS_EN}
      />
    )}

    {showFooterPages && drawerRouteId && (
      <FooterPageDrawer
        content={pageContents.find((c) => c.routeId === drawerRouteId) ?? null}
        onClose={() => setDrawerRouteId(null)}
        translations={translations ?? FOOTER_TRANSLATIONS_EN}
      />
    )}
    </>
  );
}

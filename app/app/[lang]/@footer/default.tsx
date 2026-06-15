export const revalidate = 300;

import { FooterPanel } from './_components/footer-panel.client';
import { getMenuCategories } from '@/lib/db/get-menu-categories';
import { getSlotData } from '@/lib/db/get-slot-data';
import { getAllFooterPageContents } from '@features/footer/get-all-footer-page-contents';
import { getActivePluginsForSlot } from '@/lib/db/get-active-plugins-for-slot';
import { resolveLang } from '@/lib/routing/resolve-lang';
import { getLogoFilePath } from '@/lib/get-logo-path';
// ADAPTED: our app-config is a server-only on-disk file (getAppConfig), not a static object.
import { getAppConfig } from '@/config/app-config';
import { getFooterTranslation } from './_translations/get-footer-translation';

export default async function FooterDefault({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const validLang = resolveLang(lang);

  const [categories, slotConfig, pageContents, activePlugins, translations] = await Promise.all([
    getMenuCategories('footer'),
    getSlotData('footer', validLang),
    getAllFooterPageContents(validLang),
    getActivePluginsForSlot('footer'),
    getFooterTranslation(validLang),
  ]);

  const routes = slotConfig?.routes ?? [];
  const logoPath = getLogoFilePath();
  const appConfig = getAppConfig();
  const companyName = appConfig.short_name || appConfig.name || 'Fractera';

  return (
    <FooterPanel
      lang={validLang}
      categories={categories}
      routes={routes}
      bgColor={slotConfig?.bgColor ?? null}
      bgClass={slotConfig?.bgClass ?? null}
      pageContents={pageContents}
      logoPath={logoPath}
      companyName={companyName}
      showDarkModeToggle={activePlugins.includes('dark-mode-toggle')}
      showWidthToggle={activePlugins.includes('width-toggle')}
      showFooterPages={activePlugins.includes('footer-pages')}
      showLanguageSwitcher={activePlugins.includes('language-switcher')}
      translations={translations}
    />
  );
}

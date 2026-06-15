'use client';

import { Languages, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DarkModePlugin } from '@/components/plugins/dark-mode/dark-mode-plugin.client';
import { usePathname, useRouter } from 'next/navigation';
import { useWidthToggle } from '@/providers/width-toggle-provider.client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { getAvailableLanguages, DEFAULT_LANGUAGE, SINGLE_LANG_MODE } from '@/config/translations/translations.config';
import { getZIndexStyle } from '@/config/ui/z-index.config';
import { useFooterTranslation, FOOTER_TRANSLATIONS_EN } from '../_translations/get-footer-translation';
import type { FooterTranslations } from '../_translations/footer-enum.translations';

/** |[]| icon for center-width toggle */
function IconWidth({ wide }: { wide: boolean }) {
  return (
    <svg
      width="20"
      height="16"
      viewBox="0 0 24 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="2" x2="1" y2="18" />
      <rect x="4" y="4" width="16" height="12" rx="1" strokeWidth={wide ? 2.2 : 1.4} />
      <line x1="23" y1="2" x2="23" y2="18" />
    </svg>
  );
}


const btnClass =
  'p-1.5 rounded-md hover:bg-white/10 opacity-60 hover:opacity-100 transition-all inline-flex items-center justify-center';

import type { FooterTranslationKey } from '../_translations/footer-enum.translations';
function LanguageSwitcher({ t }: { t: (key: FooterTranslationKey) => string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState('');
  const [pendingLang, setPendingLang] = useState<string | null>(null);

  const allLanguages = useMemo(() => getAvailableLanguages(), []);

  const currentLang = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return segments[0] ?? DEFAULT_LANGUAGE;
  }, [pathname]);

  const languages = useMemo(() => {
    if (!filter) return allLanguages;
    return allLanguages.filter(
      (lang) =>
        lang.nativeName.toLowerCase().startsWith(filter.toLowerCase()) ||
        lang.englishName.toLowerCase().startsWith(filter.toLowerCase())
    );
  }, [allLanguages, filter]);

  const handleSelect = (langCode: string) => {
    if (langCode === currentLang) return;
    setPendingLang(langCode);
  };

  const handleConfirm = () => {
    if (!pendingLang) return;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0 && segments[0] === currentLang) {
      segments.shift();
    }
    router.replace(`/${pendingLang}/${segments.join('/')}`);
    setPendingLang(null);
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={btnClass}
              >
                <Languages size={16} />
              </button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent>{t("footer.lang_switch")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-auto p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              className="h-8 pl-8 text-sm"
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("footer.lang_search")}
              type="text"
              value={filter}
            />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup onValueChange={handleSelect} value={currentLang}>
            {languages.length > 0 ? (
              languages.map((lang) => (
                <DropdownMenuRadioItem className="cursor-pointer" key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span className="text-sm">{lang.nativeName}</span>
                  </span>
                </DropdownMenuRadioItem>
              ))
            ) : (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t("footer.lang_not_found")}
              </div>
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!pendingLang} onOpenChange={(open) => !open && setPendingLang(null)}>
        <AlertDialogContent style={getZIndexStyle('LANGUAGE_SWITCH_DIALOG')}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("footer.lang_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("footer.lang_dialog_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("footer.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>{t("footer.continue")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function FooterToolbar({ showDarkModeToggle, showWidthToggle, showLanguageSwitcher, translations, lang }: { showDarkModeToggle?: boolean; showWidthToggle?: boolean; showLanguageSwitcher?: boolean; translations?: FooterTranslations; lang?: string }) {
  const t = useFooterTranslation(translations ?? FOOTER_TRANSLATIONS_EN);
  const { centerMaxWidth, toggleWidth } = useWidthToggle();

  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {/* width-toggle plugin */}
      {showWidthToggle && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleWidth}
              className={btnClass}
            >
              <IconWidth wide={centerMaxWidth === 1250} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("footer.width_toggle")}</TooltipContent>
        </Tooltip>
      )}

      {/* language switcher — ADAPTED: gated by the Platform `languageSwitcher` flag too (not
          just SINGLE_LANG_MODE), so it joins the other 3 footer features under Admin -> Platform.
          Shows only when more than one language is configured AND the flag is on. */}
      {!SINGLE_LANG_MODE && showLanguageSwitcher && <LanguageSwitcher t={t} />}

      {/* dark-mode-toggle plugin */}
      {showDarkModeToggle && <DarkModePlugin lang={lang} />}
    </div>
  );
}

'use client';

import { Sun, Moon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme, type ThemeMode } from '@/providers/theme-provider.client';
import translationsData from './translations/dark-mode.translations.json';

function IconSystem() {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 3l0 18" />
      <path d="M12 9l4.65 -4.65" />
      <path d="M12 14.3l7.37 -7.37" />
      <path d="M12 19.6l8.85 -8.85" />
    </svg>
  );
}

const THEME_ICONS: Record<ThemeMode, React.ReactNode> = {
  system: <IconSystem />,
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
};

const btnClass =
  'p-1.5 rounded-md hover:bg-white/10 opacity-60 hover:opacity-100 transition-all inline-flex items-center justify-center';

type TranslationEntry = { key: string; translations: Record<string, string> };

function buildLabels(lang: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of Object.values(translationsData as Record<string, TranslationEntry>)) {
    result[entry.key] = entry.translations[lang] ?? entry.translations['en'] ?? entry.key;
  }
  return result;
}

const LABELS_EN = buildLabels('en');

export function DarkModePlugin({ lang }: { lang?: string }) {
  const { mode, cycleTheme } = useTheme();
  const labels = lang ? buildLabels(lang) : LABELS_EN;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={cycleTheme}
          className={btnClass}
          title={labels[`dark_mode.tooltip.${mode}`]}
        >
          {THEME_ICONS[mode]}
          <span className="sr-only">Toggle theme</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{labels[`dark_mode.tooltip.${mode}`]}</TooltipContent>
    </Tooltip>
  );
}

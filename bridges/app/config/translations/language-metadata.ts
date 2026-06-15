// config/translations/language-metadata.ts
// =============================================================================
// AI Translation Quality Tiers (WMT24, Lokalise 2025, AfricaNLP 2025):
//   A         — High quality  (93%+, major LLMs + DeepL + Google Translate)
//   B         — Good quality  (70–92%, reliable for UI strings)
//   beta      — Limited       (short UI strings OK, human review recommended)
//   community — Insufficient AI data; requires crowdsource verification
// =============================================================================
//
// VENDORED COPY of app/config/translations/language-metadata.ts. The admin (bridges/app) is a
// separate Next app and cannot import the Shell's modules, so the catalogue is duplicated here to
// feed the Platform panel's language picker (step 117). Pure static data — exempt from the
// 200-line rule; keep in sync with the Shell copy if the language set ever changes.

export type LanguageRegion =
  | 'North America'
  | 'Latin America'
  | 'Europe'
  | 'Eastern Europe & CIS'
  | 'Middle East & North Africa'
  | 'Sub-Saharan Africa'
  | 'Asia Pacific';

export type AITranslationTier = 'A' | 'B' | 'beta' | 'community';

export type LanguageMetadata = {
  code: string;              // ISO 639-1 two-letter code
  flag: string;              // Emoji flag
  nativeName: string;        // Name in the language itself
  englishName: string;       // Name in English
  regions: LanguageRegion[]; // One language can appear in multiple regions
  aiTier: AITranslationTier; // AI translation quality — used for UI badges & filtering
};

export const ALL_LANGUAGE_METADATA: Record<string, LanguageMetadata> = {

  // ============================================================================
  // NORTH AMERICA
  // ============================================================================
  en: { code: 'en', flag: '🇺🇸', nativeName: 'English',           englishName: 'English',     regions: ['North America', 'Europe', 'Asia Pacific', 'Sub-Saharan Africa'], aiTier: 'A' },
  fr: { code: 'fr', flag: '🇫🇷', nativeName: 'Français',           englishName: 'French',      regions: ['North America', 'Europe', 'Sub-Saharan Africa'],                aiTier: 'A' },

  // ============================================================================
  // LATIN AMERICA
  // ============================================================================
  es: { code: 'es', flag: '🇪🇸', nativeName: 'Español',            englishName: 'Spanish',     regions: ['Latin America', 'Europe', 'North America'],                     aiTier: 'A' },
  pt: { code: 'pt', flag: '🇧🇷', nativeName: 'Português',          englishName: 'Portuguese',  regions: ['Latin America', 'Europe', 'Sub-Saharan Africa'],                aiTier: 'A' },

  // ============================================================================
  // EUROPE
  // ============================================================================
  de: { code: 'de', flag: '🇩🇪', nativeName: 'Deutsch',            englishName: 'German',      regions: ['Europe'],                                                       aiTier: 'A' },
  it: { code: 'it', flag: '🇮🇹', nativeName: 'Italiano',           englishName: 'Italian',     regions: ['Europe'],                                                       aiTier: 'A' },
  nl: { code: 'nl', flag: '🇳🇱', nativeName: 'Nederlands',         englishName: 'Dutch',       regions: ['Europe'],                                                       aiTier: 'A' },
  sv: { code: 'sv', flag: '🇸🇪', nativeName: 'Svenska',            englishName: 'Swedish',     regions: ['Europe'],                                                       aiTier: 'A' },
  no: { code: 'no', flag: '🇳🇴', nativeName: 'Norsk',              englishName: 'Norwegian',   regions: ['Europe'],                                                       aiTier: 'A' },
  da: { code: 'da', flag: '🇩🇰', nativeName: 'Dansk',              englishName: 'Danish',      regions: ['Europe'],                                                       aiTier: 'A' },
  fi: { code: 'fi', flag: '🇫🇮', nativeName: 'Suomi',              englishName: 'Finnish',     regions: ['Europe'],                                                       aiTier: 'A' },
  is: { code: 'is', flag: '🇮🇸', nativeName: 'Íslenska',           englishName: 'Icelandic',   regions: ['Europe'],                                                       aiTier: 'B' },
  el: { code: 'el', flag: '🇬🇷', nativeName: 'Ελληνικά',           englishName: 'Greek',       regions: ['Europe'],                                                       aiTier: 'A' },
  pl: { code: 'pl', flag: '🇵🇱', nativeName: 'Polski',             englishName: 'Polish',      regions: ['Europe'],                                                       aiTier: 'A' },
  cs: { code: 'cs', flag: '🇨🇿', nativeName: 'Čeština',            englishName: 'Czech',       regions: ['Europe'],                                                       aiTier: 'A' },
  sk: { code: 'sk', flag: '🇸🇰', nativeName: 'Slovenčina',         englishName: 'Slovak',      regions: ['Europe'],                                                       aiTier: 'A' },
  hu: { code: 'hu', flag: '🇭🇺', nativeName: 'Magyar',             englishName: 'Hungarian',   regions: ['Europe'],                                                       aiTier: 'A' },
  ro: { code: 'ro', flag: '🇷🇴', nativeName: 'Română',             englishName: 'Romanian',    regions: ['Europe'],                                                       aiTier: 'A' },
  hr: { code: 'hr', flag: '🇭🇷', nativeName: 'Hrvatski',           englishName: 'Croatian',    regions: ['Europe'],                                                       aiTier: 'A' },
  sl: { code: 'sl', flag: '🇸🇮', nativeName: 'Slovenščina',        englishName: 'Slovenian',   regions: ['Europe'],                                                       aiTier: 'A' },
  et: { code: 'et', flag: '🇪🇪', nativeName: 'Eesti',              englishName: 'Estonian',    regions: ['Europe'],                                                       aiTier: 'A' },
  lv: { code: 'lv', flag: '🇱🇻', nativeName: 'Latviešu',           englishName: 'Latvian',     regions: ['Europe'],                                                       aiTier: 'A' },
  lt: { code: 'lt', flag: '🇱🇹', nativeName: 'Lietuvių',           englishName: 'Lithuanian',  regions: ['Europe'],                                                       aiTier: 'A' },
  mt: { code: 'mt', flag: '🇲🇹', nativeName: 'Malti',              englishName: 'Maltese',     regions: ['Europe'],                                                       aiTier: 'B' },
  ca: { code: 'ca', flag: '🇦🇩', nativeName: 'Català',             englishName: 'Catalan',     regions: ['Europe'],                                                       aiTier: 'A' },
  gl: { code: 'gl', flag: '🇪🇸', nativeName: 'Galego',             englishName: 'Galician',    regions: ['Europe'],                                                       aiTier: 'A' },
  cy: { code: 'cy', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', nativeName: 'Cymraeg',            englishName: 'Welsh',       regions: ['Europe'],                                                       aiTier: 'B' },
  ga: { code: 'ga', flag: '🇮🇪', nativeName: 'Gaeilge',            englishName: 'Irish',       regions: ['Europe'],                                                       aiTier: 'B' },
  eu: { code: 'eu', flag: '🇪🇸', nativeName: 'Euskera',            englishName: 'Basque',      regions: ['Europe'],                                                       aiTier: 'beta' },

  // ============================================================================
  // EASTERN EUROPE & CIS
  // ============================================================================
  ru: { code: 'ru', flag: '🇷🇺', nativeName: 'Русский',            englishName: 'Russian',     regions: ['Eastern Europe & CIS'],                                         aiTier: 'A' },
  uk: { code: 'uk', flag: '🇺🇦', nativeName: 'Українська',         englishName: 'Ukrainian',   regions: ['Eastern Europe & CIS'],                                         aiTier: 'A' },
  be: { code: 'be', flag: '🇧🇾', nativeName: 'Беларуская',         englishName: 'Belarusian',  regions: ['Eastern Europe & CIS'],                                         aiTier: 'B' },
  bg: { code: 'bg', flag: '🇧🇬', nativeName: 'Български',          englishName: 'Bulgarian',   regions: ['Eastern Europe & CIS'],                                         aiTier: 'A' },
  sr: { code: 'sr', flag: '🇷🇸', nativeName: 'Српски',             englishName: 'Serbian',     regions: ['Eastern Europe & CIS'],                                         aiTier: 'A' },
  bs: { code: 'bs', flag: '🇧🇦', nativeName: 'Bosanski',           englishName: 'Bosnian',     regions: ['Eastern Europe & CIS'],                                         aiTier: 'A' },
  mk: { code: 'mk', flag: '🇲🇰', nativeName: 'Македонски',         englishName: 'Macedonian',  regions: ['Eastern Europe & CIS'],                                         aiTier: 'B' },
  sq: { code: 'sq', flag: '🇦🇱', nativeName: 'Shqip',              englishName: 'Albanian',    regions: ['Eastern Europe & CIS'],                                         aiTier: 'B' },
  kk: { code: 'kk', flag: '🇰🇿', nativeName: 'Қазақша',            englishName: 'Kazakh',      regions: ['Eastern Europe & CIS'],                                         aiTier: 'B' },
  uz: { code: 'uz', flag: '🇺🇿', nativeName: 'Oʻzbekcha',          englishName: 'Uzbek',       regions: ['Eastern Europe & CIS'],                                         aiTier: 'B' },
  ky: { code: 'ky', flag: '🇰🇬', nativeName: 'Кыргызча',           englishName: 'Kyrgyz',      regions: ['Eastern Europe & CIS'],                                         aiTier: 'beta' },
  tg: { code: 'tg', flag: '🇹🇯', nativeName: 'Тоҷикӣ',             englishName: 'Tajik',       regions: ['Eastern Europe & CIS'],                                         aiTier: 'beta' },
  tk: { code: 'tk', flag: '🇹🇲', nativeName: 'Türkmençe',          englishName: 'Turkmen',     regions: ['Eastern Europe & CIS'],                                         aiTier: 'beta' },
  az: { code: 'az', flag: '🇦🇿', nativeName: 'Azərbaycan',         englishName: 'Azerbaijani', regions: ['Eastern Europe & CIS'],                                         aiTier: 'B' },
  hy: { code: 'hy', flag: '🇦🇲', nativeName: 'Հայերեն',            englishName: 'Armenian',    regions: ['Eastern Europe & CIS'],                                         aiTier: 'B' },
  ka: { code: 'ka', flag: '🇬🇪', nativeName: 'ქართული',            englishName: 'Georgian',    regions: ['Eastern Europe & CIS'],                                         aiTier: 'B' },
  mn: { code: 'mn', flag: '🇲🇳', nativeName: 'Монгол',             englishName: 'Mongolian',   regions: ['Eastern Europe & CIS', 'Asia Pacific'],                         aiTier: 'B' },

  // ============================================================================
  // MIDDLE EAST & NORTH AFRICA
  // ============================================================================
  ar: { code: 'ar', flag: '🇸🇦', nativeName: 'العربية',            englishName: 'Arabic',      regions: ['Middle East & North Africa'],                                   aiTier: 'A' },
  tr: { code: 'tr', flag: '🇹🇷', nativeName: 'Türkçe',             englishName: 'Turkish',     regions: ['Middle East & North Africa', 'Eastern Europe & CIS'],           aiTier: 'A' },
  he: { code: 'he', flag: '🇮🇱', nativeName: 'עברית',              englishName: 'Hebrew',      regions: ['Middle East & North Africa'],                                   aiTier: 'A' },
  fa: { code: 'fa', flag: '🇮🇷', nativeName: 'فارسی',              englishName: 'Persian',     regions: ['Middle East & North Africa'],                                   aiTier: 'A' },
  ku: { code: 'ku', flag: '🇮🇶', nativeName: 'Kurdî',              englishName: 'Kurdish',     regions: ['Middle East & North Africa'],                                   aiTier: 'beta' },

  // ============================================================================
  // SUB-SAHARAN AFRICA
  // ============================================================================
  af: { code: 'af', flag: '🇿🇦', nativeName: 'Afrikaans',          englishName: 'Afrikaans',   regions: ['Sub-Saharan Africa'],                                           aiTier: 'A' },
  sw: { code: 'sw', flag: '🇰🇪', nativeName: 'Kiswahili',          englishName: 'Swahili',     regions: ['Sub-Saharan Africa'],                                           aiTier: 'A' },
  ha: { code: 'ha', flag: '🇳🇬', nativeName: 'Hausa',              englishName: 'Hausa',       regions: ['Sub-Saharan Africa'],                                           aiTier: 'B' },
  yo: { code: 'yo', flag: '🇳🇬', nativeName: 'Yorùbá',             englishName: 'Yoruba',      regions: ['Sub-Saharan Africa'],                                           aiTier: 'B' },
  ig: { code: 'ig', flag: '🇳🇬', nativeName: 'Igbo',               englishName: 'Igbo',        regions: ['Sub-Saharan Africa'],                                           aiTier: 'B' },
  am: { code: 'am', flag: '🇪🇹', nativeName: 'አማርኛ',               englishName: 'Amharic',     regions: ['Sub-Saharan Africa'],                                           aiTier: 'B' },
  zu: { code: 'zu', flag: '🇿🇦', nativeName: 'isiZulu',            englishName: 'Zulu',        regions: ['Sub-Saharan Africa'],                                           aiTier: 'B' },
  xh: { code: 'xh', flag: '🇿🇦', nativeName: 'isiXhosa',           englishName: 'Xhosa',       regions: ['Sub-Saharan Africa'],                                           aiTier: 'beta' },
  rw: { code: 'rw', flag: '🇷🇼', nativeName: 'Kinyarwanda',        englishName: 'Kinyarwanda', regions: ['Sub-Saharan Africa'],                                           aiTier: 'beta' },
  so: { code: 'so', flag: '🇸🇴', nativeName: 'Soomaali',           englishName: 'Somali',      regions: ['Sub-Saharan Africa'],                                           aiTier: 'beta' },

  // ============================================================================
  // ASIA PACIFIC
  // ============================================================================
  zh: { code: 'zh', flag: '🇨🇳', nativeName: '中文',                englishName: 'Chinese',     regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  ja: { code: 'ja', flag: '🇯🇵', nativeName: '日本語',              englishName: 'Japanese',    regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  ko: { code: 'ko', flag: '🇰🇷', nativeName: '한국어',              englishName: 'Korean',      regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  hi: { code: 'hi', flag: '🇮🇳', nativeName: 'हिन्दी',             englishName: 'Hindi',       regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  ur: { code: 'ur', flag: '🇵🇰', nativeName: 'اردو',               englishName: 'Urdu',        regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  bn: { code: 'bn', flag: '🇧🇩', nativeName: 'বাংলা',              englishName: 'Bengali',     regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  te: { code: 'te', flag: '🇮🇳', nativeName: 'తెలుగు',             englishName: 'Telugu',      regions: ['Asia Pacific'],                                                 aiTier: 'B' },
  mr: { code: 'mr', flag: '🇮🇳', nativeName: 'मराठी',              englishName: 'Marathi',     regions: ['Asia Pacific'],                                                 aiTier: 'B' },
  kn: { code: 'kn', flag: '🇮🇳', nativeName: 'ಕನ್ನಡ',              englishName: 'Kannada',     regions: ['Asia Pacific'],                                                 aiTier: 'B' },
  gu: { code: 'gu', flag: '🇮🇳', nativeName: 'ગુજરાતી',            englishName: 'Gujarati',    regions: ['Asia Pacific'],                                                 aiTier: 'B' },
  ml: { code: 'ml', flag: '🇮🇳', nativeName: 'മലയാളം',             englishName: 'Malayalam',   regions: ['Asia Pacific'],                                                 aiTier: 'B' },
  ta: { code: 'ta', flag: '🇮🇳', nativeName: 'தமிழ்',             englishName: 'Tamil',       regions: ['Asia Pacific'],                                                 aiTier: 'B' },
  ne: { code: 'ne', flag: '🇳🇵', nativeName: 'नेपाली',             englishName: 'Nepali',      regions: ['Asia Pacific'],                                                 aiTier: 'B' },
  vi: { code: 'vi', flag: '🇻🇳', nativeName: 'Tiếng Việt',         englishName: 'Vietnamese',  regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  th: { code: 'th', flag: '🇹🇭', nativeName: 'ไทย',                englishName: 'Thai',        regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  id: { code: 'id', flag: '🇮🇩', nativeName: 'Bahasa Indonesia',    englishName: 'Indonesian',  regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  ms: { code: 'ms', flag: '🇲🇾', nativeName: 'Bahasa Melayu',      englishName: 'Malay',       regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  tl: { code: 'tl', flag: '🇵🇭', nativeName: 'Tagalog',            englishName: 'Tagalog',     regions: ['Asia Pacific'],                                                 aiTier: 'A' },
  my: { code: 'my', flag: '🇲🇲', nativeName: 'မြန်မာဘာသာ',         englishName: 'Burmese',     regions: ['Asia Pacific'],                                                 aiTier: 'B' },
  km: { code: 'km', flag: '🇰🇭', nativeName: 'ភាសាខ្មែរ',           englishName: 'Khmer',       regions: ['Asia Pacific'],                                                 aiTier: 'B' },
  lo: { code: 'lo', flag: '🇱🇦', nativeName: 'ລາວ',                englishName: 'Lao',         regions: ['Asia Pacific'],                                                 aiTier: 'beta' },

};

export const LANGUAGE_REGIONS: LanguageRegion[] = [
  'North America',
  'Latin America',
  'Europe',
  'Eastern Europe & CIS',
  'Middle East & North Africa',
  'Sub-Saharan Africa',
  'Asia Pacific',
];

/** Filter languages by AI translation tier */
export const getLanguagesByTier = (tier: AITranslationTier): LanguageMetadata[] =>
  Object.values(ALL_LANGUAGE_METADATA).filter((l) => l.aiTier === tier);

/** Returns true if language is production-ready (Tier A or B) */
export const isProductionReady = (code: string): boolean => {
  const lang = ALL_LANGUAGE_METADATA[code];
  return lang ? lang.aiTier === 'A' || lang.aiTier === 'B' : false;
};

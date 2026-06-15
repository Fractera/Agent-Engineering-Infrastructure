import { SHELL_LAYOUTS, TEMPLATE_REGISTRY } from '@/config/ui/template-registry';
import type { TitleMetaStyleEntry, ElementMetaStyleEntry, MetaStyleEntry, SlotMetaStyles } from '@/config/ui/initial-app-config';

export type { MetaStyleEntry, SlotMetaStyles };

// ─── Brand Book Slots ─────────────────────────────────────────────────────────

export const BRAND_BOOK_SLOTS = [
  'header',
  'promo-screen',
  'center-header',
  'center',
  'faq',
  'center-footer',
  'left',
  'right',
  'footer',
] as const;

export type BrandBookSlot = typeof BRAND_BOOK_SLOTS[number];

// ─── Meta Style Defaults (replaces brand-book-defaults.ts) ───────────────────

// Title HTML tags per slot and depth
const TITLE_TAGS_BY_SLOT: Record<string, string[]> = {
  'center':        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  'faq':           ['h2', 'h3', 'h4', 'h5', 'h6', 'h6'],
  'center-footer': ['h2', 'h3', 'h4', 'h5', 'h6', 'h6'],
  'left':          ['h2', 'h3', 'h4', 'h5', 'h6', 'h6'],
  'right':         ['h2', 'h3', 'h4', 'h5', 'h6', 'h6'],
  'footer':        ['h2', 'h3', 'h4', 'h5', 'h6', 'h6'],
  // header, promo-screen, center-header → 'p' (no SEO h-tags)
};

// Per-slot title primary classes (some slots have custom sizes)
const TITLE_CLASSES_BY_SLOT: Record<string, string[]> = {
  'header':          ['text-base font-semibold', 'text-sm font-medium',  'text-sm font-medium',  'text-sm font-medium',  'text-sm font-medium',  'text-sm font-medium'],
  'center-header':   ['text-2xl font-semibold',  'text-xl font-medium',  'text-lg font-medium',  'text-base font-medium','text-base font-medium','text-sm font-medium' ],
  'faq':             ['text-2xl font-semibold',  'text-xl font-medium',  'text-lg font-medium',  'text-base font-medium','text-base font-medium','text-sm font-medium' ],
  'center-footer':   ['text-2xl font-semibold',  'text-xl font-medium',  'text-lg font-medium',  'text-base font-medium','text-base font-medium','text-sm font-medium' ],
  'left':            ['text-2xl font-semibold',  'text-xl font-medium',  'text-lg font-medium',  'text-base font-medium','text-sm font-medium',  'text-sm font-medium' ],
  'right':           ['text-2xl font-semibold',  'text-xl font-medium',  'text-lg font-medium',  'text-base font-medium','text-sm font-medium',  'text-sm font-medium' ],
  'footer':          ['text-2xl font-semibold',  'text-xl font-medium',  'text-lg font-medium',  'text-base font-medium','text-sm font-medium',  'text-sm font-medium' ],
};

// Default title classes by depth (for slots not in TITLE_CLASSES_BY_SLOT)
const DEFAULT_TITLE_CLASSES_BY_DEPTH = [
  'text-5xl font-bold tracking-tight',
  'text-3xl font-semibold',
  'text-2xl font-semibold',
  'text-xl font-medium',
  'text-lg font-medium',
  'text-base font-medium',
];

// Description classes per slot and depth
const DESC_CLASSES_BY_SLOT: Record<string, string[]> = {
  'header':        ['text-sm text-muted-foreground',    'text-xs text-muted-foreground',    'text-xs text-muted-foreground',    'text-xs text-muted-foreground',    'text-xs text-muted-foreground',    'text-xs text-muted-foreground'   ],
  'center-header': ['text-base text-muted-foreground mt-2','text-sm text-muted-foreground mt-2','text-sm text-muted-foreground mt-1','text-sm text-muted-foreground mt-1','text-xs text-muted-foreground mt-1','text-xs text-muted-foreground mt-1'],
  'faq':           ['text-base text-muted-foreground mt-2','text-sm text-muted-foreground mt-2','text-sm text-muted-foreground mt-1','text-sm text-muted-foreground mt-1','text-xs text-muted-foreground mt-1','text-xs text-muted-foreground mt-1'],
  'center-footer': ['text-base text-muted-foreground mt-2','text-sm text-muted-foreground mt-2','text-sm text-muted-foreground mt-1','text-sm text-muted-foreground mt-1','text-xs text-muted-foreground mt-1','text-xs text-muted-foreground mt-1'],
  'left':          ['text-base text-muted-foreground mt-2','text-sm text-muted-foreground mt-2','text-sm text-muted-foreground mt-1','text-sm text-muted-foreground mt-1','text-xs text-muted-foreground mt-1','text-xs text-muted-foreground mt-1'],
  'right':         ['text-base text-muted-foreground mt-2','text-sm text-muted-foreground mt-2','text-sm text-muted-foreground mt-1','text-sm text-muted-foreground mt-1','text-xs text-muted-foreground mt-1','text-xs text-muted-foreground mt-1'],
  'footer':        ['text-base text-muted-foreground mt-2','text-sm text-muted-foreground mt-2','text-sm text-muted-foreground mt-1','text-sm text-muted-foreground mt-1','text-xs text-muted-foreground mt-1','text-xs text-muted-foreground mt-1'],
};

const DEFAULT_DESC_CLASSES_BY_DEPTH = [
  'text-xl text-muted-foreground mt-4',
  'text-lg text-muted-foreground mt-3',
  'text-base text-muted-foreground mt-2',
  'text-sm text-muted-foreground mt-2',
  'text-sm text-muted-foreground mt-1',
  'text-sm text-muted-foreground mt-1',
];

// Media classes per slot
const MEDIA_CLASSES_BY_SLOT: Record<string, string> = {
  'header':  'h-8 w-auto object-contain',
  'center':  'w-full object-cover rounded-lg',
  'left':    'w-full object-cover rounded-md',
  'right':   'w-full object-cover rounded-md',
  'footer':  'w-full object-cover rounded-md',
};

function buildMetaDefaults(slotName: string, depth: number): SlotMetaStyles {
  const d = Math.min(depth, 5);
  const prefix = `${slotName}-depth${d}`;
  const titleTag = TITLE_TAGS_BY_SLOT[slotName]?.[d] ?? 'p';
  const titleClasses = TITLE_CLASSES_BY_SLOT[slotName]?.[d] ?? DEFAULT_TITLE_CLASSES_BY_DEPTH[d] ?? 'text-base font-medium';
  const descClasses = DESC_CLASSES_BY_SLOT[slotName]?.[d] ?? DEFAULT_DESC_CLASSES_BY_DEPTH[d] ?? 'text-sm text-muted-foreground';
  const mediaClasses = MEDIA_CLASSES_BY_SLOT[slotName] ?? 'w-full object-cover';

  const title: TitleMetaStyleEntry = {
    tag: titleTag,
    wrapperClasses: '',
    primary: { classes: titleClasses, font: '', animation: '' },
    accent:  { classes: '', font: '', animation: '' },
    third:   { classes: '', font: '', animation: '' },
    animation: '',
  };
  const label: ElementMetaStyleEntry = {
    tag: 'p',
    classes: 'text-xs font-semibold uppercase tracking-widest text-primary',
    font: '',
    animation: '',
  };
  const description: ElementMetaStyleEntry = {
    tag: 'p',
    classes: descClasses,
    font: '',
    animation: '',
  };
  const media: ElementMetaStyleEntry = {
    tag: 'img',
    classes: mediaClasses,
    font: '',
    animation: '',
  };
  const link: ElementMetaStyleEntry = {
    tag: 'a',
    classes: 'text-sm font-medium text-primary underline underline-offset-4 hover:opacity-70',
    font: '',
    animation: '',
  };

  return {
    [`${prefix}-label`]:       label,
    [`${prefix}-title`]:       title,
    [`${prefix}-description`]: description,
    [`${prefix}-media`]:       media,
    [`${prefix}-link`]:        link,
  };
}

export const META_STYLE_DEFAULTS: SlotMetaStyles = Object.fromEntries(
  BRAND_BOOK_SLOTS.flatMap((slot) =>
    [0, 1, 2, 3, 4, 5].flatMap((depth) => Object.entries(buildMetaDefaults(slot, depth)))
  )
);

// ─── Container Styles ─────────────────────────────────────────────────────────

export type ContainerStyles = {
  shellLayout: string;
  shellClasses: string;
  overlayClasses: string;
  contentClasses: string;
  metaClasses: string;
  widgetClasses: string;
  textClasses: string;
  mediaClasses: string;
  childrenClasses: string;
  widgetAnimation: string;
  metaWidgetDirection: 'col' | 'row';
  metaWidgetReverse: boolean;
  bgType: 'none' | 'color' | 'image' | 'video' | 'css_animation';
  bgColorClass: string;
  bgImageUrl: string;
  bgImageBlurData: string;
  bgVideoUrl: string;
  bgVideoPosterUrl: string;
  bgOverlayClass: string;
  bgCssAnimationName: string;
};

export const DEFAULT_CONTAINERS: ContainerStyles = {
  shellLayout: 'stack',
  shellClasses: '',
  overlayClasses: '',
  contentClasses: '',
  metaClasses: '',
  widgetClasses: '',
  textClasses: '',
  mediaClasses: '',
  childrenClasses: '',
  widgetAnimation: '',
  metaWidgetDirection: 'col',
  metaWidgetReverse: false,
  bgType: 'none',
  bgColorClass: '',
  bgImageUrl: '',
  bgImageBlurData: '',
  bgVideoUrl: '',
  bgVideoPosterUrl: '',
  bgOverlayClass: '',
  bgCssAnimationName: '',
};

const DEPTHS = [0, 1, 2, 3, 4, 5] as const;

export function buildPreset(shellLayout: string, depth: number, overrides: Partial<ContainerStyles> = {}): ContainerStyles {
  const wrappers = TEMPLATE_REGISTRY[shellLayout]?.wrappers;
  return {
    shellLayout,
    shellClasses:    wrappers?.shellClasses    ?? '',
    overlayClasses:  wrappers?.overlayClasses  ?? '',
    contentClasses:  wrappers?.contentClasses  ?? '',
    metaClasses:     wrappers?.metaClasses     ?? '',
    widgetClasses:   wrappers?.widgetClasses   ?? '',
    textClasses:     wrappers?.textClasses     ?? '',
    mediaClasses:    wrappers?.mediaClasses    ?? '',
    childrenClasses: wrappers?.childrenClasses ?? '',
    widgetAnimation: wrappers?.widgetAnimation ?? '',
    metaWidgetDirection: 'col',
    metaWidgetReverse:   false,
    bgType:           'none',
    bgColorClass:     '',
    bgImageUrl:       '',
    bgImageBlurData:  '',
    bgVideoUrl:       '',
    bgVideoPosterUrl: '',
    bgOverlayClass:   '',
    bgCssAnimationName: '',
    ...overrides,
  };
}

export const LAYOUT_PRESETS: Record<string, Record<number, ContainerStyles>> = Object.fromEntries(
  SHELL_LAYOUTS.map((layout) => [
    layout.value,
    Object.fromEntries(
      DEPTHS.map((depth) => [depth, buildPreset(layout.value, depth)])
    ),
  ])
);

// ─── Slot Presets (аналог LAYOUT_PRESETS для уровня слота) ───────────────────
// LAYOUT_PRESETS: Record<shellLayout, Record<depth, ContainerStyles>>
// SLOTS_PRESETS:  Record<slotName,    Record<depth, ContainerStyles>>

const SLOT_PAGES_LAYOUT: Record<string, string> = {
  'header':        'flex items-center w-full h-full px-4 gap-4',
  'promo-screen':  'flex flex-col items-center justify-center w-full h-full',
  'center-header': 'flex items-center w-full h-full px-6 gap-4',
  'center':        'flex flex-col w-full h-full overflow-y-auto',
  'center-footer': 'flex items-center w-full h-full px-6 gap-4',
  'left':          'flex flex-col w-full h-full overflow-y-auto px-4 py-6 gap-6',
  'right':         'flex flex-col w-full h-full overflow-y-auto px-4 py-6 gap-6',
  'footer':        'flex items-center w-full h-full px-4 gap-4',
};

function buildSlotPreset(slotName: string, _depth: number, overrides: Partial<ContainerStyles> = {}): ContainerStyles {
  return {
    shellLayout: 'stack',
    shellClasses: '',
    overlayClasses: '',
    contentClasses: SLOT_PAGES_LAYOUT[slotName] ?? 'flex flex-col w-full h-full',
    metaClasses: '',
    widgetClasses: '',
    textClasses: '',
    mediaClasses: '',
    childrenClasses: '',
    widgetAnimation: '',
    metaWidgetDirection: 'col',
    metaWidgetReverse: false,
    bgType: 'none',
    bgColorClass: '',
    bgImageUrl: '',
    bgImageBlurData: '',
    bgVideoUrl: '',
    bgVideoPosterUrl: '',
    bgOverlayClass: '',
    bgCssAnimationName: '',
    ...overrides,
  };
}

const SLOT_BG_OVERRIDES: Partial<Record<string, Partial<ContainerStyles>>> = {};

export const SLOTS_PRESETS: Record<string, Record<number, ContainerStyles>> = Object.fromEntries(
  BRAND_BOOK_SLOTS.map((slot) => [
    slot,
    Object.fromEntries(
      DEPTHS.map((depth) => [depth, buildSlotPreset(slot, depth, SLOT_BG_OVERRIDES[slot] ?? {})])
    ),
  ])
);

// @ts-nocheck — временный файл, будет удалён после перехода на Supabase seed
import type { BrandBookBgEntry } from '@/lib/types/background-config';
/**
 * Unified routes config for all 23 slots.
 * Single model: page slots, drawer slots, modal slots — same structure.
 * routeType derived from slot name via getRouteTypeFromSlot().
 * Migrate consumers from panel-routes.config.ts gradually.
 */

export const SLOT_NAMES = [
  'header',
  'footer',
  'promoScreen',
  'centerHeader',
  'center',
  'centerFooter',
  'faq',
  'left',
  'leftHeader',
  'leftFooter',
  'right',
  'rightHeader',
  'rightFooter',
  'leftDrawer',
  'rightDrawer',
  'footerDrawer',
  'footerModal',
  'codeGenerator',
  'body',
] as const;

export type SlotName = (typeof SLOT_NAMES)[number];

export const ROUTE_TYPES = ['page', 'intercepting-drawer', 'intercepting-modal'] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export const ROUTE_TYPE_LABELS: Record<RouteType, string> = {
  'page': 'Page',
  'intercepting-drawer': 'Drawer',
  'intercepting-modal': 'Modal',
};

export function getRouteTypeFromSlot(slot: SlotName): RouteType {
  if (slot.includes('Modal')) return 'intercepting-modal';
  if (slot.includes('Drawer')) return 'intercepting-drawer';
  return 'page';
}

export const MARKETPLACE_FILTERS = [
  '@personal',
  '@public',
  '@free',
  '@cheap',
  '@bestSeller',
] as const;

export type MarketplaceFilter = (typeof MARKETPLACE_FILTERS)[number];

/** Static = one file per path. Dynamic = [slug] handler. */
export const ROUTE_GENERATION_TYPES = ['static', 'dynamic'] as const;
export type RouteGenerationType = (typeof ROUTE_GENERATION_TYPES)[number];

export type FractalEntry = {
  id: string;
  routeId: string;
  parentFractalId: string | null;
  name: string;
  marketplaceItemId: string;
  orderIndex: number;
  isLocked?: boolean;
  customClasses?: string;
  brandBookFractalId?: string | null;
  customStyleId?: string | null;
  // Внешние мета фрактала (FractalShell)
  // metaTitle / metaDescription — resolved из fractal_meta_translations для текущего lang
  metaTitle?: string | null;
  metaDescription?: string | null;
  // Fallback из дефолтного языка (en) — когда перевода для текущего lang нет
  metaTitleFallback?: string | null;
  metaDescriptionFallback?: string | null;
  metaLabelFallback?: string | null;
  // Label (eyebrow text above title) — переводимый
  metaLabel?: string | null;
  // Медиа не переводится — один URL для всех локалей
  metaMediaUrl?: string | null;
  metaMediaType?: 'image' | 'video' | null;
  // Sizing карточки внутри карусели
  carouselItemType?: 'vertical' | 'square' | 'horizontal' | null;
  carouselAutoPlay?: boolean | null;
  // Grid layout — адаптивная сетка
  gridColumns?: number | null;
  gridItemType?: 'vertical' | 'square' | 'horizontal' | null;
  gridGap?: 'none' | 'sm' | 'md' | 'lg' | null;
  // Ссылка (link_text + link_href) — переводимые, хранятся в fractal_meta_translations
  metaLinkText?: string | null;
  metaLinkHref?: string | null;
  metaLinkTextFallback?: string | null;
  metaLinkHrefFallback?: string | null;
  titleWordStyles?: TitleWordStyle[] | null;
  // Семантический тег заголовка фрактала — рассчитывается при создании по слоту и глубине
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | null;
  // Глубина вложенности в дереве фракталов (0 = корневой, max 6)
  depth?: number | null;
  // Фрактал рендерится только внутри виджета, не как самостоятельный элемент страницы
  isRenderOnlyIntoWidget?: boolean | null;
  // Фрактал использует Claude Computer Use
  isUsingComputer?: boolean | null;
  // Сценарий автоматизации (jsonb, например React Flow: { nodes, edges })
  automationScenario?: Record<string, unknown> | null;
  // Кастомные стили фрактала — перекрывают brand_book_fractal поле за полем
  customMetaStyles?: SlotMetaStyles | null;
  customShellConfig?: SlotShellConfig | null;
  // Background — from fractal_custom_styles (custom) or brand_book_fractal (brand_book default)
  bgType?: 'none' | 'color' | 'image' | 'video' | 'css_animation' | null;
  bgColorClass?: string | null;
  bgImageUrl?: string | null;
  bgImageBlurData?: string | null;
  bgVideoUrl?: string | null;
  bgVideoPosterUrl?: string | null;
  bgOverlayClass?: string | null;
  bgCssAnimationName?: string | null;
  // Widget spec — ТЗ виджета из таблицы fractal_widget_specs
  widgetSpec?: string | null;
};

export const ALL_ROLES = [
  'guest',
  'user',
  'vip_user',
  'subscriber_lite',
  'subscriber_standard',
  'subscriber_max',
  'buyer',
  'manager',
  'senior_manager',
  'support_manager',
  'delivery_manager',
  'finance',
  'content_editor',
  'admin',
  'architect',
] as const;

export type Role = typeof ALL_ROLES[number];

export const DEFAULT_ALLOWED_ROLES: Role[] = [];

export type RouteEntry = {
  id: string;
  path: string;
  title: string;
  description: string;
  routeGenerationType: RouteGenerationType | string;
  isPublic?: boolean;
  isDynamic?: boolean;
  paramName?: string;
  fractals: FractalEntry[];
  allowedRoles: string[];
  unauthorizedRedirect: string;
  isLocked?: boolean;
  requiresGuestRegistration?: boolean;
  customClasses?: string;
  menuCategoryId?: string | null;
  pagesLayout?: string;
  pageBgType?: string;
  pageBgColorClass?: string;
  pageBgImageUrl?: string;
  pageBgImageBlurData?: string;
  pageBgVideoUrl?: string;
  pageBgVideoPosterUrl?: string;
  pageBgOverlayClass?: string;
  pageBgCssAnimationName?: string;
};

export type DefaultPageMarketplace = {
  marketplaceTags: string[];
  marketplaceFilters: readonly string[];
  marketplaceAiSearchPrompt: string;
};

export type ShellLayout =
  | 'content'
  | 'media-hero'
  | 'hero-content-bg'
  | 'hero-meta-bg'
  | 'split-media-right'
  | 'split-media-left'
  | 'card-media'
  | 'card-widget-bg'
  | 'widget-only'
  | 'null-widget'
  | 'carousel'
  | 'grid'
  | 'timeline-left'
  | 'timeline-right'
  | 'timeline-left-media'
  | 'timeline-right-media'
  | 'timeline-left-bg'
  | 'timeline-right-bg'
  | 'accordion'
  | 'carousel-item-content'
  | 'carousel-item-image'
  | 'carousel-item-image-below'
  | 'carousel-item-image-below-2'
  | 'carousel-item-video';

export type DepthContainerStyles = {
  shellClasses?: string;
  overlayClasses?: string;
  contentClasses?: string;
  metaClasses?: string;
  widgetClasses?: string;
  textClasses?: string;
  mediaClasses?: string;
  childrenClasses?: string;
  widgetAnimation?: string;
};

export type SlotShellConfig = {
  shellLayouts: {
    depth0: ShellLayout;
    depth1: ShellLayout;
    depth2: ShellLayout;
    depth3: ShellLayout;
    depth4: ShellLayout;
    depth5: ShellLayout;
  };
  depthStyles?: Record<string, DepthContainerStyles>;
};

export type MetaStylePart = { classes: string; font: string; animation?: string; };

export type TitleWordStyle = {
  word: string;
  style: 'primary' | 'accent' | 'third';
};

export type TitleMetaStyleEntry = {
  tag: string;
  wrapperClasses: string;
  primary: MetaStylePart;
  accent: MetaStylePart;
  third: MetaStylePart;
  animation: string;
};

export type ElementMetaStyleEntry = {
  tag: string;
  classes: string;
  font: string;
  animation: string;
};

export type MetaStyleEntry = TitleMetaStyleEntry | ElementMetaStyleEntry;

export function isTitleEntry(entry: MetaStyleEntry): entry is TitleMetaStyleEntry {
  return 'primary' in entry;
}

export type SlotMetaStyles = Record<string, MetaStyleEntry>;

export type SlotConfig = {
  defaultPageUrl: string;
  label: string;
  isDefaultPageNull: boolean;
  isPagesNull: boolean;
  urlPrefix?: string;
  isLoadingPageProhibited?: boolean;
  defaultPageMarketplace?: DefaultPageMarketplace;
  bgClass: string;
  bgColor?: string | null;
  shellConfig?: SlotShellConfig;
  metaStyles?: SlotMetaStyles;
  // Если true — FractalShell не рендерит внешний meta-блок (title/description/media),
  // виджет сам отвечает за их отображение внутри себя
  isRenderOnlyIntoWidget?: boolean;
  brandBookPagesLayout?: string;
  bgType?: 'none' | 'color' | 'image' | 'video' | 'css_animation';
  bgColorClass?: string;
  bgImageUrl?: string;
  bgImageBlurData?: string;
  bgVideoUrl?: string;
  bgVideoPosterUrl?: string;
  bgOverlayClass?: string;
  bgCssAnimationName?: string;
  generatedSlotCss?: string;
  brandBookBgByDepth?: Record<number, BrandBookBgEntry>;
  routes: readonly RouteEntry[];
};

export type RoutesConfig = Record<SlotName, SlotConfig>;

/** Props passed to slot pages: SlotConfig + current page URL from params/pathname */
export type PageSlotProps = SlotConfig & {
  pageUrl: string;
};

export const ROUTES_CONFIG: RoutesConfig = {

  header: {
    defaultPageUrl: '/',
    label: 'Header',
    isDefaultPageNull: false,
    isPagesNull: true,

    isLoadingPageProhibited: true,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    routes: [],
  },
  footer: {
    defaultPageUrl: '/footer',
    label: 'Footer',
    isDefaultPageNull: false,
    isPagesNull: false,

    isLoadingPageProhibited: true,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    routes: [
      { path: '/footer', title: 'Default footer page', description: 'Default footer page', routeGenerationType: 'static', isPublic: true, },
      ],
  },
  promoScreen: {
    defaultPageUrl: '/promo',
    label: 'Promo Screen',
    urlPrefix: 'ps',
    isDefaultPageNull: null,
    isPagesNull: false,
    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    routes: [
      { path: '/promo', title: 'Default Promo Screen', description: 'Default Promo Screen', routeGenerationType: 'static', isPublic: true },
    ],
  },
  centerHeader: {
    defaultPageUrl: '/default-center-static-header-page',
    label: 'Static Center Header',
    isDefaultPageNull: false,
    isPagesNull: false,
    urlPrefix: 'ch',

    isLoadingPageProhibited: true,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    routes: [
      { path: '/default-center-static-header-page', title: 'Default Static Center Header', description: 'Default Static Center Header', routeGenerationType: 'static' },
      { path: '/test-center-static-header-page-1', title: 'Test Static Center Header Content 1', description: 'Test content 1 for static center header', routeGenerationType: 'static' },
      { path: '/test-center-static-header-page-2', title: 'Test Static Center Header Content 2', description: 'Test content 2 for static center header', routeGenerationType: 'static' },
      { path: '/test-center-static-header-page-3', title: 'Test Static Center Header Content 3', description: 'Test content 3 for static center header', routeGenerationType: 'static' },

      { path: '/header-top', title: 'header top', description: '', routeGenerationType: 'static' },
    
      { path: '/roma-top', title: 'roma top', description: '', routeGenerationType: 'static' },
    ],
  },
  center: {
  defaultPageUrl: '/home',
  label: 'Static Center',
  isDefaultPageNull: false,
  isPagesNull: false,
  isLoadingPageProhibited: true,
  bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
  routes: [
    { path: '/home', title: 'Default Static Home', description: 'Default Static center home page', routeGenerationType: 'static' },
    { path: '/', title: 'Static Home', description: 'Static center home page', routeGenerationType: 'static' },
    { path: '/users', title: 'User Dashboard', description: 'Manage registered users, roles, and account access', routeGenerationType: 'static' },
    ],
},

  centerFooter: {
    defaultPageUrl: '/default-center-static-footer-page',
    label: 'Static Center Footer',
    urlPrefix: 'cf',
    isDefaultPageNull: false,
    isPagesNull: false,

    isLoadingPageProhibited: true,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    defaultPageMarketplace: {
      marketplaceTags: [],
      marketplaceFilters: ['@cheap'],
      marketplaceAiSearchPrompt: '',
    },
    routes: [
      { path: '/default-center-static-footer-page', title: 'Default Static Center Footer', description: 'Default Static Center Footer', routeGenerationType: 'static' },
      { path: '/test-center-static-footer-page-1', title: 'Test Static Center Footer Content 1', description: 'Test content 1', routeGenerationType: 'static' },
      { path: '/test-center-static-footer-page-2', title: 'Test Static Center Footer Content 222', description: 'Test content 2', routeGenerationType: 'static' },
      { path: '/test-center-static-footer-page-3', title: 'Test Static Center Footer Content 3', description: 'Test content 3', routeGenerationType: 'static' },
    ],
  },
  faq: {
    defaultPageUrl: '/default-faq-page',
    label: 'FAQ',
    isDefaultPageNull: false,
    isPagesNull: false,
    isLoadingPageProhibited: true,
    defaultPageMarketplace: {
      marketplaceTags: [],
      marketplaceFilters: ['@cheap'],
      marketplaceAiSearchPrompt: '',
    },
    routes: [
      { path: '/default-faq-page', title: 'Default FAQ', description: 'Default FAQ section', routeGenerationType: 'static' },
    ],
  },

  left: {
    defaultPageUrl: '/default-left-page',
    label: 'Left',
    urlPrefix: 'l',
    isDefaultPageNull: false,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    routes: [
      { path: '/default-left-page', title: 'Default Left', description: 'Default Left', routeGenerationType: 'static' },
      { path: '/registration', title: 'Registration', description: 'User registration and onboarding flow', routeGenerationType: 'static' },
      { path: '/chat', title: 'Chat', description: 'Real-time messaging interface', routeGenerationType: 'static' },
      { path: '/payment', title: 'Payment', description: 'Payment processing and billing history', routeGenerationType: 'static' },
    ],
  },
  leftHeader: {
    defaultPageUrl: '/default-left-header-page',
    label: 'Left Header',
    isDefaultPageNull: false,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    routes: [
      { path: '/default-left-header-page', title: 'Default Left Header', description: 'Default Left Header', routeGenerationType: 'static' },
      { path: '/test-left-header-page-1', title: 'Test Left Header Content 1', description: 'Test content 1 for left header', routeGenerationType: 'static' },
      { path: '/test-left-header-page-2', title: 'Test Left Header Content 2', description: 'Test content 2 for left header', routeGenerationType: 'static' },
      { path: '/test-left-header-page-3', title: 'Test Left Header Content 3', description: 'Test content 3 for left header', routeGenerationType: 'static' },
    ],
  },
  leftFooter: {
    defaultPageUrl: '/default-left-footer-page',
    label: 'Left Footer',
    isDefaultPageNull: false,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    defaultPageMarketplace: {
      marketplaceTags: [],
      marketplaceFilters: [],
      marketplaceAiSearchPrompt: '',
    },
    routes: [
      { path: '/default-left-footer-page', title: 'Default Left Footer', description: 'Default Left Footer', routeGenerationType: 'static' },
      { path: '/test-left-footer-page-1', title: 'Test Left Footer Content 1', description: 'Test content 1', routeGenerationType: 'static' },
      { path: '/test-left-footer-page-2', title: 'Test Left Footer Content 2', description: 'Test content 2', routeGenerationType: 'static' },
      { path: '/test-left-footer-page-3', title: 'Test Left Footer Content 3', description: 'Test content 3', routeGenerationType: 'static' },
    ],
  },
  right: {
    defaultPageUrl: '/default-right-page',
    label: 'Right',
    urlPrefix: 'r',
    isDefaultPageNull: false,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    routes: [
      { path: '/default-right-page', title: 'Default Right', description: 'Default Right', routeGenerationType: 'static' },
      { path: '/orders', title: 'Orders', description: 'View and manage your orders', routeGenerationType: 'static' },
      { path: '/delivery', title: 'Delivery', description: 'Track delivery status in real time', routeGenerationType: 'static' },
      { path: '/support', title: 'Support', description: 'Customer support and help center', routeGenerationType: 'static' },
      { path: '/user', title: 'User Card', description: 'User account details and management', routeGenerationType: 'dynamic', isDynamic: true, paramName: 'id' },
    ],
  },
  rightHeader: {
    defaultPageUrl: '/default-right-header-page',
    label: 'Right Header',
    isDefaultPageNull: false,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    routes: [
      { path: '/default-right-header-page', title: 'Default Right Header', description: 'Default Right Header', routeGenerationType: 'static' },
      { path: '/test-right-header-page-1', title: 'Test Right Header Content 1', description: 'Test content 1 for right header', routeGenerationType: 'static' },
      { path: '/test-right-header-page-2', title: 'Test Right Header Content 2', description: 'Test content 2 for right header', routeGenerationType: 'static' },
      { path: '/test-right-header-page-3', title: 'Test Right Header Content 3', description: 'Test content 3 for right header', routeGenerationType: 'static' },
    ],
  },
  rightFooter: {
    defaultPageUrl: '/default-right-footer-page',
    label: 'Right Footer',
    isDefaultPageNull: true,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    defaultPageMarketplace: {
      marketplaceTags: [],
      marketplaceFilters: [],
      marketplaceAiSearchPrompt: '',
    },
    routes: [
      { path: '/default-right-footer-page', title: 'Default Right Footer', description: 'Default Right Footer', routeGenerationType: 'static' },
      { path: '/test-right-footer-page-1', title: 'Test Right Footer Content 1', description: 'Test content 1', routeGenerationType: 'static' },
      { path: '/test-right-footer-page-2', title: 'Test Right Footer Content 2', description: 'Test content 2', routeGenerationType: 'static' },
      { path: '/test-right-footer-page-3', title: 'Test Right Footer Content 3', description: 'Test content 3', routeGenerationType: 'static' },
    ],
  },
  leftDrawer: {
    defaultPageUrl: '/default-left-drawer',
    label: 'Left Drawer',
    isDefaultPageNull: true,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    defaultPageMarketplace: {
      marketplaceTags: [],
      marketplaceFilters: [],
      marketplaceAiSearchPrompt: '',
    },
    routes: [
    
      { path: '/new-left-drawer', title: 'new left drawer', description: '', routeGenerationType: 'static' },
    ],
  },
  leftModal: {
    defaultPageUrl: '/left-modal',
    label: 'Left Modal',
    isDefaultPageNull: true,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    defaultPageMarketplace: {
      marketplaceTags: [],
      marketplaceFilters: [],
      marketplaceAiSearchPrompt: '',
    },
    routes: [
    
      { path: '/new-left', title: 'new left', description: '', routeGenerationType: 'static' },
    ],
  },
  rightDrawer: {
    defaultPageUrl: '/right-drawer',
    label: 'Right Drawer',
    isDefaultPageNull: true,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    defaultPageMarketplace: {
      marketplaceTags: [],
      marketplaceFilters: [],
      marketplaceAiSearchPrompt: '',
    },
    routes: [
      { path: '/new-right-drawer', title: 'new right drawer', description: '', routeGenerationType: 'static' },
    
      { path: '/new-right-2-drawer', title: 'new right 2 drawer', description: '', routeGenerationType: 'static' },
    ],
  },
  rightModal: {
    defaultPageUrl: '/right-modal',
    label: 'Right Modal',
    isDefaultPageNull: true,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    defaultPageMarketplace: {
      marketplaceTags: [],
      marketplaceFilters: [],
      marketplaceAiSearchPrompt: '',
    },
    routes: [
      { path: '/new-right-modal', title: 'new right modal', description: '', routeGenerationType: 'static' },
    ],
  },
  footerDrawer: {
    defaultPageUrl: '/cookies',
    label: 'Footer Drawer',
    isDefaultPageNull: true,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    defaultPageMarketplace: {
      marketplaceTags: ['#qwerqwer'],
      marketplaceFilters: ['@personal'],
      marketplaceAiSearchPrompt: 'zsdfasdf',
    },
    routes: [
      { path: '/cookies', title: 'Cookies', description: 'Cookies policy', routeGenerationType: 'static' },
      { path: '/terms', title: 'Terms', description: 'Terms of service', routeGenerationType: 'static' },
      { path: '/privacy', title: 'Privacy', description: 'Privacy policy', routeGenerationType: 'static' },
    ],
  },
  footerModal: {
    defaultPageUrl: '/footer-modal',
    label: 'Footer Modal',
    isDefaultPageNull: true,
    isPagesNull: false,

    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    defaultPageMarketplace: {
      marketplaceTags: [],
      marketplaceFilters: ['@free'],
      marketplaceAiSearchPrompt: 'sdfghjk',
    },
    routes: [
      { path: '/footer-modal', title: 'Modal', description: 'Footer modal', routeGenerationType: 'static', isPublic: true },
    
      { path: '/roma-modal', title: 'roma modal', description: '', routeGenerationType: 'static' },
    
      { path: '/anna-footer-modal', title: 'anna footer modal', description: '', routeGenerationType: 'static' },
    ],
  },
  codeGenerator: {
    defaultPageUrl: '/marketplace',
    label: 'Code Generator',
    isDefaultPageNull: false,
    isPagesNull: false,
    isLoadingPageProhibited: false,
    bgClass: 'bg-gradient-to-t from-white to-slate-50 border-t border-slate-200 shadow-[0_-1px_3px_0_rgba(0,0,0,0.04)]',
    routes: [],
  },

  body: {
    defaultPageUrl: '/body',
    label: 'Body',
    isDefaultPageNull: true,
    isPagesNull: true,
    isLoadingPageProhibited: true,
    bgClass: '',
    routes: [],
  },
};

export const LEFT_PATHS = ROUTES_CONFIG.left.routes.map((r) => r.path);
export const RIGHT_PATHS = ROUTES_CONFIG.right.routes.map((r) => r.path);

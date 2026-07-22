// TEN-LANGUAGE UI for the Projects-zone footer (CLAUDE.md 4г) — the footer itself carries no visible label
// text (step 213: just the workspace name + icon buttons), but every icon button and the theme toggle expose
// their meaning ONLY through a tooltip/aria-label — easy to miss, still owner-facing text. Hand-authored fixed
// chrome, same pattern as quiz-i18n.ts.

export type ProjectsZoneFooterStrings = {
  themeSystem: string; themeLight: string; themeDark: string;
  architecture: string; continueDevelopment: string;
  developmentSteps: string;
  environmentKeys: string;
  widthWide: string; widthNormal: string;
};

export const PROJECTS_ZONE_FOOTER_I18N: Record<string, ProjectsZoneFooterStrings> = {
  en: { themeSystem: "System theme", themeLight: "Light theme", themeDark: "Dark theme", architecture: "Architecture", continueDevelopment: "Continue development", developmentSteps: "Development steps", environmentKeys: "Environment keys", widthWide: "Wide screen", widthNormal: "Normal width" },
  ru: { themeSystem: "Системная тема", themeLight: "Светлая тема", themeDark: "Тёмная тема", architecture: "Архитектура", continueDevelopment: "Продолжить разработку", developmentSteps: "Шаги разработки", environmentKeys: "Переменные окружения", widthWide: "Широкий экран", widthNormal: "Обычная ширина" },
  es: { themeSystem: "Tema del sistema", themeLight: "Tema claro", themeDark: "Tema oscuro", architecture: "Arquitectura", continueDevelopment: "Continuar el desarrollo", developmentSteps: "Pasos de desarrollo", environmentKeys: "Claves de entorno", widthWide: "Pantalla ancha", widthNormal: "Ancho normal" },
  fr: { themeSystem: "Thème système", themeLight: "Thème clair", themeDark: "Thème sombre", architecture: "Architecture", continueDevelopment: "Continuer le développement", developmentSteps: "Étapes de développement", environmentKeys: "Clés d'environnement", widthWide: "Écran large", widthNormal: "Largeur normale" },
  it: { themeSystem: "Tema di sistema", themeLight: "Tema chiaro", themeDark: "Tema scuro", architecture: "Architettura", continueDevelopment: "Continua lo sviluppo", developmentSteps: "Passi di sviluppo", environmentKeys: "Chiavi d'ambiente", widthWide: "Schermo largo", widthNormal: "Larghezza normale" },
  de: { themeSystem: "Systemdesign", themeLight: "Helles Design", themeDark: "Dunkles Design", architecture: "Architektur", continueDevelopment: "Entwicklung fortsetzen", developmentSteps: "Entwicklungsschritte", environmentKeys: "Umgebungsschlüssel", widthWide: "Breiter Bildschirm", widthNormal: "Normale Breite" },
  pt: { themeSystem: "Tema do sistema", themeLight: "Tema claro", themeDark: "Tema escuro", architecture: "Arquitetura", continueDevelopment: "Continuar o desenvolvimento", developmentSteps: "Passos de desenvolvimento", environmentKeys: "Chaves de ambiente", widthWide: "Ecrã largo", widthNormal: "Largura normal" },
  pl: { themeSystem: "Motyw systemowy", themeLight: "Jasny motyw", themeDark: "Ciemny motyw", architecture: "Architektura", continueDevelopment: "Kontynuuj rozwój", developmentSteps: "Kroki rozwoju", environmentKeys: "Klucze środowiskowe", widthWide: "Szeroki ekran", widthNormal: "Zwykła szerokość" },
  tr: { themeSystem: "Sistem teması", themeLight: "Açık tema", themeDark: "Koyu tema", architecture: "Mimari", continueDevelopment: "Geliştirmeye devam et", developmentSteps: "Geliştirme adımları", environmentKeys: "Ortam anahtarları", widthWide: "Geniş ekran", widthNormal: "Normal genişlik" },
  nl: { themeSystem: "Systeemthema", themeLight: "Licht thema", themeDark: "Donker thema", architecture: "Architectuur", continueDevelopment: "Ontwikkeling voortzetten", developmentSteps: "Ontwikkelstappen", environmentKeys: "Omgevingssleutels", widthWide: "Breed scherm", widthNormal: "Normale breedte" },
};

export function projectsZoneFooterStrings(lang: string): ProjectsZoneFooterStrings {
  return PROJECTS_ZONE_FOOTER_I18N[lang.slice(0, 2)] ?? PROJECTS_ZONE_FOOTER_I18N.en;
}

// TEN-LANGUAGE UI for the category hub page (`/projects/<category>`) and the automation-page breadcrumb
// (CLAUDE.md 4г) — hand-authored fixed chrome, same pattern as projects-index-i18n.ts / quiz-i18n.ts. The
// `breadcrumb` key ("← Projects") is shared by category-hub.server.tsx AND
// components/automation-status-bar.client.tsx — one string, two call sites, no duplicate dictionary.

export type CategoryHubStrings = {
  breadcrumb: string;
  emptyState: string;
};

export const CATEGORY_HUB_I18N: Record<string, CategoryHubStrings> = {
  en: {
    breadcrumb: "← Projects",
    emptyState: "No automations here yet — add the first one with the card below.",
  },
  ru: {
    breadcrumb: "← Проекты",
    emptyState: "Здесь пока нет автоматизаций — добавьте первую карточкой ниже.",
  },
  es: {
    breadcrumb: "← Proyectos",
    emptyState: "Todavía no hay automatizaciones aquí — añade la primera con la tarjeta de abajo.",
  },
  fr: {
    breadcrumb: "← Projets",
    emptyState: "Il n'y a pas encore d'automatisation ici — ajoutez la première avec la carte ci-dessous.",
  },
  it: {
    breadcrumb: "← Progetti",
    emptyState: "Non ci sono ancora automazioni qui — aggiungi la prima con la scheda qui sotto.",
  },
  de: {
    breadcrumb: "← Projekte",
    emptyState: "Hier gibt es noch keine Automatisierungen — füge die erste mit der Karte unten hinzu.",
  },
  pt: {
    breadcrumb: "← Projetos",
    emptyState: "Ainda não há automações aqui — adicione a primeira com o cartão abaixo.",
  },
  pl: {
    breadcrumb: "← Projekty",
    emptyState: "Nie ma tu jeszcze żadnych automatyzacji — dodaj pierwszą kartą poniżej.",
  },
  tr: {
    breadcrumb: "← Projeler",
    emptyState: "Burada henüz otomasyon yok — aşağıdaki kartla ilkini ekleyin.",
  },
  nl: {
    breadcrumb: "← Projecten",
    emptyState: "Hier zijn nog geen automatiseringen — voeg de eerste toe met de kaart hieronder.",
  },
};

export function categoryHubStrings(lang: string): CategoryHubStrings {
  return CATEGORY_HUB_I18N[lang.slice(0, 2)] ?? CATEGORY_HUB_I18N.en;
}

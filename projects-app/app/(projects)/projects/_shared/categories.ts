// The four permanent categories of the Projects layer (§3.12, step 174 master
// plan). Categories always exist, even when empty; a project is a NAMED folder
// /projects/<category>/<project-slug> — dynamic segments are forbidden in this
// layer. Slugs are fixed English identifiers (never localized, never renamed).
export type ProjectCategorySlug =
  | "automation"
  | "personal"
  | "other";

export type ProjectCategory = {
  slug: ProjectCategorySlug;
  title: string;
  navLabel: string; // short label for the category nav buttons (step 207.10 item 3)
  description: string;
  // TEN-LANGUAGE TITLE/DESCRIPTION (step 234.1, additive — CLAUDE.md 4г) — ADDITIVE, optional. `title`/
  // `description` above stay PLAIN STRINGS and every existing consumer (frozen-project-starter.ts,
  // projects-manifest.ts, api/projects/global/route.ts) keeps reading them unchanged. The root /projects
  // index page AND category-hub.server.tsx (the /projects/<category> hub) read these translated variants,
  // via categoryTitle()/categoryDescription() below. The 4 permanent categories are hand-authored here
  // (fixed chrome, rule 4г: no model call); a
  // category the owner creates through the modal gets these LLM-translated at creation time instead
  // (app/api/projects/categories/route.ts + lib/quiz.ts translateCategoryCopy) — same fields, two population
  // paths.
  titleI18n?: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  // TEN-LANGUAGE NAV LABEL (CLAUDE.md 4г) — the short category-nav-button text; same additive/optional
  // shape as titleI18n/descriptionI18n, same fallback pattern via categoryNavLabel() below.
  navLabelI18n?: Record<string, string>;
};

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  {
    slug: "automation",
    title: "Automation",
    navLabel: "Business",
    description:
      "Repeatable business automations — scheduled publishing, data pipelines, " +
      "integrations with external APIs. Each project is a finished-cycle tool: " +
      "an n8n for one single task.",
    titleI18n: {
      en: "Automation", ru: "Автоматизация", es: "Automatización", fr: "Automatisation", it: "Automazione",
      de: "Automatisierung", pt: "Automação", pl: "Automatyzacja", tr: "Otomasyon", nl: "Automatisering",
    },
    descriptionI18n: {
      en: "Repeatable business automations — scheduled publishing, data pipelines, integrations with external APIs. Each project is a finished-cycle tool: an n8n for one single task.",
      ru: "Повторяемые бизнес-автоматизации — публикация по расписанию, конвейеры данных, интеграции с внешними API. Каждый проект — инструмент с законченным циклом: n8n для одной конкретной задачи.",
      es: "Automatizaciones de negocio repetibles — publicación programada, canalizaciones de datos, integraciones con APIs externas. Cada proyecto es una herramienta de ciclo cerrado: un n8n para una sola tarea.",
      fr: "Automatisations métier reproductibles — publication programmée, pipelines de données, intégrations avec des API externes. Chaque projet est un outil à cycle complet : un n8n pour une seule tâche.",
      it: "Automazioni aziendali ripetibili — pubblicazione pianificata, pipeline di dati, integrazioni con API esterne. Ogni progetto è uno strumento a ciclo chiuso: un n8n per un singolo compito.",
      de: "Wiederholbare Geschäftsautomatisierungen — geplante Veröffentlichung, Datenpipelines, Integrationen mit externen APIs. Jedes Projekt ist ein Werkzeug mit abgeschlossenem Zyklus: ein n8n für eine einzige Aufgabe.",
      pt: "Automações de negócio repetíveis — publicação agendada, pipelines de dados, integrações com APIs externas. Cada projeto é uma ferramenta de ciclo fechado: um n8n para uma única tarefa.",
      pl: "Powtarzalne automatyzacje biznesowe — publikacja według harmonogramu, potoki danych, integracje z zewnętrznymi API. Każdy projekt to narzędzie o zamkniętym cyklu: n8n dla jednego konkretnego zadania.",
      tr: "Tekrarlanabilir iş otomasyonları — zamanlanmış yayınlama, veri hatları, harici API entegrasyonları. Her proje tamamlanmış döngülü bir araçtır: tek bir görev için bir n8n.",
      nl: "Herhaalbare bedrijfsautomatiseringen — geplande publicatie, datapijplijnen, integraties met externe API's. Elk project is een tool met een afgesloten cyclus: een n8n voor één enkele taak.",
    },
    navLabelI18n: {
      en: "Business", ru: "Бизнес", es: "Negocio", fr: "Entreprise", it: "Attività",
      de: "Unternehmen", pt: "Negócio", pl: "Biznes", tr: "İş", nl: "Zakelijk",
    },
  },
  {
    slug: "personal",
    title: "Personal effectiveness",
    navLabel: "Personal",
    description:
      "Private tools for the owner's own productivity — reminders, trackers, " +
      "personal dashboards and assistants.",
    titleI18n: {
      en: "Personal effectiveness", ru: "Личная эффективность", es: "Efectividad personal", fr: "Efficacité personnelle",
      it: "Efficacia personale", de: "Persönliche Effektivität", pt: "Eficácia pessoal", pl: "Efektywność osobista",
      tr: "Kişisel verimlilik", nl: "Persoonlijke effectiviteit",
    },
    descriptionI18n: {
      en: "Private tools for the owner's own productivity — reminders, trackers, personal dashboards and assistants.",
      ru: "Личные инструменты для собственной продуктивности владельца — напоминания, трекеры, персональные дашборды и ассистенты.",
      es: "Herramientas privadas para la propia productividad del propietario — recordatorios, seguimientos, paneles personales y asistentes.",
      fr: "Outils privés pour la propre productivité du propriétaire — rappels, suivis, tableaux de bord personnels et assistants.",
      it: "Strumenti privati per la produttività personale del proprietario — promemoria, tracker, dashboard personali e assistenti.",
      de: "Private Werkzeuge für die eigene Produktivität des Inhabers — Erinnerungen, Tracker, persönliche Dashboards und Assistenten.",
      pt: "Ferramentas privadas para a própria produtividade do proprietário — lembretes, rastreadores, painéis pessoais e assistentes.",
      pl: "Prywatne narzędzia do własnej produktywności właściciela — przypomnienia, trackery, osobiste panele i asystenci.",
      tr: "Sahibinin kendi verimliliği için özel araçlar — hatırlatıcılar, izleyiciler, kişisel panolar ve asistanlar.",
      nl: "Privétools voor de eigen productiviteit van de eigenaar — herinneringen, trackers, persoonlijke dashboards en assistenten.",
    },
    navLabelI18n: {
      en: "Personal", ru: "Личное", es: "Personal", fr: "Personnel", it: "Personale",
      de: "Persönlich", pt: "Pessoal", pl: "Osobiste", tr: "Kişisel", nl: "Persoonlijk",
    },
  },
  {
    slug: "other",
    title: "Other",
    navLabel: "Other",
    description:
      "Projects that do not fit the three categories above. If a project type " +
      "recurs here, it is a candidate for a category of its own.",
    titleI18n: {
      en: "Other", ru: "Другое", es: "Otros", fr: "Autre", it: "Altro",
      de: "Sonstiges", pt: "Outros", pl: "Inne", tr: "Diğer", nl: "Overig",
    },
    descriptionI18n: {
      en: "Projects that do not fit the three categories above. If a project type recurs here, it is a candidate for a category of its own.",
      ru: "Проекты, не вписывающиеся в три категории выше. Если тип проекта здесь повторяется — это кандидат на собственную категорию.",
      es: "Proyectos que no encajan en las tres categorías anteriores. Si un tipo de proyecto se repite aquí, es candidato a tener su propia categoría.",
      fr: "Projets qui ne correspondent à aucune des trois catégories ci-dessus. Si un type de projet s'y répète, c'est un candidat pour sa propre catégorie.",
      it: "Progetti che non rientrano nelle tre categorie sopra. Se un tipo di progetto qui si ripete, è candidato a una categoria propria.",
      de: "Projekte, die in keine der drei obigen Kategorien passen. Wiederholt sich hier ein Projekttyp, ist er Kandidat für eine eigene Kategorie.",
      pt: "Projetos que não se enquadram nas três categorias acima. Se um tipo de projeto se repetir aqui, é candidato a ter categoria própria.",
      pl: "Projekty, które nie pasują do trzech powyższych kategorii. Jeśli jakiś typ projektu się tu powtarza, jest kandydatem do własnej kategorii.",
      tr: "Yukarıdaki üç kategoriye uymayan projeler. Bir proje türü burada tekrarlanırsa, kendi kategorisi için adaydır.",
      nl: "Projecten die niet in de drie categorieën hierboven passen. Als een projecttype hier vaker voorkomt, is het kandidaat voor een eigen categorie.",
    },
    navLabelI18n: {
      en: "Other", ru: "Другое", es: "Otros", fr: "Autre", it: "Altro",
      de: "Sonstiges", pt: "Outros", pl: "Inne", tr: "Diğer", nl: "Overig",
    },
  },
];

/** The category's title in `lang`, falling back to English, then the plain (single-language) field. */
export function categoryTitle(c: ProjectCategory, lang: string): string {
  return c.titleI18n?.[lang] ?? c.titleI18n?.en ?? c.title;
}

/** The category's description in `lang`, falling back to English, then the plain (single-language) field. */
export function categoryDescription(c: ProjectCategory, lang: string): string {
  return c.descriptionI18n?.[lang] ?? c.descriptionI18n?.en ?? c.description;
}

/** The category's nav-button label in `lang`, falling back to English, then the plain (single-language) field. */
export function categoryNavLabel(c: ProjectCategory, lang: string): string {
  return c.navLabelI18n?.[lang] ?? c.navLabelI18n?.en ?? c.navLabel;
}

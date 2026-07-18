// TEN-LANGUAGE UI for the intelligent automation search (step 258, CLAUDE.md 4г) — the "Find automation" card
// (first in the projects grid) and its modal. en, es, fr, it, ru, de, pt, pl, tr, nl; anything else → English.

export type FindStrings = {
  cardTitle: string;        // the grid card's heading
  cardHint: string;         // the grid card's one-line hint
  modalTitle: string;
  modalBody: string;
  queryLabel: string;
  queryPlaceholder: string;
  searchButton: string;
  searching: string;
  searchFailed: string;
  noResults: string;        // catalog returned nothing
  resultsHeading: string;   // "{n}"
  openAutomation: string;   // the per-result "open" affordance label (aria)
};

export const FIND_I18N: Record<string, FindStrings> = {
  en: {
    cardTitle: "Find an automation",
    cardHint: "Describe what you need — search the ready ones by meaning",
    modalTitle: "Find an automation",
    modalBody: "Describe in your own words what the automation should do. We search the ready automations by meaning and show the closest ones — open one to reuse or clone it.",
    queryLabel: "What do you need?",
    queryPlaceholder: "e.g. collect messages from a Telegram channel and send an event onward…",
    searchButton: "Search",
    searching: "Searching…",
    searchFailed: "Search failed. Please try again.",
    noResults: "Nothing matched yet. Try describing it differently, or build a new automation.",
    resultsHeading: "Found {n}",
    openAutomation: "Open automation",
  },
  ru: {
    cardTitle: "Найти автоматизацию",
    cardHint: "Опишите, что нужно — поиск готовых по смыслу",
    modalTitle: "Найти автоматизацию",
    modalBody: "Опишите своими словами, что должна делать автоматизация. Мы ищем среди готовых по смыслу и показываем самые близкие — откройте, чтобы переиспользовать или клонировать.",
    queryLabel: "Что вам нужно?",
    queryPlaceholder: "например: собирать сообщения из Telegram-канала и отправлять событие дальше…",
    searchButton: "Искать",
    searching: "Ищу…",
    searchFailed: "Поиск не удался. Попробуйте ещё раз.",
    noResults: "Пока ничего не нашлось. Попробуйте описать иначе или создайте новую автоматизацию.",
    resultsHeading: "Найдено: {n}",
    openAutomation: "Открыть автоматизацию",
  },
  es: {
    cardTitle: "Buscar una automatización",
    cardHint: "Describe lo que necesitas — busca las listas por significado",
    modalTitle: "Buscar una automatización",
    modalBody: "Describe con tus palabras qué debe hacer la automatización. Buscamos entre las listas por significado y mostramos las más cercanas — abre una para reutilizarla o clonarla.",
    queryLabel: "¿Qué necesitas?",
    queryPlaceholder: "p. ej.: recopilar mensajes de un canal de Telegram y enviar un evento…",
    searchButton: "Buscar",
    searching: "Buscando…",
    searchFailed: "La búsqueda falló. Inténtalo de nuevo.",
    noResults: "Nada coincidió aún. Prueba a describirlo de otro modo o crea una nueva automatización.",
    resultsHeading: "Encontradas {n}",
    openAutomation: "Abrir automatización",
  },
  fr: {
    cardTitle: "Trouver une automatisation",
    cardHint: "Décrivez ce qu'il vous faut — recherche par le sens",
    modalTitle: "Trouver une automatisation",
    modalBody: "Décrivez avec vos mots ce que l'automatisation doit faire. Nous cherchons parmi les automatisations prêtes par le sens et montrons les plus proches — ouvrez-en une pour la réutiliser ou la cloner.",
    queryLabel: "De quoi avez-vous besoin ?",
    queryPlaceholder: "ex. : collecter les messages d'un canal Telegram et émettre un événement…",
    searchButton: "Rechercher",
    searching: "Recherche…",
    searchFailed: "La recherche a échoué. Réessayez.",
    noResults: "Rien ne correspond encore. Décrivez-le autrement ou créez une nouvelle automatisation.",
    resultsHeading: "{n} trouvée(s)",
    openAutomation: "Ouvrir l'automatisation",
  },
  it: {
    cardTitle: "Trova un'automazione",
    cardHint: "Descrivi ciò che ti serve — cerca quelle pronte per significato",
    modalTitle: "Trova un'automazione",
    modalBody: "Descrivi a parole tue cosa deve fare l'automazione. Cerchiamo tra quelle pronte per significato e mostriamo le più vicine — aprine una per riusarla o clonarla.",
    queryLabel: "Di cosa hai bisogno?",
    queryPlaceholder: "es.: raccogliere messaggi da un canale Telegram e inviare un evento…",
    searchButton: "Cerca",
    searching: "Ricerca…",
    searchFailed: "Ricerca non riuscita. Riprova.",
    noResults: "Ancora nessuna corrispondenza. Prova a descriverlo diversamente o crea una nuova automazione.",
    resultsHeading: "Trovate {n}",
    openAutomation: "Apri automazione",
  },
  de: {
    cardTitle: "Automatisierung finden",
    cardHint: "Beschreiben Sie, was Sie brauchen — Suche nach Bedeutung",
    modalTitle: "Automatisierung finden",
    modalBody: "Beschreiben Sie in eigenen Worten, was die Automatisierung tun soll. Wir suchen die fertigen nach Bedeutung und zeigen die nächstliegenden — öffnen Sie eine, um sie wiederzuverwenden oder zu klonen.",
    queryLabel: "Was brauchen Sie?",
    queryPlaceholder: "z. B.: Nachrichten aus einem Telegram-Kanal sammeln und ein Ereignis weitergeben…",
    searchButton: "Suchen",
    searching: "Suche…",
    searchFailed: "Suche fehlgeschlagen. Bitte erneut versuchen.",
    noResults: "Noch nichts gefunden. Beschreiben Sie es anders oder erstellen Sie eine neue Automatisierung.",
    resultsHeading: "{n} gefunden",
    openAutomation: "Automatisierung öffnen",
  },
  pt: {
    cardTitle: "Encontrar uma automação",
    cardHint: "Descreva o que precisa — procure as prontas por significado",
    modalTitle: "Encontrar uma automação",
    modalBody: "Descreva por palavras suas o que a automação deve fazer. Procuramos entre as prontas por significado e mostramos as mais próximas — abra uma para reutilizar ou clonar.",
    queryLabel: "Do que precisa?",
    queryPlaceholder: "ex.: recolher mensagens de um canal do Telegram e enviar um evento…",
    searchButton: "Procurar",
    searching: "A procurar…",
    searchFailed: "A procura falhou. Tente novamente.",
    noResults: "Ainda nada correspondeu. Tente descrever de outra forma ou crie uma nova automação.",
    resultsHeading: "Encontradas {n}",
    openAutomation: "Abrir automação",
  },
  pl: {
    cardTitle: "Znajdź automatyzację",
    cardHint: "Opisz, czego potrzebujesz — wyszukiwanie gotowych po znaczeniu",
    modalTitle: "Znajdź automatyzację",
    modalBody: "Opisz własnymi słowami, co ma robić automatyzacja. Szukamy wśród gotowych po znaczeniu i pokazujemy najbliższe — otwórz jedną, aby ją ponownie użyć lub sklonować.",
    queryLabel: "Czego potrzebujesz?",
    queryPlaceholder: "np.: zbieraj wiadomości z kanału Telegram i wysyłaj zdarzenie dalej…",
    searchButton: "Szukaj",
    searching: "Szukam…",
    searchFailed: "Wyszukiwanie nie powiodło się. Spróbuj ponownie.",
    noResults: "Na razie nic nie pasuje. Opisz to inaczej lub utwórz nową automatyzację.",
    resultsHeading: "Znaleziono {n}",
    openAutomation: "Otwórz automatyzację",
  },
  tr: {
    cardTitle: "Otomasyon bul",
    cardHint: "Neye ihtiyacın olduğunu anlat — hazır olanları anlama göre ara",
    modalTitle: "Otomasyon bul",
    modalBody: "Otomasyonun ne yapması gerektiğini kendi sözlerinle anlat. Hazır olanları anlama göre arar ve en yakınlarını gösteririz — yeniden kullanmak veya klonlamak için birini aç.",
    queryLabel: "Neye ihtiyacın var?",
    queryPlaceholder: "örn.: bir Telegram kanalından mesajları topla ve bir olay ilet…",
    searchButton: "Ara",
    searching: "Aranıyor…",
    searchFailed: "Arama başarısız oldu. Lütfen tekrar deneyin.",
    noResults: "Henüz eşleşme yok. Farklı anlatmayı deneyin veya yeni bir otomasyon oluşturun.",
    resultsHeading: "{n} bulundu",
    openAutomation: "Otomasyonu aç",
  },
  nl: {
    cardTitle: "Automatisering zoeken",
    cardHint: "Beschrijf wat u nodig hebt — zoek de kant-en-klare op betekenis",
    modalTitle: "Automatisering zoeken",
    modalBody: "Beschrijf in uw eigen woorden wat de automatisering moet doen. We zoeken de kant-en-klare op betekenis en tonen de dichtstbijzijnde — open er een om te hergebruiken of te klonen.",
    queryLabel: "Wat hebt u nodig?",
    queryPlaceholder: "bijv.: berichten uit een Telegram-kanaal verzamelen en een gebeurtenis doorsturen…",
    searchButton: "Zoeken",
    searching: "Zoeken…",
    searchFailed: "Zoeken mislukt. Probeer het opnieuw.",
    noResults: "Nog niets gevonden. Beschrijf het anders of maak een nieuwe automatisering.",
    resultsHeading: "{n} gevonden",
    openAutomation: "Automatisering openen",
  },
};

export function findStrings(lang: string): FindStrings {
  return FIND_I18N[lang] ?? FIND_I18N.en;
}

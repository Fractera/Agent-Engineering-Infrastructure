// СЛОВАРЬ курьер-планировщика карты — десять языков (правило 4г, слой Проекты), англ. фолбэк. Строки
// публичной поверхности карты живут в папке (закон 0).
export type CourierStrings = {
  title: string
  subtitle: string
  addressPh: string
  addByAddress: string
  clickHint: string
  point: string
  clear: string
  build: string
  building: string
  remove: string
  distance: string
  duration: string
  fuel: string
  cost: string
  litres: string
  depot: string
  order: string
  geoDown: string
  emptyHint: string
}

export const COURIER_I18N: Record<string, CourierStrings> = {
  en: { title: "Courier route planner", subtitle: "Click the map to drop stops (or add by address), then plan the least-fuel order.", addressPh: "Address…", addByAddress: "Add", clickHint: "Click the map to add a stop. The first one is the depot.", point: "Stop", clear: "Clear", build: "Plan route", building: "Planning…", remove: "Remove", distance: "Distance", duration: "Time", fuel: "Fuel", cost: "Cost", litres: "L", depot: "depot", order: "Optimal order", geoDown: "Address search is still warming up — meanwhile click the map to add stops.", emptyHint: "Add at least 2 stops." },
  es: { title: "Planificador de ruta del mensajero", subtitle: "Haz clic en el mapa para añadir paradas (o por dirección), luego calcula el orden con menos combustible.", addressPh: "Dirección…", addByAddress: "Añadir", clickHint: "Haz clic en el mapa para añadir una parada. La primera es la base.", point: "Parada", clear: "Limpiar", build: "Planificar ruta", building: "Planificando…", remove: "Quitar", distance: "Distancia", duration: "Tiempo", fuel: "Combustible", cost: "Coste", litres: "L", depot: "base", order: "Orden óptimo", geoDown: "La búsqueda por dirección aún se prepara — mientras, haz clic en el mapa.", emptyHint: "Añade al menos 2 paradas." },
  fr: { title: "Planificateur d'itinéraire coursier", subtitle: "Cliquez sur la carte pour ajouter des arrêts (ou par adresse), puis calculez l'ordre le moins gourmand.", addressPh: "Adresse…", addByAddress: "Ajouter", clickHint: "Cliquez sur la carte pour ajouter un arrêt. Le premier est le dépôt.", point: "Arrêt", clear: "Effacer", build: "Calculer l'itinéraire", building: "Calcul…", remove: "Retirer", distance: "Distance", duration: "Temps", fuel: "Carburant", cost: "Coût", litres: "L", depot: "dépôt", order: "Ordre optimal", geoDown: "La recherche d'adresse se prépare encore — cliquez sur la carte en attendant.", emptyHint: "Ajoutez au moins 2 arrêts." },
  it: { title: "Pianificatore percorso corriere", subtitle: "Clicca sulla mappa per aggiungere tappe (o per indirizzo), poi calcola l'ordine con meno carburante.", addressPh: "Indirizzo…", addByAddress: "Aggiungi", clickHint: "Clicca sulla mappa per aggiungere una tappa. La prima è il deposito.", point: "Tappa", clear: "Pulisci", build: "Calcola percorso", building: "Calcolo…", remove: "Rimuovi", distance: "Distanza", duration: "Tempo", fuel: "Carburante", cost: "Costo", litres: "L", depot: "deposito", order: "Ordine ottimale", geoDown: "La ricerca per indirizzo si sta preparando — intanto clicca sulla mappa.", emptyHint: "Aggiungi almeno 2 tappe." },
  ru: { title: "Планировщик маршрута курьера", subtitle: "Кликайте по карте, чтобы поставить точки (или добавьте по адресу), затем постройте порядок с минимумом бензина.", addressPh: "Адрес…", addByAddress: "Добавить", clickHint: "Кликните по карте, чтобы поставить точку. Первая — депо (старт).", point: "Точка", clear: "Очистить", build: "Построить маршрут", building: "Считаю…", remove: "Убрать", distance: "Расстояние", duration: "Время", fuel: "Бензин", cost: "Стоимость", litres: "л", depot: "депо", order: "Оптимальный порядок", geoDown: "Поиск по адресу ещё готовится — пока просто кликайте по карте, чтобы ставить точки.", emptyHint: "Добавьте минимум 2 точки." },
  de: { title: "Kurier-Routenplaner", subtitle: "Auf die Karte klicken für Stopps (oder per Adresse), dann die verbrauchsärmste Reihenfolge planen.", addressPh: "Adresse…", addByAddress: "Hinzufügen", clickHint: "Auf die Karte klicken, um einen Stopp hinzuzufügen. Der erste ist das Depot.", point: "Stopp", clear: "Leeren", build: "Route planen", building: "Berechne…", remove: "Entfernen", distance: "Distanz", duration: "Zeit", fuel: "Kraftstoff", cost: "Kosten", litres: "L", depot: "Depot", order: "Optimale Reihenfolge", geoDown: "Die Adresssuche startet noch — klicken Sie solange auf die Karte.", emptyHint: "Mindestens 2 Stopps hinzufügen." },
  pt: { title: "Planeador de rota do estafeta", subtitle: "Clique no mapa para adicionar paragens (ou por morada), depois calcule a ordem com menos combustível.", addressPh: "Morada…", addByAddress: "Adicionar", clickHint: "Clique no mapa para adicionar uma paragem. A primeira é a base.", point: "Paragem", clear: "Limpar", build: "Planear rota", building: "A calcular…", remove: "Remover", distance: "Distância", duration: "Tempo", fuel: "Combustível", cost: "Custo", litres: "L", depot: "base", order: "Ordem ótima", geoDown: "A pesquisa por morada ainda está a preparar — entretanto clique no mapa.", emptyHint: "Adicione pelo menos 2 paragens." },
  pl: { title: "Planer trasy kuriera", subtitle: "Kliknij mapę, aby dodać przystanki (lub po adresie), potem wyznacz kolejność z najmniejszym paliwem.", addressPh: "Adres…", addByAddress: "Dodaj", clickHint: "Kliknij mapę, aby dodać przystanek. Pierwszy to baza.", point: "Przystanek", clear: "Wyczyść", build: "Wyznacz trasę", building: "Liczę…", remove: "Usuń", distance: "Odległość", duration: "Czas", fuel: "Paliwo", cost: "Koszt", litres: "L", depot: "baza", order: "Optymalna kolejność", geoDown: "Wyszukiwanie po adresie jeszcze się przygotowuje — na razie klikaj mapę.", emptyHint: "Dodaj min. 2 przystanki." },
  tr: { title: "Kurye rota planlayıcı", subtitle: "Durak eklemek için haritaya tıklayın (veya adresle), sonra en az yakıtlı sırayı planlayın.", addressPh: "Adres…", addByAddress: "Ekle", clickHint: "Durak eklemek için haritaya tıklayın. İlki depodur.", point: "Durak", clear: "Temizle", build: "Rota planla", building: "Hesaplanıyor…", remove: "Kaldır", distance: "Mesafe", duration: "Süre", fuel: "Yakıt", cost: "Maliyet", litres: "L", depot: "depo", order: "En iyi sıra", geoDown: "Adres araması hâlâ hazırlanıyor — bu arada haritaya tıklayın.", emptyHint: "En az 2 durak ekleyin." },
  nl: { title: "Koeriersrouteplanner", subtitle: "Klik op de kaart voor stops (of via adres), plan dan de zuinigste volgorde.", addressPh: "Adres…", addByAddress: "Toevoegen", clickHint: "Klik op de kaart om een stop toe te voegen. De eerste is het depot.", point: "Stop", clear: "Wissen", build: "Route plannen", building: "Berekenen…", remove: "Verwijderen", distance: "Afstand", duration: "Tijd", fuel: "Brandstof", cost: "Kosten", litres: "L", depot: "depot", order: "Optimale volgorde", geoDown: "Adres zoeken is nog aan het opstarten — klik intussen op de kaart.", emptyHint: "Voeg minstens 2 stops toe." },
}

export function courierStrings(lang: string): CourierStrings {
  return COURIER_I18N[lang] ?? COURIER_I18N.en
}

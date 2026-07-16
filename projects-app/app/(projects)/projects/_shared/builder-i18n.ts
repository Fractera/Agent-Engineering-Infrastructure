// BUILDER I18N (owner 2026-07-16) — the strings of the diagram Builder's two modes and the draft node's
// type editor. NEW surface → ten languages (rule 4г): en, es, fr, it, ru, de, pt, pl, tr, nl. Deterministic
// dictionary in code — never a model call. Same pattern as global-canvas-i18n.ts.

export type BuilderStrings = {
  // ── the two SEPARATE build modes (owner: node-building and edge-building must never be one mode) ──
  buildNodes: string;      // renamed from "Builder" (owner 2026-07-16)
  closeBuildNodes: string;
  buildEdges: string;      // NEW mode — draw/delete edges by hand
  closeBuildEdges: string;
  addFreeNode: string;     // create an UNLINKED draft node (no parent)
  autoLayout: string;
  nodesHint: string;       // hint line while in node mode
  edgesHint: string;       // hint line while in edge mode
  deleteEdge: string;      // toolbar button — removes the SELECTED edge
  edgeRewired: string;     // toast after a successful connect
  edgeDeleted: string;     // toast after a successful delete
  // ── the draft node's TYPE editor (right drawer) ──
  typeSection: string;     // section heading
  roleLabel: string;
  typeLabel: string;
  customTypePlaceholder: string; // e.g. "WhatsApp"
  saveType: string;
  typeSaved: string;
  roleInput: string;
  roleIntermediate: string;
  roleOutput: string;
  typeTransform: string;
  typeCondition: string;
  typeCustom: string;
  // ── the "How it works" modal's typing view (owner 2026-07-16) ──
  showTypes: string;
  hideTypes: string;
  copyTypes: string;
};

export const BUILDER_I18N: Record<string, BuilderStrings> = {
  en: {
    buildNodes: "Build nodes", closeBuildNodes: "Close node mode",
    buildEdges: "Build edges", closeBuildEdges: "Close edge mode",
    addFreeNode: "Add free node", autoLayout: "Auto-layout",
    nodesHint: "Node mode — add, edit or delete nodes; drag to arrange",
    edgesHint: "Edge mode — drag from a node's edge to another node to wire them; click an edge, then Delete edge",
    deleteEdge: "Delete edge", edgeRewired: "Edge created", edgeDeleted: "Edge deleted",
    typeSection: "Node type", roleLabel: "Role", typeLabel: "Type",
    customTypePlaceholder: "Custom type name, e.g. WhatsApp",
    saveType: "Save type", typeSaved: "Node type saved",
    roleInput: "Input", roleIntermediate: "Intermediate", roleOutput: "Output",
    typeTransform: "Transform (regular work)", typeCondition: "Condition (branch gate)", typeCustom: "Custom…",
    showTypes: "Show types", hideTypes: "Hide types", copyTypes: "Copy types",
  },
  ru: {
    buildNodes: "Строить узлы", closeBuildNodes: "Закрыть режим узлов",
    buildEdges: "Строить рёбра", closeBuildEdges: "Закрыть режим рёбер",
    addFreeNode: "Свободный узел", autoLayout: "Авторасстановка",
    nodesHint: "Режим узлов — добавляйте, правьте и удаляйте узлы; перетаскивайте для расстановки",
    edgesHint: "Режим рёбер — потяните от края узла к другому узлу, чтобы связать; клик по ребру, затем «Удалить ребро»",
    deleteEdge: "Удалить ребро", edgeRewired: "Ребро создано", edgeDeleted: "Ребро удалено",
    typeSection: "Тип узла", roleLabel: "Роль", typeLabel: "Тип",
    customTypePlaceholder: "Название своего типа, напр. WhatsApp",
    saveType: "Сохранить тип", typeSaved: "Тип узла сохранён",
    roleInput: "Входной", roleIntermediate: "Серединный", roleOutput: "Выходной",
    typeTransform: "Обычный (transform)", typeCondition: "Условие (ветвление)", typeCustom: "Свой…",
    showTypes: "Показать типизацию", hideTypes: "Скрыть типизацию", copyTypes: "Копировать типизацию",
  },
  es: {
    buildNodes: "Construir nodos", closeBuildNodes: "Cerrar modo nodos",
    buildEdges: "Construir aristas", closeBuildEdges: "Cerrar modo aristas",
    addFreeNode: "Nodo libre", autoLayout: "Auto-disposición",
    nodesHint: "Modo nodos: añada, edite o elimine nodos; arrastre para organizar",
    edgesHint: "Modo aristas: arrastre desde el borde de un nodo hasta otro para conectarlos; haga clic en una arista y luego «Eliminar arista»",
    deleteEdge: "Eliminar arista", edgeRewired: "Arista creada", edgeDeleted: "Arista eliminada",
    typeSection: "Tipo de nodo", roleLabel: "Rol", typeLabel: "Tipo",
    customTypePlaceholder: "Nombre del tipo propio, p. ej. WhatsApp",
    saveType: "Guardar tipo", typeSaved: "Tipo de nodo guardado",
    roleInput: "Entrada", roleIntermediate: "Intermedio", roleOutput: "Salida",
    typeTransform: "Normal (transform)", typeCondition: "Condición (bifurcación)", typeCustom: "Propio…",
    showTypes: "Mostrar tipos", hideTypes: "Ocultar tipos", copyTypes: "Copiar tipos",
  },
  fr: {
    buildNodes: "Construire des nœuds", closeBuildNodes: "Fermer le mode nœuds",
    buildEdges: "Construire des liens", closeBuildEdges: "Fermer le mode liens",
    addFreeNode: "Nœud libre", autoLayout: "Disposition auto",
    nodesHint: "Mode nœuds — ajoutez, modifiez ou supprimez des nœuds ; faites glisser pour organiser",
    edgesHint: "Mode liens — tirez du bord d'un nœud vers un autre pour les relier ; cliquez sur un lien puis « Supprimer le lien »",
    deleteEdge: "Supprimer le lien", edgeRewired: "Lien créé", edgeDeleted: "Lien supprimé",
    typeSection: "Type de nœud", roleLabel: "Rôle", typeLabel: "Type",
    customTypePlaceholder: "Nom du type personnalisé, p. ex. WhatsApp",
    saveType: "Enregistrer le type", typeSaved: "Type de nœud enregistré",
    roleInput: "Entrée", roleIntermediate: "Intermédiaire", roleOutput: "Sortie",
    typeTransform: "Normal (transform)", typeCondition: "Condition (branchement)", typeCustom: "Personnalisé…",
    showTypes: "Afficher les types", hideTypes: "Masquer les types", copyTypes: "Copier les types",
  },
  it: {
    buildNodes: "Costruire nodi", closeBuildNodes: "Chiudi modalità nodi",
    buildEdges: "Costruire collegamenti", closeBuildEdges: "Chiudi modalità collegamenti",
    addFreeNode: "Nodo libero", autoLayout: "Disposizione automatica",
    nodesHint: "Modalità nodi — aggiungi, modifica o elimina nodi; trascina per disporre",
    edgesHint: "Modalità collegamenti — trascina dal bordo di un nodo a un altro per collegarli; clicca un collegamento, poi «Elimina collegamento»",
    deleteEdge: "Elimina collegamento", edgeRewired: "Collegamento creato", edgeDeleted: "Collegamento eliminato",
    typeSection: "Tipo di nodo", roleLabel: "Ruolo", typeLabel: "Tipo",
    customTypePlaceholder: "Nome del tipo personalizzato, es. WhatsApp",
    saveType: "Salva tipo", typeSaved: "Tipo di nodo salvato",
    roleInput: "Ingresso", roleIntermediate: "Intermedio", roleOutput: "Uscita",
    typeTransform: "Normale (transform)", typeCondition: "Condizione (diramazione)", typeCustom: "Personalizzato…",
    showTypes: "Mostra tipi", hideTypes: "Nascondi tipi", copyTypes: "Copia tipi",
  },
  de: {
    buildNodes: "Knoten bauen", closeBuildNodes: "Knoten-Modus schließen",
    buildEdges: "Kanten bauen", closeBuildEdges: "Kanten-Modus schließen",
    addFreeNode: "Freier Knoten", autoLayout: "Auto-Layout",
    nodesHint: "Knoten-Modus — Knoten hinzufügen, bearbeiten oder löschen; zum Anordnen ziehen",
    edgesHint: "Kanten-Modus — vom Rand eines Knotens zu einem anderen ziehen, um sie zu verbinden; Kante anklicken, dann „Kante löschen“",
    deleteEdge: "Kante löschen", edgeRewired: "Kante erstellt", edgeDeleted: "Kante gelöscht",
    typeSection: "Knotentyp", roleLabel: "Rolle", typeLabel: "Typ",
    customTypePlaceholder: "Eigener Typname, z. B. WhatsApp",
    saveType: "Typ speichern", typeSaved: "Knotentyp gespeichert",
    roleInput: "Eingang", roleIntermediate: "Zwischenknoten", roleOutput: "Ausgang",
    typeTransform: "Normal (transform)", typeCondition: "Bedingung (Verzweigung)", typeCustom: "Eigener…",
    showTypes: "Typen anzeigen", hideTypes: "Typen ausblenden", copyTypes: "Typen kopieren",
  },
  pt: {
    buildNodes: "Construir nós", closeBuildNodes: "Fechar modo nós",
    buildEdges: "Construir ligações", closeBuildEdges: "Fechar modo ligações",
    addFreeNode: "Nó livre", autoLayout: "Disposição automática",
    nodesHint: "Modo nós — adicione, edite ou elimine nós; arraste para organizar",
    edgesHint: "Modo ligações — arraste da borda de um nó até outro para os ligar; clique numa ligação e depois «Eliminar ligação»",
    deleteEdge: "Eliminar ligação", edgeRewired: "Ligação criada", edgeDeleted: "Ligação eliminada",
    typeSection: "Tipo de nó", roleLabel: "Papel", typeLabel: "Tipo",
    customTypePlaceholder: "Nome do tipo personalizado, p. ex. WhatsApp",
    saveType: "Guardar tipo", typeSaved: "Tipo de nó guardado",
    roleInput: "Entrada", roleIntermediate: "Intermédio", roleOutput: "Saída",
    typeTransform: "Normal (transform)", typeCondition: "Condição (ramificação)", typeCustom: "Personalizado…",
    showTypes: "Mostrar tipos", hideTypes: "Ocultar tipos", copyTypes: "Copiar tipos",
  },
  pl: {
    buildNodes: "Buduj węzły", closeBuildNodes: "Zamknij tryb węzłów",
    buildEdges: "Buduj krawędzie", closeBuildEdges: "Zamknij tryb krawędzi",
    addFreeNode: "Wolny węzeł", autoLayout: "Auto-układ",
    nodesHint: "Tryb węzłów — dodawaj, edytuj i usuwaj węzły; przeciągaj, aby rozmieścić",
    edgesHint: "Tryb krawędzi — przeciągnij od krawędzi węzła do innego, aby je połączyć; kliknij krawędź, potem „Usuń krawędź”",
    deleteEdge: "Usuń krawędź", edgeRewired: "Krawędź utworzona", edgeDeleted: "Krawędź usunięta",
    typeSection: "Typ węzła", roleLabel: "Rola", typeLabel: "Typ",
    customTypePlaceholder: "Nazwa własnego typu, np. WhatsApp",
    saveType: "Zapisz typ", typeSaved: "Typ węzła zapisany",
    roleInput: "Wejściowy", roleIntermediate: "Pośredni", roleOutput: "Wyjściowy",
    typeTransform: "Zwykły (transform)", typeCondition: "Warunek (rozgałęzienie)", typeCustom: "Własny…",
    showTypes: "Pokaż typy", hideTypes: "Ukryj typy", copyTypes: "Kopiuj typy",
  },
  tr: {
    buildNodes: "Düğüm oluştur", closeBuildNodes: "Düğüm modunu kapat",
    buildEdges: "Bağlantı oluştur", closeBuildEdges: "Bağlantı modunu kapat",
    addFreeNode: "Serbest düğüm", autoLayout: "Otomatik yerleşim",
    nodesHint: "Düğüm modu — düğüm ekleyin, düzenleyin veya silin; düzenlemek için sürükleyin",
    edgesHint: "Bağlantı modu — bir düğümün kenarından diğerine sürükleyerek bağlayın; bir bağlantıya tıklayın, sonra «Bağlantıyı sil»",
    deleteEdge: "Bağlantıyı sil", edgeRewired: "Bağlantı oluşturuldu", edgeDeleted: "Bağlantı silindi",
    typeSection: "Düğüm türü", roleLabel: "Rol", typeLabel: "Tür",
    customTypePlaceholder: "Özel tür adı, örn. WhatsApp",
    saveType: "Türü kaydet", typeSaved: "Düğüm türü kaydedildi",
    roleInput: "Giriş", roleIntermediate: "Ara", roleOutput: "Çıkış",
    typeTransform: "Normal (transform)", typeCondition: "Koşul (dallanma)", typeCustom: "Özel…",
    showTypes: "Türleri göster", hideTypes: "Türleri gizle", copyTypes: "Türleri kopyala",
  },
  nl: {
    buildNodes: "Knopen bouwen", closeBuildNodes: "Knopenmodus sluiten",
    buildEdges: "Verbindingen bouwen", closeBuildEdges: "Verbindingsmodus sluiten",
    addFreeNode: "Vrije knoop", autoLayout: "Auto-indeling",
    nodesHint: "Knopenmodus — voeg knopen toe, bewerk of verwijder ze; sleep om te ordenen",
    edgesHint: "Verbindingsmodus — sleep van de rand van een knoop naar een andere om ze te verbinden; klik op een verbinding en dan «Verbinding verwijderen»",
    deleteEdge: "Verbinding verwijderen", edgeRewired: "Verbinding gemaakt", edgeDeleted: "Verbinding verwijderd",
    typeSection: "Knooptype", roleLabel: "Rol", typeLabel: "Type",
    customTypePlaceholder: "Naam van eigen type, bijv. WhatsApp",
    saveType: "Type opslaan", typeSaved: "Knooptype opgeslagen",
    roleInput: "Invoer", roleIntermediate: "Tussenliggend", roleOutput: "Uitvoer",
    typeTransform: "Normaal (transform)", typeCondition: "Conditie (vertakking)", typeCustom: "Eigen…",
    showTypes: "Types tonen", hideTypes: "Types verbergen", copyTypes: "Types kopiëren",
  },
};

export function builderStrings(lang: string): BuilderStrings {
  return BUILDER_I18N[lang] ?? BUILDER_I18N.en;
}

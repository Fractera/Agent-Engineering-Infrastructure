// WARNING / PROBLEMS I18N (step 246) — the strings of the agent→owner escalation surfaces: the node
// drawer's blocker block and the automation-level problems modal. Ten languages (rule 4г), deterministic,
// in code.

export type WarningStrings = {
  // STEP 247 — LAYER 1, the static FRAMING the agent never writes: a human sentence built from the
  // warning's short `subject` (+ the node's name when known), followed by a per-kind "what you can do".
  framingIntroNode: string;  // "{name}" + "{subject}"
  framingIntro: string;      // "{subject}" only (no node name known)
  framingScout: string;      // kind hermes-scout: solve yourself OR copy the request to the Hermes agent
  framingDecision: string;   // kind owner-decision: the agent waits for YOUR decision
  framingExternal: string;   // kind external-service
  // Step 248 — kind missing-credentials: keys live in Settings; the warning clears ITSELF after the keys
  // are saved there, and development re-tests the object. {keys} = comma-joined env key names.
  framingCredentials: string;
  keysLabel: string;         // "Required keys"
  openSettings: string;      // the button that opens the Settings modal
  // The missing-keys FUNNEL (step 248) — declared required keys with no value yet (no warning needed).
  funnelBadge: string;       // "Keys required ({n})"
  funnelTitle: string;
  funnelBody: string;        // {keys}
  blockTitle: string;        // "⚠ Blocker" heading in the drawer / modal item
  scoutButton: string;       // "Use the Hermes agent as a scout"
  copyInstruction: string;   // copy the ready Hermes instruction
  copied: string;
  answerLabel: string;       // the answer field label
  answerPlaceholder: string; // hint: paste the scout's report / your decision
  sendAnswer: string;
  answerSent: string;        // toast — the object is unblocked, re-enters the wave
  answerFailed: string;
  expectedLabel: string;     // "What the agent expects back"
  problemsTitle: string;     // modal title
  problemsDescription: string;
  problemsBadge: string;     // tooltip/aria of the ⚠ N badge
  problemsEmpty: string;
  prev: string;
  next: string;
  ofCounter: string;         // "{i} of {n}"
};

export const WARNING_I18N: Record<string, WarningStrings> = {
  en: {
    framingIntroNode: "While developing the node “{name}”, the coding agent requested: {subject} — and could not solve it on its own, so it raised this notice.",
    framingIntro: "During development the coding agent requested: {subject} — and could not solve it on its own, so it raised this notice.",
    framingScout: "You can propose your own solution in the field below — or use the Hermes agent: it has extended tools and can obtain what is missing. Copy the request, hand it to the Hermes agent, then paste its answer into the field below — the development round repeats.",
    framingDecision: "The agent is waiting for YOUR decision. Write it in the field below — the development round repeats.",
    framingExternal: "The problem is on an external service's side. Write in the field below how to proceed (or paste the missing data) — the development round repeats.",
    framingCredentials: "This automation needs keys to operate: {keys}. Open Settings and fill them in — this notice will disappear by itself, and development will then re-test the node with the real keys.",
    keysLabel: "Required keys",
    openSettings: "Open Settings",
    funnelBadge: "Keys required ({n})",
    funnelTitle: "This automation is missing its keys",
    funnelBody: "The following keys are declared but not filled in yet: {keys}. Open Settings and add them — the automation cannot operate without them.",
    blockTitle: "Blocker", scoutButton: "Use the Hermes agent as a scout",
    copyInstruction: "Copy instruction for Hermes", copied: "Copied",
    answerLabel: "Scout's answer / your decision",
    answerPlaceholder: "Paste the Hermes report or write your decision…",
    sendAnswer: "Send answer", answerSent: "Answer recorded — the object re-enters the development wave",
    answerFailed: "Could not record the answer",
    expectedLabel: "What the agent expects back",
    problemsTitle: "Development problems", problemsDescription: "The coding agent reported blockers it cannot pass alone. Answer each one — the answer goes back into development.",
    problemsBadge: "Development problems", problemsEmpty: "No open problems.",
    prev: "Previous", next: "Next", ofCounter: "{i} of {n}",
  },
  ru: {
    framingIntroNode: "При разработке узла «{name}» агент-программист запросил: {subject} — и не смог решить эту задачу сам, поэтому вывел это предупреждение.",
    framingIntro: "При разработке агент-программист запросил: {subject} — и не смог решить эту задачу сам, поэтому вывел это предупреждение.",
    framingScout: "Вы можете предложить своё решение в поле ниже — или использовать Гермес-агента: у него расширенные инструменты, и он может добыть недостающее сам. Скопируйте запрос, передайте его Гермес-агенту, а полученный ответ вставьте в поле ниже — этап разработки повторится.",
    framingDecision: "Агент ждёт ВАШЕГО решения. Напишите его в поле ниже — и этап разработки повторится.",
    framingExternal: "Проблема на стороне внешнего сервиса. Напишите в поле ниже, как поступить (или вставьте недостающие данные), — и этап разработки повторится.",
    framingCredentials: "Для работы этой автоматизации нужны ключи: {keys}. Откройте Настройки и заполните их — это предупреждение исчезнет само, а разработка затем повторно протестирует узел уже с настоящими ключами.",
    keysLabel: "Требуемые ключи",
    openSettings: "Открыть настройки",
    funnelBadge: "Нужны ключи ({n})",
    funnelTitle: "У этой автоматизации не заполнены ключи",
    funnelBody: "Задекларированы, но ещё не заполнены следующие ключи: {keys}. Откройте Настройки и добавьте их — без них автоматизация работать не сможет.",
    blockTitle: "Препятствие", scoutButton: "Использовать Гермес-агента как разведчика",
    copyInstruction: "Скопировать инструкцию для Гермеса", copied: "Скопировано",
    answerLabel: "Ответ разведчика / ваше решение",
    answerPlaceholder: "Вставьте отчёт Гермеса или напишите своё решение…",
    sendAnswer: "Отправить ответ", answerSent: "Ответ записан — объект вернётся в волну разработки",
    answerFailed: "Не удалось записать ответ",
    expectedLabel: "Что агент ждёт в ответ",
    problemsTitle: "Проблемы разработки", problemsDescription: "Агент-кодер сообщил о препятствиях, которые не может пройти сам. Ответьте на каждое — ответ уйдёт обратно в разработку.",
    problemsBadge: "Проблемы разработки", problemsEmpty: "Открытых проблем нет.",
    prev: "Назад", next: "Далее", ofCounter: "{i} из {n}",
  },
  es: {
    framingIntroNode: "Al desarrollar el nodo «{name}», el agente programador solicitó: {subject} — y no pudo resolverlo por sí solo, por lo que emitió este aviso.",
    framingIntro: "Durante el desarrollo, el agente programador solicitó: {subject} — y no pudo resolverlo por sí solo, por lo que emitió este aviso.",
    framingScout: "Puede proponer su propia solución en el campo de abajo — o usar el agente Hermes: tiene herramientas ampliadas y puede obtener lo que falta. Copie la solicitud, entréguesela al agente Hermes y pegue su respuesta en el campo de abajo: la ronda de desarrollo se repetirá.",
    framingDecision: "El agente espera SU decisión. Escríbala en el campo de abajo y la ronda de desarrollo se repetirá.",
    framingExternal: "El problema está del lado de un servicio externo. Escriba abajo cómo proceder (o pegue los datos que faltan) y la ronda de desarrollo se repetirá.",
    framingCredentials: "Esta automatización necesita claves para funcionar: {keys}. Abra Ajustes y rellénelas — este aviso desaparecerá solo, y el desarrollo volverá a probar el nodo con las claves reales.",
    keysLabel: "Claves requeridas",
    openSettings: "Abrir ajustes",
    funnelBadge: "Faltan claves ({n})",
    funnelTitle: "A esta automatización le faltan sus claves",
    funnelBody: "Las siguientes claves están declaradas pero aún sin rellenar: {keys}. Abra Ajustes y añádalas — sin ellas la automatización no puede funcionar.",
    blockTitle: "Obstáculo", scoutButton: "Usar el agente Hermes como explorador",
    copyInstruction: "Copiar instrucción para Hermes", copied: "Copiado",
    answerLabel: "Respuesta del explorador / su decisión",
    answerPlaceholder: "Pegue el informe de Hermes o escriba su decisión…",
    sendAnswer: "Enviar respuesta", answerSent: "Respuesta registrada: el objeto vuelve a la ola de desarrollo",
    answerFailed: "No se pudo registrar la respuesta",
    expectedLabel: "Qué espera recibir el agente",
    problemsTitle: "Problemas de desarrollo", problemsDescription: "El agente programador informó de obstáculos que no puede superar solo. Responda a cada uno: la respuesta vuelve al desarrollo.",
    problemsBadge: "Problemas de desarrollo", problemsEmpty: "No hay problemas abiertos.",
    prev: "Anterior", next: "Siguiente", ofCounter: "{i} de {n}",
  },
  fr: {
    framingIntroNode: "En développant le nœud « {name} », l'agent codeur a demandé : {subject} — et n'a pas pu résoudre cela seul, il a donc émis cet avertissement.",
    framingIntro: "Pendant le développement, l'agent codeur a demandé : {subject} — et n'a pas pu résoudre cela seul, il a donc émis cet avertissement.",
    framingScout: "Vous pouvez proposer votre propre solution dans le champ ci-dessous — ou utiliser l'agent Hermès : il dispose d'outils étendus et peut obtenir ce qui manque. Copiez la demande, remettez-la à l'agent Hermès, puis collez sa réponse dans le champ ci-dessous — le tour de développement se répétera.",
    framingDecision: "L'agent attend VOTRE décision. Écrivez-la dans le champ ci-dessous — le tour de développement se répétera.",
    framingExternal: "Le problème vient d'un service externe. Écrivez ci-dessous comment procéder (ou collez les données manquantes) — le tour de développement se répétera.",
    framingCredentials: "Cette automatisation a besoin de clés pour fonctionner : {keys}. Ouvrez les Réglages et renseignez-les — cet avertissement disparaîtra de lui-même, puis le développement retestera le nœud avec les vraies clés.",
    keysLabel: "Clés requises",
    openSettings: "Ouvrir les réglages",
    funnelBadge: "Clés requises ({n})",
    funnelTitle: "Les clés de cette automatisation ne sont pas renseignées",
    funnelBody: "Les clés suivantes sont déclarées mais pas encore renseignées : {keys}. Ouvrez les Réglages et ajoutez-les — sans elles, l'automatisation ne peut pas fonctionner.",
    blockTitle: "Obstacle", scoutButton: "Utiliser l'agent Hermès comme éclaireur",
    copyInstruction: "Copier l'instruction pour Hermès", copied: "Copié",
    answerLabel: "Réponse de l'éclaireur / votre décision",
    answerPlaceholder: "Collez le rapport d'Hermès ou écrivez votre décision…",
    sendAnswer: "Envoyer la réponse", answerSent: "Réponse enregistrée — l'objet revient dans la vague de développement",
    answerFailed: "Impossible d'enregistrer la réponse",
    expectedLabel: "Ce que l'agent attend en retour",
    problemsTitle: "Problèmes de développement", problemsDescription: "L'agent codeur a signalé des obstacles qu'il ne peut pas franchir seul. Répondez à chacun — la réponse repart dans le développement.",
    problemsBadge: "Problèmes de développement", problemsEmpty: "Aucun problème ouvert.",
    prev: "Précédent", next: "Suivant", ofCounter: "{i} sur {n}",
  },
  it: {
    framingIntroNode: "Sviluppando il nodo «{name}», l'agente programmatore ha richiesto: {subject} — e non ha potuto risolverlo da solo, quindi ha emesso questo avviso.",
    framingIntro: "Durante lo sviluppo l'agente programmatore ha richiesto: {subject} — e non ha potuto risolverlo da solo, quindi ha emesso questo avviso.",
    framingScout: "Può proporre la sua soluzione nel campo qui sotto — oppure usare l'agente Hermes: ha strumenti estesi e può procurarsi ciò che manca. Copi la richiesta, la consegni all'agente Hermes e incolli la sua risposta nel campo qui sotto: il giro di sviluppo si ripeterà.",
    framingDecision: "L'agente attende la SUA decisione. La scriva nel campo qui sotto — il giro di sviluppo si ripeterà.",
    framingExternal: "Il problema è dal lato di un servizio esterno. Scriva qui sotto come procedere (o incolli i dati mancanti) — il giro di sviluppo si ripeterà.",
    framingCredentials: "Questa automazione ha bisogno di chiavi per funzionare: {keys}. Apra le Impostazioni e le compili — questo avviso sparirà da solo, e lo sviluppo ritesterà il nodo con le chiavi reali.",
    keysLabel: "Chiavi richieste",
    openSettings: "Apri impostazioni",
    funnelBadge: "Chiavi richieste ({n})",
    funnelTitle: "Le chiavi di questa automazione non sono compilate",
    funnelBody: "Le seguenti chiavi sono dichiarate ma non ancora compilate: {keys}. Apra le Impostazioni e le aggiunga — senza di esse l'automazione non può funzionare.",
    blockTitle: "Ostacolo", scoutButton: "Usare l'agente Hermes come esploratore",
    copyInstruction: "Copia istruzione per Hermes", copied: "Copiato",
    answerLabel: "Risposta dell'esploratore / la sua decisione",
    answerPlaceholder: "Incolli il rapporto di Hermes o scriva la sua decisione…",
    sendAnswer: "Invia risposta", answerSent: "Risposta registrata — l'oggetto torna nell'ondata di sviluppo",
    answerFailed: "Impossibile registrare la risposta",
    expectedLabel: "Cosa l'agente si aspetta in cambio",
    problemsTitle: "Problemi di sviluppo", problemsDescription: "L'agente programmatore ha segnalato ostacoli che non può superare da solo. Risponda a ciascuno: la risposta torna nello sviluppo.",
    problemsBadge: "Problemi di sviluppo", problemsEmpty: "Nessun problema aperto.",
    prev: "Precedente", next: "Successivo", ofCounter: "{i} di {n}",
  },
  de: {
    framingIntroNode: "Bei der Entwicklung des Knotens „{name}“ hat der Coding-Agent Folgendes angefordert: {subject} — und konnte es nicht allein lösen, daher dieser Hinweis.",
    framingIntro: "Während der Entwicklung hat der Coding-Agent Folgendes angefordert: {subject} — und konnte es nicht allein lösen, daher dieser Hinweis.",
    framingScout: "Sie können unten Ihre eigene Lösung vorschlagen — oder den Hermes-Agenten einsetzen: Er hat erweiterte Werkzeuge und kann das Fehlende selbst beschaffen. Kopieren Sie die Anfrage, übergeben Sie sie dem Hermes-Agenten und fügen Sie seine Antwort unten ein — die Entwicklungsrunde wiederholt sich.",
    framingDecision: "Der Agent wartet auf IHRE Entscheidung. Schreiben Sie sie unten hinein — die Entwicklungsrunde wiederholt sich.",
    framingExternal: "Das Problem liegt bei einem externen Dienst. Schreiben Sie unten, wie verfahren werden soll (oder fügen Sie die fehlenden Daten ein) — die Entwicklungsrunde wiederholt sich.",
    framingCredentials: "Diese Automatisierung braucht Schlüssel zum Arbeiten: {keys}. Öffnen Sie die Einstellungen und tragen Sie sie ein — dieser Hinweis verschwindet von selbst, und die Entwicklung testet den Knoten anschließend mit den echten Schlüsseln erneut.",
    keysLabel: "Erforderliche Schlüssel",
    openSettings: "Einstellungen öffnen",
    funnelBadge: "Schlüssel nötig ({n})",
    funnelTitle: "Dieser Automatisierung fehlen ihre Schlüssel",
    funnelBody: "Folgende Schlüssel sind deklariert, aber noch nicht eingetragen: {keys}. Öffnen Sie die Einstellungen und ergänzen Sie sie — ohne sie kann die Automatisierung nicht arbeiten.",
    blockTitle: "Hindernis", scoutButton: "Hermes-Agent als Späher einsetzen",
    copyInstruction: "Anweisung für Hermes kopieren", copied: "Kopiert",
    answerLabel: "Antwort des Spähers / Ihre Entscheidung",
    answerPlaceholder: "Fügen Sie den Hermes-Bericht ein oder schreiben Sie Ihre Entscheidung…",
    sendAnswer: "Antwort senden", answerSent: "Antwort erfasst — das Objekt kehrt in die Entwicklungswelle zurück",
    answerFailed: "Antwort konnte nicht erfasst werden",
    expectedLabel: "Was der Agent zurückerwartet",
    problemsTitle: "Entwicklungsprobleme", problemsDescription: "Der Coding-Agent meldete Hindernisse, die er allein nicht überwinden kann. Beantworten Sie jedes — die Antwort fließt zurück in die Entwicklung.",
    problemsBadge: "Entwicklungsprobleme", problemsEmpty: "Keine offenen Probleme.",
    prev: "Zurück", next: "Weiter", ofCounter: "{i} von {n}",
  },
  pt: {
    framingIntroNode: "Ao desenvolver o nó «{name}», o agente programador solicitou: {subject} — e não conseguiu resolver sozinho, por isso emitiu este aviso.",
    framingIntro: "Durante o desenvolvimento, o agente programador solicitou: {subject} — e não conseguiu resolver sozinho, por isso emitiu este aviso.",
    framingScout: "Pode propor a sua própria solução no campo abaixo — ou usar o agente Hermes: ele tem ferramentas alargadas e pode obter o que falta. Copie o pedido, entregue-o ao agente Hermes e cole a resposta dele no campo abaixo — a ronda de desenvolvimento repete-se.",
    framingDecision: "O agente aguarda a SUA decisão. Escreva-a no campo abaixo — e a ronda de desenvolvimento repete-se.",
    framingExternal: "O problema está do lado de um serviço externo. Escreva abaixo como proceder (ou cole os dados em falta) — e a ronda de desenvolvimento repete-se.",
    framingCredentials: "Esta automação precisa de chaves para funcionar: {keys}. Abra as Definições e preencha-as — este aviso desaparecerá sozinho, e o desenvolvimento voltará a testar o nó com as chaves reais.",
    keysLabel: "Chaves necessárias",
    openSettings: "Abrir definições",
    funnelBadge: "Faltam chaves ({n})",
    funnelTitle: "Faltam as chaves desta automação",
    funnelBody: "As seguintes chaves estão declaradas mas ainda por preencher: {keys}. Abra as Definições e adicione-as — sem elas a automação não pode funcionar.",
    blockTitle: "Obstáculo", scoutButton: "Usar o agente Hermes como batedor",
    copyInstruction: "Copiar instrução para o Hermes", copied: "Copiado",
    answerLabel: "Resposta do batedor / a sua decisão",
    answerPlaceholder: "Cole o relatório do Hermes ou escreva a sua decisão…",
    sendAnswer: "Enviar resposta", answerSent: "Resposta registada — o objeto volta à onda de desenvolvimento",
    answerFailed: "Não foi possível registar a resposta",
    expectedLabel: "O que o agente espera receber",
    problemsTitle: "Problemas de desenvolvimento", problemsDescription: "O agente programador relatou obstáculos que não consegue superar sozinho. Responda a cada um — a resposta volta ao desenvolvimento.",
    problemsBadge: "Problemas de desenvolvimento", problemsEmpty: "Sem problemas abertos.",
    prev: "Anterior", next: "Seguinte", ofCounter: "{i} de {n}",
  },
  pl: {
    framingIntroNode: "Podczas rozwoju węzła „{name}” agent-programista zażądał: {subject} — i nie mógł rozwiązać tego sam, dlatego wyświetlił to ostrzeżenie.",
    framingIntro: "Podczas rozwoju agent-programista zażądał: {subject} — i nie mógł rozwiązać tego sam, dlatego wyświetlił to ostrzeżenie.",
    framingScout: "Możesz zaproponować własne rozwiązanie w polu poniżej — albo użyć agenta Hermes: ma rozszerzone narzędzia i może sam zdobyć to, czego brakuje. Skopiuj zapytanie, przekaż je agentowi Hermes, a jego odpowiedź wklej w pole poniżej — runda rozwoju się powtórzy.",
    framingDecision: "Agent czeka na TWOJĄ decyzję. Napisz ją w polu poniżej — runda rozwoju się powtórzy.",
    framingExternal: "Problem leży po stronie zewnętrznej usługi. Napisz poniżej, jak postąpić (lub wklej brakujące dane) — runda rozwoju się powtórzy.",
    framingCredentials: "Ta automatyzacja potrzebuje kluczy do działania: {keys}. Otwórz Ustawienia i uzupełnij je — to ostrzeżenie zniknie samo, a rozwój ponownie przetestuje węzeł z prawdziwymi kluczami.",
    keysLabel: "Wymagane klucze",
    openSettings: "Otwórz ustawienia",
    funnelBadge: "Potrzebne klucze ({n})",
    funnelTitle: "Ta automatyzacja nie ma uzupełnionych kluczy",
    funnelBody: "Następujące klucze są zadeklarowane, ale jeszcze nie uzupełnione: {keys}. Otwórz Ustawienia i dodaj je — bez nich automatyzacja nie może działać.",
    blockTitle: "Przeszkoda", scoutButton: "Użyj agenta Hermes jako zwiadowcy",
    copyInstruction: "Kopiuj instrukcję dla Hermesa", copied: "Skopiowano",
    answerLabel: "Odpowiedź zwiadowcy / Twoja decyzja",
    answerPlaceholder: "Wklej raport Hermesa lub napisz swoją decyzję…",
    sendAnswer: "Wyślij odpowiedź", answerSent: "Odpowiedź zapisana — obiekt wraca do fali rozwoju",
    answerFailed: "Nie udało się zapisać odpowiedzi",
    expectedLabel: "Czego agent oczekuje w zamian",
    problemsTitle: "Problemy rozwoju", problemsDescription: "Agent-programista zgłosił przeszkody, których nie może pokonać sam. Odpowiedz na każdą — odpowiedź wraca do rozwoju.",
    problemsBadge: "Problemy rozwoju", problemsEmpty: "Brak otwartych problemów.",
    prev: "Wstecz", next: "Dalej", ofCounter: "{i} z {n}",
  },
  tr: {
    framingIntroNode: "“{name}” düğümünü geliştirirken kodlayıcı ajan şunu talep etti: {subject} — ve bunu tek başına çözemediği için bu uyarıyı verdi.",
    framingIntro: "Geliştirme sırasında kodlayıcı ajan şunu talep etti: {subject} — ve bunu tek başına çözemediği için bu uyarıyı verdi.",
    framingScout: "Aşağıdaki alana kendi çözümünüzü yazabilirsiniz — ya da Hermes ajanını kullanın: genişletilmiş araçlara sahiptir ve eksik olanı kendisi edinebilir. Talebi kopyalayın, Hermes ajanına iletin ve yanıtını aşağıdaki alana yapıştırın — geliştirme turu tekrarlanır.",
    framingDecision: "Ajan SİZİN kararınızı bekliyor. Aşağıdaki alana yazın — geliştirme turu tekrarlanır.",
    framingExternal: "Sorun harici bir servis tarafında. Aşağıya nasıl ilerleneceğini yazın (veya eksik verileri yapıştırın) — geliştirme turu tekrarlanır.",
    framingCredentials: "Bu otomasyonun çalışması için anahtarlar gerekiyor: {keys}. Ayarları açıp doldurun — bu uyarı kendiliğinden kaybolacak ve geliştirme düğümü gerçek anahtarlarla yeniden test edecek.",
    keysLabel: "Gerekli anahtarlar",
    openSettings: "Ayarları aç",
    funnelBadge: "Anahtar gerekli ({n})",
    funnelTitle: "Bu otomasyonun anahtarları doldurulmamış",
    funnelBody: "Şu anahtarlar bildirilmiş ama henüz doldurulmamış: {keys}. Ayarları açın ve ekleyin — onlar olmadan otomasyon çalışamaz.",
    blockTitle: "Engel", scoutButton: "Hermes ajanını keşifçi olarak kullan",
    copyInstruction: "Hermes için talimatı kopyala", copied: "Kopyalandı",
    answerLabel: "Keşifçinin yanıtı / kararınız",
    answerPlaceholder: "Hermes raporunu yapıştırın veya kararınızı yazın…",
    sendAnswer: "Yanıtı gönder", answerSent: "Yanıt kaydedildi — nesne geliştirme dalgasına geri dönüyor",
    answerFailed: "Yanıt kaydedilemedi",
    expectedLabel: "Ajanın karşılığında beklediği",
    problemsTitle: "Geliştirme sorunları", problemsDescription: "Kodlayıcı ajan tek başına aşamayacağı engeller bildirdi. Her birine yanıt verin — yanıt geliştirmeye geri döner.",
    problemsBadge: "Geliştirme sorunları", problemsEmpty: "Açık sorun yok.",
    prev: "Geri", next: "İleri", ofCounter: "{i} / {n}",
  },
  nl: {
    framingIntroNode: "Bij het ontwikkelen van de node “{name}” vroeg de codeeragent om: {subject} — en kon dit niet zelf oplossen, daarom gaf hij deze melding.",
    framingIntro: "Tijdens de ontwikkeling vroeg de codeeragent om: {subject} — en kon dit niet zelf oplossen, daarom gaf hij deze melding.",
    framingScout: "U kunt uw eigen oplossing in het veld hieronder voorstellen — of de Hermes-agent inzetten: die heeft uitgebreide tools en kan het ontbrekende zelf verkrijgen. Kopieer het verzoek, geef het aan de Hermes-agent en plak zijn antwoord in het veld hieronder — de ontwikkelronde herhaalt zich.",
    framingDecision: "De agent wacht op UW beslissing. Schrijf die in het veld hieronder — de ontwikkelronde herhaalt zich.",
    framingExternal: "Het probleem ligt bij een externe dienst. Schrijf hieronder hoe verder te gaan (of plak de ontbrekende gegevens) — de ontwikkelronde herhaalt zich.",
    framingCredentials: "Deze automatisering heeft sleutels nodig om te werken: {keys}. Open Instellingen en vul ze in — deze melding verdwijnt vanzelf, en de ontwikkeling test de node daarna opnieuw met de echte sleutels.",
    keysLabel: "Vereiste sleutels",
    openSettings: "Instellingen openen",
    funnelBadge: "Sleutels nodig ({n})",
    funnelTitle: "De sleutels van deze automatisering zijn niet ingevuld",
    funnelBody: "De volgende sleutels zijn gedeclareerd maar nog niet ingevuld: {keys}. Open Instellingen en voeg ze toe — zonder deze kan de automatisering niet werken.",
    blockTitle: "Obstakel", scoutButton: "Hermes-agent als verkenner inzetten",
    copyInstruction: "Instructie voor Hermes kopiëren", copied: "Gekopieerd",
    answerLabel: "Antwoord van de verkenner / uw beslissing",
    answerPlaceholder: "Plak het Hermes-rapport of schrijf uw beslissing…",
    sendAnswer: "Antwoord versturen", answerSent: "Antwoord vastgelegd — het object keert terug in de ontwikkelgolf",
    answerFailed: "Antwoord kon niet worden vastgelegd",
    expectedLabel: "Wat de agent terug verwacht",
    problemsTitle: "Ontwikkelproblemen", problemsDescription: "De codeeragent meldde obstakels die hij niet alleen kan passeren. Beantwoord elk — het antwoord gaat terug de ontwikkeling in.",
    problemsBadge: "Ontwikkelproblemen", problemsEmpty: "Geen open problemen.",
    prev: "Vorige", next: "Volgende", ofCounter: "{i} van {n}",
  },
};

export function warningStrings(lang: string): WarningStrings {
  return WARNING_I18N[lang] ?? WARNING_I18N.en;
}

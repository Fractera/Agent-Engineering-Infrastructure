// SIX-LANGUAGE UI for the WHOLE Quiz flow (CLAUDE.md 4г; owner: "every text, every button, everywhere").
// The six languages we ship (en, es, fr, it, ru, de); anything else falls back to English. This is the ONE
// place the Quiz's owner-facing strings live — the modal chrome AND every toast the session raises. Strings
// with {name}/{n}/{step} are templates; fill them with `fill()`.

export type QuizStrings = {
  // modal chrome
  banner: string;
  phScenarios: string; phAnswer: string;
  tUseCases: string; tUseCasesSub: string;
  tNode: string; tNodeOf: string;
  tLink: string;
  tCaseOne: string; tCaseAll: string;
  loaderEdge: string; loaderCase: string; loaderInstruction: string;
  autoWriting: string; autoPaused: string; btnPause: string; btnContinue: string; btnKeep: string;
  btnAnswer: string; btnAuto: string;
  btnFinishLink: string; btnSaveCases: string; btnCasesReady: string; btnFinishNode: string; btnEnd: string;
  hintLink: string; hintCase: string; hintUsecases: string; hintNodes: string;
  designer: string;
  // toasts — session lifecycle
  errStart: string; errComplete: string; errAutoStart: string; errNoAnswer: string;
  errCreateNode: string; errWriteLink: string; errSaveCases: string; errCasesNotReady: string;
  sessionFinished: string; testIt: string; testFinished: string;
  openUserCases: string; copy: string; copyStep: string; handoffDesc: string;
  nodeDesigned: string;           // {name} {step}
  linkDesigned: string;           // {name} {step}
  casesWritten: string; casesWrittenOne: string; casesWrittenDesc: string;   // {n}
  casesUpdated: string; casesUpdatedOne: string; nothingChanged: string;     // {n}
  keptAsDesc: string; editReplaced: string;
  casesMissing: string; casesMissingDesc: string;
  nodeDesignedOnly: string; nodeDesignedDesc: string;   // {name} — step 233: node is a draft, no per-node step
};

/** Fill {name}/{n}/{step} placeholders. */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export const QUIZ_I18N: Record<string, QuizStrings> = {
  en: {
    banner: "Planning an automation works far better with the most powerful model available to you. Pick it in the hamburger menu at the top of the page (Settings → model).",
    phScenarios: "Describe your scenarios — speak freely; hold the microphone and dictate…", phAnswer: "Your answer…",
    tUseCases: "The user cases", tUseCasesSub: "described first — before anything is built",
    tNode: "Designing node", tNodeOf: "of at most", tLink: "Designing the link",
    tCaseOne: "Revisiting a user case", tCaseAll: "Revisiting the user cases",
    loaderEdge: "Reading both automations…", loaderCase: "Reading the automation…", loaderInstruction: "Reading your instruction…",
    autoWriting: "Auto-quiz — writing… (you can pause and edit)", autoPaused: "Auto-quiz — paused, edit freely",
    btnPause: "Pause", btnContinue: "Continue auto-quiz", btnKeep: "Keep this text",
    btnAnswer: "Answer", btnAuto: "Auto-quiz",
    btnFinishLink: "Finish the link → development step", btnSaveCases: "Save the cases → development step",
    btnCasesReady: "The cases are ready → design the nodes", btnFinishNode: "Finish this node → next", btnEnd: "End the session",
    hintLink: "Finishing the link writes its brief and queues one development step for the coding agent.",
    hintCase: "Saving writes the new case text and queues one development step per case you changed.",
    hintUsecases: "Nothing is built until the scenarios exist: they become your numbered user cases, and the nodes are designed from them.",
    hintNodes: "Each node you finish becomes a draft on the diagram and a development step for the coding agent.",
    designer: "Designer",
    errStart: "Could not start the quiz.", errComplete: "This design session is complete.", errAutoStart: "Auto-quiz could not start.",
    errNoAnswer: "The model did not answer.", errCreateNode: "Could not create the node.", errWriteLink: "Could not write the link brief.",
    errSaveCases: "Could not save the user cases.", errCasesNotReady: "The user cases are not ready yet.",
    sessionFinished: "Design session finished", testIt: "Test it", testFinished: "Test finished",
    openUserCases: "Open user cases", copy: "Copy", copyStep: "Copy step",
    handoffDesc: "Copy the brief and paste it into the coding agent's chat, or let the agent drain the queue.",
    nodeDesigned: "Node \"{name}\" designed — development step #{step} created",
    linkDesigned: "Link \"{name}\" designed — development step #{step} created",
    casesWritten: "{n} user cases written", casesWrittenOne: "1 user case written",
    casesWrittenDesc: "Read them in the Use cases panel and confirm them — development starts only after that. Now we design the nodes.",
    casesUpdated: "{n} user cases updated", casesUpdatedOne: "1 user case updated", nothingChanged: "Nothing changed",
    keptAsDesc: "Kept as your description of the scenarios — the cases will be written from it.",
    editReplaced: "Your edit replaced the model's text — what gets built comes from it.",
    casesMissing: "The user cases are still missing",
    casesMissingDesc: "Without a detailed description the automation cannot be created — this opens again on your next visit.",
    nodeDesignedOnly: "Node \"{name}\" designed", nodeDesignedDesc: "It is a draft on the diagram. When you are done designing, press \"Start development\" to hand every node to a coding agent as one step.",
  },
  ru: {
    banner: "Планирование автоматизации идёт намного эффективнее на самой мощной доступной вам модели. Выберите её в гамбургер-меню вверху страницы (Настройки → модель).",
    phScenarios: "Опишите свои сценарии — говорите свободно; удерживайте микрофон и диктуйте…", phAnswer: "Ваш ответ…",
    tUseCases: "Пользовательские кейсы", tUseCasesSub: "сначала описываем их — до всего остального",
    tNode: "Проектируем узел", tNodeOf: "максимум из", tLink: "Проектируем связь",
    tCaseOne: "Пересматриваем кейс", tCaseAll: "Пересматриваем пользовательские кейсы",
    loaderEdge: "Читаю обе автоматизации…", loaderCase: "Читаю автоматизацию…", loaderInstruction: "Читаю вашу инструкцию…",
    autoWriting: "Авто-квиз — пишу… (можно поставить на паузу и отредактировать)", autoPaused: "Авто-квиз — пауза, редактируйте свободно",
    btnPause: "Пауза", btnContinue: "Продолжить авто-квиз", btnKeep: "Оставить этот текст",
    btnAnswer: "Ответить", btnAuto: "Авто-квиз",
    btnFinishLink: "Завершить связь → шаг разработки", btnSaveCases: "Сохранить кейсы → шаг разработки",
    btnCasesReady: "Кейсы готовы → проектируем узлы", btnFinishNode: "Завершить узел → дальше", btnEnd: "Завершить сессию",
    hintLink: "Завершение связи запишет её бриф и поставит один шаг разработки в очередь кодеру.",
    hintCase: "Сохранение запишет новый текст кейсов и поставит по одному шагу разработки на каждый изменённый кейс.",
    hintUsecases: "Ничего не строится, пока не описаны сценарии: они становятся пронумерованными кейсами, и из них проектируются узлы.",
    hintNodes: "Каждый завершённый узел становится черновиком на диаграмме и шагом разработки для кодера.",
    designer: "Дизайнер",
    errStart: "Не удалось запустить Quiz.", errComplete: "Эта сессия проектирования завершена.", errAutoStart: "Не удалось запустить авто-квиз.",
    errNoAnswer: "Модель не ответила.", errCreateNode: "Не удалось создать узел.", errWriteLink: "Не удалось записать бриф связи.",
    errSaveCases: "Не удалось сохранить кейсы.", errCasesNotReady: "Кейсы ещё не готовы.",
    sessionFinished: "Сессия проектирования завершена", testIt: "Протестировать", testFinished: "Тест завершён",
    openUserCases: "Открыть кейсы", copy: "Скопировать", copyStep: "Скопировать шаг",
    handoffDesc: "Скопируйте бриф и вставьте в чат кодера — или дайте агенту разобрать очередь.",
    nodeDesigned: "Узел «{name}» спроектирован — создан шаг разработки №{step}",
    linkDesigned: "Связь «{name}» спроектирована — создан шаг разработки №{step}",
    casesWritten: "Записано кейсов: {n}", casesWrittenOne: "Записан 1 кейс",
    casesWrittenDesc: "Прочитайте их в панели «Кейсы» и подтвердите — разработка начнётся только после этого. Теперь проектируем узлы.",
    casesUpdated: "Обновлено кейсов: {n}", casesUpdatedOne: "Обновлён 1 кейс", nothingChanged: "Ничего не изменилось",
    keptAsDesc: "Сохранено как ваше описание сценариев — из него будут записаны кейсы.",
    editReplaced: "Ваша правка заменила текст модели — из него и строится результат.",
    casesMissing: "Пользовательские кейсы всё ещё не заданы",
    casesMissingDesc: "Без подробного описания автоматизацию создать нельзя — окно откроется снова при следующем визите.",
    nodeDesignedOnly: "Узел «{name}» спроектирован", nodeDesignedDesc: "Это черновик на диаграмме. Когда закончите проектировать, нажмите «Запустить разработку» — все узлы уйдут агенту-кодеру одним шагом.",
  },
  es: {
    banner: "Planificar una automatización funciona mucho mejor con el modelo más potente disponible. Elígelo en el menú de hamburguesa de la parte superior de la página (Ajustes → modelo).",
    phScenarios: "Describe tus escenarios — habla con libertad; mantén pulsado el micrófono y dicta…", phAnswer: "Tu respuesta…",
    tUseCases: "Los casos de uso", tUseCasesSub: "descritos primero — antes de construir nada",
    tNode: "Diseñando el nodo", tNodeOf: "de un máximo de", tLink: "Diseñando el enlace",
    tCaseOne: "Revisando un caso de uso", tCaseAll: "Revisando los casos de uso",
    loaderEdge: "Leyendo ambas automatizaciones…", loaderCase: "Leyendo la automatización…", loaderInstruction: "Leyendo tu instrucción…",
    autoWriting: "Auto-quiz — escribiendo… (puedes pausar y editar)", autoPaused: "Auto-quiz — en pausa, edita libremente",
    btnPause: "Pausar", btnContinue: "Continuar auto-quiz", btnKeep: "Conservar este texto",
    btnAnswer: "Responder", btnAuto: "Auto-quiz",
    btnFinishLink: "Terminar el enlace → paso de desarrollo", btnSaveCases: "Guardar los casos → paso de desarrollo",
    btnCasesReady: "Los casos están listos → diseñar los nodos", btnFinishNode: "Terminar este nodo → siguiente", btnEnd: "Terminar la sesión",
    hintLink: "Al terminar el enlace se escribe su resumen y se pone en cola un paso de desarrollo para el agente de código.",
    hintCase: "Al guardar se escribe el nuevo texto de los casos y se pone en cola un paso de desarrollo por cada caso que cambiaste.",
    hintUsecases: "No se construye nada hasta que existen los escenarios: se convierten en tus casos de uso numerados, y los nodos se diseñan a partir de ellos.",
    hintNodes: "Cada nodo que terminas se convierte en un borrador en el diagrama y en un paso de desarrollo para el agente de código.",
    designer: "Diseñador",
    errStart: "No se pudo iniciar el quiz.", errComplete: "Esta sesión de diseño está completa.", errAutoStart: "No se pudo iniciar el auto-quiz.",
    errNoAnswer: "El modelo no respondió.", errCreateNode: "No se pudo crear el nodo.", errWriteLink: "No se pudo escribir el resumen del enlace.",
    errSaveCases: "No se pudieron guardar los casos.", errCasesNotReady: "Los casos aún no están listos.",
    sessionFinished: "Sesión de diseño terminada", testIt: "Probar", testFinished: "Prueba terminada",
    openUserCases: "Abrir casos de uso", copy: "Copiar", copyStep: "Copiar paso",
    handoffDesc: "Copia el resumen y pégalo en el chat del agente de código — o deja que el agente vacíe la cola.",
    nodeDesigned: "Nodo «{name}» diseñado — paso de desarrollo n.º {step} creado",
    linkDesigned: "Enlace «{name}» diseñado — paso de desarrollo n.º {step} creado",
    casesWritten: "{n} casos de uso escritos", casesWrittenOne: "1 caso de uso escrito",
    casesWrittenDesc: "Léelos en el panel de casos de uso y confírmalos — el desarrollo empieza solo después de eso. Ahora diseñamos los nodos.",
    casesUpdated: "{n} casos de uso actualizados", casesUpdatedOne: "1 caso de uso actualizado", nothingChanged: "Nada cambió",
    keptAsDesc: "Guardado como tu descripción de los escenarios — de ahí se escribirán los casos.",
    editReplaced: "Tu edición reemplazó el texto del modelo — lo que se construye sale de ahí.",
    casesMissing: "Todavía faltan los casos de uso",
    casesMissingDesc: "Sin una descripción detallada no se puede crear la automatización — esto se abrirá de nuevo en tu próxima visita.",
    nodeDesignedOnly: "Nodo «{name}» diseñado", nodeDesignedDesc: "Es un borrador en el diagrama. Cuando termines de diseñar, pulsa «Iniciar desarrollo» — todos los nodos se entregan al agente de código como un solo paso.",
  },
  fr: {
    banner: "La planification d'une automatisation est bien meilleure avec le modèle le plus puissant à votre disposition. Choisissez-le dans le menu hamburger en haut de la page (Paramètres → modèle).",
    phScenarios: "Décrivez vos scénarios — parlez librement ; maintenez le micro et dictez…", phAnswer: "Votre réponse…",
    tUseCases: "Les cas d'usage", tUseCasesSub: "décrits d'abord — avant toute construction",
    tNode: "Conception du nœud", tNodeOf: "sur un maximum de", tLink: "Conception du lien",
    tCaseOne: "Révision d'un cas d'usage", tCaseAll: "Révision des cas d'usage",
    loaderEdge: "Lecture des deux automatisations…", loaderCase: "Lecture de l'automatisation…", loaderInstruction: "Lecture de votre instruction…",
    autoWriting: "Auto-quiz — écriture… (vous pouvez mettre en pause et modifier)", autoPaused: "Auto-quiz — en pause, modifiez librement",
    btnPause: "Pause", btnContinue: "Continuer l'auto-quiz", btnKeep: "Garder ce texte",
    btnAnswer: "Répondre", btnAuto: "Auto-quiz",
    btnFinishLink: "Terminer le lien → étape de développement", btnSaveCases: "Enregistrer les cas → étape de développement",
    btnCasesReady: "Les cas sont prêts → concevoir les nœuds", btnFinishNode: "Terminer ce nœud → suivant", btnEnd: "Terminer la session",
    hintLink: "Terminer le lien écrit son résumé et met en file une étape de développement pour l'agent de code.",
    hintCase: "Enregistrer écrit le nouveau texte des cas et met en file une étape de développement par cas modifié.",
    hintUsecases: "Rien n'est construit tant que les scénarios n'existent pas : ils deviennent vos cas d'usage numérotés, et les nœuds en sont conçus.",
    hintNodes: "Chaque nœud terminé devient un brouillon sur le diagramme et une étape de développement pour l'agent de code.",
    designer: "Concepteur",
    errStart: "Impossible de démarrer le quiz.", errComplete: "Cette session de conception est terminée.", errAutoStart: "Impossible de démarrer l'auto-quiz.",
    errNoAnswer: "Le modèle n'a pas répondu.", errCreateNode: "Impossible de créer le nœud.", errWriteLink: "Impossible d'écrire le résumé du lien.",
    errSaveCases: "Impossible d'enregistrer les cas.", errCasesNotReady: "Les cas ne sont pas encore prêts.",
    sessionFinished: "Session de conception terminée", testIt: "Tester", testFinished: "Test terminé",
    openUserCases: "Ouvrir les cas d'usage", copy: "Copier", copyStep: "Copier l'étape",
    handoffDesc: "Copiez le résumé et collez-le dans le chat de l'agent de code — ou laissez l'agent vider la file.",
    nodeDesigned: "Nœud « {name} » conçu — étape de développement n° {step} créée",
    linkDesigned: "Lien « {name} » conçu — étape de développement n° {step} créée",
    casesWritten: "{n} cas d'usage écrits", casesWrittenOne: "1 cas d'usage écrit",
    casesWrittenDesc: "Lisez-les dans le panneau des cas d'usage et confirmez-les — le développement ne commence qu'après. Concevons maintenant les nœuds.",
    casesUpdated: "{n} cas d'usage mis à jour", casesUpdatedOne: "1 cas d'usage mis à jour", nothingChanged: "Rien n'a changé",
    keptAsDesc: "Enregistré comme votre description des scénarios — les cas en seront écrits.",
    editReplaced: "Votre modification a remplacé le texte du modèle — c'est de là que vient ce qui est construit.",
    casesMissing: "Les cas d'usage manquent encore",
    casesMissingDesc: "Sans description détaillée, l'automatisation ne peut pas être créée — ceci se rouvrira à votre prochaine visite.",
    nodeDesignedOnly: "Nœud « {name} » conçu", nodeDesignedDesc: "C'est un brouillon sur le diagramme. Quand vous avez fini de concevoir, appuyez sur « Démarrer le développement » — tous les nœuds partent à l'agent de code en une seule étape.",
  },
  it: {
    banner: "Pianificare un'automazione funziona molto meglio con il modello più potente a tua disposizione. Sceglilo nel menu hamburger in cima alla pagina (Impostazioni → modello).",
    phScenarios: "Descrivi i tuoi scenari — parla liberamente; tieni premuto il microfono e detta…", phAnswer: "La tua risposta…",
    tUseCases: "I casi d'uso", tUseCasesSub: "descritti prima — prima di costruire qualsiasi cosa",
    tNode: "Progettazione del nodo", tNodeOf: "su un massimo di", tLink: "Progettazione del collegamento",
    tCaseOne: "Revisione di un caso d'uso", tCaseAll: "Revisione dei casi d'uso",
    loaderEdge: "Lettura di entrambe le automazioni…", loaderCase: "Lettura dell'automazione…", loaderInstruction: "Lettura della tua istruzione…",
    autoWriting: "Auto-quiz — sto scrivendo… (puoi mettere in pausa e modificare)", autoPaused: "Auto-quiz — in pausa, modifica liberamente",
    btnPause: "Pausa", btnContinue: "Continua l'auto-quiz", btnKeep: "Mantieni questo testo",
    btnAnswer: "Rispondi", btnAuto: "Auto-quiz",
    btnFinishLink: "Concludi il collegamento → passo di sviluppo", btnSaveCases: "Salva i casi → passo di sviluppo",
    btnCasesReady: "I casi sono pronti → progetta i nodi", btnFinishNode: "Concludi questo nodo → avanti", btnEnd: "Termina la sessione",
    hintLink: "Concludere il collegamento scrive il suo riassunto e mette in coda un passo di sviluppo per l'agente di codice.",
    hintCase: "Il salvataggio scrive il nuovo testo dei casi e mette in coda un passo di sviluppo per ogni caso modificato.",
    hintUsecases: "Non si costruisce nulla finché non esistono gli scenari: diventano i tuoi casi d'uso numerati, e da essi si progettano i nodi.",
    hintNodes: "Ogni nodo che concludi diventa una bozza sul diagramma e un passo di sviluppo per l'agente di codice.",
    designer: "Progettista",
    errStart: "Impossibile avviare il quiz.", errComplete: "Questa sessione di progettazione è completa.", errAutoStart: "Impossibile avviare l'auto-quiz.",
    errNoAnswer: "Il modello non ha risposto.", errCreateNode: "Impossibile creare il nodo.", errWriteLink: "Impossibile scrivere il riassunto del collegamento.",
    errSaveCases: "Impossibile salvare i casi.", errCasesNotReady: "I casi non sono ancora pronti.",
    sessionFinished: "Sessione di progettazione terminata", testIt: "Prova", testFinished: "Prova terminata",
    openUserCases: "Apri i casi d'uso", copy: "Copia", copyStep: "Copia il passo",
    handoffDesc: "Copia il riassunto e incollalo nella chat dell'agente di codice — oppure lascia che l'agente svuoti la coda.",
    nodeDesigned: "Nodo «{name}» progettato — passo di sviluppo n. {step} creato",
    linkDesigned: "Collegamento «{name}» progettato — passo di sviluppo n. {step} creato",
    casesWritten: "{n} casi d'uso scritti", casesWrittenOne: "1 caso d'uso scritto",
    casesWrittenDesc: "Leggili nel pannello dei casi d'uso e confermali — lo sviluppo inizia solo dopo. Ora progettiamo i nodi.",
    casesUpdated: "{n} casi d'uso aggiornati", casesUpdatedOne: "1 caso d'uso aggiornato", nothingChanged: "Nulla è cambiato",
    keptAsDesc: "Salvato come la tua descrizione degli scenari — da essa saranno scritti i casi.",
    editReplaced: "La tua modifica ha sostituito il testo del modello — è da lì che nasce ciò che viene costruito.",
    casesMissing: "I casi d'uso mancano ancora",
    casesMissingDesc: "Senza una descrizione dettagliata l'automazione non può essere creata — si riaprirà alla tua prossima visita.",
    nodeDesignedOnly: "Nodo «{name}» progettato", nodeDesignedDesc: "È una bozza sul diagramma. Quando hai finito di progettare, premi «Avvia lo sviluppo» — tutti i nodi vanno all'agente di codice in un unico passo.",
  },
  de: {
    banner: "Das Planen einer Automatisierung gelingt weit besser mit dem stärksten dir verfügbaren Modell. Wähle es im Hamburger-Menü oben auf der Seite (Einstellungen → Modell).",
    phScenarios: "Beschreibe deine Szenarien — sprich frei; halte das Mikrofon gedrückt und diktiere…", phAnswer: "Deine Antwort…",
    tUseCases: "Die Anwendungsfälle", tUseCasesSub: "zuerst beschrieben — bevor irgendetwas gebaut wird",
    tNode: "Knoten wird entworfen", tNodeOf: "von höchstens", tLink: "Verbindung wird entworfen",
    tCaseOne: "Anwendungsfall überarbeiten", tCaseAll: "Anwendungsfälle überarbeiten",
    loaderEdge: "Beide Automatisierungen werden gelesen…", loaderCase: "Automatisierung wird gelesen…", loaderInstruction: "Deine Anweisung wird gelesen…",
    autoWriting: "Auto-Quiz — schreibe… (du kannst pausieren und bearbeiten)", autoPaused: "Auto-Quiz — pausiert, frei bearbeiten",
    btnPause: "Pause", btnContinue: "Auto-Quiz fortsetzen", btnKeep: "Diesen Text behalten",
    btnAnswer: "Antworten", btnAuto: "Auto-Quiz",
    btnFinishLink: "Verbindung abschließen → Entwicklungsschritt", btnSaveCases: "Fälle speichern → Entwicklungsschritt",
    btnCasesReady: "Die Fälle sind fertig → Knoten entwerfen", btnFinishNode: "Diesen Knoten abschließen → weiter", btnEnd: "Sitzung beenden",
    hintLink: "Das Abschließen der Verbindung schreibt ihre Kurzbeschreibung und reiht einen Entwicklungsschritt für den Coding-Agenten ein.",
    hintCase: "Das Speichern schreibt den neuen Fall-Text und reiht je geändertem Fall einen Entwicklungsschritt ein.",
    hintUsecases: "Nichts wird gebaut, solange die Szenarien nicht existieren: Sie werden zu deinen nummerierten Anwendungsfällen, und daraus werden die Knoten entworfen.",
    hintNodes: "Jeder abgeschlossene Knoten wird zu einem Entwurf im Diagramm und zu einem Entwicklungsschritt für den Coding-Agenten.",
    designer: "Designer",
    errStart: "Das Quiz konnte nicht gestartet werden.", errComplete: "Diese Design-Sitzung ist abgeschlossen.", errAutoStart: "Auto-Quiz konnte nicht gestartet werden.",
    errNoAnswer: "Das Modell hat nicht geantwortet.", errCreateNode: "Der Knoten konnte nicht erstellt werden.", errWriteLink: "Die Kurzbeschreibung der Verbindung konnte nicht geschrieben werden.",
    errSaveCases: "Die Fälle konnten nicht gespeichert werden.", errCasesNotReady: "Die Fälle sind noch nicht fertig.",
    sessionFinished: "Design-Sitzung beendet", testIt: "Testen", testFinished: "Test beendet",
    openUserCases: "Anwendungsfälle öffnen", copy: "Kopieren", copyStep: "Schritt kopieren",
    handoffDesc: "Kopiere die Kurzbeschreibung in den Chat des Coding-Agenten — oder lass den Agenten die Warteschlange abarbeiten.",
    nodeDesigned: "Knoten „{name}“ entworfen — Entwicklungsschritt Nr. {step} erstellt",
    linkDesigned: "Verbindung „{name}“ entworfen — Entwicklungsschritt Nr. {step} erstellt",
    casesWritten: "{n} Anwendungsfälle geschrieben", casesWrittenOne: "1 Anwendungsfall geschrieben",
    casesWrittenDesc: "Lies sie im Anwendungsfälle-Panel und bestätige sie — die Entwicklung startet erst danach. Jetzt entwerfen wir die Knoten.",
    casesUpdated: "{n} Anwendungsfälle aktualisiert", casesUpdatedOne: "1 Anwendungsfall aktualisiert", nothingChanged: "Nichts geändert",
    keptAsDesc: "Als deine Beschreibung der Szenarien gespeichert — daraus werden die Fälle geschrieben.",
    editReplaced: "Deine Änderung hat den Text des Modells ersetzt — daraus entsteht, was gebaut wird.",
    casesMissing: "Die Anwendungsfälle fehlen noch",
    casesMissingDesc: "Ohne ausführliche Beschreibung kann die Automatisierung nicht erstellt werden — es öffnet sich beim nächsten Besuch erneut.",
    nodeDesignedOnly: "Knoten „{name}“ entworfen", nodeDesignedDesc: "Er ist ein Entwurf im Diagramm. Wenn du mit dem Entwerfen fertig bist, drücke „Entwicklung starten“ — alle Knoten gehen als ein Schritt an den Coding-Agenten.",
  },
};

export function quizStrings(lang: string): QuizStrings {
  return QUIZ_I18N[lang.slice(0, 2)] ?? QUIZ_I18N.en;
}

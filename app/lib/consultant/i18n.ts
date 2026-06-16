// Self-contained i18n for the consultant widget (D4). These dialog strings are a FIXED
// 6-language set baked into the project — INDEPENDENT of the admin's site-language config
// and the [lang] locale system (decision 2026-06-16). Resolution: current [lang] ∈ 6 → it;
// else the app default language ∈ 6 → it; else English.

export const CONSULTANT_LANGS = ['en', 'es', 'fr', 'de', 'it', 'ru'] as const
export type ConsultantLang = (typeof CONSULTANT_LANGS)[number]

export type ConsultantStrings = {
  open: string
  title: string
  you: string
  tierGuest: string
  tierUser: string
  tierOwner: string
  close: string
  empty: string
  inputPlaceholder: string
  send: string
  unavailable: string
  notConnected: string
  // R6 — two escalation variants the agent predetermines (kind personal|role), plus a
  // neutral persistent footer hint and the sign-in button. Never hardcodes "admin".
  authPersonal: string
  authRole: string
  signInHint: string
  signIn: string
  // Key block (E3).
  keyMissingTitle: string
  keyErrorTitle: string
  keyMissingDesc: string
  keyErrorDesc: string
  keyPlaceholder: string
  keyConsent: string
  keySave: string
  keyEnter: string
  keySaveFail: string
}

const STRINGS: Record<ConsultantLang, ConsultantStrings> = {
  en: {
    open: 'Open AI consultant',
    title: 'AI consultant',
    you: 'You',
    tierGuest: 'Guest',
    tierUser: 'User',
    tierOwner: 'Owner',
    close: 'Close',
    empty: 'Ask a question or request something — e.g. “what languages does this site support?”',
    inputPlaceholder: 'Ask or request…',
    send: 'Send',
    unavailable: 'Sorry — the consultant is unavailable right now. Please try again.',
    notConnected: 'The consultant is not connected to the agent yet.',
    authPersonal: 'To access the personal information you requested, you need to be signed in to your account. Please sign in to continue.',
    authRole: 'The function you requested isn’t registered for your role — it may exist for a signed-in user or the administrator. Please sign in to continue.',
    signInHint: 'Sign in to access your own data and unlock more tools.',
    signIn: 'Sign in',
    keyMissingTitle: 'Connect an AI key to start',
    keyErrorTitle: 'The AI key isn’t working',
    keyMissingDesc: 'This consultant needs an OpenAI key to answer. Paste one to begin.',
    keyErrorDesc: 'The saved key didn’t respond — it may be invalid or out of credit. Enter a working OpenAI key.',
    keyPlaceholder: 'sk-…',
    keyConsent: 'This key is saved on the server and used in this project.',
    keySave: 'Save key',
    keyEnter: 'Enter a key',
    keySaveFail: 'Could not save the key',
  },
  es: {
    open: 'Abrir el consultor de IA',
    title: 'Consultor de IA',
    you: 'Tú',
    tierGuest: 'Invitado',
    tierUser: 'Usuario',
    tierOwner: 'Propietario',
    close: 'Cerrar',
    empty: 'Haz una pregunta o pide algo — p. ej. «¿qué idiomas admite este sitio?»',
    inputPlaceholder: 'Pregunta o pide…',
    send: 'Enviar',
    unavailable: 'Lo sentimos — el consultor no está disponible ahora. Inténtalo de nuevo.',
    notConnected: 'El consultor aún no está conectado al agente.',
    authPersonal: 'Para acceder a la información personal que solicitas, debes iniciar sesión en tu cuenta. Inicia sesión para continuar.',
    authRole: 'La función que solicitas no está registrada para tu rol — puede existir para un usuario autenticado o el administrador. Inicia sesión para continuar.',
    signInHint: 'Inicia sesión para acceder a tus datos y desbloquear más herramientas.',
    signIn: 'Iniciar sesión',
    keyMissingTitle: 'Conecta una clave de IA para empezar',
    keyErrorTitle: 'La clave de IA no funciona',
    keyMissingDesc: 'Este consultor necesita una clave de OpenAI para responder. Pega una para empezar.',
    keyErrorDesc: 'La clave guardada no respondió — puede ser inválida o sin crédito. Introduce una clave de OpenAI válida.',
    keyPlaceholder: 'sk-…',
    keyConsent: 'Esta clave se guarda en el servidor y se usa en este proyecto.',
    keySave: 'Guardar clave',
    keyEnter: 'Introduce una clave',
    keySaveFail: 'No se pudo guardar la clave',
  },
  fr: {
    open: 'Ouvrir le consultant IA',
    title: 'Consultant IA',
    you: 'Vous',
    tierGuest: 'Invité',
    tierUser: 'Utilisateur',
    tierOwner: 'Propriétaire',
    close: 'Fermer',
    empty: 'Posez une question ou demandez quelque chose — p. ex. « quelles langues ce site prend-il en charge ? »',
    inputPlaceholder: 'Demandez…',
    send: 'Envoyer',
    unavailable: 'Désolé — le consultant est indisponible pour le moment. Réessayez.',
    notConnected: 'Le consultant n’est pas encore connecté à l’agent.',
    authPersonal: 'Pour accéder aux informations personnelles que vous demandez, vous devez être connecté à votre compte. Connectez-vous pour continuer.',
    authRole: 'La fonction que vous demandez n’est pas enregistrée pour votre rôle — elle peut exister pour un utilisateur connecté ou l’administrateur. Connectez-vous pour continuer.',
    signInHint: 'Connectez-vous pour accéder à vos données et débloquer plus d’outils.',
    signIn: 'Se connecter',
    keyMissingTitle: 'Connectez une clé IA pour commencer',
    keyErrorTitle: 'La clé IA ne fonctionne pas',
    keyMissingDesc: 'Ce consultant a besoin d’une clé OpenAI pour répondre. Collez-en une pour commencer.',
    keyErrorDesc: 'La clé enregistrée n’a pas répondu — elle est peut-être invalide ou sans crédit. Saisissez une clé OpenAI valide.',
    keyPlaceholder: 'sk-…',
    keyConsent: 'Cette clé est enregistrée sur le serveur et utilisée dans ce projet.',
    keySave: 'Enregistrer la clé',
    keyEnter: 'Saisissez une clé',
    keySaveFail: 'Impossible d’enregistrer la clé',
  },
  de: {
    open: 'KI-Berater öffnen',
    title: 'KI-Berater',
    you: 'Sie',
    tierGuest: 'Gast',
    tierUser: 'Benutzer',
    tierOwner: 'Inhaber',
    close: 'Schließen',
    empty: 'Stellen Sie eine Frage oder bitten Sie um etwas — z. B. „Welche Sprachen unterstützt diese Website?“',
    inputPlaceholder: 'Fragen oder anfordern…',
    send: 'Senden',
    unavailable: 'Entschuldigung — der Berater ist derzeit nicht verfügbar. Bitte erneut versuchen.',
    notConnected: 'Der Berater ist noch nicht mit dem Agenten verbunden.',
    authPersonal: 'Um auf die angeforderten persönlichen Informationen zuzugreifen, müssen Sie in Ihrem Konto angemeldet sein. Bitte melden Sie sich an, um fortzufahren.',
    authRole: 'Die angeforderte Funktion ist für Ihre Rolle nicht registriert — sie existiert möglicherweise für einen angemeldeten Benutzer oder den Administrator. Bitte melden Sie sich an, um fortzufahren.',
    signInHint: 'Melden Sie sich an, um auf Ihre Daten zuzugreifen und mehr Werkzeuge freizuschalten.',
    signIn: 'Anmelden',
    keyMissingTitle: 'Verbinden Sie einen KI-Schlüssel, um zu starten',
    keyErrorTitle: 'Der KI-Schlüssel funktioniert nicht',
    keyMissingDesc: 'Dieser Berater benötigt einen OpenAI-Schlüssel, um zu antworten. Fügen Sie einen ein, um zu beginnen.',
    keyErrorDesc: 'Der gespeicherte Schlüssel hat nicht geantwortet — er ist möglicherweise ungültig oder ohne Guthaben. Geben Sie einen gültigen OpenAI-Schlüssel ein.',
    keyPlaceholder: 'sk-…',
    keyConsent: 'Dieser Schlüssel wird auf dem Server gespeichert und in diesem Projekt verwendet.',
    keySave: 'Schlüssel speichern',
    keyEnter: 'Schlüssel eingeben',
    keySaveFail: 'Schlüssel konnte nicht gespeichert werden',
  },
  it: {
    open: 'Apri il consulente IA',
    title: 'Consulente IA',
    you: 'Tu',
    tierGuest: 'Ospite',
    tierUser: 'Utente',
    tierOwner: 'Proprietario',
    close: 'Chiudi',
    empty: 'Fai una domanda o richiedi qualcosa — es. «quali lingue supporta questo sito?»',
    inputPlaceholder: 'Chiedi o richiedi…',
    send: 'Invia',
    unavailable: 'Spiacenti — il consulente non è disponibile al momento. Riprova.',
    notConnected: 'Il consulente non è ancora connesso all’agente.',
    authPersonal: 'Per accedere alle informazioni personali che richiedi, devi aver effettuato l’accesso al tuo account. Accedi per continuare.',
    authRole: 'La funzione che richiedi non è registrata per il tuo ruolo — potrebbe esistere per un utente autenticato o l’amministratore. Accedi per continuare.',
    signInHint: 'Accedi per consultare i tuoi dati e sbloccare più strumenti.',
    signIn: 'Accedi',
    keyMissingTitle: 'Collega una chiave IA per iniziare',
    keyErrorTitle: 'La chiave IA non funziona',
    keyMissingDesc: 'Questo consulente ha bisogno di una chiave OpenAI per rispondere. Incollane una per iniziare.',
    keyErrorDesc: 'La chiave salvata non ha risposto — potrebbe essere non valida o senza credito. Inserisci una chiave OpenAI valida.',
    keyPlaceholder: 'sk-…',
    keyConsent: 'Questa chiave è salvata sul server e usata in questo progetto.',
    keySave: 'Salva chiave',
    keyEnter: 'Inserisci una chiave',
    keySaveFail: 'Impossibile salvare la chiave',
  },
  ru: {
    open: 'Открыть ИИ-консультанта',
    title: 'ИИ-консультант',
    you: 'Вы',
    tierGuest: 'Гость',
    tierUser: 'Пользователь',
    tierOwner: 'Владелец',
    close: 'Закрыть',
    empty: 'Задайте вопрос или попросите что-нибудь — например, «на каких языках работает этот сайт?»',
    inputPlaceholder: 'Спросите или попросите…',
    send: 'Отправить',
    unavailable: 'Извините — консультант сейчас недоступен. Попробуйте ещё раз.',
    notConnected: 'Консультант ещё не подключён к агенту.',
    authPersonal: 'Для доступа к персональной информации, которую вы запрашиваете, необходимо войти под своей учётной записью. Пожалуйста, авторизуйтесь, чтобы продолжить.',
    authRole: 'Функции, которые вы запрашиваете, не зарегистрированы для вашей роли — возможно, они доступны авторизованному пользователю или администратору. Пожалуйста, авторизуйтесь, чтобы продолжить.',
    signInHint: 'Авторизуйтесь, чтобы получить доступ к своим данным и расширенным инструментам.',
    signIn: 'Войти',
    keyMissingTitle: 'Подключите ключ ИИ, чтобы начать',
    keyErrorTitle: 'Ключ ИИ не работает',
    keyMissingDesc: 'Консультанту нужен ключ OpenAI, чтобы отвечать. Вставьте его, чтобы начать.',
    keyErrorDesc: 'Сохранённый ключ не ответил — возможно, он неверный или закончились средства. Введите рабочий ключ OpenAI.',
    keyPlaceholder: 'sk-…',
    keyConsent: 'Этот ключ сохраняется на сервере и используется в проекте.',
    keySave: 'Сохранить ключ',
    keyEnter: 'Введите ключ',
    keySaveFail: 'Не удалось сохранить ключ',
  },
}

function isConsultantLang(x: string): x is ConsultantLang {
  return (CONSULTANT_LANGS as readonly string[]).includes(x)
}

// current [lang] ∈ 6 → it; else app default ∈ 6 → it; else 'en'.
export function resolveConsultantLang(current?: string | null, appDefault?: string | null): ConsultantLang {
  const c = (current ?? '').toLowerCase()
  if (isConsultantLang(c)) return c
  const d = (appDefault ?? '').toLowerCase()
  if (isConsultantLang(d)) return d
  return 'en'
}

export function getConsultantStrings(lang: ConsultantLang): ConsultantStrings {
  return STRINGS[lang]
}

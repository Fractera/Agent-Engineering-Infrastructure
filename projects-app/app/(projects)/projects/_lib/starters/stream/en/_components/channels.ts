// КАНАЛЫ И ИХ КЛЮЧИ — единый принцип на всю автоматизацию (шаг 293).
//
// ДВА ФАКТА, ДВА МЕСТА, И ОНИ НЕ ПЕРЕСЕКАЮТСЯ:
//   • КАКИЕ ключи нужны каналу — говорит ЯДРО, в `envKeys` его узла. Это свойство конкретной
//     автоматизации: у одной телеграм-вход есть, у другой нет;
//   • ЧТО такое каждый ключ (как называется по-человечески, где его взять, секрет ли он) — говорит
//     каталог ниже. Это свойство самого сервиса, одинаковое для всех автоматизаций на свете.
// Стандарт объявления перенесён из v1 (`_shared/channels.ts`, шаг 219/220) внутрь папки (закон 0).
//
// ГДЕ ЛЕЖАТ ЗНАЧЕНИЯ. В `.env.local` слоя Проекты — ОДИН файл на все автоматизации (решение владельца:
// один аккаунт Resend и один бот на проект, как единый ключ OpenAI). Пишутся и читаются они через
// единственную дверь `api/env`; значение секрета не отдаётся наружу никогда, только присутствие.
//
// ПОДСКАЗКА `help` ЖИВЁТ В ДАННЫХ, а не в компоненте: форма ключей объясняет себя сама, и добавление
// нового сервиса не требует править разметку.

export type ChannelKey = {
  /** Имя переменной окружения — то, что стоит в `envKeys` узла. */
  env: string;
  /**
   * СЕРВИС, которому принадлежит ключ, и его человеческое имя.
   *
   * Настраивают не КАНАЛ, а СЕРВИС. Шесть узлов (вход и выход телеграм-бота, личный чат, и так далее)
   * делят один `TELEGRAM_BOT_TOKEN`, потому что ключи общие на проект. Показывать шесть настроек там,
   * где настройка одна, — шум, а не полнота (правка владельца 2026-07-23). Поэтому окно настроек
   * группирует ключи по этому полю и показывает РОВНО столько карточек, сколько сервисов реально
   * объявлено этой автоматизацией.
   */
  service: string;
  serviceLabel: Record<string, string>;
  /** Что это словами, на десяти языках. */
  label: Record<string, string>;
  /** Где взять и куда пойти — на десяти языках. */
  help: Record<string, string>;
  /** Секрет: маскированный ввод, значение наружу не отдаётся. */
  secret?: boolean;
  /** Пустое значение — законное умолчание, а не отсутствие ключа. */
  optional?: boolean;
  /** ОРАНЖЕВОЕ предупреждение под полем — когда сам факт ввода ключа имеет неочевидную цену (напр.
   *  ключ Anthropic переводит биллинг с подписки на поштучный API — «неожиданно дорого»). Десять языков. */
  warning?: Record<string, string>;
  /**
   * У поля есть НАТИВНОЕ определение значения: форма рисует кнопку, которая узнаёт значение сама, вместо
   * того чтобы владелец искал его руками. `"telegram"` — связывание chat id через дверь `api/telegram/link`
   * (пользователь жмёт START у бота, мы читаем chat id из его же сообщения). Значение всё равно записывает
   * обычное «Сохранить»: кнопка лишь подставляет его в поле, закон отмены формы не трогается.
   */
  autoLink?: "telegram";
};

const L = (en: string, es: string, fr: string, it: string, ru: string, de: string, pt: string, pl: string, tr: string, nl: string) =>
  ({ en, es, fr, it, ru, de, pt, pl, tr, nl });

// Имена сервисов — по одному на карточку настроек, а не по одному на канал.
const TELEGRAM = L("Telegram bot", "Bot de Telegram", "Bot Telegram", "Bot Telegram", "Телеграм-бот", "Telegram-Bot", "Bot do Telegram", "Bot Telegram", "Telegram botu", "Telegram-bot");
const RESEND = L("Email delivery (Resend)", "Envío de correo (Resend)", "Envoi d'e-mails (Resend)", "Invio email (Resend)", "Почтовая рассылка (Resend)", "E-Mail-Versand (Resend)", "Envio de email (Resend)", "Wysyłka e-mail (Resend)", "E-posta gönderimi (Resend)", "E-mailverzending (Resend)");
// Провайдеры ИИ — их ключи вводятся тем же механизмом, что и ключи каналов: второго способа
// вводить секреты в продукте нет. Какой провайдер ВЫБРАН — свойство автоматизации, оно в паспорте.
const ANTHROPIC = L("Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic");
const OPENAI = L("OpenAI", "OpenAI", "OpenAI", "OpenAI", "OpenAI", "OpenAI", "OpenAI", "OpenAI", "OpenAI", "OpenAI");
const MEMORY = L("Memory (LightRAG)", "Memoria (LightRAG)", "Mémoire (LightRAG)", "Memoria (LightRAG)", "Память (LightRAG)", "Speicher (LightRAG)", "Memória (LightRAG)", "Pamięć (LightRAG)", "Bellek (LightRAG)", "Geheugen (LightRAG)");

export const KEY_CATALOG: Record<string, ChannelKey> = {
  TELEGRAM_BOT_TOKEN: {
    env: "TELEGRAM_BOT_TOKEN",
    service: "telegram", serviceLabel: TELEGRAM,
    secret: true,
    label: L("Bot token", "Token del bot", "Jeton du bot", "Token del bot", "Токен бота", "Bot-Token", "Token do bot", "Token bota", "Bot jetonu", "Bot-token"),
    help: L(
      "Write to @BotFather in Telegram → /newbot → copy the token it returns.",
      "Escribe a @BotFather en Telegram → /newbot → copia el token que devuelve.",
      "Écrivez à @BotFather dans Telegram → /newbot → copiez le jeton renvoyé.",
      "Scrivi a @BotFather su Telegram → /newbot → copia il token restituito.",
      "Напишите @BotFather в Telegram → /newbot → скопируйте выданный токен.",
      "Schreiben Sie @BotFather in Telegram → /newbot → kopieren Sie den Token.",
      "Escreva a @BotFather no Telegram → /newbot → copie o token devolvido.",
      "Napisz do @BotFather w Telegramie → /newbot → skopiuj zwrócony token.",
      "Telegram'da @BotFather'a yazın → /newbot → dönen jetonu kopyalayın.",
      "Schrijf @BotFather in Telegram → /newbot → kopieer het teruggegeven token.",
    ),
  },
  TELEGRAM_ALLOWED_CHAT_ID: {
    env: "TELEGRAM_ALLOWED_CHAT_ID",
    service: "telegram", serviceLabel: TELEGRAM,
    optional: true,
    autoLink: "telegram",
    label: L("Allowed chat id", "Id de chat permitido", "Id de discussion autorisée", "Id chat consentita", "Разрешённый чат", "Erlaubte Chat-ID", "Id de chat permitido", "Dozwolony id czatu", "İzinli sohbet kimliği", "Toegestane chat-id"),
    help: L(
      "Press “Link my Telegram” below — it opens the bot, you tap Start, and the id fills in itself. Leave empty to accept every chat.",
      "Pulsa «Vincular mi Telegram» abajo — abre el bot, pulsas Iniciar y el id se rellena solo. Déjalo vacío para aceptar cualquier chat.",
      "Appuyez sur « Lier mon Telegram » ci-dessous — le bot s'ouvre, vous appuyez sur Démarrer et l'id se remplit tout seul. Laissez vide pour accepter toutes les discussions.",
      "Premi «Collega il mio Telegram» qui sotto — apre il bot, tocchi Avvia e l'id si compila da solo. Lascia vuoto per accettare ogni chat.",
      "Нажмите «Связать мой Telegram» ниже — откроется бот, вы жмёте Start, и id подставится сам. Пусто — принимать любой чат.",
      "Klicken Sie unten auf „Mein Telegram verknüpfen“ — der Bot öffnet sich, Sie tippen auf Start und die ID füllt sich selbst aus. Leer lassen, um jeden Chat zu akzeptieren.",
      "Carregue em «Ligar o meu Telegram» abaixo — abre o bot, toca em Iniciar e o id preenche-se sozinho. Deixe vazio para aceitar qualquer chat.",
      "Naciśnij „Połącz mój Telegram” poniżej — otworzy bota, klikasz Start, a id wpisze się sam. Zostaw puste, aby przyjmować każdy czat.",
      "Aşağıdaki «Telegram'ımı bağla»ya basın — bot açılır, Başlat'a dokunursunuz ve kimlik kendiliğinden dolar. Her sohbeti kabul etmek için boş bırakın.",
      "Klik hieronder op “Mijn Telegram koppelen” — de bot opent, je tikt op Start en de id vult zichzelf in. Laat leeg om elke chat te accepteren.",
    ),
  },
  TELEGRAM_USER_CHAT_ID: {
    env: "TELEGRAM_USER_CHAT_ID",
    service: "telegram", serviceLabel: TELEGRAM,
    optional: true,
    label: L("Your chat id", "Id de tu chat", "Id de ta discussion", "Id della tua chat", "Твой чат", "Deine Chat-ID", "Id do teu chat", "Id twojego czatu", "Sohbet kimliğin", "Jouw chat-id"),
    help: L(
      "Leave empty — it fills in AUTOMATICALLY from your first message to the bot. Enter only the bot token above, then write anything to the bot; the automation remembers your chat for delayed reminders.",
      "Déjalo vacío: se rellena AUTOMÁTICAMENTE con tu primer mensaje al bot. Introduce solo el token arriba y escribe algo al bot; la automatización recuerda tu chat para los recordatorios.",
      "Laisse vide — il se remplit AUTOMATIQUEMENT dès ton premier message au bot. Saisis seulement le jeton ci-dessus, puis écris n'importe quoi au bot ; l'automatisation retient ta discussion pour les rappels.",
      "Lascialo vuoto: si compila AUTOMATICAMENTE dal tuo primo messaggio al bot. Inserisci solo il token sopra, poi scrivi qualcosa al bot; l'automazione ricorda la tua chat per i promemoria.",
      "Оставь пустым — заполнится АВТОМАТИЧЕСКИ с твоего первого сообщения боту. Введи только токен выше, потом напиши боту что угодно; автоматизация запомнит твой чат для отложенных напоминаний.",
      "Leer lassen — sie füllt sich AUTOMATISCH mit deiner ersten Nachricht an den Bot. Gib oben nur den Token ein, schreib dann irgendetwas an den Bot; die Automatisierung merkt sich deinen Chat für Erinnerungen.",
      "Deixa vazio — preenche-se AUTOMATICAMENTE com a tua primeira mensagem ao bot. Introduz só o token acima e escreve algo ao bot; a automação lembra o teu chat para os lembretes.",
      "Zostaw puste — wypełni się AUTOMATYCZNIE od Twojej pierwszej wiadomości do bota. Wpisz tylko token powyżej, potem napisz cokolwiek do bota; automatyzacja zapamięta Twój czat do przypomnień.",
      "Boş bırak — bota ilk mesajınla OTOMATİK dolar. Yukarıya yalnızca jetonu gir, sonra bota bir şey yaz; otomasyon hatırlatmalar için sohbetini hatırlar.",
      "Laat leeg — het vult zichzelf AUTOMATISCH in vanaf je eerste bericht aan de bot. Voer boven alleen het token in, schrijf dan iets naar de bot; de automatisering onthoudt je chat voor herinneringen.",
    ),
  },
  RESEND_API_KEY: {
    env: "RESEND_API_KEY",
    service: "resend", serviceLabel: RESEND,
    secret: true,
    label: L("Resend API key", "Clave API de Resend", "Clé API Resend", "Chiave API Resend", "Ключ API Resend", "Resend-API-Schlüssel", "Chave API do Resend", "Klucz API Resend", "Resend API anahtarı", "Resend API-sleutel"),
    help: L(
      "resend.com/api-keys → Create API key → copy it once (it is shown a single time).",
      "resend.com/api-keys → Create API key → cópiala una vez (se muestra solo una vez).",
      "resend.com/api-keys → Create API key → copiez-la (elle n'est affichée qu'une fois).",
      "resend.com/api-keys → Create API key → copiala subito (viene mostrata una sola volta).",
      "resend.com/api-keys → Create API key → скопируйте сразу, показывается один раз.",
      "resend.com/api-keys → Create API key → sofort kopieren, er wird nur einmal angezeigt.",
      "resend.com/api-keys → Create API key → copie já, é mostrada uma única vez.",
      "resend.com/api-keys → Create API key → skopiuj od razu, pokazywany jest raz.",
      "resend.com/api-keys → Create API key → hemen kopyalayın, yalnızca bir kez gösterilir.",
      "resend.com/api-keys → Create API key → kopieer meteen, hij wordt één keer getoond.",
    ),
  },
  RESEND_FROM_EMAIL: {
    env: "RESEND_FROM_EMAIL",
    service: "resend", serviceLabel: RESEND,
    label: L("Sender address", "Dirección del remitente", "Adresse d'expéditeur", "Indirizzo mittente", "Адрес отправителя", "Absenderadresse", "Endereço do remetente", "Adres nadawcy", "Gönderen adresi", "Afzenderadres"),
    help: L(
      "An address on a domain VERIFIED in resend.com/domains — Resend refuses to send from anything else.",
      "Una dirección de un dominio VERIFICADO en resend.com/domains: Resend rechaza cualquier otra.",
      "Une adresse sur un domaine VÉRIFIÉ dans resend.com/domains — Resend refuse toute autre.",
      "Un indirizzo su un dominio VERIFICATO in resend.com/domains — Resend rifiuta gli altri.",
      "Адрес на домене, ПОДТВЕРЖДЁННОМ в resend.com/domains — с других Resend отправлять откажется.",
      "Eine Adresse auf einer in resend.com/domains VERIFIZIERTEN Domain — andere lehnt Resend ab.",
      "Um endereço num domínio VERIFICADO em resend.com/domains — Resend recusa os outros.",
      "Adres w domenie ZWERYFIKOWANEJ w resend.com/domains — z innych Resend odmówi wysyłki.",
      "resend.com/domains'te DOĞRULANMIŞ bir alan adındaki adres — Resend diğerlerini reddeder.",
      "Een adres op een in resend.com/domains GEVERIFIEERD domein — andere weigert Resend.",
    ),
  },
  ANTHROPIC_API_KEY: {
    env: "ANTHROPIC_API_KEY",
    service: "anthropic", serviceLabel: ANTHROPIC,
    secret: true,
    warning: L(
      "Heads up: an Anthropic API key bills PER TOKEN, not by subscription — this can get unexpectedly expensive. A present key also makes the Claude coding agent leave your subscription and bill through the API too.",
      "Atención: una clave API de Anthropic se cobra POR TOKEN, no por suscripción, y puede salir inesperadamente cara. Una clave presente también hace que el agente de código Claude deje la suscripción y cobre por API.",
      "Attention : une clé API Anthropic est facturée AU JETON, pas à l'abonnement — cela peut devenir étonnamment cher. Une clé présente fait aussi quitter l'abonnement à l'agent de code Claude, facturé via l'API.",
      "Attenzione: una chiave API Anthropic si paga A TOKEN, non ad abbonamento — può diventare inaspettatamente costoso. Una chiave presente fa anche uscire l'agente di codice Claude dall'abbonamento, con fatturazione via API.",
      "Внимание: ключ Anthropic API тарифицируется ПОШТУЧНО за токены, а не по подписке — это может оказаться неожиданно дорого. Введённый ключ к тому же уводит кодинг-агент Claude с подписки на оплату через API.",
      "Achtung: Ein Anthropic-API-Schlüssel wird PRO TOKEN abgerechnet, nicht per Abo — das kann unerwartet teuer werden. Ein vorhandener Schlüssel nimmt zudem den Claude-Coding-Agenten vom Abo und rechnet über die API ab.",
      "Atenção: uma chave API da Anthropic é cobrada POR TOKEN, não por subscrição — pode ficar inesperadamente caro. Uma chave presente também faz o agente de código Claude sair da subscrição e cobrar via API.",
      "Uwaga: klucz API Anthropic jest rozliczany ZA TOKEN, nie w abonamencie — może to być nieoczekiwanie drogie. Obecny klucz sprawia też, że agent kodujący Claude opuszcza abonament i rozlicza się przez API.",
      "Dikkat: Anthropic API anahtarı abonelikle değil TOKEN başına ücretlendirilir — beklenmedik şekilde pahalı olabilir. Mevcut bir anahtar ayrıca Claude kodlama ajanını abonelikten çıkarıp API üzerinden ücretlendirir.",
      "Let op: een Anthropic API-sleutel wordt PER TOKEN afgerekend, niet per abonnement — dit kan onverwacht duur worden. Een aanwezige sleutel haalt ook de Claude-codeeragent van het abonnement en rekent via de API af.",
    ),
    label: L("API key", "Clave API", "Clé API", "Chiave API", "Ключ API", "API-Schlüssel", "Chave API", "Klucz API", "API anahtarı", "API-sleutel"),
    help: L(
      "platform.claude.com → API keys → Create key. One key serves every automation in the project.",
      "platform.claude.com → API keys → Create key. Una clave sirve a todas las automatizaciones del proyecto.",
      "platform.claude.com → API keys → Create key. Une seule clé sert toutes les automatisations du projet.",
      "platform.claude.com → API keys → Create key. Una chiave serve tutte le automazioni del progetto.",
      "platform.claude.com → API keys → Create key. Один ключ обслуживает все автоматизации проекта.",
      "platform.claude.com → API keys → Create key. Ein Schlüssel bedient alle Automatisierungen des Projekts.",
      "platform.claude.com → API keys → Create key. Uma chave serve todas as automações do projeto.",
      "platform.claude.com → API keys → Create key. Jeden klucz obsługuje wszystkie automatyzacje projektu.",
      "platform.claude.com → API keys → Create key. Tek anahtar projedeki tüm otomasyonlara hizmet eder.",
      "platform.claude.com → API keys → Create key. Eén sleutel bedient alle automatiseringen van het project.",
    ),
  },
  OPENAI_API_KEY: {
    env: "OPENAI_API_KEY",
    service: "openai", serviceLabel: OPENAI,
    secret: true,
    label: L("API key", "Clave API", "Clé API", "Chiave API", "Ключ API", "API-Schlüssel", "Chave API", "Klucz API", "API anahtarı", "API-sleutel"),
    help: L(
      "platform.openai.com → API keys → Create new secret key. One key serves every automation in the project.",
      "platform.openai.com → API keys → Create new secret key. Una clave sirve a todas las automatizaciones del proyecto.",
      "platform.openai.com → API keys → Create new secret key. Une seule clé sert toutes les automatisations du projet.",
      "platform.openai.com → API keys → Create new secret key. Una chiave serve tutte le automazioni del progetto.",
      "platform.openai.com → API keys → Create new secret key. Один ключ обслуживает все автоматизации проекта.",
      "platform.openai.com → API keys → Create new secret key. Ein Schlüssel bedient alle Automatisierungen des Projekts.",
      "platform.openai.com → API keys → Create new secret key. Uma chave serve todas as automações do projeto.",
      "platform.openai.com → API keys → Create new secret key. Jeden klucz obsługuje wszystkie automatyzacje projektu.",
      "platform.openai.com → API keys → Create new secret key. Tek anahtar projedeki tüm otomasyonlara hizmet eder.",
      "platform.openai.com → API keys → Create new secret key. Eén sleutel bedient alle automatiseringen van het project.",
    ),
  },
  LIGHTRAG_URL: {
    env: "LIGHTRAG_URL",
    service: "memory", serviceLabel: MEMORY,
    optional: true,
    label: L("Memory service URL", "URL del servicio de memoria", "URL du service mémoire", "URL del servizio memoria", "URL сервиса памяти", "Speicherdienst-URL", "URL do serviço de memória", "URL usługi pamięci", "Bellek servisi URL'si", "URL geheugendienst"),
    help: L(
      "Leave empty — the automation uses the platform memory at http://127.0.0.1:9621 by default.",
      "Déjalo vacío: la automatización usa la memoria de la plataforma en http://127.0.0.1:9621 por defecto.",
      "Laisse vide — l'automatisation utilise la mémoire de la plateforme sur http://127.0.0.1:9621 par défaut.",
      "Lascialo vuoto: l'automazione usa la memoria della piattaforma su http://127.0.0.1:9621 di default.",
      "Оставь пустым — по умолчанию используется память платформы на http://127.0.0.1:9621.",
      "Leer lassen — die Automatisierung nutzt standardmäßig den Plattformspeicher unter http://127.0.0.1:9621.",
      "Deixa vazio — a automação usa a memória da plataforma em http://127.0.0.1:9621 por omissão.",
      "Zostaw puste — automatyzacja domyślnie używa pamięci platformy pod http://127.0.0.1:9621.",
      "Boş bırak — otomasyon varsayılan olarak http://127.0.0.1:9621 adresindeki platform belleğini kullanır.",
      "Laat leeg — de automatisering gebruikt standaard het platformgeheugen op http://127.0.0.1:9621.",
    ),
  },
  LIGHTRAG_API_KEY: {
    env: "LIGHTRAG_API_KEY",
    service: "memory", serviceLabel: MEMORY,
    optional: true, secret: true,
    label: L("Memory API key", "Clave API de memoria", "Clé API mémoire", "Chiave API memoria", "Ключ API памяти", "Speicher-API-Schlüssel", "Chave API de memória", "Klucz API pamięci", "Bellek API anahtarı", "Geheugen-API-sleutel"),
    help: L(
      "Leave empty — only needed if the memory service was configured to require a key.",
      "Déjalo vacío: solo si el servicio de memoria se configuró para exigir clave.",
      "Laisse vide — utile seulement si le service mémoire exige une clé.",
      "Lascialo vuoto: serve solo se il servizio memoria richiede una chiave.",
      "Оставь пустым — нужен только если сервис памяти настроен требовать ключ.",
      "Leer lassen — nur nötig, wenn der Speicherdienst einen Schlüssel verlangt.",
      "Deixa vazio — só é preciso se o serviço de memória exigir uma chave.",
      "Zostaw puste — potrzebny tylko, gdy usługa pamięci wymaga klucza.",
      "Boş bırak — yalnızca bellek servisi anahtar gerektiriyorsa gerekir.",
      "Laat leeg — alleen nodig als de geheugendienst een sleutel vereist.",
    ),
  },
  RESEND_INBOUND_SECRET: {
    env: "RESEND_INBOUND_SECRET",
    service: "resend", serviceLabel: RESEND,
    secret: true,
    label: L("Inbound webhook secret", "Secreto del webhook entrante", "Secret du webhook entrant", "Segreto del webhook in entrata", "Секрет входящего вебхука", "Secret des Eingangs-Webhooks", "Segredo do webhook de entrada", "Sekret webhooka przychodzącego", "Gelen webhook sırrı", "Geheim van inkomende webhook"),
    help: L(
      "resend.com → Webhooks → add this automation's api/inbound-email address and copy the signing secret. Receiving also needs MX records on the inbound domain.",
      "resend.com → Webhooks → añade la dirección api/inbound-email de esta automatización y copia el secreto de firma. Recibir requiere además registros MX en el dominio.",
      "resend.com → Webhooks → ajoutez l'adresse api/inbound-email de cette automatisation et copiez le secret de signature. La réception exige aussi des enregistrements MX.",
      "resend.com → Webhooks → aggiungi l'indirizzo api/inbound-email di questa automazione e copia il segreto di firma. Ricevere richiede anche i record MX.",
      "resend.com → Webhooks → добавьте адрес api/inbound-email этой автоматизации и скопируйте секрет подписи. Для приёма нужны ещё MX-записи на домене.",
      "resend.com → Webhooks → die api/inbound-email-Adresse dieser Automatisierung hinzufügen und das Signatur-Secret kopieren. Empfang braucht zusätzlich MX-Einträge.",
      "resend.com → Webhooks → adicione o endereço api/inbound-email desta automação e copie o segredo de assinatura. Receber exige ainda registos MX.",
      "resend.com → Webhooks → dodaj adres api/inbound-email tej automatyzacji i skopiuj sekret podpisu. Odbiór wymaga też rekordów MX.",
      "resend.com → Webhooks → bu otomasyonun api/inbound-email adresini ekleyin ve imza sırrını kopyalayın. Almak için ayrıca MX kayıtları gerekir.",
      "resend.com → Webhooks → voeg het api/inbound-email-adres van deze automatisering toe en kopieer het ondertekeningsgeheim. Ontvangen vereist ook MX-records.",
    ),
  },
};

/** Ключи узла, развёрнутые в их описания. Неизвестное имя показываем как есть — молчать о нём хуже. */
export function keysOf(envKeys: readonly string[]): ChannelKey[] {
  return envKeys.map(
    (env) =>
      KEY_CATALOG[env] ?? {
        env,
        service: env.split("_")[0].toLowerCase() || "other",
        serviceLabel: { en: env.split("_")[0] || "Other" },
        label: { en: env },
        help: { en: "Declared by this automation; no description in the catalogue yet." },
        secret: /TOKEN|KEY|SECRET|PASSWORD/i.test(env),
      },
  );
}

/** Ключи, отсутствие которых ДЕЙСТВИТЕЛЬНО не даёт каналу работать (необязательные не в счёт). */
export const requiredOf = (keys: ChannelKey[]): string[] => keys.filter((k) => !k.optional).map((k) => k.env);

/** СЕРВИС — то, что владелец настраивает: имя и все его ключи вместе. */
export type Service = { key: string; label: Record<string, string>; keys: ChannelKey[] };

/**
 * Объявленные имена переменных → карточки сервисов.
 *
 * Именно здесь список схлопывается: восемнадцать каналов автоматизации объявляют суммарно пять
 * переменных, принадлежащих ДВУМ сервисам, и настроек в окне ровно две. Канал, не требующий ключей,
 * сюда не попадает вовсе — настраивать в нём нечего, а включают его на холсте.
 *
 * Неизвестное имя ключа получает собственную карточку: молча потерять объявленный ключ хуже, чем
 * показать его без описания.
 */
export function servicesOf(envKeys: readonly string[]): Service[] {
  const out = new Map<string, Service>();
  for (const key of keysOf([...new Set(envKeys)])) {
    const existing = out.get(key.service);
    if (existing) existing.keys.push(key);
    else out.set(key.service, { key: key.service, label: key.serviceLabel, keys: [key] });
  }
  return [...out.values()];
}

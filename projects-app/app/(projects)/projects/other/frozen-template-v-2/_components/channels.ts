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
    label: L("Allowed chat id", "Id de chat permitido", "Id de discussion autorisée", "Id chat consentita", "Разрешённый чат", "Erlaubte Chat-ID", "Id de chat permitido", "Dozwolony id czatu", "İzinli sohbet kimliği", "Toegestane chat-id"),
    help: L(
      "Leave empty to accept every chat. To restrict it, write to the bot and take the chat id from its reply.",
      "Déjalo vacío para aceptar cualquier chat. Para restringirlo, escribe al bot y toma el id de su respuesta.",
      "Laissez vide pour accepter toutes les discussions. Pour restreindre, écrivez au bot et prenez l'id dans sa réponse.",
      "Lascia vuoto per accettare ogni chat. Per limitarlo, scrivi al bot e prendi l'id dalla sua risposta.",
      "Пусто — принимать любой чат. Чтобы ограничить, напишите боту и возьмите id чата из его ответа.",
      "Leer lassen, um jeden Chat zu akzeptieren. Zum Einschränken dem Bot schreiben und die Chat-ID aus der Antwort nehmen.",
      "Deixe vazio para aceitar qualquer chat. Para restringir, escreva ao bot e tire o id da resposta.",
      "Zostaw puste, aby przyjmować każdy czat. Aby ograniczyć, napisz do bota i weź id z odpowiedzi.",
      "Her sohbeti kabul etmek için boş bırakın. Sınırlamak için bota yazın ve yanıtındaki kimliği alın.",
      "Laat leeg om elke chat te accepteren. Om te beperken: schrijf de bot en neem de chat-id uit het antwoord.",
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

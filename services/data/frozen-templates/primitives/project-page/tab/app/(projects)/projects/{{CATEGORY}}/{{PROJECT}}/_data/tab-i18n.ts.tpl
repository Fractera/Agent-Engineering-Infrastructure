// Reusable UI strings of a project tab (step 187.5). The Projects zone is MONOLINGUAL
// (§3.12) — it renders ONE language, the slot's DEFAULT_LANGUAGE — so these strings are
// picked once by that language with an English fallback for anything unlisted (the same
// contract as components/menu/account/account-menu.i18n.ts). Translations are idiomatic,
// not literal. The react-flow CANVAS and the admin settings page stay English by design
// and are NOT covered here.
//
// Scope: section headings of the tab, the footer's two tooltip links (186.2), the
// missing-keys modal header/buttons (186.3), and the OpenAI-key recommendation tooltip
// (187.9). Add a language by adding its code below; unlisted languages fall back to en.

export type ProjectTabStrings = {
  // section headings
  about: string;
  diagram: string;
  run: string;
  hooks: string;
  processes: string;
  results: string;
  scheduled: string;
  // footer tooltips (186.2)
  continueDev: string;
  envVars: string;
  // missing-keys modal (186.3)
  keysTitle: string;
  keysDescription: string;
  keysLater: string;
  keysSave: string;
  keysSaving: string;
  // OpenAI key recommendation tooltip (187.9)
  openaiLabel: string;
  openaiTooltip: string;
};

const EN: ProjectTabStrings = {
  about: "About this project",
  diagram: "Process diagram",
  run: "Run the automation",
  hooks: "Hooks",
  processes: "Current processes",
  results: "Results",
  scheduled: "Scheduled runs",
  continueDev: "Continue development",
  envVars: "Environment variables",
  keysTitle: "This automation needs a few keys",
  keysDescription:
    "The following values are missing. Enter them to make the automation work. You can close this and add them later — but nothing runs until they are set.",
  keysLater: "Later",
  keysSave: "Save keys",
  keysSaving: "Saving…",
  openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
  openaiTooltip:
    "We recommend an API key, not a subscription: if the content-generation agent hits its limit and is switched off, the rest of your processes keep running. Don't worry — this process is very resource-efficient.",
};

// Idiomatic bundles for a broad core of languages. Unlisted languages resolve to EN
// (STRINGS[lang] ?? EN) — never a fabricated/uncertain translation (avoids mojibake, rule 4б).
export const STRINGS: Record<string, ProjectTabStrings> = {
  en: EN,
  ru: {
    about: "Об этом проекте",
    diagram: "Схема процесса",
    run: "Запустить автоматизацию",
    hooks: "Хуки",
    processes: "Текущие процессы",
    results: "Результаты",
    scheduled: "Запуски по расписанию",
    continueDev: "Продолжить разработку",
    envVars: "Переменные окружения",
    keysTitle: "Этой автоматизации нужно несколько ключей",
    keysDescription:
      "Не хватает следующих значений. Введите их, чтобы автоматизация заработала. Можно закрыть и добавить позже — но пока ключи не заданы, ничего не выполняется.",
    keysLater: "Позже",
    keysSave: "Сохранить ключи",
    keysSaving: "Сохранение…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Рекомендуем использовать API-ключ, а не подписку: если агент генерации контента превысит лимит и будет отключён, остальные процессы останутся рабочими. Не беспокойтесь — этот процесс очень ресурсоэкономный.",
  },
  es: {
    about: "Acerca de este proyecto",
    diagram: "Diagrama del proceso",
    run: "Ejecutar la automatización",
    hooks: "Hooks",
    processes: "Procesos actuales",
    results: "Resultados",
    scheduled: "Ejecuciones programadas",
    continueDev: "Continuar el desarrollo",
    envVars: "Variables de entorno",
    keysTitle: "Esta automatización necesita algunas claves",
    keysDescription:
      "Faltan los siguientes valores. Introdúcelos para que la automatización funcione. Puedes cerrar y añadirlos más tarde, pero nada se ejecuta hasta que estén definidos.",
    keysLater: "Más tarde",
    keysSave: "Guardar claves",
    keysSaving: "Guardando…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Recomendamos una clave API, no una suscripción: si el agente de generación de contenido alcanza su límite y se desactiva, el resto de tus procesos siguen funcionando. No te preocupes: este proceso es muy eficiente en recursos.",
  },
  fr: {
    about: "À propos de ce projet",
    diagram: "Schéma du processus",
    run: "Lancer l'automatisation",
    hooks: "Hooks",
    processes: "Processus en cours",
    results: "Résultats",
    scheduled: "Exécutions planifiées",
    continueDev: "Poursuivre le développement",
    envVars: "Variables d'environnement",
    keysTitle: "Cette automatisation a besoin de quelques clés",
    keysDescription:
      "Les valeurs suivantes manquent. Saisissez-les pour que l'automatisation fonctionne. Vous pouvez fermer et les ajouter plus tard, mais rien ne s'exécute tant qu'elles ne sont pas définies.",
    keysLater: "Plus tard",
    keysSave: "Enregistrer les clés",
    keysSaving: "Enregistrement…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Nous recommandons une clé API, pas un abonnement : si l'agent de génération de contenu atteint sa limite et est désactivé, vos autres processus continuent de fonctionner. Pas d'inquiétude : ce processus est très économe en ressources.",
  },
  de: {
    about: "Über dieses Projekt",
    diagram: "Prozessdiagramm",
    run: "Automatisierung starten",
    hooks: "Hooks",
    processes: "Aktuelle Prozesse",
    results: "Ergebnisse",
    scheduled: "Geplante Ausführungen",
    continueDev: "Entwicklung fortsetzen",
    envVars: "Umgebungsvariablen",
    keysTitle: "Diese Automatisierung benötigt einige Schlüssel",
    keysDescription:
      "Die folgenden Werte fehlen. Geben Sie sie ein, damit die Automatisierung funktioniert. Sie können dies schließen und sie später hinzufügen — aber es läuft nichts, bis sie gesetzt sind.",
    keysLater: "Später",
    keysSave: "Schlüssel speichern",
    keysSaving: "Speichern…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Wir empfehlen einen API-Schlüssel, kein Abonnement: Wenn der Agent zur Inhaltserzeugung sein Limit erreicht und abgeschaltet wird, laufen Ihre übrigen Prozesse weiter. Keine Sorge — dieser Prozess ist sehr ressourcenschonend.",
  },
  pt: {
    about: "Sobre este projeto",
    diagram: "Diagrama do processo",
    run: "Executar a automação",
    hooks: "Hooks",
    processes: "Processos atuais",
    results: "Resultados",
    scheduled: "Execuções agendadas",
    continueDev: "Continuar o desenvolvimento",
    envVars: "Variáveis de ambiente",
    keysTitle: "Esta automação precisa de algumas chaves",
    keysDescription:
      "Os seguintes valores estão faltando. Insira-os para que a automação funcione. Você pode fechar e adicioná-los depois — mas nada é executado até que estejam definidos.",
    keysLater: "Depois",
    keysSave: "Salvar chaves",
    keysSaving: "Salvando…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Recomendamos uma chave de API, não uma assinatura: se o agente de geração de conteúdo atingir o limite e for desligado, os demais processos continuam funcionando. Não se preocupe — este processo é muito econômico em recursos.",
  },
  it: {
    about: "Informazioni sul progetto",
    diagram: "Diagramma del processo",
    run: "Avvia l'automazione",
    hooks: "Hooks",
    processes: "Processi correnti",
    results: "Risultati",
    scheduled: "Esecuzioni pianificate",
    continueDev: "Continua lo sviluppo",
    envVars: "Variabili d'ambiente",
    keysTitle: "Questa automazione ha bisogno di alcune chiavi",
    keysDescription:
      "Mancano i seguenti valori. Inseriscili per far funzionare l'automazione. Puoi chiudere e aggiungerli più tardi, ma nulla viene eseguito finché non sono impostati.",
    keysLater: "Più tardi",
    keysSave: "Salva chiavi",
    keysSaving: "Salvataggio…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Consigliamo una chiave API, non un abbonamento: se l'agente di generazione dei contenuti raggiunge il limite e viene disattivato, gli altri processi continuano a funzionare. Non preoccuparti: questo processo è molto efficiente nelle risorse.",
  },
  uk: {
    about: "Про цей проєкт",
    diagram: "Схема процесу",
    run: "Запустити автоматизацію",
    hooks: "Хуки",
    processes: "Поточні процеси",
    results: "Результати",
    scheduled: "Заплановані запуски",
    continueDev: "Продовжити розробку",
    envVars: "Змінні середовища",
    keysTitle: "Цій автоматизації потрібно кілька ключів",
    keysDescription:
      "Бракує наступних значень. Введіть їх, щоб автоматизація запрацювала. Можна закрити й додати пізніше — але доки ключі не задані, нічого не виконується.",
    keysLater: "Пізніше",
    keysSave: "Зберегти ключі",
    keysSaving: "Збереження…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Рекомендуємо використовувати API-ключ, а не підписку: якщо агент генерації контенту перевищить ліміт і буде вимкнений, інші процеси залишаться робочими. Не хвилюйтеся — цей процес дуже ресурсоощадний.",
  },
  pl: {
    about: "O tym projekcie",
    diagram: "Diagram procesu",
    run: "Uruchom automatyzację",
    hooks: "Hooki",
    processes: "Bieżące procesy",
    results: "Wyniki",
    scheduled: "Zaplanowane uruchomienia",
    continueDev: "Kontynuuj rozwój",
    envVars: "Zmienne środowiskowe",
    keysTitle: "Ta automatyzacja potrzebuje kilku kluczy",
    keysDescription:
      "Brakuje następujących wartości. Wprowadź je, aby automatyzacja działała. Możesz zamknąć i dodać je później — ale nic się nie uruchomi, dopóki nie zostaną ustawione.",
    keysLater: "Później",
    keysSave: "Zapisz klucze",
    keysSaving: "Zapisywanie…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Zalecamy klucz API, a nie subskrypcję: jeśli agent generujący treści osiągnie limit i zostanie wyłączony, pozostałe procesy będą działać dalej. Bez obaw — ten proces jest bardzo oszczędny zasobowo.",
  },
  tr: {
    about: "Bu proje hakkında",
    diagram: "Süreç şeması",
    run: "Otomasyonu çalıştır",
    hooks: "Kancalar",
    processes: "Mevcut süreçler",
    results: "Sonuçlar",
    scheduled: "Zamanlanmış çalıştırmalar",
    continueDev: "Geliştirmeye devam et",
    envVars: "Ortam değişkenleri",
    keysTitle: "Bu otomasyon birkaç anahtara ihtiyaç duyuyor",
    keysDescription:
      "Aşağıdaki değerler eksik. Otomasyonun çalışması için bunları girin. Kapatıp daha sonra ekleyebilirsiniz — ancak ayarlanana kadar hiçbir şey çalışmaz.",
    keysLater: "Sonra",
    keysSave: "Anahtarları kaydet",
    keysSaving: "Kaydediliyor…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Abonelik değil, bir API anahtarı öneririz: içerik üreten aracı sınırına ulaşıp kapatılırsa diğer süreçleriniz çalışmaya devam eder. Endişelenmeyin — bu süreç kaynak açısından çok verimlidir.",
  },
  ar: {
    about: "حول هذا المشروع",
    diagram: "مخطط العملية",
    run: "تشغيل الأتمتة",
    hooks: "الخطافات",
    processes: "العمليات الحالية",
    results: "النتائج",
    scheduled: "التشغيلات المجدولة",
    continueDev: "متابعة التطوير",
    envVars: "متغيرات البيئة",
    keysTitle: "تحتاج هذه الأتمتة إلى بعض المفاتيح",
    keysDescription:
      "القيم التالية مفقودة. أدخلها لكي تعمل الأتمتة. يمكنك الإغلاق وإضافتها لاحقًا، لكن لن يعمل شيء حتى يتم تعيينها.",
    keysLater: "لاحقًا",
    keysSave: "حفظ المفاتيح",
    keysSaving: "جارٍ الحفظ…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "نوصي بمفتاح API وليس اشتراكًا: إذا بلغ وكيل إنشاء المحتوى حده وتم إيقافه، تستمر بقية عملياتك في العمل. لا تقلق — هذه العملية اقتصادية جدًا في الموارد.",
  },
  zh: {
    about: "关于此项目",
    diagram: "流程图",
    run: "运行自动化",
    hooks: "钩子",
    processes: "当前进程",
    results: "结果",
    scheduled: "计划运行",
    continueDev: "继续开发",
    envVars: "环境变量",
    keysTitle: "此自动化需要一些密钥",
    keysDescription:
      "缺少以下值。请输入它们以使自动化正常工作。你可以关闭并稍后添加，但在设置之前不会运行任何内容。",
    keysLater: "稍后",
    keysSave: "保存密钥",
    keysSaving: "正在保存…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "我们建议使用 API 密钥而非订阅：如果内容生成代理达到限额并被关闭，你的其余进程仍可继续运行。别担心——此进程非常节省资源。",
  },
  ja: {
    about: "このプロジェクトについて",
    diagram: "プロセス図",
    run: "自動化を実行",
    hooks: "フック",
    processes: "現在のプロセス",
    results: "結果",
    scheduled: "スケジュール実行",
    continueDev: "開発を続ける",
    envVars: "環境変数",
    keysTitle: "この自動化にはいくつかのキーが必要です",
    keysDescription:
      "次の値が不足しています。自動化を動作させるために入力してください。閉じて後で追加することもできますが、設定するまで何も実行されません。",
    keysLater: "後で",
    keysSave: "キーを保存",
    keysSaving: "保存中…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "サブスクリプションではなく API キーの使用をお勧めします。コンテンツ生成エージェントが上限に達して停止しても、他のプロセスは動作し続けます。ご安心ください——この処理は非常に省リソースです。",
  },
  ko: {
    about: "이 프로젝트 정보",
    diagram: "프로세스 다이어그램",
    run: "자동화 실행",
    hooks: "훅",
    processes: "현재 프로세스",
    results: "결과",
    scheduled: "예약된 실행",
    continueDev: "개발 계속하기",
    envVars: "환경 변수",
    keysTitle: "이 자동화에는 몇 가지 키가 필요합니다",
    keysDescription:
      "다음 값이 누락되었습니다. 자동화가 작동하도록 입력하세요. 닫고 나중에 추가할 수 있지만, 설정하기 전까지는 아무것도 실행되지 않습니다.",
    keysLater: "나중에",
    keysSave: "키 저장",
    keysSaving: "저장 중…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "구독이 아닌 API 키 사용을 권장합니다. 콘텐츠 생성 에이전트가 한도에 도달해 꺼져도 나머지 프로세스는 계속 실행됩니다. 걱정 마세요 — 이 프로세스는 매우 자원 효율적입니다.",
  },
  hi: {
    about: "इस परियोजना के बारे में",
    diagram: "प्रक्रिया आरेख",
    run: "स्वचालन चलाएँ",
    hooks: "हुक",
    processes: "वर्तमान प्रक्रियाएँ",
    results: "परिणाम",
    scheduled: "निर्धारित रन",
    continueDev: "विकास जारी रखें",
    envVars: "एनवायरनमेंट वेरिएबल",
    keysTitle: "इस स्वचालन को कुछ कुंजियों की आवश्यकता है",
    keysDescription:
      "निम्न मान अनुपस्थित हैं। स्वचालन को काम करने के लिए इन्हें दर्ज करें। आप इसे बंद करके बाद में जोड़ सकते हैं — लेकिन सेट होने तक कुछ भी नहीं चलेगा।",
    keysLater: "बाद में",
    keysSave: "कुंजियाँ सहेजें",
    keysSaving: "सहेजा जा रहा है…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "हम सदस्यता नहीं, बल्कि एक API कुंजी की अनुशंसा करते हैं: यदि सामग्री-निर्माण एजेंट अपनी सीमा तक पहुँचकर बंद हो जाता है, तो आपकी शेष प्रक्रियाएँ चलती रहती हैं। चिंता न करें — यह प्रक्रिया बहुत संसाधन-कुशल है।",
  },
  id: {
    about: "Tentang proyek ini",
    diagram: "Diagram proses",
    run: "Jalankan otomatisasi",
    hooks: "Hooks",
    processes: "Proses saat ini",
    results: "Hasil",
    scheduled: "Jalankan terjadwal",
    continueDev: "Lanjutkan pengembangan",
    envVars: "Variabel lingkungan",
    keysTitle: "Otomatisasi ini membutuhkan beberapa kunci",
    keysDescription:
      "Nilai berikut belum ada. Masukkan agar otomatisasi berfungsi. Anda dapat menutup dan menambahkannya nanti — tetapi tidak ada yang berjalan sampai disetel.",
    keysLater: "Nanti",
    keysSave: "Simpan kunci",
    keysSaving: "Menyimpan…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Kami menyarankan kunci API, bukan langganan: jika agen pembuat konten mencapai batasnya dan dimatikan, proses Anda yang lain tetap berjalan. Jangan khawatir — proses ini sangat hemat sumber daya.",
  },
  vi: {
    about: "Giới thiệu về dự án này",
    diagram: "Sơ đồ quy trình",
    run: "Chạy tự động hóa",
    hooks: "Hooks",
    processes: "Tiến trình hiện tại",
    results: "Kết quả",
    scheduled: "Lần chạy đã lên lịch",
    continueDev: "Tiếp tục phát triển",
    envVars: "Biến môi trường",
    keysTitle: "Tự động hóa này cần một vài khóa",
    keysDescription:
      "Thiếu các giá trị sau. Nhập chúng để tự động hóa hoạt động. Bạn có thể đóng và thêm sau — nhưng sẽ không có gì chạy cho đến khi được thiết lập.",
    keysLater: "Để sau",
    keysSave: "Lưu khóa",
    keysSaving: "Đang lưu…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "Chúng tôi khuyên dùng khóa API, không phải gói đăng ký: nếu tác nhân tạo nội dung đạt giới hạn và bị tắt, các tiến trình còn lại của bạn vẫn tiếp tục chạy. Đừng lo — quy trình này rất tiết kiệm tài nguyên.",
  },
  nl: {
    about: "Over dit project",
    diagram: "Processchema",
    run: "Automatisering uitvoeren",
    hooks: "Hooks",
    processes: "Huidige processen",
    results: "Resultaten",
    scheduled: "Geplande uitvoeringen",
    continueDev: "Ontwikkeling voortzetten",
    envVars: "Omgevingsvariabelen",
    keysTitle: "Deze automatisering heeft enkele sleutels nodig",
    keysDescription:
      "De volgende waarden ontbreken. Voer ze in om de automatisering te laten werken. Je kunt dit sluiten en ze later toevoegen — maar er draait niets totdat ze zijn ingesteld.",
    keysLater: "Later",
    keysSave: "Sleutels opslaan",
    keysSaving: "Opslaan…",
    openaiLabel: "Fractera AI (OpenAI) — OPENAI_API_KEY",
    openaiTooltip:
      "We raden een API-sleutel aan, geen abonnement: als de content-generatie-agent zijn limiet bereikt en wordt uitgeschakeld, blijven je overige processen draaien. Geen zorgen — dit proces is zeer zuinig met bronnen.",
  },
};

// Resolve the string bundle for a language, falling back to English for anything not
// listed above. Never returns undefined.
export function projectTabStrings(lang: string): ProjectTabStrings {
  return STRINGS[lang] ?? EN;
}

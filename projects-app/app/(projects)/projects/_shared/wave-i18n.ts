// TEN-LANGUAGE UI for the DEVELOPMENT WAVE (step 240; CLAUDE.md rule 4г) — the banner that appears as soon
// as anything is staged, and the lock modal every tool shows once the wave has been handed over.
// {n} is the development step number; fill it with String.replace.

export type WaveStrings = {
  // the banner — staging
  bannerTitle: string;
  bannerBody: string;        // {n} = number of staged changes
  bannerLaunch: string;
  // the banner — locked
  lockedTitle: string;
  lockedBody: string;        // {n} = step number
  // the lock modal (shown when a tool is used while locked)
  lockTitle: string;
  lockBody: string;          // {n} = step number
  lockBodyNoStep: string;
  lockAmend: string;
  lockOpenArchitecture: string;
  lockOk: string;
};

export const WAVE_I18N: Record<string, WaveStrings> = {
  en: {
    bannerTitle: "Changes are waiting to be developed",
    bannerBody: "You have {n} change(s) staged. Finish everything you want in this round — every element — then launch development once, as a single batch.",
    bannerLaunch: "Launch development",
    lockedTitle: "Development is scheduled",
    lockedBody: "Development step #{n} was handed to your coding agent. This page is locked until it is finished.",
    lockTitle: "A new development is scheduled",
    lockBody: "Development step #{n} has already been handed over. Finish it before making further changes here — otherwise the brief your coding agent is working from would silently change.",
    lockBodyNoStep: "A development step has already been handed over. Finish it before making further changes here.",
    lockAmend: "If you still want to amend the brief that was already sent, open your project on the Architecture page and use its to-do list.",
    lockOpenArchitecture: "Open Architecture",
    lockOk: "OK, I understand",
  },
  ru: {
    bannerTitle: "Изменения ждут разработки",
    bannerBody: "У вас накоплено изменений: {n}. Завершите всё, что хотите в этом круге — по всем элементам — и запустите разработку один раз, одной волной.",
    bannerLaunch: "Запустить разработку",
    lockedTitle: "Разработка запланирована",
    lockedBody: "Шаг разработки №{n} передан вашему агенту-программисту. Страница заблокирована до его завершения.",
    lockTitle: "Запланирована новая разработка",
    lockBody: "Шаг разработки №{n} уже передан. Завершите его, прежде чем вносить новые изменения здесь — иначе техническое задание, по которому работает агент, незаметно изменится.",
    lockBodyNoStep: "Шаг разработки уже передан. Завершите его, прежде чем вносить новые изменения здесь.",
    lockAmend: "Если вы всё же хотите дополнить уже отправленное техническое задание — откройте ваш проект на странице архитектуры и воспользуйтесь её todo-листом.",
    lockOpenArchitecture: "Открыть архитектуру",
    lockOk: "ОК, я понимаю",
  },
  es: {
    bannerTitle: "Hay cambios esperando desarrollo",
    bannerBody: "Tienes {n} cambio(s) preparados. Termina todo lo que quieras en esta ronda — en todos los elementos — y lanza el desarrollo una sola vez, en un único lote.",
    bannerLaunch: "Lanzar el desarrollo",
    lockedTitle: "El desarrollo está programado",
    lockedBody: "El paso de desarrollo n.º {n} se entregó a tu agente de código. Esta página está bloqueada hasta que termine.",
    lockTitle: "Hay un nuevo desarrollo programado",
    lockBody: "El paso de desarrollo n.º {n} ya se entregó. Termínalo antes de hacer más cambios aquí; de lo contrario, el encargo con el que trabaja tu agente cambiaría sin avisar.",
    lockBodyNoStep: "Ya se entregó un paso de desarrollo. Termínalo antes de hacer más cambios aquí.",
    lockAmend: "Si aun así quieres modificar el encargo ya enviado, abre tu proyecto en la página de Arquitectura y usa su lista de tareas.",
    lockOpenArchitecture: "Abrir Arquitectura",
    lockOk: "De acuerdo, lo entiendo",
  },
  fr: {
    bannerTitle: "Des modifications attendent d'être développées",
    bannerBody: "Vous avez {n} modification(s) en attente. Terminez tout ce que vous voulez dans ce tour — sur tous les éléments — puis lancez le développement une seule fois, en un seul lot.",
    bannerLaunch: "Lancer le développement",
    lockedTitle: "Le développement est planifié",
    lockedBody: "L'étape de développement n° {n} a été confiée à votre agent de code. Cette page est verrouillée jusqu'à ce qu'elle soit terminée.",
    lockTitle: "Un nouveau développement est planifié",
    lockBody: "L'étape de développement n° {n} a déjà été transmise. Terminez-la avant d'apporter d'autres modifications ici, sinon le cahier des charges sur lequel travaille votre agent changerait sans prévenir.",
    lockBodyNoStep: "Une étape de développement a déjà été transmise. Terminez-la avant d'apporter d'autres modifications ici.",
    lockAmend: "Si vous voulez tout de même compléter le cahier des charges déjà envoyé, ouvrez votre projet sur la page Architecture et utilisez sa liste de tâches.",
    lockOpenArchitecture: "Ouvrir l'Architecture",
    lockOk: "D'accord, j'ai compris",
  },
  it: {
    bannerTitle: "Ci sono modifiche in attesa di sviluppo",
    bannerBody: "Hai {n} modifica/e in sospeso. Completa tutto ciò che vuoi in questo giro — su ogni elemento — poi avvia lo sviluppo una sola volta, in un unico lotto.",
    bannerLaunch: "Avvia lo sviluppo",
    lockedTitle: "Lo sviluppo è programmato",
    lockedBody: "Il passo di sviluppo n. {n} è stato consegnato al tuo agente di codice. Questa pagina è bloccata finché non sarà completato.",
    lockTitle: "È programmato un nuovo sviluppo",
    lockBody: "Il passo di sviluppo n. {n} è già stato consegnato. Completalo prima di apportare altre modifiche qui, altrimenti le specifiche su cui lavora il tuo agente cambierebbero silenziosamente.",
    lockBodyNoStep: "Un passo di sviluppo è già stato consegnato. Completalo prima di apportare altre modifiche qui.",
    lockAmend: "Se vuoi comunque integrare le specifiche già inviate, apri il tuo progetto nella pagina Architettura e usa la sua lista di to-do.",
    lockOpenArchitecture: "Apri Architettura",
    lockOk: "OK, ho capito",
  },
  de: {
    bannerTitle: "Änderungen warten auf die Entwicklung",
    bannerBody: "Du hast {n} vorgemerkte Änderung(en). Schließe in dieser Runde alles ab, was du möchtest — über alle Elemente hinweg — und starte die Entwicklung dann EINMAL, als ein Paket.",
    bannerLaunch: "Entwicklung starten",
    lockedTitle: "Die Entwicklung ist eingeplant",
    lockedBody: "Entwicklungsschritt Nr. {n} wurde an deinen Coding-Agenten übergeben. Diese Seite ist gesperrt, bis er fertig ist.",
    lockTitle: "Eine neue Entwicklung ist eingeplant",
    lockBody: "Entwicklungsschritt Nr. {n} wurde bereits übergeben. Schließe ihn ab, bevor du hier weitere Änderungen vornimmst — sonst würde sich die Vorgabe, mit der dein Agent arbeitet, unbemerkt ändern.",
    lockBodyNoStep: "Ein Entwicklungsschritt wurde bereits übergeben. Schließe ihn ab, bevor du hier weitere Änderungen vornimmst.",
    lockAmend: "Wenn du die bereits gesendete Vorgabe dennoch ergänzen willst, öffne dein Projekt auf der Architektur-Seite und nutze deren To-do-Liste.",
    lockOpenArchitecture: "Architektur öffnen",
    lockOk: "OK, verstanden",
  },
  pt: {
    bannerTitle: "Há alterações à espera de desenvolvimento",
    bannerBody: "Tem {n} alteração(ões) preparada(s). Termine tudo o que quiser nesta ronda — em todos os elementos — e lance o desenvolvimento uma única vez, num só lote.",
    bannerLaunch: "Lançar o desenvolvimento",
    lockedTitle: "O desenvolvimento está agendado",
    lockedBody: "O passo de desenvolvimento n.º {n} foi entregue ao seu agente de código. Esta página fica bloqueada até estar concluído.",
    lockTitle: "Está agendado um novo desenvolvimento",
    lockBody: "O passo de desenvolvimento n.º {n} já foi entregue. Conclua-o antes de fazer mais alterações aqui — caso contrário, o caderno de encargos com que o seu agente trabalha mudaria sem aviso.",
    lockBodyNoStep: "Já foi entregue um passo de desenvolvimento. Conclua-o antes de fazer mais alterações aqui.",
    lockAmend: "Se ainda assim quiser complementar o caderno de encargos já enviado, abra o seu projeto na página Arquitetura e use a sua lista de tarefas.",
    lockOpenArchitecture: "Abrir Arquitetura",
    lockOk: "OK, compreendo",
  },
  pl: {
    bannerTitle: "Zmiany czekają na rozwój",
    bannerBody: "Masz przygotowane zmiany: {n}. Dokończ w tej rundzie wszystko, co chcesz — we wszystkich elementach — a potem uruchom rozwój RAZ, jedną falą.",
    bannerLaunch: "Uruchom rozwój",
    lockedTitle: "Rozwój jest zaplanowany",
    lockedBody: "Krok rozwoju nr {n} został przekazany Twojemu agentowi kodującemu. Ta strona jest zablokowana, dopóki nie zostanie ukończony.",
    lockTitle: "Zaplanowano nowy rozwój",
    lockBody: "Krok rozwoju nr {n} został już przekazany. Ukończ go przed wprowadzaniem kolejnych zmian — inaczej specyfikacja, na której pracuje Twój agent, zmieniłaby się niepostrzeżenie.",
    lockBodyNoStep: "Krok rozwoju został już przekazany. Ukończ go przed wprowadzaniem kolejnych zmian tutaj.",
    lockAmend: "Jeśli mimo to chcesz uzupełnić już wysłaną specyfikację, otwórz projekt na stronie Architektury i skorzystaj z jej listy to-do.",
    lockOpenArchitecture: "Otwórz Architekturę",
    lockOk: "OK, rozumiem",
  },
  tr: {
    bannerTitle: "Değişiklikler geliştirilmeyi bekliyor",
    bannerBody: "Hazırlanmış {n} değişikliğiniz var. Bu turda istediğiniz her şeyi — tüm ögelerde — tamamlayın, sonra geliştirmeyi tek seferde, tek parti olarak başlatın.",
    bannerLaunch: "Geliştirmeyi başlat",
    lockedTitle: "Geliştirme planlandı",
    lockedBody: "{n} numaralı geliştirme adımı kodlama ajanınıza teslim edildi. Bu sayfa tamamlanana kadar kilitli.",
    lockTitle: "Yeni bir geliştirme planlandı",
    lockBody: "{n} numaralı geliştirme adımı zaten teslim edildi. Burada yeni değişiklikler yapmadan önce onu tamamlayın — aksi hâlde ajanınızın çalıştığı şartname sessizce değişirdi.",
    lockBodyNoStep: "Bir geliştirme adımı zaten teslim edildi. Burada yeni değişiklikler yapmadan önce onu tamamlayın.",
    lockAmend: "Yine de gönderilmiş şartnameyi tamamlamak istiyorsanız, projenizi Mimari sayfasında açın ve oradaki yapılacaklar listesini kullanın.",
    lockOpenArchitecture: "Mimariyi aç",
    lockOk: "Tamam, anladım",
  },
  nl: {
    bannerTitle: "Wijzigingen wachten op ontwikkeling",
    bannerBody: "Je hebt {n} wijziging(en) klaarstaan. Maak in deze ronde alles af wat je wilt — over alle onderdelen — en start de ontwikkeling daarna ÉÉN keer, als één batch.",
    bannerLaunch: "Ontwikkeling starten",
    lockedTitle: "De ontwikkeling is ingepland",
    lockedBody: "Ontwikkelstap #{n} is overgedragen aan je coding agent. Deze pagina is vergrendeld tot die klaar is.",
    lockTitle: "Er is een nieuwe ontwikkeling ingepland",
    lockBody: "Ontwikkelstap #{n} is al overgedragen. Rond die eerst af voordat je hier verdere wijzigingen maakt — anders zou de opdracht waarmee je agent werkt ongemerkt veranderen.",
    lockBodyNoStep: "Er is al een ontwikkelstap overgedragen. Rond die eerst af voordat je hier verdere wijzigingen maakt.",
    lockAmend: "Wil je de al verzonden opdracht toch aanvullen, open je project dan op de Architectuur-pagina en gebruik de to-dolijst daar.",
    lockOpenArchitecture: "Architectuur openen",
    lockOk: "Oké, ik begrijp het",
  },
};

export function waveStrings(lang: string): WaveStrings {
  return WAVE_I18N[lang.slice(0, 2)] ?? WAVE_I18N.en;
}

// СЛОВАРЬ «ОТПРАВИТЬ В РАЗРАБОТКУ» — десять языков (закон 4г). Живёт рядом с самим компонентом в
// `_components/shared/`: отправлять задание модели умеет ЛЮБАЯ вкладка, поэтому и строки общие.
export type SendStrings = {
  devTitle: string;
  devPlaceholder: string;
  devSubmit: string;
  devSending: string;
  devSaved: string;
  devFailed: string;
  devPending: string; // задание владельца, ещё не разобранное моделью
};

export const SEND_I18N: Record<string, SendStrings> = {
  en: { devTitle: "Send this panel into development", devPlaceholder: "Describe what this control panel should ask and do…", devSubmit: "Send to development", devSending: "Sending…", devSaved: "Saved to the core — the model will read it as the task.", devFailed: "Could not save.", devPending: "Task waiting for development:" },
  es: { devTitle: "Enviar este panel a desarrollo", devPlaceholder: "Describe qué debe pedir y hacer este panel…", devSubmit: "Enviar a desarrollo", devSending: "Enviando…", devSaved: "Guardado en el núcleo: el modelo lo leerá como la tarea.", devFailed: "No se pudo guardar.", devPending: "Tarea pendiente de desarrollo:" },
  fr: { devTitle: "Envoyer ce panneau en développement", devPlaceholder: "Décrivez ce que ce panneau doit demander et faire…", devSubmit: "Envoyer en développement", devSending: "Envoi…", devSaved: "Enregistré dans le noyau : le modèle le lira comme la tâche.", devFailed: "Enregistrement impossible.", devPending: "Tâche en attente de développement :" },
  it: { devTitle: "Manda questo pannello in sviluppo", devPlaceholder: "Descrivi cosa deve chiedere e fare questo pannello…", devSubmit: "Manda in sviluppo", devSending: "Invio…", devSaved: "Salvato nel nucleo: il modello lo leggerà come compito.", devFailed: "Impossibile salvare.", devPending: "Compito in attesa di sviluppo:" },
  ru: { devTitle: "Отправить пульт в разработку", devPlaceholder: "Опишите, что этот пульт должен спрашивать и делать…", devSubmit: "Отправить в разработку", devSending: "Отправляю…", devSaved: "Сохранено в ядре — модель прочитает это как задание.", devFailed: "Не удалось сохранить.", devPending: "Задание ждёт разработки:" },
  de: { devTitle: "Dieses Pult in die Entwicklung geben", devPlaceholder: "Beschreibe, was dieses Pult fragen und tun soll…", devSubmit: "In die Entwicklung geben", devSending: "Senden…", devSaved: "Im Kern gespeichert — das Modell liest es als Aufgabe.", devFailed: "Speichern fehlgeschlagen.", devPending: "Aufgabe wartet auf Entwicklung:" },
  pt: { devTitle: "Enviar este painel para desenvolvimento", devPlaceholder: "Descreva o que este painel deve pedir e fazer…", devSubmit: "Enviar para desenvolvimento", devSending: "A enviar…", devSaved: "Guardado no núcleo — o modelo vai lê-lo como a tarefa.", devFailed: "Não foi possível guardar.", devPending: "Tarefa à espera de desenvolvimento:" },
  pl: { devTitle: "Wyślij ten pulpit do rozwoju", devPlaceholder: "Opisz, o co ten pulpit ma pytać i co ma robić…", devSubmit: "Wyślij do rozwoju", devSending: "Wysyłam…", devSaved: "Zapisano w rdzeniu — model odczyta to jako zadanie.", devFailed: "Nie udało się zapisać.", devPending: "Zadanie czeka na rozwój:" },
  tr: { devTitle: "Bu paneli geliştirmeye gönder", devPlaceholder: "Bu panelin ne sorması ve ne yapması gerektiğini yazın…", devSubmit: "Geliştirmeye gönder", devSending: "Gönderiliyor…", devSaved: "Çekirdeğe kaydedildi — model bunu görev olarak okuyacak.", devFailed: "Kaydedilemedi.", devPending: "Geliştirme bekleyen görev:" },
  nl: { devTitle: "Stuur dit paneel naar ontwikkeling", devPlaceholder: "Beschrijf wat dit paneel moet vragen en doen…", devSubmit: "Naar ontwikkeling sturen", devSending: "Versturen…", devSaved: "Opgeslagen in de kern — het model leest dit als de taak.", devFailed: "Opslaan mislukt.", devPending: "Taak wacht op ontwikkeling:" },
};

export const sendStrings = (lang: string): SendStrings => SEND_I18N[lang.slice(0, 2)] ?? SEND_I18N.en;

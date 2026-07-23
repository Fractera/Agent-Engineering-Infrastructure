// СЛОВАРЬ ФОРМЫ КЛЮЧЕЙ — десять языков (закон 4г), англ. фолбэк. Общий примитив, поэтому и словарь
// общий: форму ключей открывают и главное меню, и календарь, и всё, что появится дальше.
export type KeysStrings = {
  connect: string; // "{k}" — имя канала
  intro: string;
  save: string;
  cancel: string;
  saving: string;
  failed: string;
  optional: string;
  alreadySet: string;
  keepValue: string;
  missing: string; // "{k}" — сколько ключей не хватает
  noKeys: string;
};

export const KEYS_I18N: Record<string, KeysStrings> = {
  en: { connect: "Connect {k}", intro: "The channel works only once these are filled in. They are stored as project settings and are never shown again.", save: "Save and turn on", cancel: "Cancel", saving: "Saving…", failed: "The keys could not be saved.", optional: "optional", alreadySet: "already set", keepValue: "Leave empty to keep the current value.", missing: "{k} key(s) missing", noKeys: "This channel needs no keys." },
  es: { connect: "Conectar {k}", intro: "El canal funciona solo cuando estén rellenados. Se guardan como ajustes del proyecto y no se vuelven a mostrar.", save: "Guardar y activar", cancel: "Cancelar", saving: "Guardando…", failed: "No se han podido guardar las claves.", optional: "opcional", alreadySet: "ya configurada", keepValue: "Déjalo vacío para conservar el valor actual.", missing: "faltan {k} clave(s)", noKeys: "Este canal no necesita claves." },
  fr: { connect: "Connecter {k}", intro: "Le canal ne fonctionne qu'une fois ceci renseigné. Ces valeurs sont enregistrées comme réglages du projet et ne sont plus jamais affichées.", save: "Enregistrer et activer", cancel: "Annuler", saving: "Enregistrement…", failed: "Les clés n'ont pas pu être enregistrées.", optional: "facultatif", alreadySet: "déjà renseignée", keepValue: "Laissez vide pour conserver la valeur actuelle.", missing: "{k} clé(s) manquante(s)", noKeys: "Ce canal n'a besoin d'aucune clé." },
  it: { connect: "Collega {k}", intro: "Il canale funziona solo quando questi sono compilati. Vengono salvati come impostazioni del progetto e non vengono più mostrati.", save: "Salva e attiva", cancel: "Annulla", saving: "Salvataggio…", failed: "Non è stato possibile salvare le chiavi.", optional: "facoltativo", alreadySet: "già impostata", keepValue: "Lascia vuoto per mantenere il valore attuale.", missing: "mancano {k} chiave/i", noKeys: "Questo canale non richiede chiavi." },
  ru: { connect: "Подключить {k}", intro: "Канал заработает, только когда это заполнено. Значения хранятся как настройки проекта и больше никогда не показываются.", save: "Сохранить и включить", cancel: "Отмена", saving: "Сохраняю…", failed: "Сохранить ключи не удалось.", optional: "необязательно", alreadySet: "уже задан", keepValue: "Оставьте пустым, чтобы сохранить текущее значение.", missing: "не хватает ключей: {k}", noKeys: "Этому каналу ключи не нужны." },
  de: { connect: "{k} verbinden", intro: "Der Kanal arbeitet erst, wenn dies ausgefüllt ist. Die Werte werden als Projekteinstellungen gespeichert und nie wieder angezeigt.", save: "Speichern und einschalten", cancel: "Abbrechen", saving: "Speichern…", failed: "Die Schlüssel konnten nicht gespeichert werden.", optional: "optional", alreadySet: "bereits gesetzt", keepValue: "Leer lassen, um den aktuellen Wert zu behalten.", missing: "{k} Schlüssel fehlen", noKeys: "Dieser Kanal braucht keine Schlüssel." },
  pt: { connect: "Ligar {k}", intro: "O canal só funciona depois de isto preenchido. Os valores ficam como definições do projeto e nunca mais são mostrados.", save: "Guardar e ligar", cancel: "Cancelar", saving: "A guardar…", failed: "Não foi possível guardar as chaves.", optional: "opcional", alreadySet: "já definida", keepValue: "Deixe vazio para manter o valor atual.", missing: "faltam {k} chave(s)", noKeys: "Este canal não precisa de chaves." },
  pl: { connect: "Podłącz {k}", intro: "Kanał zadziała dopiero po wypełnieniu. Wartości są zapisywane jako ustawienia projektu i nigdy więcej nie są pokazywane.", save: "Zapisz i włącz", cancel: "Anuluj", saving: "Zapisywanie…", failed: "Nie udało się zapisać kluczy.", optional: "opcjonalne", alreadySet: "już ustawiony", keepValue: "Zostaw puste, aby zachować bieżącą wartość.", missing: "brakuje kluczy: {k}", noKeys: "Ten kanał nie potrzebuje kluczy." },
  tr: { connect: "{k} bağla", intro: "Kanal ancak bunlar doldurulunca çalışır. Değerler proje ayarı olarak saklanır ve bir daha gösterilmez.", save: "Kaydet ve aç", cancel: "İptal", saving: "Kaydediliyor…", failed: "Anahtarlar kaydedilemedi.", optional: "isteğe bağlı", alreadySet: "zaten ayarlı", keepValue: "Mevcut değeri korumak için boş bırakın.", missing: "{k} anahtar eksik", noKeys: "Bu kanal anahtar gerektirmiyor." },
  nl: { connect: "{k} verbinden", intro: "Het kanaal werkt pas als dit is ingevuld. De waarden worden als projectinstelling bewaard en nooit meer getoond.", save: "Opslaan en aanzetten", cancel: "Annuleren", saving: "Opslaan…", failed: "De sleutels konden niet worden opgeslagen.", optional: "optioneel", alreadySet: "al ingesteld", keepValue: "Laat leeg om de huidige waarde te behouden.", missing: "{k} sleutel(s) ontbreken", noKeys: "Dit kanaal heeft geen sleutels nodig." },
};

export const keysStrings = (lang: string): KeysStrings => KEYS_I18N[lang.slice(0, 2)] ?? KEYS_I18N.en;

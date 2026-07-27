// СЛОВАРЬ приветствия новорождённой автоматизации — десять языков (закон 4г), англ. фолбэк. Дев-слой.
//
// Шаг 302: строки переехали СЮДА из захардкоженного англ. `starters/stream/en/_components/shared/welcome.tsx`.
// Это builder-facing онбординг (обращён к СТРОИТЕЛЮ автоматизации, а не к конечному пользователю её продукта),
// поэтому по границе «кто смотрит» он КОКПИТ → десять языков в `_shared-v2`, а не одноязычная витрина стартера.
// Фраз в библиотеке v1 не было (welcome рождён в шаге 301 сразу хардкодом) — переведено заново.
export type WelcomeStrings = {
  title: string; // заголовок карточки
  body: string; // пояснение: пустой замороженный шаблон, оживает из кейсов
  cta: string; // призыв: открой кейсы ниже, заполни Quiz (заканчивается стрелкой ↓)
};

const I18N: Record<string, WelcomeStrings> = {
  en: { title: "Your automation is born — now describe it", body: "It is still an empty, frozen template: nothing runs and the canvas is bare. To bring it to life, describe how it should work in the use-cases below — the AI reads exactly those to build it.", cta: "Open the use-cases below and fill in the Quiz. ↓" },
  ru: { title: "Ваша автоматизация рождена — теперь опишите её", body: "Это пока пустой, замороженный шаблон: ничего не выполняется, холст пуст. Чтобы оживить её, опишите в пользовательских кейсах ниже, как она должна работать — ИИ читает именно их, чтобы её построить.", cta: "Откройте пользовательские кейсы ниже и заполните Quiz. ↓" },
  es: { title: "Tu automatización ha nacido — ahora descríbela", body: "Todavía es una plantilla vacía y congelada: nada se ejecuta y el lienzo está en blanco. Para darle vida, describe cómo debería funcionar en los casos de uso de abajo — la IA lee exactamente esos para construirla.", cta: "Abre los casos de uso de abajo y completa el Quiz. ↓" },
  fr: { title: "Votre automatisation est née — décrivez-la maintenant", body: "Ce n'est encore qu'un modèle vide et figé : rien ne s'exécute et le canevas est vierge. Pour lui donner vie, décrivez son fonctionnement dans les cas d'usage ci-dessous — l'IA lit précisément ceux-là pour la construire.", cta: "Ouvrez les cas d'usage ci-dessous et remplissez le Quiz. ↓" },
  it: { title: "La tua automazione è nata — ora descrivila", body: "È ancora un modello vuoto e congelato: non gira nulla e il canvas è vuoto. Per darle vita, descrivi come dovrebbe funzionare nei casi d'uso qui sotto — l'IA legge proprio quelli per costruirla.", cta: "Apri i casi d'uso qui sotto e compila il Quiz. ↓" },
  de: { title: "Deine Automatisierung ist geboren — jetzt beschreibe sie", body: "Es ist noch eine leere, eingefrorene Vorlage: nichts läuft und die Leinwand ist leer. Um sie zum Leben zu erwecken, beschreibe in den Anwendungsfällen unten, wie sie funktionieren soll — die KI liest genau diese, um sie zu bauen.", cta: "Öffne die Anwendungsfälle unten und fülle das Quiz aus. ↓" },
  pt: { title: "A sua automação nasceu — agora descreva-a", body: "Ainda é um modelo vazio e congelado: nada é executado e a tela está em branco. Para lhe dar vida, descreva como deve funcionar nos casos de uso abaixo — a IA lê exatamente esses para a construir.", cta: "Abra os casos de uso abaixo e preencha o Quiz. ↓" },
  pl: { title: "Twoja automatyzacja się narodziła — teraz ją opisz", body: "To wciąż pusty, zamrożony szablon: nic się nie wykonuje, a płótno jest puste. Aby ożywić automatyzację, opisz w przypadkach użycia poniżej, jak ma działać — SI czyta właśnie je, aby ją zbudować.", cta: "Otwórz przypadki użycia poniżej i wypełnij Quiz. ↓" },
  tr: { title: "Otomasyonunuz doğdu — şimdi onu tanımlayın", body: "Hâlâ boş, donmuş bir şablon: hiçbir şey çalışmıyor ve tuval boş. Ona hayat vermek için aşağıdaki kullanım senaryolarında nasıl çalışması gerektiğini anlatın — yapay zekâ onu inşa etmek için tam olarak bunları okur.", cta: "Aşağıdaki kullanım senaryolarını açın ve Quiz'i doldurun. ↓" },
  nl: { title: "Je automatisering is geboren — beschrijf haar nu", body: "Het is nog een leeg, bevroren sjabloon: er draait niets en het canvas is leeg. Om het tot leven te wekken, beschrijf in de use-cases hieronder hoe het moet werken — de AI leest precies die om het te bouwen.", cta: "Open de use-cases hieronder en vul de Quiz in. ↓" },
};

export function welcomeStrings(lang: string): WelcomeStrings {
  return I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;
}

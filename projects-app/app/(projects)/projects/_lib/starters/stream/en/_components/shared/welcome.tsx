// ПРИВЕТСТВИЕ НОВОРОЖДЁННОЙ АВТОМАТИЗАЦИИ (шаг 301). Показывается, пока автоматизация — только что
// созданный замороженный клон стартера БЕЗ единого пользовательского кейса: пустой холст, имя в шапке и
// это приглашение. Смысл — увести владельца в пользовательские кейсы: описание рождается там, в Quiz, и
// только из него ИИ понимает, что строить (закон `passport.md` §7: «нет кейса — нет узла»).
//
// 🔒 СТАРТЕР — ОДНОЯЗЫЧНЫЙ (английский), решение владельца: мультиязычность стартера убирается в шаге 302,
// где рождается по одному стартеру на язык (`starters/stream/<lang>/`). Поэтому здесь НЕ словарь на десять
// языков, а один английский текст. `lang` не читается намеренно.
export default function Welcome(_props: { lang: string }) {
  return (
    <section data-section="welcome" className="mt-6 rounded-xl border border-dashed bg-card/50 p-6 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Your automation is born — now describe it</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        It is still an empty, frozen template: nothing runs and the canvas is bare. To bring it to life,
        describe how it should work in the use-cases below — the AI reads exactly those to build it.
      </p>
      <p className="mt-3 text-sm font-medium text-foreground">Open the use-cases below and fill in the Quiz. ↓</p>
    </section>
  );
}

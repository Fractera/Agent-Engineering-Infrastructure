// Команды документа — серверный блок, один на все места (2026-08-10).
//
// ЗАЧЕМ ОДИН. Команды показываются в ДВУХ местах: на карте документов, где виден
// весь корпус, и на странице самого документа, куда человек приходит разбираться
// с ним конкретно. Владелец открыл вкладку «Единственный агент» и не нашёл там
// команды — потому что она жила только на карте. Две копии этой разметки
// разъехались бы через месяц, поэтому здесь она одна.
//
// Серверный: строки приходят уже разрешёнными, в браузер уезжает только островок
// правки одной фразы.

import { COMMAND_ANCHOR, verbsOf, type CommandMap, type CommandVerb } from "@/lib/instruction-set";
import { CommandEditor, type CommandLabels } from "./command-editor.client";

export type CommandBlockLabels = CommandLabels & {
  /** Подпись глагола: «активировать», «добавить», «найти», «изменить». */
  verbs: Record<CommandVerb, string>;
};

export function DocCommands(
  { docKey, lang, commands, labels }:
  { docKey: string; lang: string; commands: CommandMap; labels: CommandBlockLabels },
) {
  const verbs = verbsOf(commands, docKey);
  if (!verbs.length) return null;

  return (
    <div className="space-y-1">
      {verbs.map((verb) => {
        const phrases = commands[docKey]?.[verb] ?? {};
        const phrase = phrases[lang] ?? phrases.en ?? Object.values(phrases)[0] ?? "";
        if (!phrase) return null;
        return (
          <CommandEditor
            key={verb}
            docKey={docKey}
            verb={verb}
            lang={lang}
            anchor={COMMAND_ANCHOR}
            phrase={phrase}
            labels={{ ...labels, caption: labels.verbs[verb] }}
          />
        );
      })}
    </div>
  );
}

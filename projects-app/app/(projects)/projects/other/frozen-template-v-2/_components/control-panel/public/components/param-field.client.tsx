"use client";

import { useRef } from "react";
import type { Param } from "../../params";
import { controlPanelStrings, pick } from "../../i18n";
import VoiceInput from "../../../shared/voice-input.client";

// ОДНО ПОЛЕ ФОРМЫ, нарисованное по своему объявленному типу. Общий компонент публичной половины: любой
// пульт вкладки рисует свои поля им, поэтому поля выглядят одинаково во всех пультах.
export default function ParamField({
  param,
  value,
  onChange,
  lang,
}: {
  param: Param;
  value: string;
  onChange: (v: string) => void;
  lang: string;
}) {
  const L = controlPanelStrings(lang);
  const label = pick(param.label, lang) || param.key;
  const placeholder = pick(param.placeholder, lang);
  // длинное поле занимает всю ширину сетки, короткое — одну колонку
  const wide = param.type === "longtext" ? "md:col-span-2" : "";
  // Голос подключается К ПОЛЮ: примитив знает ссылку на поле, поэтому речь встаёт по курсору. Числовому
  // полю микрофон не нужен — диктовать цифры в него смысла нет.
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const voice = param.type !== "number";

  return (
    <label className={`space-y-1 ${wide}`}>
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {label}
        <span className="text-[10px] uppercase tracking-wide opacity-70">
          {param.required ? L.required : L.optional}
        </span>
      </span>
      {param.type === "longtext" ? (
        <textarea
          ref={areaRef}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-20 w-full resize-y rounded-md border bg-transparent p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <input
          ref={inputRef}
          type={param.type === "number" ? "number" : "text"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      )}
      {voice ? (
        <VoiceInput
          targetRef={param.type === "longtext" ? areaRef : inputRef}
          value={value}
          onChange={onChange}
          lang={lang}
        />
      ) : null}
    </label>
  );
}

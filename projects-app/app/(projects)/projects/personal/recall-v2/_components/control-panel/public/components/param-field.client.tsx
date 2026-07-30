"use client";

import { useId, useRef } from "react";
import type { Param } from "../../params";
import { controlPanelStrings, pick } from "../../i18n";
import VoiceInput from "../../../tools/voice-input/client/voice-input.client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  const fieldId = useId();

  return (
    <div className={cn("space-y-1", wide)}>
      <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
        {label}
        <span className="text-[10px] uppercase tracking-wide opacity-70">
          {param.required ? L.required : L.optional}
        </span>
      </Label>
      {param.type === "longtext" ? (
        <Textarea
          ref={areaRef}
          id={fieldId}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-20 resize-y"
        />
      ) : (
        <Input
          ref={inputRef}
          id={fieldId}
          type={param.type === "number" ? "number" : "text"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
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
    </div>
  );
}

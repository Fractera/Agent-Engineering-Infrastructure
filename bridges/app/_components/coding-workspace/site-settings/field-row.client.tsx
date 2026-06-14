"use client";

import { Input } from "@/components/ui/input";
import type { Field } from "./fields";
import { ImageField } from "./image-field.client";
import { IconsField } from "./icons-field.client";
import type { IconSet } from "./upload";

// Render one config field by type. `value` is the current value at the field's path; `onChange`
// writes the new value back to the panel's working config (the panel owns the nested set).

export function FieldRow({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const labelEl = (
    <div className="flex flex-col">
      <span className="text-[11px] text-foreground">{field.label}</span>
      {field.hint && <span className="text-[9px] text-muted-foreground">{field.hint}</span>}
    </div>
  );

  if (field.type === "image") {
    return (
      <div className="flex flex-col gap-1.5">
        {labelEl}
        <ImageField label={field.label} value={(value as string) ?? null} crop={field.crop} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "icons") {
    return (
      <div className="flex flex-col gap-1.5">
        {labelEl}
        <IconsField value={(value as IconSet) ?? null} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "switch") {
    const on = value === true;
    return (
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        {labelEl}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(!on)}
          className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 size-3 rounded-full bg-background transition-all ${on ? "left-3.5" : "left-0.5"}`} />
        </button>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div className="flex items-center justify-between gap-3">
        {labelEl}
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 rounded-md border border-border bg-muted px-2 text-[11px] text-foreground focus:outline-none"
        >
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="flex flex-col gap-1">
        {labelEl}
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className="rounded-md border border-border bg-muted px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none font-mono resize-y"
        />
      </div>
    );
  }

  const isNumber = field.type === "number";
  return (
    <div className="flex flex-col gap-1">
      {labelEl}
      <Input
        type={isNumber ? "number" : "text"}
        value={value === undefined || value === null ? "" : String(value)}
        placeholder={field.placeholder}
        onChange={(e) => {
          const v = e.target.value;
          onChange(isNumber ? (v === "" ? undefined : Number(v)) : v);
        }}
        className="text-[11px] font-mono"
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Copy, CheckCheck, CloudUpload, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getZIndexStyle } from '@/config/ui/z-index.config';
import { upsertFooterPageContent } from '@features/footer/upsert-footer-page-content';
// ADAPTED: the reference imports a client-safe `appConfig` object. Our live app-config is a
// server-only on-disk file (config/app-config.ts uses fs). This dialog is a client component,
// so it reads the client-safe committed defaults. (Owner customizations from Site Settings are
// not reflected in the generated instruction text — acceptable for this architect content-gen
// tool; could be threaded as props from the server footer entry later.)
import { DEFAULT_APP_CONFIG as appConfig } from '@/config/app-config.defaults';
import { ALL_LANGUAGE_METADATA } from '@/config/translations/language-metadata';

type AiResponse = {
  title: string;
  titleSuggestion: string;
  descriptionSuggestion: string;
  content: string;
  suggestedPath: string;
};

type ValidationResult =
  | { ok: true; data: AiResponse }
  | { ok: false; errors: string[] };

function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

function validate(raw: string): ValidationResult {
  let parsed: unknown;
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${(e as Error).message}`] };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, errors: ['Root must be a JSON object {}'] };
  }

  const obj = parsed as Record<string, unknown>;
  const errors: string[] = [];

  // Проверяем наличие и тип всех полей
  for (const key of ['title', 'titleSuggestion', 'descriptionSuggestion', 'content', 'suggestedPath'] as const) {
    if (typeof obj[key] !== 'string' || !(obj[key] as string).trim()) {
      errors.push(`Field "${key}" is missing or empty`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const title = obj.title as string;
  const titleSuggestion = obj.titleSuggestion as string;
  const descriptionSuggestion = obj.descriptionSuggestion as string;
  const content = obj.content as string;
  const suggestedPath = (obj.suggestedPath as string).trim();

  // title — должен быть чистым текстом без HTML тегов
  if (/<[^>]+>/.test(title)) {
    errors.push(`"title" must be plain text without HTML tags. Got: "${title.slice(0, 60)}..." — remove all <h1>, <b> and other tags`);
  }

  // titleSuggestion — не должен содержать теги
  if (/<[^>]+>/.test(titleSuggestion)) {
    errors.push(`"titleSuggestion" must be plain text without HTML tags`);
  }

  // descriptionSuggestion — не должен содержать теги, длина 80-200 символов
  if (/<[^>]+>/.test(descriptionSuggestion)) {
    errors.push(`"descriptionSuggestion" must be plain text without HTML tags`);
  }
  if (descriptionSuggestion.length < 80) {
    errors.push(`"descriptionSuggestion" is too short (${descriptionSuggestion.length} chars). Minimum 80 characters`);
  }
  if (descriptionSuggestion.length > 200) {
    errors.push(`"descriptionSuggestion" is too long (${descriptionSuggestion.length} chars). Maximum 200 characters`);
  }

  // content — должен содержать HTML теги (это тело страницы)
  if (!/<[^>]+>/.test(content)) {
    errors.push(`"content" must contain HTML markup (h2, p, ul, etc.)`);
  }
  // content не должен содержать <h1>
  if (/<h1[\s>]/i.test(content)) {
    errors.push(`"content" must NOT contain <h1> tag — the page title goes in "title" field`);
  }

  // suggestedPath — должен начинаться с "footer-", только lowercase + дефисы, без пробелов и слешей
  if (!suggestedPath.startsWith('footer-')) {
    errors.push(`"suggestedPath" must start with "footer-" (e.g. "footer-privacy", "footer-terms"). Got: "${suggestedPath}"`);
  }
  if (!/^footer-[a-z0-9]+(-[a-z0-9]+)*$/.test(suggestedPath)) {
    errors.push(`"suggestedPath" must be lowercase letters, digits and hyphens only, no spaces or slashes (e.g. "footer-privacy-policy"). Got: "${suggestedPath}"`);
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      title: stripTags(title),
      titleSuggestion: stripTags(titleSuggestion),
      descriptionSuggestion: stripTags(descriptionSuggestion),
      content,
      suggestedPath,
    },
  };
}

export function buildFooterPageInstruction(params: {
  lang: string;
  pageLabel: string;
  pagePath: string;
  existingContent?: string;
  customInstructions?: string;
}): string {
  const { lang, pageLabel, pagePath, existingContent, customInstructions } = params;
  const meta = ALL_LANGUAGE_METADATA[lang];
  const langName = meta?.englishName ?? lang.toUpperCase();
  const langNative = meta?.nativeName ?? lang;

  const projectData = [
    `- Project name: ${appConfig.name}`,
    appConfig.description ? `- Project description: ${appConfig.description}` : null,
    `- Website URL: ${appConfig.url}`,
    appConfig.author?.name ? `- Author / company: ${appConfig.author.name}` : null,
    appConfig.author?.email ? `- Contact email: ${appConfig.author.email}` : null,
    appConfig.seo?.social?.twitter ? `- Twitter: ${appConfig.seo.social.twitter}` : null,
  ].filter(Boolean).join('\n');

  const existingBlock = existingContent?.trim()
    ? `\nExisting content to translate/improve (do not generate from scratch):\n${existingContent.trim()}\n`
    : '';

  const customBlock = customInstructions?.trim()
    ? `\n---\n\n## ⚠️ CUSTOM INSTRUCTIONS FROM USER — MANDATORY, apply during content generation\n\n${customInstructions.trim()}\n`
    : '';

  return `## PART 1 — Introduction

You are an AI assistant creating a professional service page for a website footer.
The page must be text-only: no images, no decorative elements, no navigation links.

Project: ${appConfig.name}
${projectData}

Page to create:
- Label: ${pageLabel}
- URL: ${pagePath}
- Language: ${langName} (${langNative})
${existingBlock}
---

## PART 2 — Output format

Respond ONLY with a single \`\`\`json code block containing exactly 5 fields:

\`\`\`json
{
  "title": "...",
  "titleSuggestion": "...",
  "descriptionSuggestion": "...",
  "content": "...",
  "suggestedPath": "..."
}
\`\`\`

Nothing before or after the code block.

---

## PART 3 — Correct example (abbreviated)

\`\`\`json
{
  "title": "Privacy Policy",
  "titleSuggestion": "Privacy Policy | ${appConfig.name}",
  "descriptionSuggestion": "Learn how ${appConfig.name} collects, uses and protects your personal data in compliance with applicable privacy laws.",
  "content": "<h2>Data We Collect</h2>\\n<p>We collect only the data necessary...</p>\\n<h2>Your Rights</h2>\\n<ul><li>Access your data</li><li>Request deletion</li></ul>",
  "suggestedPath": "footer-privacy-policy"
}
\`\`\`

---

## PART 4 — Incorrect example (abbreviated)

\`\`\`json
{
  "title": "<h1>Privacy Policy</h1>",
  "titleSuggestion": "",
  "descriptionSuggestion": "Short.",
  "content": "## Data We Collect\\nJust plain text with no HTML tags.",
  "suggestedPath": "/privacy-policy"
}
\`\`\`

Errors in the above: title has HTML tags, titleSuggestion is empty, descriptionSuggestion is too short, content has markdown instead of HTML, suggestedPath starts with "/" instead of "footer-" and contains a slash.

---

## PART 5 — Content instructions

- Language: ${langName} (${langNative}) — use natural native phrasing, not word-for-word translations
- Tone: professional, clear, trustworthy
- Length: 200–600 words
- Use real project data (name, URL, contacts) — no placeholders like [Company Name]
- If existing content is provided above — translate it to ${langName} without asking questions
- If you need clarification — ask briefly, then offer: "Say 'generate' to proceed with what I have"

Field rules:
- "title" — page heading, plain text only, no HTML tags, no markdown
- "titleSuggestion" — browser tab title, format: "Page Name | ${appConfig.name}"
- "descriptionSuggestion" — meta description, 80–200 characters, plain text only
- "content" — full page body, must use HTML tags (h2, h3, p, ul, li, strong, em), must NOT contain <h1>
- "suggestedPath" — URL slug for the page route. Rules:
  - MUST start with "footer-" (this prefix prevents conflicts with other site pages)
  - Only lowercase letters, digits, and hyphens — no slashes, no spaces, no uppercase
  - ✅ CORRECT: "footer-privacy-policy", "footer-terms", "footer-about-us", "footer-contact"
  - ❌ WRONG: "/footer-privacy" (has slash), "footer_privacy" (has underscore), "privacy-policy" (missing prefix), "Footer-Privacy" (uppercase)

---

## PART 6 — Self-validation checklist (verify before responding)

- [ ] Response is a single \`\`\`json code block — nothing outside it
- [ ] JSON is valid: no trailing commas, no comments, all strings properly escaped
- [ ] All 4 fields present and non-empty
- [ ] "title" — zero HTML tags, zero markdown symbols
- [ ] "titleSuggestion" — plain text, ends with "| ${appConfig.name}"
- [ ] "descriptionSuggestion" — plain text, length 80–200 characters (count carefully)
- [ ] "content" — contains HTML tags, does NOT contain <h1>
- [ ] "suggestedPath" — starts with "footer-", lowercase + hyphens only, no slashes, no spaces
- [ ] All text is in ${langName} — no English except brand names or technical terms (API, URL, FAQ)
- [ ] No placeholder brackets anywhere${customBlock}`;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lang: string;
  pageLabel: string;
  pagePath: string;
  routeId: string;
  existingContent?: string;
  onSaved: (data: AiResponse) => void;
};

export function FooterPageInstructionDialog({
  open,
  onOpenChange,
  lang,
  pageLabel,
  pagePath,
  routeId,
  existingContent,
  onSaved,
}: Props) {
  const meta = ALL_LANGUAGE_METADATA[lang];
  const langName = meta?.englishName ?? lang.toUpperCase();
  const flag = meta?.flag ?? '🌐';

  const [customInstructions, setCustomInstructions] = useState('');

  const instruction = buildFooterPageInstruction({ lang, pageLabel, pagePath, existingContent, customInstructions });

  const [copied, setCopied] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [answer, setAnswer] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [errorCopied, setErrorCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setUnlocked(false);
      setAnswer('');
      setErrors([]);
      setCustomInstructions('');
    }
  }, [open]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(instruction);
    setCopied(true);
    setUnlocked(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setErrors([]);
    const result = validate(answer);
    if (!result.ok) { setErrors(result.errors); return; }

    setSaving(true);
    const res = await upsertFooterPageContent({
      routeId,
      lang,
      title: result.data.title,
      description: result.data.descriptionSuggestion,
      content: result.data.content,
      suggestedPath: result.data.suggestedPath,
    });
    setSaving(false);

    if (!res.success) { setErrors([res.error ?? 'Save failed']); return; }
    onSaved(result.data);
    onOpenChange(false);
  };

  const handleCopyErrors = async () => {
    const errorList = errors.map((e, i) => `${i + 1}. ${e}`).join('\n');
    const text = `Your previous response has ${errors.length} validation error${errors.length > 1 ? 's' : ''} and was rejected. Please fix all errors and respond again with a corrected JSON block.

ERRORS FOUND:
${errorList}

REMINDER — correct field rules:
- "title": plain text only, no HTML tags, no markdown (e.g. "Privacy Policy")
- "titleSuggestion": plain text, format "Page Name | ${appConfig.name}" (e.g. "${pageLabel} | ${appConfig.name}")
- "descriptionSuggestion": plain text, 80–200 characters, no HTML (count characters carefully)
- "content": HTML markup required (h2, p, ul, li, etc.), <h1> tag is FORBIDDEN

Respond ONLY with the corrected \`\`\`json code block. Nothing else.`;
    await navigator.clipboard.writeText(text);
    setErrorCopied(true);
    setTimeout(() => setErrorCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[560px] max-w-[560px]"
        style={{
          height: '640px',
          maxHeight: '640px',
          display: 'flex',
          flexDirection: 'column',
          ...getZIndexStyle('TRANSLATE_INSTRUCTION_DIALOG'),
        }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{flag} Generate page — {langName}</DialogTitle>
          <DialogDescription>
            Use your preferred AI model to generate this page. Copy the instruction, paste it into the AI chat, then paste the JSON response below.
          </DialogDescription>
        </DialogHeader>

        <div className="h-px bg-border shrink-0" />

        <div className="flex-1 overflow-y-auto min-h-0">
          <pre className="text-[11px] leading-relaxed text-foreground whitespace-pre-wrap font-mono bg-muted/40 rounded p-3">
            {instruction}
          </pre>
        </div>

        <div className="h-px bg-border shrink-0" />

        <div className="shrink-0 flex flex-col gap-2 pt-2">
          <textarea
            value={customInstructions}
            onChange={(e) => { setCustomInstructions(e.target.value); setCopied(false); setUnlocked(false); }}
            placeholder="Optional: describe how you want to customize this page — specific tone, sections to add or remove, legal requirements, brand voice, etc. This will be added to the instruction as mandatory custom requirements."
            rows={3}
            className="w-full rounded-md border border-input bg-background text-xs px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-colors text-foreground placeholder:text-muted-foreground"
          />

          <Button className="w-full" onClick={handleCopy}>
            {copied ? <><CheckCheck className="size-4" /> Copied!</> : <><Copy className="size-4" /> Copy instruction</>}
          </Button>

          <textarea
            disabled={!unlocked}
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setErrors([]); }}
            placeholder={unlocked ? 'Paste the AI response here (plain JSON or ```json block)…' : 'Copy the instruction first to unlock this field'}
            rows={4}
            className={`w-full rounded-md border text-xs font-mono px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-colors ${
              unlocked ? 'bg-background border-input text-foreground' : 'bg-muted/30 border-border text-muted-foreground cursor-not-allowed'
            } ${errors.length > 0 ? 'border-red-400 focus:ring-red-400' : ''}`}
          />

          {errors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-red-700">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span className="text-xs font-medium">Validation failed ({errors.length} error{errors.length > 1 ? 's' : ''})</span>
                </div>
                <button type="button" onClick={handleCopyErrors} className="shrink-0 flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 transition-colors">
                  {errorCopied ? <CheckCheck className="size-3" /> : <Copy className="size-3" />}
                  {errorCopied ? 'Copied' : 'Copy errors'}
                </button>
              </div>
              <ul className="flex flex-col gap-0.5">
                {errors.map((err, i) => (
                  <li key={i} className="text-[11px] text-red-700 font-mono leading-snug">{i + 1}. {err}</li>
                ))}
              </ul>
            </div>
          )}

          <Button className="w-full" disabled={!unlocked || !answer.trim() || saving} onClick={handleSave}>
            <CloudUpload className="size-4" />
            {saving ? 'Saving…' : 'Save page'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { Loader2, ExternalLink, Sparkles } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getZIndexStyle } from '@/config/ui/z-index.config';
import { FooterPageInstructionDialog } from '@/components/footer/footer-page-instruction-dialog.client';
import { SUPPORTED_LANGUAGES } from '@/config/translations/translations.config';
import { ALL_LANGUAGE_METADATA } from '@/config/translations/language-metadata';
import type { FooterLinkData } from '@features/footer/get-footer-links-action';
import { useFooterTranslation, FOOTER_TRANSLATIONS_EN } from '../_translations/get-footer-translation';
import type { FooterTranslations } from '../_translations/footer-enum.translations';

type LinkFormState = { label: string; path: string };

function slugify(label: string): string {
  return 'footer-' + label
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'page';
}

// ── Add dialog ───────────────────────────────────────────────

type AddDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: LinkFormState;
  onFormChange: (f: LinkFormState) => void;
  error: string;
  saving: boolean;
  onAdd: () => void;
  translations?: FooterTranslations;
};

export function FooterAddDialog({ open, onOpenChange, form, onFormChange, error, saving, onAdd, translations }: AddDialogProps) {
  const t = useFooterTranslation(translations ?? FOOTER_TRANSLATIONS_EN);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" style={getZIndexStyle('FOOTER_MENU_DIALOG')}>
        <DialogHeader>
          <DialogTitle>{t("footer.add_page")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="add-label">{t("footer.label")}</Label>
            <Input
              id="add-label"
              value={form.label}
              onChange={(e) => onFormChange({ ...form, label: e.target.value })}
              placeholder="Privacy Policy"
            />
            {form.label.trim() && (
              <p className="text-[11px] text-muted-foreground">Path: <span className="font-mono">{slugify(form.label.trim())}</span></p>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t("footer.cancel")}</Button>
            <Button size="sm" onClick={onAdd} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : t("footer.add")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit dialog ──────────────────────────────────────────────

type EditDialogProps = {
  editLink: FooterLinkData | null;
  onClose: () => void;
  form: LinkFormState;
  onFormChange: (f: LinkFormState) => void;
  error: string;
  saving: boolean;
  onSave: () => void;
  content: string;
  description: string;
  contentLoading: boolean;
  contentSaving: boolean;
  onContentChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSaveContent: () => void;
  useRedirect: boolean;
  redirectPath: string;
  redirectSaving: boolean;
  onToggleRedirect: () => void;
  onRedirectPathChange: (v: string) => void;
  onSaveRedirect: (use: boolean, path: string) => void;
  instructionLang: string | null;
  onSetInstructionLang: (l: string | null) => void;
  onInstructionSaved: (data: { content: string; descriptionSuggestion: string; suggestedPath: string }) => void;
  lang: string;
  translations?: FooterTranslations;
};

export function FooterEditDialog({
  editLink, onClose, form, onFormChange, error, saving, onSave,
  content, description, contentLoading, contentSaving,
  onContentChange, onDescriptionChange, onSaveContent,
  useRedirect, redirectPath, redirectSaving,
  onToggleRedirect, onRedirectPathChange, onSaveRedirect,
  instructionLang, onSetInstructionLang, onInstructionSaved, translations,
}: EditDialogProps) {
  const t = useFooterTranslation(translations ?? FOOTER_TRANSLATIONS_EN);
  return (
    <>
      <Dialog open={!!editLink} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-lg" style={getZIndexStyle('FOOTER_MENU_DIALOG')}>
          <DialogHeader>
            <DialogTitle>{t("footer.edit_page")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label htmlFor="edit-label">{t("footer.label")}</Label>
              <Input
                id="edit-label"
                value={form.label}
                onChange={(e) => onFormChange({ ...form, label: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">Path: <span className="font-mono">{form.path}</span></p>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>{t("footer.cancel")}</Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : t("footer.save")}
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <button
                type="button"
                onClick={onToggleRedirect}
                className="flex items-center gap-2 text-sm w-full text-left"
                disabled={redirectSaving}
              >
                <div className={`relative w-8 h-4 rounded-full transition-colors ${useRedirect ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${useRedirect ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <ExternalLink size={13} className="text-muted-foreground" />
                <span className="text-muted-foreground">{t("footer.use_redirect")}</span>
                {redirectSaving && <Loader2 size={12} className="animate-spin text-muted-foreground ml-auto" />}
              </button>

              {useRedirect && (
                <div className="space-y-1.5">
                  <Input
                    value={redirectPath}
                    onChange={(e) => onRedirectPathChange(e.target.value)}
                    placeholder="/existing-page  (e.g. /footer-privacy)"
                  />
                  <Button
                    size="sm" variant="outline" className="w-full"
                    onClick={() => onSaveRedirect(true, redirectPath)}
                    disabled={redirectSaving || !redirectPath.trim()}
                  >
                    {redirectSaving ? <Loader2 size={14} className="animate-spin" /> : t("footer.save_redirect")}
                  </Button>
                </div>
              )}
            </div>

            {!useRedirect && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("footer.ai_hint")}
                  </p>
                  {contentLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="edit-content">{t("footer.page_content_html")}</Label>
                      <textarea
                        id="edit-content"
                        value={content}
                        onChange={(e) => onContentChange(e.target.value)}
                        rows={6}
                        placeholder="<h2>Section</h2><p>Content...</p>"
                        className="w-full rounded-md border border-input bg-background text-xs font-mono px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_LANGUAGES.map((l) => {
                      const meta = ALL_LANGUAGE_METADATA[l];
                      return (
                        <Button
                          key={l} variant="outline" size="sm"
                          className="gap-1 text-xs h-7 px-2"
                          onClick={() => onSetInstructionLang(l)}
                          disabled={!editLink?.routeId}
                        >
                          {meta?.flag ?? '🌐'} {meta?.englishName ?? l.toUpperCase()}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    size="sm" className="w-full"
                    onClick={onSaveContent}
                    disabled={contentSaving || contentLoading}
                  >
                    {contentSaving ? <Loader2 size={14} className="animate-spin" /> : t("footer.save_content")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {editLink?.routeId && instructionLang && (
        <FooterPageInstructionDialog
          open={!!instructionLang}
          onOpenChange={(v) => { if (!v) onSetInstructionLang(null); }}
          lang={instructionLang}
          pageLabel={editLink.label}
          pagePath={editLink.path}
          routeId={editLink.routeId}
          existingContent={content}
          onSaved={onInstructionSaved}
        />
      )}
    </>
  );
}

// ── Delete dialog ────────────────────────────────────────────

type DeleteDialogProps = {
  deleteLink: FooterLinkData | null;
  onClose: () => void;
  saving: boolean;
  onDelete: () => void;
  translations?: FooterTranslations;
};

export function FooterDeleteDialog({ deleteLink, onClose, saving, onDelete, translations }: DeleteDialogProps) {
  const t = useFooterTranslation(translations ?? FOOTER_TRANSLATIONS_EN);
  return (
    <Dialog open={!!deleteLink} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm" style={getZIndexStyle('FOOTER_MENU_DIALOG')}>
        <DialogHeader>
          <DialogTitle>{t("footer.delete_page")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-2">
          {t("footer.delete_page")} <span className="font-medium text-foreground">{deleteLink?.label || deleteLink?.path}</span>?
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>{t("footer.cancel")}</Button>
          <Button variant="destructive" size="sm" onClick={onDelete} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : t("footer.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


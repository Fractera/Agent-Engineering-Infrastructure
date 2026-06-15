'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getZIndexStyle } from '@/config/ui/z-index.config';
import { getFooterLinksAction, type FooterLinkData } from '@features/footer/get-footer-links-action';
import { getMenuCategoriesAction } from '@features/route/get-menu-categories-action';
import { createFooterLink } from '@features/footer/create-footer-link';
import { updateFooterLink } from '@features/footer/update-footer-link';
import { deleteMenuCategory } from '@features/route/delete-menu-category';
import { reorderMenuCategories } from '@features/route/reorder-menu-categories';
import { getFooterPageContent } from '@features/footer/get-footer-page-content';
import { upsertFooterPageContent } from '@features/footer/upsert-footer-page-content';
import { upsertFooterPageRedirect } from '@features/footer/upsert-footer-page-redirect';
import type { MenuCategory } from '@/lib/types/menu-category';
import { FooterMenuList } from './footer-menu-list.client';
import { FooterAddDialog, FooterEditDialog, FooterDeleteDialog } from './footer-menu-dialogs.client';
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: string;
  translations?: FooterTranslations;
};

export function FooterMenuDialog({ open, onOpenChange, lang, translations }: Props) {
  const t = useFooterTranslation(translations ?? FOOTER_TRANSLATIONS_EN);
  const router = useRouter();
  const langRef = useRef(lang);
  langRef.current = lang;

  const [links, setLinks] = useState<FooterLinkData[]>([]);
  const [allCategories, setAllCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<LinkFormState>({ label: '', path: '' });
  const [addError, setAddError] = useState('');

  const [editLink, setEditLink] = useState<FooterLinkData | null>(null);
  const [editForm, setEditForm] = useState<LinkFormState>({ label: '', path: '' });
  const [editError, setEditError] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContentLoading, setEditContentLoading] = useState(false);
  const [editContentSaving, setEditContentSaving] = useState(false);
  const [editUseRedirect, setEditUseRedirect] = useState(false);
  const [editRedirectPath, setEditRedirectPath] = useState('');
  const [editRedirectSaving, setEditRedirectSaving] = useState(false);
  const [instructionLang, setInstructionLang] = useState<string | null>(null);

  const [deleteLink, setDeleteLink] = useState<FooterLinkData | null>(null);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  async function reload() {
    setLoading(true);
    const [data, cats] = await Promise.all([
      getFooterLinksAction(langRef.current),
      getMenuCategoriesAction('footer'),
    ]);
    setLinks(data);
    setAllCategories(cats);
    setLoading(false);
  }

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reload();
    wasOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleAdd() {
    if (!addForm.label.trim()) { setAddError('Label is required'); return; }
    const path = slugify(addForm.label.trim());
    setSaving(true);
    const res = await createFooterLink({ label: addForm.label.trim(), path, lang: langRef.current });
    setSaving(false);
    if (!res.success) { setAddError(res.error ?? 'Error'); return; }
    setAddOpen(false);
    await reload();
  }

  async function openEdit(link: FooterLinkData) {
    setEditLink(link);
    setEditForm({ label: link.label, path: link.path });
    setEditError('');
    setEditContent('');
    setEditDescription('');
    setEditUseRedirect(false);
    setEditRedirectPath('');
    if (link.routeId) {
      setEditContentLoading(true);
      const existing = await getFooterPageContent(link.routeId, langRef.current);
      setEditContent(existing?.content ?? '');
      setEditDescription(existing?.description ?? '');
      setEditUseRedirect(existing?.useRedirect ?? false);
      setEditRedirectPath(existing?.redirectPath ?? '');
      setEditContentLoading(false);
    }
  }

  async function handleSaveRedirect(useRedirect: boolean, redirectPath: string) {
    if (!editLink?.routeId) return;
    setEditRedirectSaving(true);
    await upsertFooterPageRedirect({ routeId: editLink.routeId, lang: langRef.current, useRedirect, redirectPath: redirectPath.trim() || null });
    setEditRedirectSaving(false);
  }

  async function handleSaveContent() {
    if (!editLink?.routeId) return;
    setEditContentSaving(true);
    await upsertFooterPageContent({ routeId: editLink.routeId, lang: langRef.current, title: editForm.label, description: editDescription, content: editContent });
    setEditContentSaving(false);
  }

  async function handleEdit() {
    if (!editLink || !editForm.label.trim()) { setEditError('Label is required'); return; }
    setSaving(true);
    const res = await updateFooterLink({ categoryId: editLink.categoryId, routeId: editLink.routeId, label: editForm.label.trim(), path: editForm.path.trim(), lang: langRef.current });
    setSaving(false);
    if (!res.success) { setEditError(res.error ?? 'Error'); return; }
    setEditLink(null);
    await reload();
  }

  async function handleDelete() {
    if (!deleteLink) return;
    setSaving(true);
    await deleteMenuCategory(deleteLink.categoryId, 'footer');
    setSaving(false);
    setDeleteLink(null);
    await reload();
  }

  async function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...links];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setLinks(reordered);
    setDragIdx(null);
    setDragOverIdx(null);
    await reorderMenuCategories(reordered.map((l) => l.categoryId), 'footer');
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-md flex flex-col gap-0 p-0"
          style={{ height: '550px', maxHeight: '550px', ...getZIndexStyle('FOOTER_MENU_DIALOG') }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{t("footer.footer_pages")}</DialogTitle>
          </DialogHeader>
          <Separator className="shrink-0" />
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-3">
              <FooterMenuList
                links={links}
                loading={loading}
                dragOverIdx={dragOverIdx}
                onEdit={openEdit}
                onDelete={setDeleteLink}
                onDragStart={setDragIdx}
                onDragOver={(e, idx) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDrop={handleDrop}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              />
            </div>
          </ScrollArea>
          <Separator className="shrink-0" />
          <div className="px-4 py-3 shrink-0 flex flex-col gap-2">
            <Button variant="outline" className="w-full gap-1.5" onClick={() => { setAddForm({ label: '', path: '' }); setAddError(''); setAddOpen(true); }}>
              <Plus size={14} />
              {t("footer.add_page")}
            </Button>
            <Button
              variant="outline" className="w-full gap-1.5"
              onClick={() => { onOpenChange(false); router.push(`/${lang}/end-coding?slot=footer`); }}
            >
              <Sparkles size={14} />
              {t("footer.add_page_ai")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FooterAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        form={addForm}
        onFormChange={setAddForm}
        error={addError}
        saving={saving}
        onAdd={handleAdd}
        translations={translations ?? FOOTER_TRANSLATIONS_EN}
      />

      <FooterEditDialog
        editLink={editLink}
        onClose={() => setEditLink(null)}
        form={editForm}
        onFormChange={setEditForm}
        error={editError}
        saving={saving}
        onSave={handleEdit}
        content={editContent}
        description={editDescription}
        contentLoading={editContentLoading}
        contentSaving={editContentSaving}
        onContentChange={setEditContent}
        onDescriptionChange={setEditDescription}
        onSaveContent={handleSaveContent}
        useRedirect={editUseRedirect}
        redirectPath={editRedirectPath}
        redirectSaving={editRedirectSaving}
        onToggleRedirect={() => { const next = !editUseRedirect; setEditUseRedirect(next); if (!next) handleSaveRedirect(false, editRedirectPath); }}
        onRedirectPathChange={setEditRedirectPath}
        onSaveRedirect={handleSaveRedirect}
        instructionLang={instructionLang}
        onSetInstructionLang={setInstructionLang}
        onInstructionSaved={async (data) => {
          setEditContent(data.content);
          setEditDescription(data.descriptionSuggestion);
          setEditForm((f) => ({ ...f, path: data.suggestedPath }));
          setInstructionLang(null);
          if (editLink) {
            await updateFooterLink({ categoryId: editLink.categoryId, routeId: editLink.routeId, label: editLink.label, path: data.suggestedPath, lang: langRef.current });
          }
        }}
        lang={lang}
        translations={translations ?? FOOTER_TRANSLATIONS_EN}
      />

      <FooterDeleteDialog
        deleteLink={deleteLink}
        onClose={() => setDeleteLink(null)}
        saving={saving}
        onDelete={handleDelete}
        translations={translations ?? FOOTER_TRANSLATIONS_EN}
      />

    </>
  );
}

"use client"

import * as React from "react"
import { X } from "lucide-react"
import { DrawerHeader } from "@/components/ui/drawer"
import {
  FooterDrawerShell,
  FooterDrawerTitle,
  FooterDrawerDescription,
  useFooterDrawerClose,
} from "@/components/containers/footer-drawer-shell.client"
import type { FooterPageContent } from "@features/footer/get-footer-page-content"
import { useFooterTranslation, FOOTER_TRANSLATIONS_EN } from '../_translations/get-footer-translation'
import type { FooterTranslations } from '../_translations/footer-enum.translations'

function CloseButton() {
  const close = useFooterDrawerClose()
  return (
    <button
      type="button"
      onClick={close}
      className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Close"
    >
      <X size={16} />
    </button>
  )
}

type Props = {
  content: FooterPageContent | null
  onClose: () => void
  translations?: FooterTranslations
}

export function FooterPageDrawer({ content, onClose, translations }: Props) {
  const t = useFooterTranslation(translations ?? FOOTER_TRANSLATIONS_EN)
  return (
    <FooterDrawerShell onClose={onClose}>
      {content === null ? (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          <CloseButton />
          {t("footer.content_not_found")}
        </div>
      ) : (
        <div className="relative mx-auto w-full max-w-2xl flex flex-col h-full">
          <CloseButton />
          <DrawerHeader className="pr-12">
            <FooterDrawerTitle>{content.title}</FooterDrawerTitle>
            {content.description && (
              <FooterDrawerDescription>{content.description}</FooterDrawerDescription>
            )}
          </DrawerHeader>
          <div
            className="flex-1 overflow-y-auto px-4 py-2 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content.content }}
          />
        </div>
      )}
    </FooterDrawerShell>
  )
}

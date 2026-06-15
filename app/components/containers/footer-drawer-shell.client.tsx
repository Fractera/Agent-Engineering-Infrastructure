"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useWidthToggle } from "@/providers/width-toggle-provider.client"
import { Z_INDEX } from "@/config/ui/z-index.config"
import { cn } from "@/lib/utils"

export function FooterDrawerTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-foreground font-semibold", className)} {...props} />
}

export function FooterDrawerDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-muted-foreground text-sm", className)} {...props} />
}

const FooterDrawerCloseCtx = React.createContext<() => void>(() => {})

export function useFooterDrawerClose() {
  return React.useContext(FooterDrawerCloseCtx)
}

const ENTER_MS = 350
const EXIT_MS  = 300
const EASING   = "cubic-bezier(0.32, 0.72, 0, 1)"

type FooterDrawerShellProps = {
  onClose: () => void
  children: React.ReactNode
}

export function FooterDrawerShell({ onClose, children }: FooterDrawerShellProps) {
  const { centerMaxWidth } = useWidthToggle()
  const [closing, setClosing] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const close = React.useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, EXIT_MS)
  }, [closing, onClose])

  const content = (
    <FooterDrawerCloseCtx.Provider value={close}>
      <div
        className="fixed inset-0 bg-black/50"
        style={{
          zIndex: Z_INDEX.FOOTER_DRAWER - 1,
          animation: closing
            ? `footer-backdrop-out ${EXIT_MS}ms ease-in forwards`
            : `footer-backdrop-in 200ms ease-out forwards`,
        }}
        onClick={close}
        aria-hidden
      />
      <div
        className="bg-background border-t border-l border-r rounded-t-lg shadow-lg overflow-auto"
        style={{
          position: "fixed",
          bottom: "var(--footer-offset, 0px)",
          padding: 16,
          paddingBottom: 40,
          left: 0,
          right: 0,
          margin: "0 auto",
          width: "100%",
          maxWidth: centerMaxWidth,
          height: 'calc(100dvh - var(--footer-offset, 0px))',
          zIndex: Z_INDEX.FOOTER_DRAWER,
          animation: closing
            ? `footer-drawer-out ${EXIT_MS}ms ${EASING} forwards`
            : `footer-drawer-in ${ENTER_MS}ms ${EASING} forwards`,
        }}
      >
        {children}
      </div>
    </FooterDrawerCloseCtx.Provider>
  )

  if (!mounted) return null

  return createPortal(content, document.body)
}

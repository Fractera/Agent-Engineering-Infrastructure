'use client';

import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { getZIndexStyle } from '@/config/ui/z-index.config';
import { useCodeGenerator } from '@/providers/code-generator-provider.client';

const TRIGGER_ZONE = 0.85;
const HIDE_DELAY_MS = 2500;
const INITIAL_VISIBLE_MS = 5000;
const FOOTER_HEIGHT = 40;

type Props = {
  children: ReactNode;
  alwaysVisible: boolean;
};

export function FooterContainer({ children, alwaysVisible: initialAlwaysVisible }: Props) {
  const { codeGeneratorOpen } = useCodeGenerator();
  const [alwaysVisible, setAlwaysVisible] = useState(initialAlwaysVisible);
  const [visible, setVisible] = useState(true);
  const [jsReady, setJsReady] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimer();
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
  }, [clearTimer]);

  useEffect(() => {
    if (alwaysVisible) return;
    const initialTimer = setTimeout(() => {
      setJsReady(true);
      setVisible(false);
    }, INITIAL_VISIBLE_MS);
    return () => clearTimeout(initialTimer);
  }, [alwaysVisible]);

  useEffect(() => {
    if (alwaysVisible || !jsReady) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY / window.innerHeight >= TRIGGER_ZONE) {
        clearTimer();
        setVisible(true);
        scheduleHide();
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => { window.removeEventListener('mousemove', handleMouseMove); clearTimer(); };
  }, [alwaysVisible, jsReady, clearTimer, scheduleHide]);

  useEffect(() => {
    const handler = (e: Event) => setAlwaysVisible((e as CustomEvent<boolean>).detail);
    window.addEventListener('footer-display-mode', handler);
    return () => window.removeEventListener('footer-display-mode', handler);
  }, []);

  const isFooterVisible = visible || codeGeneratorOpen || alwaysVisible;

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--footer-offset',
      isFooterVisible ? `${FOOTER_HEIGHT}px` : '0px'
    );
  }, [isFooterVisible]);

  return (
    <footer
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: FOOTER_HEIGHT,
        transform: isFooterVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: jsReady ? 'transform 0.25s ease' : undefined,
        ...getZIndexStyle('FOOTER'),
      }}
      data-footer-autohide={!alwaysVisible ? 'true' : undefined}
    >
      <div className="relative h-full w-full">
        {children}
      </div>
    </footer>
  );
}

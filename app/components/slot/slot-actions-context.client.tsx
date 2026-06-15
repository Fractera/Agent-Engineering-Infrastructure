'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type SlotActionsContextValue = {
  actionsNode: ReactNode;
  chatNode: ReactNode;
  isHovered: boolean;
  setActionsNode: (node: ReactNode) => void;
  setChatNode: (node: ReactNode) => void;
  setIsHovered: (v: boolean) => void;
};

const SlotActionsContext = createContext<SlotActionsContextValue | null>(null);

export function SlotActionsProvider({ children }: { children: ReactNode }) {
  const [actionsNode, setActionsNodeState] = useState<ReactNode>(null);
  const [chatNode, setChatNodeState] = useState<ReactNode>(null);
  const [isHovered, setIsHoveredState] = useState(false);

  const setActionsNode = useCallback((node: ReactNode) => setActionsNodeState(node), []);
  const setChatNode = useCallback((node: ReactNode) => setChatNodeState(node), []);
  const setIsHovered = useCallback((v: boolean) => setIsHoveredState(v), []);

  return (
    <SlotActionsContext.Provider value={{ actionsNode, chatNode, isHovered, setActionsNode, setChatNode, setIsHovered }}>
      {children}
    </SlotActionsContext.Provider>
  );
}

export function useSlotActions() {
  const ctx = useContext(SlotActionsContext);
  if (!ctx) throw new Error('useSlotActions must be used within SlotActionsProvider');
  return ctx;
}

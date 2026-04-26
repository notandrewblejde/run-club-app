import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Action declared by a detail screen, rendered into the bottom bar in place
 * of the tab icons. Patterned after rn-driver-app's BottomBarActions.
 */
export interface BottomBarAction {
  label: string;
  onPress: () => void;
  variant?: 'contained' | 'outlined';
  color?: 'primary' | 'error';
  loading?: boolean;
  disabled?: boolean;
  /** Optional: render icon (and compact label) instead of text-only. */
  icon?: 'plus' | 'pencil';
}

interface BottomBarActionsContextValue {
  actions: BottomBarAction[];
  setActions: (actions: BottomBarAction[]) => void;
  clearActions: () => void;
}

const BottomBarActionsContext = createContext<BottomBarActionsContextValue>({
  actions: [],
  setActions: () => {},
  clearActions: () => {},
});

export function BottomBarActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActionsState] = useState<BottomBarAction[]>([]);

  const setActions = useCallback((next: BottomBarAction[]) => setActionsState(next), []);
  const clearActions = useCallback(() => setActionsState([]), []);

  const value = useMemo(
    () => ({ actions, setActions, clearActions }),
    [actions, setActions, clearActions],
  );

  return (
    <BottomBarActionsContext.Provider value={value}>
      {children}
    </BottomBarActionsContext.Provider>
  );
}

export function useBottomBarActions() {
  return useContext(BottomBarActionsContext);
}

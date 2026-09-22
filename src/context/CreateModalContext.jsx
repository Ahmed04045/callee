// src/context/CreateModalContext.jsx
//
// Open state for the Create modal (see components/CreateModal.jsx), shared
// so any page can trigger it — the "Create" nav button, but also links like
// "Create the first group" on the Clubs page — without prop-drilling a
// handler down every route.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CreateModalContext = createContext(null);

export function CreateModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  // null = show the "what do you want to create" picker first. A caller that
  // already knows (e.g. "Create the first group" on the Clubs page) can skip
  // straight past it by passing a type to open().
  const [type, setType] = useState(null);

  const open = useCallback((initialType) => {
    setType(initialType ?? null);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setType(null);
  }, []);

  const value = useMemo(() => ({ isOpen, type, open, close, setType }), [isOpen, type, open, close]);

  return <CreateModalContext.Provider value={value}>{children}</CreateModalContext.Provider>;
}

export function useCreateModal() {
  const ctx = useContext(CreateModalContext);
  if (!ctx) throw new Error('useCreateModal must be used inside a <CreateModalProvider>.');
  return ctx;
}

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { type ReviewNotice, WriteOutcomeError, readReviewNotice, storeReviewNotice } from '@/lib/action-safety';

type Safety = { notice: ReviewNotice | null; clearNotice: () => void; runWrite: <T>(write: () => Promise<T>) => Promise<T> };
const Context = createContext<Safety | null>(null);

export function ActionSafetyProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const identity = useRef(userId);
  identity.current = userId;
  const [notice, setNotice] = useState<ReviewNotice | null>(null);
  useEffect(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* memory-only mode */ }
    const next = userId ? readReviewNotice(storage, userId) : null;
    setNotice(next);
  }, [userId]);

  const persist = (next: ReviewNotice | null) => {
    if (userId) {
      let storage: Storage | undefined;
      try { storage = window.localStorage; } catch { /* memory-only mode */ }
      storeReviewNotice(storage, userId, next);
    }
  };
  const saveNotice = (next: ReviewNotice | null) => {
    persist(next);
    if (identity.current !== userId) return;
    setNotice(next);
  };
  const runWrite = async <T,>(write: () => Promise<T>) => {
    if (!userId || identity.current !== userId) throw new Error('Oturum değişti. Kaydı göndermeden önce yeniden giriş yapın.');
    // Keep an earlier unresolved notice when an unrelated write finishes.
    if (!notice) persist({ at: new Date().toISOString(), outcome: 'uncertain' });
    try {
      const result = await write();
      if (!notice) persist(null);
      return result;
    } catch (error) {
      if (error instanceof WriteOutcomeError) saveNotice({ at: new Date().toISOString(), outcome: error.outcome });
      else if (!notice) persist(null);
      throw error;
    }
  };
  return <Context.Provider value={{ notice, clearNotice: () => saveNotice(null), runWrite }}>
    {children}
  </Context.Provider>;
}

export function useActionSafety() {
  const value = useContext(Context);
  if (!value) throw new Error('ActionSafetyProvider bulunamadı.');
  return value;
}

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { type ReviewNotice, WriteOutcomeError, readReviewNotice, storeReviewNotice } from '@/lib/action-safety';
import { mutationCoordinator } from '@/lib/mutation-coordinator';

type Safety = { reportError: (error: unknown) => void; notice: ReviewNotice | null; clearNotice: () => void; runWrite: <T>(write: () => Promise<T>) => Promise<T> };
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
    mutationCoordinator.setReviewRequired(Boolean(next));
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
    mutationCoordinator.setReviewRequired(Boolean(next));
  };
  const reportError = (error: unknown) => {
    if (error instanceof WriteOutcomeError) saveNotice({ at: new Date().toISOString(), outcome: error.outcome });
  };
  const runWrite = async <T,>(write: () => Promise<T>) => {
    if (!userId || identity.current !== userId) throw new Error('Oturum değişti. Kaydı göndermeden önce yeniden giriş yapın.');
    if (mutationCoordinator.snapshot().reviewRequired) throw new Error('Önce sonucu belirsiz olan son işlemi kontrol edin.');
    // Persist only a timestamp and outcome marker, never account/form data.
    // If the app closes mid-request, the next opening asks for review.
    persist({ at: new Date().toISOString(), outcome: 'uncertain' });
    try {
      const result = await write();
      persist(null);
      return result;
    } catch (error) {
      if (error instanceof WriteOutcomeError) saveNotice({ at: new Date().toISOString(), outcome: error.outcome });
      else persist(null);
      throw error;
    }
  };
  return <Context.Provider value={{ reportError, notice, clearNotice: () => saveNotice(null), runWrite }}>
    {children}
  </Context.Provider>;
}

export function useActionSafety() {
  const value = useContext(Context);
  if (!value) throw new Error('ActionSafetyProvider bulunamadı.');
  return value;
}

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type Confirmation, type ConfirmAction, type ReviewNotice, WriteOutcomeError, readReviewNotice, storeReviewNotice } from '@/lib/action-safety';
import { mutationCoordinator } from '@/lib/mutation-coordinator';

type Safety = { confirm: ConfirmAction; reportError: (error: unknown) => void; notice: ReviewNotice | null; clearNotice: () => void; runWrite: <T>(write: () => Promise<T>) => Promise<T> };
const Context = createContext<Safety | null>(null);

export function ActionSafetyProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const identity = useRef(userId);
  identity.current = userId;
  const location = useLocation();
  const [options, setOptions] = useState<Confirmation | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [typed, setTyped] = useState('');
  const [notice, setNotice] = useState<ReviewNotice | null>(null);
  const resolve = useRef<((result: boolean) => void) | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const finish = useCallback((result: boolean) => {
    const pending = resolve.current;
    resolve.current = null;
    setOptions(null);
    pending?.(result);
  }, []);
  useEffect(() => { finish(false); }, [location.pathname, userId, finish]);
  useEffect(() => () => { resolve.current?.(false); resolve.current = null; }, []);
  useEffect(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* memory-only mode */ }
    const next = userId ? readReviewNotice(storage, userId) : null;
    setNotice(next);
    mutationCoordinator.setReviewRequired(Boolean(next));
  }, [userId]);

  const confirm = useCallback<ConfirmAction>(next => {
    if (resolve.current) return Promise.resolve(false);
    setAcknowledged(false); setTyped(''); setOptions(next);
    return new Promise<boolean>(done => { resolve.current = done; });
  }, []);
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
  const allowed = (!options?.acknowledgement || acknowledged) && (!options?.requireText || typed.trim() === options.requireText.trim());
  return <Context.Provider value={{ confirm, reportError, notice, clearNotice: () => saveNotice(null), runWrite }}>
    {children}
    <AlertDialog open={Boolean(options)} onOpenChange={open => { if (!open) finish(false); }}>
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto" onOpenAutoFocus={event => { event.preventDefault(); cancelButton.current?.focus(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          <AlertDialogDescription>{options?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {options?.details && <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border p-3 text-sm">
          {options.details.map((item, index) => <div className="contents" key={index}><dt className="text-muted-foreground">{item.label}</dt><dd className="break-words whitespace-pre-line font-medium">{item.value}</dd></div>)}
        </dl>}
        {options?.acknowledgement && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-1" /><span>{options.acknowledgement}</span></label>}
        {options?.requireText && <label className="space-y-2 text-sm"><span>Onaylamak için <strong>{options.requireText}</strong> yazın.</span><Input aria-label="Silme onayı" value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" /></label>}
        <AlertDialogFooter>
          <Button ref={cancelButton} variant="outline" onClick={() => finish(false)}>Vazgeç</Button>
          <Button variant={options?.destructive ? 'destructive' : 'default'} disabled={!allowed} onClick={() => finish(true)}>{options?.confirmLabel || 'Onayla'}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Context.Provider>;
}

export function useActionSafety() {
  const value = useContext(Context);
  if (!value) throw new Error('ActionSafetyProvider bulunamadı.');
  return value;
}

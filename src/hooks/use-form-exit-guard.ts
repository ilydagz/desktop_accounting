import { useEffect, useRef } from 'react';
import { useActionSafety } from '@/contexts/ActionSafetyContext';

export function useFormExitGuard(open: boolean, signature: string, busy: boolean) {
  const { confirm } = useActionSafety();
  const baseline = useRef(signature);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) baseline.current = signature;
  wasOpen.current = open;
  const dirty = open && signature !== baseline.current;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return async (discard: () => void) => {
    if (busy) return;
    if (dirty && !await confirm({ title: 'Kaydedilmemiş bilgiler var', description: 'Kapatırsanız bu formdaki değişiklikler kaydedilmeyecek. Mevcut kayıtlar değişmez.', confirmLabel: 'Değişiklikleri bırak' })) return;
    discard();
  };
}

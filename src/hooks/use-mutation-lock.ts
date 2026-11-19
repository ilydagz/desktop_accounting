import { useRef, useSyncExternalStore } from 'react';
import { mutationCoordinator } from '@/lib/mutation-coordinator';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';

export function useMutationLock() {
  const owner = useRef(Symbol('write'));
  const state = useSyncExternalStore(mutationCoordinator.subscribe, mutationCoordinator.snapshot, mutationCoordinator.snapshot);
  const online = useOnlineStatus();
  const { toast } = useToast();
  const busy = state.owner !== null;
  return {
    busy,
    disabled: busy || !online || state.reviewRequired,
    begin() {
      if (!online || state.reviewRequired) {
        toast({ title: 'Kayıt bekletildi', description: !online ? 'Çevrimdışısınız. Formunuz açık kalır; bağlantı geldikten sonra tekrar deneyin.' : 'Önce sonucu belirsiz olan son işlemi kontrol edin.', variant: 'destructive' });
        return false;
      }
      return mutationCoordinator.acquire(owner.current);
    },
    end() { mutationCoordinator.release(owner.current); },
  };
}

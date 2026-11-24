import { useRef, useSyncExternalStore } from 'react';
import { mutationCoordinator } from '@/lib/mutation-coordinator';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { toast } from '@/hooks/use-toast';

export function useMutationLock() {
  const owner = useRef(Symbol('write'));
  const state = useSyncExternalStore(mutationCoordinator.subscribe, mutationCoordinator.snapshot, mutationCoordinator.snapshot);
  const online = useOnlineStatus();
  const busy = state.owner !== null;
  return {
    busy,
    disabled: busy || !online,
    begin() {
      if (!online) {
        toast({ title: 'Kayıt bekletildi', description: 'Çevrimdışısınız. Formunuz açık kalır. Bağlantı geldikten sonra tekrar deneyin.', variant: 'destructive' });
        return false;
      }
      return mutationCoordinator.acquire(owner.current);
    },
    end() { mutationCoordinator.release(owner.current); },
  };
}

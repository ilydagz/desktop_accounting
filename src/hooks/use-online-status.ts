import { useSyncExternalStore } from 'react';

const snapshot = () => navigator.onLine !== false;
const subscribe = (listener: () => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener); };
};
export function useOnlineStatus() { return useSyncExternalStore(subscribe, snapshot, () => true); }

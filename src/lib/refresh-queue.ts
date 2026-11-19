export function createRefreshQueue(refresh: () => Promise<void>) {
  let pending = false;
  let running: Promise<void> | null = null;
  return function requestRefresh(): Promise<void> {
    pending = true;
    if (!running) {
      running = (async () => {
        try {
          while (pending) { pending = false; await refresh(); }
        } finally { running = null; }
      })();
    }
    return running;
  };
}

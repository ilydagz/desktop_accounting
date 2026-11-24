export function createMutationCoordinator() {
  let state = { owner: null as symbol | null };
  const listeners = new Set<() => void>();
  const update = (next: typeof state) => { state = next; listeners.forEach(listener => listener()); };
  return {
    snapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    acquire(owner: symbol) {
      if (state.owner) return false;
      update({ owner });
      return true;
    },
    release(owner: symbol) { if (state.owner === owner) update({ owner: null }); },
  };
}
export const mutationCoordinator = createMutationCoordinator();

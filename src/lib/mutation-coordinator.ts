export function createMutationCoordinator() {
  let state = { owner: null as symbol | null, reviewRequired: false };
  const listeners = new Set<() => void>();
  const update = (next: typeof state) => { state = next; listeners.forEach(listener => listener()); };
  return {
    snapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    acquire(owner: symbol) {
      if (state.owner || state.reviewRequired) return false;
      update({ ...state, owner });
      return true;
    },
    release(owner: symbol) { if (state.owner === owner) update({ ...state, owner: null }); },
    setReviewRequired(reviewRequired: boolean) {
      if (state.reviewRequired !== reviewRequired) update({ ...state, reviewRequired });
    },
  };
}
export const mutationCoordinator = createMutationCoordinator();

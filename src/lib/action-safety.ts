export type Confirmation = {
  title: string;
  description: string;
  details?: { label: string; value: string }[];
  confirmLabel?: string;
  destructive?: boolean;
  acknowledgement?: string;
  requireText?: string;
};
export type ConfirmAction = (options: Confirmation) => Promise<boolean>;

export class ActionCancelledError extends Error {
  constructor() { super('İşlem iptal edildi.'); }
}

export class WriteOutcomeError extends Error {
  readonly outcome: 'uncertain' | 'partial';
  constructor(message: string, outcome: 'uncertain' | 'partial') { super(message); this.outcome = outcome; }
}

// A database rejection has a code. A transport failure may have happened before
// or after the commit, so it must not be presented as "nothing was saved".
export function throwWriteError(error: { code?: string; message?: string } | unknown): never {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code) throw error;
  throw new WriteOutcomeError('Sunucudan kesin sonuç alınamadı. Kayıt tamamlanmış olabilir. Yeniden göndermeden önce mevcut kayıtları kontrol edin.', 'uncertain');
}

export type ReviewNotice = { at: string; outcome: 'uncertain' | 'partial' };
export function readReviewNotice(storage: Pick<Storage, 'getItem'> | undefined, userId: string): ReviewNotice | null {
  try {
    const item = JSON.parse(storage?.getItem('limes:write-review:' + userId) || 'null');
    return item && typeof item.at === 'string' && ['uncertain', 'partial'].includes(item.outcome) ? { at: item.at, outcome: item.outcome } : null;
  } catch { return null; }
}
export function storeReviewNotice(storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined, userId: string, notice: ReviewNotice | null) {
  try {
    if (notice) storage?.setItem('limes:write-review:' + userId, JSON.stringify({ at: notice.at, outcome: notice.outcome }));
    else storage?.removeItem('limes:write-review:' + userId);
  } catch { /* The in-memory review gate stays active if storage is blocked. */ }
}

export type Balance = { borc: number; alacak: number; bakiye: number };
export type Movement = {
  id: string; type: string; amount: number | string; date: string;
  account_id?: string; created_at?: string; description?: string; method?: string;
  ledger_id?: string | null; maturity_date?: string | null;
  interest_rate?: number | string | null; interest_type?: string | null;
  is_interest?: boolean; parent_id?: string | null; is_paid?: boolean;
};
type AccountBalance = { borc: number | string; alacak: number | string; bakiye: number | string };

// Normalize database numeric strings without changing stored precision or signs.
// Kuruş rounding below is for the read-only report/display, never write policy.
export function money(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new Error('Geçersiz tutar. Kaydı kontrol edin.');
  }
  return amount;
}
const cents = (value: unknown) => Math.round(money(value) * 100);

export function movementTotals(history: Movement[]): Balance {
  let borc = 0, alacak = 0;
  for (const tx of history) {
    const amount = cents(tx.amount);
    if (tx.type === 'tahsilat') alacak += amount;
    else if (tx.type === 'odeme') borc += amount;
    else throw new Error('Bilinmeyen işlem türü. Hesap kontrol edilmeli.');
  }
  return { borc: borc / 100, alacak: alacak / 100, bakiye: (alacak - borc) / 100 };
}

// Input is newest first. Capture the balance AFTER this movement, then undo it
// to reach the previous movement. Legacy opening balances remain included.
export function historyWithSnapshots<T extends Movement>(account: AccountBalance, history: T[]) {
  let borc = cents(account.borc), alacak = cents(account.alacak), bakiye = cents(account.bakiye);
  return history.map(tx => {
    const snapshot = { borc: borc / 100, alacak: alacak / 100, bakiye: Math.abs(bakiye) / 100 };
    const amount = cents(tx.amount);
    if (tx.type === 'tahsilat') { alacak -= amount; bakiye -= amount; }
    else if (tx.type === 'odeme') { borc -= amount; bakiye += amount; }
    else throw new Error('Bilinmeyen işlem türü. Ekstre oluşturulamadı.');
    return { ...tx, snapshot };
  });
}

export function movementKey(tx: Omit<Movement, 'id'>) {
  return JSON.stringify([
    tx.account_id, tx.type, money(tx.amount), new Date(tx.date).toISOString(),
    tx.description || '', tx.method || 'Nakit', tx.ledger_id || null,
    tx.maturity_date ? new Date(tx.maturity_date).toISOString() : null,
    Number(tx.interest_rate || 0), tx.interest_type || null,
    Boolean(tx.is_interest), tx.parent_id || null,
  ]);
}

export function duplicateGroups(history: Movement[]) {
  const groups = new Map<string, Movement[]>();
  for (const tx of history) {
    const key = movementKey(tx);
    groups.set(key, [...(groups.get(key) || []), tx]);
  }
  return [...groups.values()].filter(group => group.length > 1);
}

export function inspectAccount(account: AccountBalance, history: Movement[]) {
  const stored = { borc: money(account.borc), alacak: money(account.alacak), bakiye: money(account.bakiye) };
  const movements = movementTotals(history);
  const reasons: string[] = [];
  if (history.length && stored.borc === 0 && stored.alacak === 0 && stored.bakiye === 0) {
    reasons.push('Hareket geçmişi var, kayıtlı toplamların tamamı sıfır.');
  }
  if (cents(stored.borc) < cents(movements.borc) || cents(stored.alacak) < cents(movements.alacak)) {
    reasons.push('Kayıtlı toplamlar hareket toplamlarından düşük; açılış bilgisi doğrulanmalı.');
  }
  const duplicates = duplicateGroups(history);
  if (duplicates.length) reasons.push(`${duplicates.length} olası mükerrer işlem grubu var.`);
  return { stored, movements, reasons, duplicates };
}

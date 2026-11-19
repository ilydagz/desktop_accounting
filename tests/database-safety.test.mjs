import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseHarness } from './support/db-harness.mjs';

const account = { id: 'account', institution_id: 'institution', type: 'individual', name: 'Test', borc: 438625, alacak: 335825, bakiye: -102800 };
const tx = { accountId: 'account', type: 'odeme', amount: 438625, date: '2025-12-30T00:00:00Z', description: 'Devir', method: 'Nakit' };
const storedTx = { ...tx, id: 'old', account_id: tx.accountId, institution_id: 'institution', ledger_id: null, is_interest: false, parent_id: null };

test('the old mass repair entry point cannot zero accounts or ledgers', async () => {
  const { db, calls, tables } = await databaseHarness({ accounts: [account] });
  await assert.rejects(db.recalculateAllBalances(), /sıfırlama kapatıldı/);
  assert.equal(calls.length, 0);
  assert.equal(tables.accounts[0].borc, 438625);
});

test('saving a stale contact form preserves current debt, credit and balance', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account] });
  await db.updateAccount('account', { name: 'Changed', borc: 0, alacak: 0, bakiye: 0, institution_id: 'other' });
  assert.equal(tables.accounts[0].name, 'Changed');
  assert.equal(tables.accounts[0].borc, 438625);
  assert.equal(tables.accounts[0].alacak, 335825);
  assert.equal(tables.accounts[0].bakiye, -102800);
  assert.equal(tables.accounts[0].institution_id, 'institution');
});

test('new opening debt, credit and independent net are saved exactly as entered', async () => {
  const { db, tables } = await databaseHarness();
  await db.addAccount({ name: 'Opening', borc: 1000, alacak: 250, bakiye: 125 });
  assert.equal(tables.accounts[0].borc, 1000);
  assert.equal(tables.accounts[0].alacak, 250);
  assert.equal(tables.accounts[0].bakiye, 125);
});

test('explicit manual balance edits preserve the accountant-entered amounts without recalculating net', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account] });
  const original = { borc: account.borc, alacak: account.alacak, bakiye: account.bakiye };
  await db.updateAccount('account', { name: 'Test', borc: -200, alacak: 100, bakiye: 125 }, original);
  assert.equal(tables.accounts[0].borc, -200);
  assert.equal(tables.accounts[0].alacak, 100);
  assert.equal(tables.accounts[0].bakiye, 125);
});

test('a stale explicit balance edit cannot overwrite a newer movement', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account] });
  const stale = { borc: account.borc - 100, alacak: account.alacak, bakiye: account.bakiye + 100 };
  await assert.rejects(db.updateAccount('account', { borc: 0, alacak: 0, bakiye: 0 }, stale), /form açıldıktan sonra değişti/);
  assert.equal(tables.accounts[0].borc, account.borc);
  assert.equal(tables.accounts[0].bakiye, account.bakiye);
});

test('the existing collection, payment, ledger and reversal signs are preserved', async () => {
  for (const type of ['tahsilat', 'odeme']) {
    const { db, tables } = await databaseHarness({ accounts: [account], ledgers: [{ id: 'cash', balance: 200 }] });
    await db.addTransaction({ ...tx, type, amount: 30, ledgerId: 'cash' });
    assert.equal(tables.accounts[0].borc, account.borc + (type === 'odeme' ? 30 : 0));
    assert.equal(tables.accounts[0].alacak, account.alacak + (type === 'tahsilat' ? 30 : 0));
    assert.equal(tables.accounts[0].bakiye, account.bakiye + (type === 'tahsilat' ? 30 : -30));
    assert.equal(tables.ledgers[0].balance, type === 'tahsilat' ? 230 : 170);
    await db.deleteTransaction(tables.transactions[0].id);
    assert.equal(tables.accounts[0].borc, account.borc);
    assert.equal(tables.accounts[0].alacak, account.alacak);
    assert.equal(tables.accounts[0].bakiye, account.bakiye);
    assert.equal(tables.ledgers[0].balance, 200);
  }
});

test('existing negative correction and fractional-amount behavior is not restricted or rounded on write', async () => {
  for (const amount of [-10, 0, 0.125]) {
    const { db, tables } = await databaseHarness({ accounts: [account] });
    await db.addTransaction({ ...tx, amount });
    assert.equal(tables.transactions[0].amount, amount);
    assert.equal(tables.accounts[0].borc, account.borc + amount);
    assert.equal(tables.accounts[0].bakiye, account.bakiye - amount);
  }
});

test('re-entering an existing movement requires explicit duplicate confirmation', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account], transactions: [storedTx] });
  await assert.rejects(db.addTransaction(tx), /zaten var/);
  assert.equal(tables.transactions.length, 1);
  assert.equal(tables.accounts[0].borc, 438625);
});

test('a genuinely distinct repeated payment may be explicitly confirmed', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account], transactions: [storedTx] });
  await db.addTransaction(tx, true);
  assert.equal(tables.transactions.length, 2);
  assert.equal(tables.accounts[0].borc, 877250);
});

test('a local datetime spelling cannot bypass duplicate detection after PostgreSQL returns UTC', async () => {
  const timezone = process.env.TZ;
  process.env.TZ = 'Europe/Istanbul';
  try {
    const { db, tables } = await databaseHarness({ accounts: [account], transactions: [storedTx] });
    await assert.rejects(db.addTransaction({ ...tx, date: '2025-12-30T00:00:00' }), /zaten var/);
    assert.equal(tables.transactions.length, 1);
  } finally {
    if (timezone === undefined) delete process.env.TZ;
    else process.env.TZ = timezone;
  }
});

test('a posted movement with a failed balance update is never reported as complete; retry is detected', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account], fail: call => call.table === 'accounts' && call.operation === 'update' ? new Error('offline') : null });
  await assert.rejects(db.addTransaction(tx), /yeniden girmeyin/);
  assert.equal(tables.transactions.length, 1);
  assert.equal(tables.accounts[0].borc, 438625);
  await assert.rejects(db.addTransaction(tx), /zaten var/);
  assert.equal(tables.transactions.length, 1);
});

test('database numeric strings do not concatenate during posting', async () => {
  const { db, tables } = await databaseHarness({ accounts: [{ ...account, borc: '438625', alacak: '335825', bakiye: '-102800' }] });
  await db.addTransaction({ ...tx, amount: 100 });
  assert.equal(tables.accounts[0].borc, 438725);
  assert.equal(tables.accounts[0].bakiye, -102900);
});

test('bulk duplicate checks happen before any insert or balance update', async () => {
  const { db, tables, calls } = await databaseHarness({ accounts: [account], transactions: [storedTx] });
  await assert.rejects(db.addTransactionToMultipleAccounts(['account'], tx), /zaten var/);
  assert.equal(tables.transactions.length, 1);
  assert.equal(calls.filter(call => call.operation !== 'select').length, 0);
});

test('duplicate edits are rejected before the original movement is deleted', async () => {
  const { db, tables, calls } = await databaseHarness({ accounts: [account], transactions: [storedTx, { ...storedTx, id: 'duplicate' }] });
  await assert.rejects(db.validateTransactionEdit('old', tx), /zaten var/);
  assert.equal(tables.transactions.length, 2);
  assert.equal(calls.filter(call => call.operation !== 'select').length, 0);
});

test('an unchanged edit does not count the movement itself as a duplicate', async () => {
  const { db, calls } = await databaseHarness({ accounts: [account], transactions: [storedTx] });
  await db.validateTransactionEdit('old', tx);
  await assert.rejects(db.validateTransactionEdit('old', { ...tx, amount: NaN }), /Geçersiz tutar/);
  assert.equal(calls.filter(call => call.operation !== 'select').length, 0);
});

test('failed reversal after deletion is surfaced as a partial operation requiring review', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account], transactions: [storedTx], fail: call => call.table === 'accounts' && call.operation === 'update' ? new Error('offline') : null });
  await assert.rejects(db.deleteTransaction('old'), /İşlem silindi ancak/);
  assert.equal(tables.transactions.length, 0);
  assert.equal(tables.accounts[0].borc, 438625);
});

test('an audit read failure cannot become an apparently clean empty report', async () => {
  const { db, calls } = await databaseHarness({ accounts: [account], fail: call => call.table === 'transactions' && call.operation === 'select' ? new Error('offline') : null });
  await assert.rejects(db.getAccountingAudit(), /offline/);
  assert.equal(calls.filter(call => call.operation !== 'select').length, 0);
});

test('account audit is read-only, scoped to institution, and includes history above the row cap', async () => {
  const rows = Array.from({ length: 1501 }, (_, i) => ({ ...storedTx, id: String(i), amount: 1, description: String(i) }));
  const { db, calls } = await databaseHarness({ accounts: [{ ...account, borc: 0, alacak: 0, bakiye: 0 }, { ...account, id: 'foreign', institution_id: 'other' }], transactions: rows });
  const report = await db.getAccountingAudit();
  assert.equal(report.accounts.length, 1);
  assert.equal(report.accounts[0].history.length, 1501);
  assert.equal(report.accounts[0].movements.borc, 1501);
  assert.match(report.accounts[0].reasons.join(' '), /tamamı sıfır/);
  assert.equal(calls.filter(call => call.operation !== 'select').length, 0);
});

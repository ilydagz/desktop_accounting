import test from 'node:test';
import assert from 'node:assert/strict';
import { createMutationCoordinator } from '../src/lib/mutation-coordinator.ts';
import { createRefreshQueue } from '../src/lib/refresh-queue.ts';
import { readReviewNotice, storeReviewNotice, throwWriteError, WriteOutcomeError } from '../src/lib/action-safety.ts';
import { databaseHarness } from './support/db-harness.mjs';

const account = { id: 'a', institution_id: 'institution', type: 'individual', name: 'Test', borc: 10, alacak: 5, bakiye: 123 };
const movement = { id: 'tx', institution_id: 'institution', account_id: 'a', ledger_id: 'bank', type: 'odeme', amount: 10, date: '2026-01-01T00:00:00Z' };

test('a second form cannot start a write while another form owns the lock', () => {
  const lock = createMutationCoordinator(), first = Symbol(), second = Symbol();
  assert.equal(lock.acquire(first), true);
  assert.equal(lock.acquire(second), false);
  lock.release(second);
  assert.equal(lock.snapshot().owner, first);
  lock.release(first);
  assert.equal(lock.acquire(second), true);
});

test('an unresolved write requires review before new submissions', () => {
  const lock = createMutationCoordinator();
  lock.setReviewRequired(true);
  assert.equal(lock.acquire(Symbol()), false);
  lock.setReviewRequired(false);
  assert.equal(lock.acquire(Symbol()), true);
});

test('review markers survive reopening, stay user-scoped, and contain no financial or customer data', () => {
  const items = new Map();
  const storage = { getItem: key => items.get(key) || null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) };
  const notice = { at: '2026-11-20T00:00:00Z', outcome: 'uncertain', name: 'must not be stored', amount: 123 };
  storeReviewNotice(storage, 'user-a', notice);
  assert.deepEqual(readReviewNotice(storage, 'user-a'), { at: notice.at, outcome: 'uncertain' });
  assert.equal(readReviewNotice(storage, 'user-b'), null);
  assert.deepEqual(Object.keys(JSON.parse([...items.values()][0])).sort(), ['at', 'outcome']);
  storeReviewNotice(storage, 'user-a', null);
  assert.equal(readReviewNotice(storage, 'user-a'), null);
});

test('blocked browser storage and malformed markers do not crash the safety UI', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(readReviewNotice(blocked, 'user'), null);
  assert.doesNotThrow(() => storeReviewNotice(blocked, 'user', { at: 'now', outcome: 'partial' }));
  assert.equal(readReviewNotice({ getItem: () => '{invalid' }, 'user'), null);
});

test('network write failures are uncertain; explicit database rejections remain definitive', () => {
  assert.throws(() => throwWriteError(new Error('failed to fetch')), error => error instanceof WriteOutcomeError && error.outcome === 'uncertain');
  const rejection = { code: '23514', message: 'constraint violation' };
  assert.throws(() => throwWriteError(rejection), error => error === rejection);
});

test('offline or unconfigured writes are refused before a database request is sent', async () => {
  for (const options of [{ online: false }, { env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' } }]) {
    const { db, calls } = await databaseHarness(options);
    await assert.rejects(db.addAccount(account), /gönderilmedi/);
    await assert.rejects(db.deleteTransaction('tx'), /gönderilmedi/);
    assert.equal(calls.length, 0);
  }
});

for (const kind of ['account', 'ledger']) {
  const seed = () => ({ accounts: [account], transactions: [movement], ledgers: [{ id: 'bank', institution_id: 'institution', balance: 42 }] });
  const remove = db => kind === 'account' ? db.deleteAccount('a') : db.deleteLedger('bank');

  test(`${kind}: direct deletion with history reuses the existing reversal rules`, async () => {
    const { db, tables } = await databaseHarness(seed());
    await remove(db);
    assert.equal(tables.transactions.length, 0);
    if (kind === 'account') {
      assert.equal(tables.accounts.length, 0);
      assert.equal(tables.ledgers[0].balance, 52);
    } else {
      assert.equal(tables.ledgers.length, 0);
      assert.equal(tables.accounts[0].borc, 0);
      assert.equal(tables.accounts[0].alacak, 5);
      assert.equal(tables.accounts[0].bakiye, 133);
    }
  });

  test(`${kind}: newly added history while preparing deletion aborts before any writes`, async () => {
    let historyReads = 0;
    const { db, calls, tables } = await databaseHarness({ ...seed(), fail: call => {
      if (call.table === 'transactions' && call.operation === 'select' && ++historyReads === 2) {
        tables.transactions.push({ ...movement, id: 'new' });
      }
    } });
    await assert.rejects(remove(db), /hareket geçmişi değişti/);
    assert.equal(calls.some(call => call.operation !== 'select'), false);
    assert.equal(tables.accounts.length, 1);
    assert.equal(tables.ledgers.length, 1);
  });

  test(`${kind}: linked interest is reversed once and failures require review`, async () => {
    const data = seed();
    data.transactions.push({ ...movement, id: 'interest', parent_id: movement.id, is_interest: true, amount: 2 });
    const { db, tables } = await databaseHarness(data);
    await remove(db);
    assert.equal(tables.transactions.length, 0);
    if (kind === 'account') assert.equal(tables.ledgers[0].balance, 54);
    else assert.equal(tables.accounts[0].bakiye, 135);

    const failed = await databaseHarness({ ...seed(), fail: call => call.table === 'accounts' && call.operation === 'update' ? { code: '23514' } : null });
    await assert.rejects(remove(failed.db), error => error.outcome === 'partial');
    assert.equal(failed.tables.accounts.length, 1);
    assert.equal(failed.tables.ledgers.length, 1);
  });
}

test('an inaccessible history never permits account or ledger deletion', async () => {
  const { db, calls } = await databaseHarness({ accounts: [account], fail: call => call.table === 'transactions' ? new Error('offline') : null });
  await assert.rejects(db.deleteAccount('a'), /doğrulanamadı/);
  await assert.rejects(db.deleteLedger('bank'), /doğrulanamadı/);
  assert.equal(calls.filter(call => call.operation !== 'select').length, 0);
});

test('an empty account can still be deliberately deleted without changing other accounts', async () => {
  const other = { ...account, id: 'other' };
  const { db, tables } = await databaseHarness({ accounts: [account, other] });
  await db.deleteAccount('a');
  assert.equal(tables.accounts.length, 1);
  assert.equal(tables.accounts[0].id, 'other');
  assert.equal(tables.accounts[0].bakiye, 123);
});

test('a rejected transport promise during insert is marked uncertain', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account], fail: call => { if (call.table === 'transactions' && call.operation === 'insert') throw new Error('connection closed'); } });
  await assert.rejects(db.addTransaction({ accountId: 'a', type: 'odeme', amount: 2, date: movement.date, description: 'Test', method: 'Nakit' }), error => error.outcome === 'uncertain');
  assert.equal(tables.accounts[0].bakiye, 123);
});

test('a rejected promise after movement insert remains a partial outcome', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account], fail: call => { if (call.table === 'accounts' && call.operation === 'select') throw new Error('connection closed'); } });
  await assert.rejects(db.addTransaction({ accountId: 'a', type: 'odeme', amount: 2, date: movement.date, description: 'Test', method: 'Nakit' }), error => error.outcome === 'partial');
  assert.equal(tables.transactions.length, 1);
});

test('an explicit insert rejection does not claim that a movement was saved', async () => {
  const { db, tables } = await databaseHarness({ accounts: [account], fail: call => call.table === 'transactions' && call.operation === 'insert' ? { code: '23514', message: 'rejected' } : null });
  await assert.rejects(db.addTransaction({ accountId: 'a', type: 'odeme', amount: 2, date: movement.date, description: 'Test', method: 'Nakit' }), error => error.code === '23514' && !error.outcome);
  assert.equal(tables.transactions.length, 0);
});

test('a refresh requested after a save is not lost behind an older pending read', async () => {
  let finishFirst;
  let runs = 0;
  const queue = createRefreshQueue(async () => {
    runs++;
    if (runs === 1) await new Promise(resolve => { finishFirst = resolve; });
  });
  const first = queue();
  const afterSave = queue();
  queue();
  finishFirst();
  await Promise.all([first, afterSave]);
  assert.equal(runs, 2);
});

test('the refresh queue remains usable after a failed read', async () => {
  let runs = 0;
  const queue = createRefreshQueue(async () => { if (++runs === 1) throw new Error('offline'); });
  await assert.rejects(queue(), /offline/);
  await queue();
  assert.equal(runs, 2);
});

for (const action of ['add', 'delete', 'bulk']) {
  for (const target of ['accounts', 'ledgers']) {
    test(`${action}: a concurrent ${target} update is preserved and requires review`, async () => {
      let harness;
      let conflicted = false;
      harness = await databaseHarness({
        accounts: [account], transactions: action === 'delete' ? [movement] : [],
        ledgers: [{ id: 'bank', institution_id: 'institution', balance: 42 }],
        fail: call => {
          if (!conflicted && call.table === target && call.operation === 'update') {
            conflicted = true;
            // Simulate a second session committing between our read and write.
            Object.assign(harness.tables[target][0], target === 'accounts'
              ? { borc: 900, alacak: 800, bakiye: 777 } : { balance: 888 });
          }
        },
      });
      const tx = { accountId: 'a', ledgerId: 'bank', type: 'odeme', amount: 2, date: movement.date, description: 'Test', method: 'Nakit' };
      await assert.rejects(action === 'add' ? harness.db.addTransaction(tx)
        : action === 'delete' ? harness.db.deleteTransaction('tx')
        : harness.db.addTransactionToMultipleAccounts(['a'], tx), error => error.outcome === 'partial');
      assert.equal(conflicted, true);
      if (target === 'accounts') {
        assert.equal(harness.tables.accounts[0].borc, 900);
        assert.equal(harness.tables.accounts[0].alacak, 800);
        assert.equal(harness.tables.accounts[0].bakiye, 777);
        assert.equal(harness.tables.ledgers[0].balance, 42);
      } else assert.equal(harness.tables.ledgers[0].balance, 888);
    });
  }
}

test('a movement deleted by another session is never reversed a second time', async () => {
  let harness;
  harness = await databaseHarness({
    accounts: [account], transactions: [movement],
    ledgers: [{ id: 'bank', institution_id: 'institution', balance: 42 }],
    fail: call => {
      if (call.table === 'transactions' && call.operation === 'delete') harness.tables.transactions.length = 0;
    },
  });
  await assert.rejects(harness.db.deleteTransaction('tx'), /artık bulunamıyor/);
  assert.equal(harness.tables.accounts[0].bakiye, 123);
  assert.equal(harness.tables.ledgers[0].balance, 42);
  assert.equal(harness.calls.some(call => call.operation === 'update'), false);
});

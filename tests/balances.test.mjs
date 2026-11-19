import test from 'node:test';
import assert from 'node:assert/strict';
import { historyWithSnapshots, movementTotals, inspectAccount, duplicateGroups, money } from '../src/lib/account-balance.ts';
import { readAllPages } from '../src/lib/paginated-read.ts';

const movements = [
  ['odeme', 438625, '2025-12-30'], ['tahsilat', 335825, '2025-12-31'],
  ['odeme', 3000, '2026-01-01'], ['tahsilat', 20000, '2026-01-27'],
  ['tahsilat', 20000, '2026-02-26'], ['tahsilat', 20000, '2026-03-12'],
  ['tahsilat', 25800, '2026-04-27'], ['tahsilat', 20000, '2026-05-21'],
  ['tahsilat', 20000, '2026-06-19'], ['odeme', 300000, '2026-06-27'],
  ['tahsilat', 5000, '2026-06-27'], ['odeme', 12000, '2026-07-01'],
].map(([type, amount, date], index) => ({ id: String(index), account_id: 'account', type, amount, date: date + 'T00:00:00Z' }));
const summary = { borc: 753625, alacak: 466625, bakiye: -287000 };

test('the old statement amounts total 753625 debt, 466625 credit and -287000 net', () => {
  assert.deepEqual(movementTotals(movements), summary);
});

test('each statement row shows its AFTER balance, including the first and last row', () => {
  const result = historyWithSnapshots(summary, [...movements].reverse()).reverse();
  assert.deepEqual(result[0].snapshot, { borc: 438625, alacak: 0, bakiye: 438625 });
  assert.deepEqual(result[1].snapshot, { borc: 438625, alacak: 335825, bakiye: 102800 });
  assert.equal(result.at(-1).snapshot.bakiye, 287000);
  assert.deepEqual(summary, { borc: 753625, alacak: 466625, bakiye: -287000 });
});

test('legacy opening balances are preserved, never inferred as zero', () => {
  const history = [{ id: 'a', type: 'odeme', amount: 100, date: '2026-01-01' }];
  const account = { borc: 1100, alacak: 200, bakiye: -900 };
  assert.deepEqual(historyWithSnapshots(account, history)[0].snapshot, { borc: 1100, alacak: 200, bakiye: 900 });
  assert.deepEqual(inspectAccount(account, history).reasons, []);
});

test('zero summaries with surviving history are flagged without changing the account', () => {
  const account = { borc: 0, alacak: 0, bakiye: 0 };
  const report = inspectAccount(account, movements);
  assert.match(report.reasons.join(' '), /tamamı sıfır/);
  assert.deepEqual(account, { borc: 0, alacak: 0, bakiye: 0 });
  assert.equal(report.movements.borc, 753625);
});

test('balanced paid accounts with nonzero gross totals are not mistaken for missing balances', () => {
  const history = [movements[0], { ...movements[1], amount: 438625 }];
  assert.deepEqual(inspectAccount({ borc: 438625, alacak: 438625, bakiye: 0 }, history).reasons, []);
});

test('an independently entered net balance is preserved and never forced to credit minus debt', () => {
  const report = inspectAccount({ ...summary, bakiye: 125 }, movements);
  assert.equal(report.stored.bakiye, 125);
  assert.deepEqual(report.reasons, []);
});

test('duplicate candidates respect account, timestamp, amount and all business fields', () => {
  const base = { ...movements[0], description: 'Aidat', method: 'Havale/EFT' };
  const repeated = { ...base, id: 'new', date: '2025-12-30T03:00:00+03:00' };
  assert.equal(duplicateGroups([base, repeated]).length, 1);
  for (const different of [
    { account_id: 'another' }, { amount: 438626 }, { description: 'Başka ödeme' },
    { type: 'tahsilat' }, { ledger_id: 'bank' }, { interest_rate: 2 },
    { date: '2025-12-30T00:01:00Z' }, { is_interest: true }, { parent_id: 'parent' },
  ]) assert.equal(duplicateGroups([base, { ...repeated, ...different }]).length, 0);
});

test('money handles numeric database strings and kuruş without concatenation or drift', () => {
  assert.equal(money('438625.00'), 438625);
  assert.equal(money('100.125'), 100.125);
  const rows = Array.from({ length: 100 }, (_, i) => ({ ...movements[0], id: String(i), amount: '0.10' }));
  assert.deepEqual(movementTotals(rows), { borc: 10, alacak: 0, bakiye: -10 });
  assert.throws(() => money('not a number'));
  assert.throws(() => historyWithSnapshots(summary, [{ ...movements[0], type: 'unknown' }]));
});

test('all history is read even with a server cap below 1000', async () => {
  const rows = Array.from({ length: 2307 }, (_, id) => ({ id }));
  let requests = 0;
  const result = await readAllPages(async from => {
    requests++;
    return { data: rows.slice(from, from + 250), count: rows.length, error: null };
  });
  assert.equal(result.length, 2307);
  assert.equal(requests, 10);
});

test('a failed later page never becomes a partial account history', async () => {
  await assert.rejects(readAllPages(async from => from ? { data: null, count: null, error: new Error('offline') } :
    { data: [{ id: 'first' }], count: 2, error: null }), /offline/);
});

test('changing counts, repeated pages and missing pages are rejected', async () => {
  await assert.rejects(readAllPages(async from => ({ data: [{ id: from }], count: from ? 3 : 2, error: null })), /değişti/);
  await assert.rejects(readAllPages(async () => ({ data: [{ id: 'same' }], count: 2, error: null })), /değişti/);
  await assert.rejects(readAllPages(async () => ({ data: [], count: 1, error: null })), /yüklenemedi/);
});

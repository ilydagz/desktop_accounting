import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import { databaseHarness } from './support/db-harness.mjs';

const legacy = await fs.readFile(new URL('./fixtures/legacy-accounting.ts', import.meta.url), 'utf8');
const account = { id: 'a', institution_id: 'institution', type: 'individual', name: 'Test', borc: 100, alacak: 20, bakiye: 137.25 };
const transaction = { accountId: 'a', type: 'odeme', amount: 30, description: 'Test', date: '2026-01-01T00:00:00Z', method: 'Nakit', ledgerId: 'bank' };
const seed = () => ({ accounts: [account, { ...account, id: 'b', borc: 7, alacak: 18, bakiye: -93 }], ledgers: [{ id: 'bank', institution_id: 'institution', balance: 901.25 }] });
async function compare(before, after, action) {
  await action(before.db);
  await action(after.db);
  assert.deepEqual(after.tables, before.tables);
}

for (const type of ['tahsilat', 'odeme']) {
  for (const amount of [0, -10, 0.125, 30, 1000]) {
    test(`existing ${type} behavior, ledger effect and paid-status rule are unchanged for ${amount}`, async () => {
      const before = await databaseHarness({ ...seed(), serviceSource: legacy });
      const after = await databaseHarness(seed());
      await compare(before, after, db => db.addTransaction({ ...transaction, type, amount }, true));
      await compare(before, after, db => db.deleteTransaction('inserted-1'));
    });
  }
  test(`bulk ${type} preserves every existing account and ledger formula`, async () => {
    const before = await databaseHarness({ ...seed(), serviceSource: legacy });
    const after = await databaseHarness(seed());
    await compare(before, after, db => db.addTransactionToMultipleAccounts(['a', 'b'], { ...transaction, type }, true));
  });
}

test('independently supplied opening amounts are unchanged from the accountant-approved baseline', async () => {
  const before = await databaseHarness({ serviceSource: legacy });
  const after = await databaseHarness();
  await compare(before, after, db => db.addAccount({ ...account, borc: -10, alacak: 50, bakiye: 713.125 }));
});

test('deleting a parent and child interest preserves the original reversal behavior', async () => {
  const data = { ...seed(), transactions: [
    { id: 'parent', account_id: 'a', ledger_id: 'bank', type: 'odeme', amount: 30 },
    { id: 'child', parent_id: 'parent', account_id: 'a', type: 'odeme', amount: 2.5, is_interest: true },
  ] };
  const before = await databaseHarness({ ...data, serviceSource: legacy });
  const after = await databaseHarness(data);
  await compare(before, after, db => db.deleteTransaction('parent'));
});

test('the original paid-status update is preserved', async () => {
  const data = { transactions: [{ id: 'paid', is_paid: false }] };
  const before = await databaseHarness({ ...data, serviceSource: legacy });
  const after = await databaseHarness(data);
  await compare(before, after, db => db.updateTransactionPaidStatus('paid', true));
});

test('all interest, principal, day-count, rounding and net-difference expressions match the frozen baseline', async () => {
  const baseline = JSON.parse(await fs.readFile(new URL('./fixtures/accounting-expressions.json', import.meta.url), 'utf8'));
  const names = new Set(['finalAmount', 'principal', 'dailyRate', 'diffTime', 'diffDays', 'interestAmount', 'netFark']);
  for (const [filename, expected] of Object.entries(baseline.files)) {
    const source = await fs.readFile(filename, 'utf8');
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const expressions = [];
    const normalized = node => node.getText(ast).replace(/\s+/g, ' ').trim();
    function visit(node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.has(node.name.text) && node.initializer) expressions.push([node.name.text, normalized(node.initializer)]);
      if (ts.isBinaryExpression(node) && ts.isIdentifier(node.left) && node.left.text === 'finalAmount' && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) expressions.push(['finalAmount=', normalized(node.right)]);
      ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.deepEqual(expressions, expected, filename);
  }
});

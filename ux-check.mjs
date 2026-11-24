import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/ux-check', pretendToBeVisual: true });
for (const key of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Element', 'Node', 'NodeFilter', 'DocumentFragment', 'MutationObserver', 'CustomEvent', 'Event', 'KeyboardEvent', 'MouseEvent', 'getComputedStyle']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.PointerEvent = dom.window.PointerEvent = class extends dom.window.MouseEvent { constructor(type, options) { super(type, options); this.pointerType = options?.pointerType || 'mouse'; this.pointerId = 1; } };
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.HTMLElement.prototype.hasPointerCapture = () => false;
dom.window.HTMLElement.prototype.setPointerCapture = function () {};
dom.window.HTMLElement.prototype.releasePointerCapture = function () {};

const api = globalThis.__limesUiCheck = {
  saved: [], attempts: 0, refreshes: 0, failure: false, duplicate: false, saveWait: null, deletions: 0, deleteWait: null,
  accounts: [{ id: 'a', name: 'Örnek A', custom_code: 'TEST-001', type: 'individual', borc: 10, alacak: 5, bakiye: 123 }],
  ledgers: [{ id: 'cash', name: 'Test kasası', type: 'kasa', balance: 100 }], transactions: [],
};
const mockDb = `
import { WriteOutcomeError } from '@/lib/action-safety';
const api = globalThis.__limesUiCheck;
export async function addTransaction(tx) {
  api.attempts++;
  await api.saveWait;
  if (api.failure) throw new WriteOutcomeError('Sonuç belirsiz', 'uncertain');
  if (api.duplicate) throw new Error('Bu hareket zaten kayıtlı.');
  api.saved.push(tx);
}
export async function addTransactionToMultipleAccounts() {}
export async function deleteTransaction() {}
export async function validateTransactionEdit() {}
export async function updateTransactionPaidStatus() {}
export async function getAccount() { return api.accounts[0]; }
export async function getAccounts() { return api.accounts; }
export async function getTransactionsByAccount() { return []; }
export async function addLedger() {}
export async function deleteLedger() { api.deletions++; await api.deleteWait; }
export async function getAccountingAudit() { return { capturedAt: new Date().toISOString(), accounts: [], ledgers: [] }; }
`;
const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ActionSafetyProvider } from '@/contexts/ActionSafetyContext';
import TransactionsPage from '@/pages/TransactionsPage';
import LedgersPage from '@/pages/LedgersPage';
import { WriteSafetyStatus } from '@/components/WriteSafetyStatus';
import { Toaster } from '@/components/ui/toaster';
export function mount(container, screen='transactions') { const root=createRoot(container); root.render(<BrowserRouter><ActionSafetyProvider userId="ui-check"><WriteSafetyStatus/>{screen==='ledgers' ? <LedgersPage/> : <TransactionsPage/>}<Toaster/></ActionSafetyProvider></BrowserRouter>); return root; }
`;
const compiled = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false,
  platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent',
  plugins: [{ name: 'isolated-ui', setup(builder) {
    builder.onResolve({ filter: /^@\/contexts\/(AuthContext|DataContext)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    builder.onResolve({ filter: /^@\/services\/db$/ }, args => ({ path: args.path, namespace: 'mock' }));
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ loader: 'js', resolveDir: process.cwd(), contents:
      args.path.endsWith('AuthContext') ? `export function useAuth(){return {user:{id:'ui-check'},institutionType:'koop',institutionId:'institution'};}` :
      args.path.endsWith('DataContext') ? `export function useData(){const api=globalThis.__limesUiCheck;return {...api,refreshData:async()=>{api.refreshes++;}};}` : mockDb,
    }));
  } }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { act } = await import('react');
let root;
const button = (text, scope = document) => {
  const found = [...scope.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  assert.ok(found, `Button '${text}' missing: ${[...scope.querySelectorAll('button')].map(item => item.textContent.trim()).join(' | ')}`);
  return found;
};
const click = async element => { assert.ok(element); await act(async () => { element.click(); }); };
const dialog = () => document.querySelector('[role="dialog"]');
const alert = () => document.querySelector('[role="alertdialog"]');
const fill = async (element, value) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
};
async function openForm() {
  await click(button('Yeni İşlem Ekle'));
  const trigger = dialog().querySelector('[role="combobox"]');
  await act(async () => { trigger.focus(); trigger.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true })); });
  const option = document.querySelector('[role="option"]');
  assert.ok(option, 'Account option did not open');
  await act(async () => { option.focus(); option.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); });
  assert.match(trigger.textContent, /Örnek A/, 'The account must be selected before saving');
  await fill(dialog().querySelector('input[type="number"]'), '200');
}

await act(async () => { root = module.exports.mount(document.getElementById('root')); });
await openForm();
await click(button('Close', dialog()));
assert.equal(dialog(), null);
assert.equal(alert(), null);
assert.equal(api.attempts, 0);
console.log('PASS: cancelling an edited form closes it directly without a request');

await openForm();
let finishSave;
api.saveWait = new Promise(resolve => { finishSave = resolve; });
const saveButton = button('Tahsilatı Kaydet', dialog());
await act(async () => { saveButton.click(); saveButton.click(); });
assert.equal(alert(), null);
assert.equal(api.attempts, 1);
assert.equal(button('Kaydediliyor…', dialog()).disabled, true);
assert.equal(api.saved.length, 0);
await click(button('Close', dialog()));
assert.ok(dialog());
await act(async () => { finishSave(); });
api.saveWait = null;
assert.equal(api.saved[0].amount, 200);
assert.equal(api.saved[0].type, 'tahsilat');
assert.equal(dialog(), null);
assert.match(document.body.textContent, /İşlem kaydedildi/);
console.log('PASS: saving starts directly, blocks repeated clicks and displays progress and success');

await openForm();
Object.defineProperty(dom.window.navigator, 'onLine', { configurable: true, value: false });
await act(async () => { dom.window.dispatchEvent(new dom.window.Event('offline')); });
assert.equal(button('Tahsilatı Kaydet', dialog()).disabled, true);
assert.equal(dialog().querySelector('input[type="number"]').value, '200');
Object.defineProperty(dom.window.navigator, 'onLine', { configurable: true, value: true });
await act(async () => { dom.window.dispatchEvent(new dom.window.Event('online')); });
assert.equal(button('Tahsilatı Kaydet', dialog()).disabled, false);
console.log('PASS: offline submission is disabled without losing the form');

api.duplicate = true;
await click(button('Tahsilatı Kaydet', dialog()));
assert.equal(api.attempts, 2);
assert.equal(api.saved.length, 1);
assert.equal(alert(), null);
assert.equal(dialog().querySelector('input[type="number"]').value, '200');
assert.match(document.body.textContent, /Bu hareket zaten kayıtlı/);
api.duplicate = false;
console.log('PASS: duplicates leave the form open and show an error without resubmitting');

api.failure = true;
await click(button('Tahsilatı Kaydet', dialog()));
assert.equal(api.attempts, 3);
assert.equal(button('Tahsilatı Kaydet', dialog()).disabled, true);
assert.match(document.body.textContent, /Son işlemin sonucu kontrol edilmeli/);
assert.ok(dom.window.localStorage.getItem('limes:write-review:ui-check'));
console.log('PASS: an uncertain response blocks retry and persists only a review marker');

await click(button('Close', dialog()));
await act(async () => { root.unmount(); });
await act(async () => { root = module.exports.mount(document.getElementById('root')); });
assert.match(document.body.textContent, /Son işlemin sonucu kontrol edilmeli/);
await click(button('Kayıtları kontrol ettim'));
assert.equal(alert(), null);
assert.equal(dom.window.localStorage.getItem('limes:write-review:ui-check'), null);
assert.equal(api.attempts, 3);
console.log('PASS: reopening retains the warning; acknowledging it never posts a movement');

await act(async () => { root.unmount(); });
await act(async () => { root = module.exports.mount(document.getElementById('root'), 'ledgers'); });
const deleteLedgerButton = document.querySelector('button[aria-label="Test kasası hesabını sil"]');
let finishDelete;
api.deleteWait = new Promise(resolve => { finishDelete = resolve; });
await act(async () => { deleteLedgerButton.click(); deleteLedgerButton.click(); });
assert.equal(api.deletions, 1);
assert.equal(alert(), null);
assert.equal(deleteLedgerButton.disabled, true);
assert.match(document.querySelector('[role="status"]').textContent, /İşleminiz sürüyor/);
await act(async () => { finishDelete(); });
assert.match(document.body.textContent, /Başarıyla Silindi/);
console.log('PASS: direct ledger deletion shows progress and only submits once');
await act(async () => { root.unmount(); });
dom.window.close();
console.log('All 7 isolated UI checks passed. No real database requests were available.');

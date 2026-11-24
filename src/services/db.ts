import { supabase } from "@/lib/supabase";
import { readAllPages } from "@/lib/paginated-read";
import { inspectAccount, money, movementKey, type Balance } from "@/lib/account-balance";
import { WriteOutcomeError, throwWriteError } from '@/lib/action-safety';

// Oturum açan kullanıcının kurum ID'sini getirir
async function getInstitutionId() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Oturum bulunamadı");

  const { data, error } = await supabase
    .from('profiles')
    .select('institution_id')
    .eq('id', user.id)
    .single();

  if (error || !data?.institution_id) throw new Error("Kurum bilgisi bulunamadı");
  return data.institution_id;
}

// Demo Mod Kontrolü
const isDemoMode = import.meta.env.VITE_SUPABASE_URL === undefined || import.meta.env.VITE_SUPABASE_URL === "";
function requireWriteConnection() {
  if (isDemoMode || !import.meta.env.VITE_SUPABASE_ANON_KEY) throw new Error('Sunucu bağlantısı yapılandırılmamış. Kayıt gönderilmedi.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Çevrimdışısınız. Kayıt gönderilmedi; bağlantı geldikten sonra deneyin.');
}
async function writeResponse<T>(request: PromiseLike<T>): Promise<T> {
  try { return await request; }
  catch (error) { throwWriteError(error); }
}
// Keep the original decimal spelling for conditional writes. Reading a
// PostgreSQL numeric as a JSON number can lose digits before it is compared.
const accountBalanceSnapshot = 'borc::text, alacak::text, bakiye::text';

function previousValueOperator(value: string | null) {
  return value === null ? 'is' : 'eq';
}

async function afterMovement<T>(request: PromiseLike<T>): Promise<T> {
  try { return await request; }
  catch { throw new WriteOutcomeError('Hareketin bir bölümü kaydedildi ancak sonraki adımlar tamamlanamadı. Yeniden göndermeden önce Hesap Kontrolü raporunu inceleyin.', 'partial'); }
}

// Geriye Dönük Uyumluluk için boş init
export async function initDB() {
  if (isDemoMode) console.warn("DEMO MOD: Supabase ayarları eksik. Veriler kaydedilmeyecektir.");
}

// --- ACCOUNTS (CARİLER) ---

export async function getAccounts(institutionId?: string) {
  if (isDemoMode) return [];
  const institution_id = institutionId ?? await getInstitutionId();
  const data = await readAllPages<any>((from, to) => supabase.from('accounts').select('*', { count: 'exact' })
    .eq('institution_id', institution_id).order('created_at', { ascending: false }).order('id').range(from, to));
  return data.map(acc => ({ ...acc, borc: money(acc.borc), alacak: money(acc.alacak), bakiye: money(acc.bakiye) }));
}

export async function getAccount(id: string) {
  const institution_id = await getInstitutionId();
  const { data, error } = await supabase.from('accounts').select('*').eq('institution_id', institution_id).eq('id', id).single();
  if (error || !data) throw error || new Error('Hesap yüklenemedi.');
  return { ...data, borc: money(data.borc), alacak: money(data.alacak), bakiye: money(data.bakiye) };
}

export async function addAccount(account: any) {
  requireWriteConnection();
  const institution_id = await getInstitutionId();
  const { error } = await writeResponse(supabase.from('accounts').insert([{ ...account, institution_id }]));
  if (error) throwWriteError(error);
}

async function deleteWithHistory(table: 'accounts' | 'ledgers', field: 'account_id' | 'ledger_id', id: string) {
  requireWriteConnection();
  const institution_id = await getInstitutionId();
  const readHistory = () => readAllPages<{ id: string; parent_id?: string }>((from, to) => supabase.from('transactions')
    .select('id, parent_id', { count: 'exact' }).eq('institution_id', institution_id).eq(field, id).order('id').range(from, to));
  let history;
  try { history = await readHistory(); }
  catch { throw new Error('İşlem geçmişi doğrulanamadı. Hesap silinmedi.'); }
  // Abort before changing data if the list shifted while preparing the deletion.
  const current = await readHistory();
  const historyIds = new Set(history.map(tx => tx.id));
  if (current.length !== history.length || current.some(tx => !historyIds.has(tx.id))) {
    throw new Error('Silme işlemi hazırlanırken hareket geçmişi değişti. Listeyi yenileyip tekrar deneyin.');
  }
  const roots = history.filter(tx => !tx.parent_id || !historyIds.has(tx.parent_id));
  if (history.length && !roots.length) throw new Error('Bağlı hareketler doğrulanamadı. Hesap silinmedi.');
  let started = false;
  try {
    for (const tx of roots) {
      started = true;
      // Reuse the existing reversal formulas, including linked interest.
      await deleteTransaction(tx.id);
    }
    if ((await readHistory()).length) throw new Error('Yeni hareketler bulundu. Hesap silinmedi.');
    const { data, error } = await writeResponse(supabase.from(table).delete().eq('institution_id', institution_id).eq('id', id).select('id').single());
    if (error) throwWriteError(error);
    if (!data) throw new Error('Hesap bulunamadı veya silme yetkisi yok.');
  } catch (error) {
    if (started) throw new WriteOutcomeError('Silme işleminin bazı adımları tamamlanmış olabilir. Yeniden denemeden önce hareketleri ve Hesap Kontrolü raporunu inceleyin.', 'partial');
    throw error;
  }
}

export async function deleteAccount(id: string) {
  await deleteWithHistory('accounts', 'account_id', id);
}

export async function updateAccount(id: string, account: any, originalBalances?: Balance) {
  requireWriteConnection();
  // A stale contact form must never overwrite balances changed by movements.
  const { borc, alacak, bakiye, institution_id: _institution, id: _id, ...details } = account;
  const institution_id = await getInstitutionId();
  const changed = originalBalances && (
    money(borc) !== originalBalances.borc || money(alacak) !== originalBalances.alacak || money(bakiye) !== originalBalances.bakiye
  );
  // Preserve deliberate manual amounts, including an independently entered net.
  // Metadata-only saves omit balances. Explicit edits require the original
  // balances to still match, so a stale form cannot erase newer movements.
  const patch = changed ? { ...details, borc: money(borc), alacak: money(alacak), bakiye: money(bakiye) } : details;
  let query = supabase.from('accounts').update(patch).eq('institution_id', institution_id).eq('id', id);
  if (changed) query = query.eq('borc', originalBalances.borc).eq('alacak', originalBalances.alacak).eq('bakiye', originalBalances.bakiye);
  const { data, error } = await writeResponse(query.select('id').single());
  if (error && !error.code) throwWriteError(error);
  if (error || !data) throw new Error('Hesap güncellenemedi veya bakiyeler form açıldıktan sonra değişti. Güncel hesabı yeniden açın.');
}

// --- LEDGERS (KASA / BANKA) ---

export async function getLedgers(institutionId?: string) {
  if (isDemoMode) return [];
  const institution_id = institutionId ?? await getInstitutionId();
  return readAllPages<any>((from, to) => supabase.from('ledgers').select('*', { count: 'exact' })
    .eq('institution_id', institution_id).order('created_at', { ascending: false }).order('id').range(from, to));
}

export async function addLedger(ledger: { type: 'kasa' | 'banka', name: string, currency?: string }) {
  requireWriteConnection();
  const institution_id = await getInstitutionId();
  const { error } = await writeResponse(supabase.from('ledgers').insert([{ ...ledger, institution_id }]));
  if (error) throwWriteError(error);
}

export async function deleteLedger(id: string) {
  await deleteWithHistory('ledgers', 'ledger_id', id);
}

// --- TRANSACTIONS (İŞLEMLER) ---

export async function getTransactionsByAccount(accountId: string, startDate?: string, endDate?: string) {
  if (isDemoMode) return [];
  const institution_id = await getInstitutionId();
  return readAllPages<any>((from, to) => {
    let query = supabase.from('transactions').select('*', { count: 'exact' })
      .eq('institution_id', institution_id).eq('account_id', accountId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    return query.order('date', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
  });
}

export async function getTransactions(institutionId?: string) {
  if (isDemoMode) return [];
  const institution_id = institutionId ?? await getInstitutionId();
  const data = await readAllPages<any>((from, to) => supabase.from('transactions')
    .select('*, accounts (name), ledgers (name)', { count: 'exact' })
    .eq('institution_id', institution_id).order('date', { ascending: false })
    .order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to));
  
  // Eski UI ile uyumlu olması için accountName ekleyelim
  return data.map(tx => ({
    ...tx, amount: money(tx.amount),
    accountName: tx.accounts?.name,
    ledgerName: tx.ledgers?.name
  }));
}

export class DuplicateTransactionError extends Error {
  constructor() { super('Aynı hesap, tarih, tutar ve açıklamaya sahip bir hareket zaten var. Bu ayrı bir hareketse açıklamasına makbuz veya işlem numarası gibi ayırt edici bir bilgi ekleyin.'); }
}

type TransactionInput = { accountId: string, ledgerId?: string | null, type: 'tahsilat' | 'odeme', amount: number, description: string, date: string, method: string, maturity_date?: string, interest_rate?: number, interest_type?: string, is_interest?: boolean, parent_id?: string };

async function checkDuplicate(tx: TransactionInput, institutionId: string, excludeId?: string) {
  const candidates = await readAllPages<any>((from, to) => supabase.from('transactions').select('*', { count: 'exact' })
    .eq('institution_id', institutionId).eq('account_id', tx.accountId).eq('date', tx.date)
    .eq('type', tx.type).eq('amount', tx.amount).order('id').range(from, to));
  const key = movementKey({ ...tx, account_id: tx.accountId, ledger_id: tx.ledgerId });
  // The database already compared timestamps in .eq('date', ...). Reuse the
  // submitted spelling here: a timezone-less datetime input is otherwise
  // parsed differently by the browser and PostgreSQL, hiding a duplicate.
  if (candidates.some(candidate => candidate.id !== excludeId && movementKey({ ...candidate, date: tx.date }) === key)) throw new DuplicateTransactionError();
}

export async function validateTransactionEdit(id: string, tx: TransactionInput) {
  money(tx.amount);
  await checkDuplicate(tx, await getInstitutionId(), id);
}

export async function addTransaction(tx: TransactionInput, allowDuplicate = false) {
  requireWriteConnection();
  const institution_id = await getInstitutionId();
  tx = { ...tx, amount: money(tx.amount) };
  if (!allowDuplicate) await checkDuplicate(tx, institution_id);
  
  // 1. İşlemi ekle
  const { error: txError } = await writeResponse(supabase.from('transactions').insert([{
    institution_id,
    account_id: tx.accountId,
    ledger_id: tx.ledgerId || null,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    method: tx.method,
    date: tx.date,
    maturity_date: tx.maturity_date || null,
    interest_rate: tx.interest_rate || 0,
    interest_type: tx.interest_type || null,
    is_interest: tx.is_interest || false,
    parent_id: tx.parent_id || null,
    is_paid: false
  }]));
  
  if (txError) throwWriteError(txError);

  // 2. Cari bakiyeyi güncelle
  const partialFailure = (cause: unknown): never => {
    console.error('İşlem kaydedildi, bakiye güncellenemedi:', cause);
    throw new WriteOutcomeError('İşlem kaydı oluşturuldu ancak bakiye güncellemesi tamamlanamadı. Aynı işlemi yeniden girmeyin; Hesap Kontrolü raporunu alın.', 'partial');
  };
  const { data: accData, error: accReadError } = await afterMovement(supabase.from('accounts').select(accountBalanceSnapshot).eq('id', tx.accountId).single());
  if (accReadError || !accData) partialFailure(accReadError);
  
  if (accData) {
    let borc = money(accData.borc), alacak = money(accData.alacak), bakiye = money(accData.bakiye);
    if (tx.type === 'tahsilat') {
      alacak += tx.amount;
      bakiye += tx.amount;
    } else {
      borc += tx.amount;
      bakiye -= tx.amount;
    }
    // A different session may have changed these totals since the read. Refuse
    // to overwrite them; the existing partial-outcome review handles the rest.
    const { data, error } = await afterMovement(supabase.from('accounts').update({ borc: money(borc), alacak: money(alacak), bakiye: money(bakiye) }).eq('id', tx.accountId)
      .filter('borc', previousValueOperator(accData.borc), accData.borc)
      .filter('alacak', previousValueOperator(accData.alacak), accData.alacak)
      .filter('bakiye', previousValueOperator(accData.bakiye), accData.bakiye).select('id').single());
    if (error || !data) partialFailure(error);

    if (alacak >= borc) {
      const { error } = await afterMovement(supabase.from('transactions').update({ is_paid: true }).eq('account_id', tx.accountId).eq('is_paid', false).gt('interest_rate', 0).eq('type', 'odeme'));
      if (error) partialFailure(error);
    }
  }

  // 3. Kasa/Banka bakiyesini güncelle
  if (tx.ledgerId) {
    const { data: lData, error: ledgerReadError } = await afterMovement(supabase.from('ledgers').select('balance::text').eq('id', tx.ledgerId).single());
    if (ledgerReadError || !lData) partialFailure(ledgerReadError);
    if (lData) {
      let balance = money(lData.balance);
      if (tx.type === 'tahsilat') {
        balance += tx.amount; // Tahsilat kasaya para sokar
      } else {
        balance -= tx.amount; // Ödeme kasadan para çıkarır
      }
      const { data, error } = await afterMovement(supabase.from('ledgers').update({ balance: money(balance) }).eq('id', tx.ledgerId).filter('balance', previousValueOperator(lData.balance), lData.balance).select('id').single());
      if (error || !data) partialFailure(error);
    }
  }
}

export async function deleteTransaction(txId: string) {
  requireWriteConnection();
  
  // Önce işlemi bul
  const { data: tx, error: fetchErr } = await supabase.from('transactions').select('*').eq('id', txId).single();
  if (fetchErr || !tx) {
    console.error("Transaction not found or fetch error:", fetchErr);
    throw new Error("İşlem bulunamadı.");
  }

  // Varsa alt işlemleri (faiz gibi) önce sil
  const children = await readAllPages<any>((from, to) => supabase.from('transactions').select('id', { count: 'exact' }).eq('parent_id', txId).order('id').range(from, to));
  if (children && children.length > 0) {
    for (const child of children) {
      try { await deleteTransaction(child.id); }
      catch { throw new WriteOutcomeError('Bağlı hareketleri silme işlemi tamamlanamadı. Bazı adımlar tamamlanmış olabilir; yeniden denemeden önce Hesap Kontrolü raporunu inceleyin.', 'partial'); }
    }
  }

  // İşlemi sil
  const { data: deleted, error: delErr } = await writeResponse(supabase.from('transactions').delete().eq('id', txId).select('id').single());
  if (delErr || !deleted) {
    console.error("Transaction delete error:", delErr);
    if (children.length) throw new WriteOutcomeError('Silme işleminin bazı adımları tamamlanamadı. Yeniden denemeden önce Hesap Kontrolü raporunu inceleyin.', 'partial');
    if (delErr) throwWriteError(delErr);
    throw new Error('Hareket artık bulunamıyor. Bakiyeler değiştirilmedi; listeyi yenileyin.');
  }
  const partialFailure = (cause: unknown): never => {
    console.error('Silme sonrası bakiye güncellenemedi:', cause);
    throw new WriteOutcomeError('İşlem silindi ancak bakiye güncellemesi tamamlanamadı. Hesap Kontrolü raporunu alın; bakiyeyi düzeltmek için yeni hareket girmeyin.', 'partial');
  };

  // Bakiyeleri geri al
  if (tx.account_id) {
    const { data: accData, error: accErr } = await afterMovement(supabase.from('accounts').select(accountBalanceSnapshot).eq('id', tx.account_id).single());
    if (accErr || !accData) partialFailure(accErr);
    if (accData && !accErr) {
      let borc = money(accData.borc), alacak = money(accData.alacak), bakiye = money(accData.bakiye);
      tx.amount = money(tx.amount);
      if (tx.type === 'tahsilat') {
        alacak -= tx.amount;
        bakiye -= tx.amount;
      } else {
        borc -= tx.amount;
        bakiye += tx.amount;
      }
      const { data, error } = await afterMovement(supabase.from('accounts').update({ borc: money(borc), alacak: money(alacak), bakiye: money(bakiye) }).eq('id', tx.account_id)
        .filter('borc', previousValueOperator(accData.borc), accData.borc)
        .filter('alacak', previousValueOperator(accData.alacak), accData.alacak)
        .filter('bakiye', previousValueOperator(accData.bakiye), accData.bakiye).select('id').single());
      if (error || !data) partialFailure(error);
    }
  }

  if (tx.ledger_id) {
    const { data: lData, error: lErr } = await afterMovement(supabase.from('ledgers').select('balance::text').eq('id', tx.ledger_id).single());
    if (lErr || !lData) partialFailure(lErr);
    if (lData && !lErr) {
      let balance = money(lData.balance);
      if (tx.type === 'tahsilat') balance -= tx.amount;
      else balance += tx.amount;
      const { data, error } = await afterMovement(supabase.from('ledgers').update({ balance: money(balance) }).eq('id', tx.ledger_id).filter('balance', previousValueOperator(lData.balance), lData.balance).select('id').single());
      if (error || !data) partialFailure(error);
    }
  }
}

export async function updateTransactionPaidStatus(txId: string, isPaid: boolean) {
  requireWriteConnection();
  const { data, error } = await writeResponse(supabase.from('transactions').update({ is_paid: isPaid }).eq('id', txId).select('id').single());
  if (error) throwWriteError(error);
  if (!data) throw new Error('İşlem güncellenemedi. Listeyi yenileyin.');
}

export async function addTransactionToMultipleAccounts(accountIds: string[], txTemplate: any, allowDuplicate = false) {
  requireWriteConnection();
  const institution_id = await getInstitutionId();
  accountIds = [...new Set(accountIds)];
  if (!accountIds.length) throw new Error('İşlem yapılacak hesap bulunamadı.');
  txTemplate = { ...txTemplate, amount: money(txTemplate.amount) };
  if (!allowDuplicate) {
    for (const accountId of accountIds) await checkDuplicate({ ...txTemplate, accountId }, institution_id);
  }
  
  // Create transactions array
  const inserts = accountIds.map(accountId => ({
    institution_id,
    account_id: accountId,
    ledger_id: txTemplate.ledgerId || null,
    type: txTemplate.type,
    amount: txTemplate.amount,
    description: txTemplate.description,
    method: txTemplate.method,
    date: txTemplate.date,
    maturity_date: txTemplate.maturity_date || null,
    interest_rate: txTemplate.interest_rate || 0,
    interest_type: txTemplate.interest_type || null,
    is_interest: txTemplate.is_interest || false,
    parent_id: txTemplate.parent_id || null,
    is_paid: false
  }));

  const { error } = await writeResponse(supabase.from('transactions').insert(inserts));
  if (error) throwWriteError(error);

  // Update balances for all accounts
  const partialFailure = (cause: unknown): never => {
    console.error('Toplu işlemde bakiye güncellemesi tamamlanamadı:', cause);
    throw new WriteOutcomeError('Toplu işlem kayıtları oluşturuldu ancak tüm bakiyeler güncellenemedi. Aynı işlemi yeniden girmeyin; Hesap Kontrolü raporunu alın.', 'partial');
  };
  const { data: accountsData, error: accountsReadError } = await afterMovement(supabase.from('accounts').select(`id, ${accountBalanceSnapshot}`).in('id', accountIds));
  if (accountsReadError || accountsData?.length !== accountIds.length) partialFailure(accountsReadError);
  
  if (accountsData) {
    for (const acc of accountsData) {
      let borc = money(acc.borc), alacak = money(acc.alacak), bakiye = money(acc.bakiye);
      if (txTemplate.type === 'tahsilat') {
        alacak += txTemplate.amount;
        bakiye += txTemplate.amount;
      } else {
        borc += txTemplate.amount;
        bakiye -= txTemplate.amount;
      }
      const { data, error } = await afterMovement(supabase.from('accounts').update({ borc: money(borc), alacak: money(alacak), bakiye: money(bakiye) }).eq('id', acc.id)
        .filter('borc', previousValueOperator(acc.borc), acc.borc)
        .filter('alacak', previousValueOperator(acc.alacak), acc.alacak)
        .filter('bakiye', previousValueOperator(acc.bakiye), acc.bakiye).select('id').single());
      if (error || !data) partialFailure(error);

      if (alacak >= borc) {
        const { error } = await afterMovement(supabase.from('transactions').update({ is_paid: true }).eq('account_id', acc.id).eq('is_paid', false).gt('interest_rate', 0).eq('type', 'odeme'));
        if (error) partialFailure(error);
      }
    }
  }

  // Update ledger balance once (Total amount = amount * accounts.length)
  if (txTemplate.ledgerId) {
    const totalAmount = txTemplate.amount * accountIds.length;
    const { data: lData, error: ledgerReadError } = await afterMovement(supabase.from('ledgers').select('balance::text').eq('id', txTemplate.ledgerId).single());
    if (ledgerReadError || !lData) partialFailure(ledgerReadError);
    if (lData) {
      let balance = money(lData.balance);
      if (txTemplate.type === 'tahsilat') {
        balance += totalAmount;
      } else {
        balance -= totalAmount;
      }
      const { data, error } = await afterMovement(supabase.from('ledgers').update({ balance: money(balance) }).eq('id', txTemplate.ledgerId).filter('balance', previousValueOperator(lData.balance), lData.balance).select('id').single());
      if (error || !data) partialFailure(error);
    }
  }
}

// Legacy entry point is deliberately non-writing: zeroing every account could
// destroy opening balances and leave accounts at zero after a failed read.
export async function recalculateAllBalances(): Promise<never> {
  throw new Error('Toplu bakiye sıfırlama kapatıldı. Hesap Kontrolü ile kayıtları inceleyin; doğrulanmış açılış bilgisi olmadan bakiye değiştirilemez.');
}

export async function getAccountingAudit() {
  if (isDemoMode) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');
  const institutionId = await getInstitutionId();
  const [accounts, transactions, ledgers] = await Promise.all([
    getAccounts(institutionId), getTransactions(institutionId), getLedgers(institutionId),
  ]);
  const accountReports = accounts.filter(account => account.type !== 'owner').map(account => {
    const history = transactions.filter(tx => tx.account_id === account.id);
    return {
      account: { id: account.id, name: account.name, custom_code: account.custom_code, created_at: account.created_at },
      ...inspectAccount(account, history),
      history: history.map(({ accounts: _account, ledgers: _ledger, accountName: _name, ledgerName: _ledgerName, ...tx }) => tx),
    };
  });
  return {
    capturedAt: new Date().toISOString(), institutionId,
    note: 'Salt okunur inceleme. Açılış tutarları bilinmiyor. Benzer işlemler otomatik silinmez. Kayıt girişi sürüyorsa raporu işlemler bittikten sonra yenileyin.',
    accounts: accountReports,
    ledgers: ledgers.map(ledger => ({ id: ledger.id, name: ledger.name, balance: ledger.balance })),
  };
}

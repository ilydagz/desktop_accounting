// Frozen accounting behavior from 926ae07. Used only with the mock database.
import { supabase } from "@/lib/supabase";
const isDemoMode = false;

async function getInstitutionId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum bulunamadı");

  const { data, error } = await supabase
    .from('profiles')
    .select('institution_id')
    .eq('id', user.id)
    .single();

  if (error || !data) throw new Error("Kurum bilgisi bulunamadı");
  return data.institution_id;
}

export async function addAccount(account: any) {
  if (isDemoMode) return;
  const institution_id = await getInstitutionId();
  const { error } = await supabase.from('accounts').insert([{ ...account, institution_id }]);
  if (error) throw error;
}

export async function addTransaction(tx: { accountId: string, ledgerId?: string | null, type: 'tahsilat' | 'odeme', amount: number, description: string, date: string, method: string, maturity_date?: string, interest_rate?: number, interest_type?: string, is_interest?: boolean, parent_id?: string }) {
  if (isDemoMode) return;
  const institution_id = await getInstitutionId();
  
  // 1. İşlemi ekle
  const { error: txError } = await supabase.from('transactions').insert([{
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
  }]);
  
  if (txError) throw txError;

  // 2. Cari bakiyeyi güncelle
  const { data: accData } = await supabase.from('accounts').select('borc, alacak, bakiye').eq('id', tx.accountId).single();
  
  if (accData) {
    let { borc, alacak, bakiye } = accData;
    if (tx.type === 'tahsilat') {
      alacak += tx.amount;
      bakiye += tx.amount;
    } else {
      borc += tx.amount;
      bakiye -= tx.amount;
    }
    await supabase.from('accounts').update({ borc, alacak, bakiye }).eq('id', tx.accountId);

    if (alacak >= borc) {
      await supabase.from('transactions').update({ is_paid: true }).eq('account_id', tx.accountId).eq('is_paid', false).gt('interest_rate', 0).eq('type', 'odeme');
    }
  }

  // 3. Kasa/Banka bakiyesini güncelle
  if (tx.ledgerId) {
    const { data: lData } = await supabase.from('ledgers').select('balance').eq('id', tx.ledgerId).single();
    if (lData) {
      let balance = lData.balance;
      if (tx.type === 'tahsilat') {
        balance += tx.amount; // Tahsilat kasaya para sokar
      } else {
        balance -= tx.amount; // Ödeme kasadan para çıkarır
      }
      await supabase.from('ledgers').update({ balance }).eq('id', tx.ledgerId);
    }
  }
}

export async function deleteTransaction(txId: string) {
  if (isDemoMode) return;
  
  // Önce işlemi bul
  const { data: tx, error: fetchErr } = await supabase.from('transactions').select('*').eq('id', txId).single();
  if (fetchErr || !tx) {
    console.error("Transaction not found or fetch error:", fetchErr);
    throw new Error("İşlem bulunamadı.");
  }

  // Varsa alt işlemleri (faiz gibi) önce sil
  const { data: children } = await supabase.from('transactions').select('id').eq('parent_id', txId);
  if (children && children.length > 0) {
    for (const child of children) {
      await deleteTransaction(child.id);
    }
  }

  // İşlemi sil
  const { error: delErr } = await supabase.from('transactions').delete().eq('id', txId);
  if (delErr) {
    console.error("Transaction delete error:", delErr);
    throw delErr;
  }

  // Bakiyeleri geri al
  if (tx.account_id) {
    const { data: accData, error: accErr } = await supabase.from('accounts').select('borc, alacak, bakiye').eq('id', tx.account_id).single();
    if (accData && !accErr) {
      let { borc, alacak, bakiye } = accData;
      if (tx.type === 'tahsilat') {
        alacak -= tx.amount;
        bakiye -= tx.amount;
      } else {
        borc -= tx.amount;
        bakiye += tx.amount;
      }
      await supabase.from('accounts').update({ borc, alacak, bakiye }).eq('id', tx.account_id);
    }
  }

  if (tx.ledger_id) {
    const { data: lData, error: lErr } = await supabase.from('ledgers').select('balance').eq('id', tx.ledger_id).single();
    if (lData && !lErr) {
      let balance = lData.balance;
      if (tx.type === 'tahsilat') balance -= tx.amount;
      else balance += tx.amount;
      await supabase.from('ledgers').update({ balance }).eq('id', tx.ledger_id);
    }
  }
}

export async function updateTransactionPaidStatus(txId: string, isPaid: boolean) {
  if (isDemoMode) return;
  const { error } = await supabase.from('transactions').update({ is_paid: isPaid }).eq('id', txId);
  if (error) throw error;
}

export async function addTransactionToMultipleAccounts(accountIds: string[], txTemplate: any) {
  if (isDemoMode) return;
  const institution_id = await getInstitutionId();
  
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

  const { error } = await supabase.from('transactions').insert(inserts);
  if (error) throw error;

  // Update balances for all accounts
  const { data: accountsData } = await supabase.from('accounts').select('id, borc, alacak, bakiye').in('id', accountIds);
  
  if (accountsData) {
    for (const acc of accountsData) {
      let { borc, alacak, bakiye } = acc;
      if (txTemplate.type === 'tahsilat') {
        alacak += txTemplate.amount;
        bakiye += txTemplate.amount;
      } else {
        borc += txTemplate.amount;
        bakiye -= txTemplate.amount;
      }
      await supabase.from('accounts').update({ borc, alacak, bakiye }).eq('id', acc.id);

      if (alacak >= borc) {
        await supabase.from('transactions').update({ is_paid: true }).eq('account_id', acc.id).eq('is_paid', false).gt('interest_rate', 0).eq('type', 'odeme');
      }
    }
  }

  // Update ledger balance once (Total amount = amount * accounts.length)
  if (txTemplate.ledgerId) {
    const totalAmount = txTemplate.amount * accountIds.length;
    const { data: lData } = await supabase.from('ledgers').select('balance').eq('id', txTemplate.ledgerId).single();
    if (lData) {
      let balance = lData.balance;
      if (txTemplate.type === 'tahsilat') {
        balance += totalAmount;
      } else {
        balance -= totalAmount;
      }
      await supabase.from('ledgers').update({ balance }).eq('id', txTemplate.ledgerId);
    }
  }
}

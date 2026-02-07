import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "limes_v2.db";

export async function getDb() {
  return await Database.load(`sqlite:${DB_NAME}`);
}

export async function initDB() {
  const db = await getDb();
  
  // 1. Cariler Tablosu (GÜNCELLENDİ: Yapı bilgileri eklendi)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      tax_number TEXT,
      tax_office TEXT,
      phone TEXT,
      email TEXT,
      city TEXT,
      district TEXT,
      
      -- Yapı Bilgileri (Sadece Kurumlar İçin)
      land_share TEXT, -- Arsa Payı
      block_number TEXT, -- Blok No
      parcel TEXT, -- Ada/Parsel
      flat_count TEXT, -- Daire Sayısı

      currency TEXT DEFAULT 'TRY',
      borc REAL DEFAULT 0,
      alacak REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. İşlemler Tablosu
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);
}

// --- CARİ İŞLEMLERİ ---
export async function getAccounts() {
  const db = await getDb();
  const result = await db.select<any[]>("SELECT * FROM accounts ORDER BY id DESC");
  return result.map(acc => ({...acc, id: acc.id.toString()}));
}

export async function addAccount(account: any) {
  const db = await getDb();
  const query = `
    INSERT INTO accounts (
      type, name, tax_number, tax_office, phone, email, 
      city, district, land_share, block_number, parcel, flat_count,
      currency, borc, alacak
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
  `;
  await db.execute(query, [
    account.type, 
    account.name, 
    account.tax_number,
    account.tax_office,
    account.phone, 
    account.email,
    account.city,
    account.district,
    account.land_share,
    account.block_number,
    account.parcel,
    account.flat_count,
    account.currency,
    account.borc,
    account.alacak
  ]);
}

export async function deleteAccount(id: string) {
  const db = await getDb();
  await db.execute("DELETE FROM accounts WHERE id = $1", [Number(id)]);
}

// --- İŞLEM FONKSİYONLARI ---
export async function getTransactions() {
  const db = await getDb();
  const result = await db.select<any[]>(`
    SELECT t.*, a.name as accountName 
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    ORDER BY t.date DESC, t.created_at DESC
  `);
  return result;
}

export async function addTransaction(tx: { accountId: number, type: 'tahsilat' | 'odeme', amount: number, description: string, date: string }) {
  const db = await getDb();
  await db.execute(
    "INSERT INTO transactions (account_id, type, amount, description, date) VALUES ($1, $2, $3, $4, $5)",
    [tx.accountId, tx.type, tx.amount, tx.description, tx.date]
  );
  if (tx.type === 'tahsilat') {
    await db.execute("UPDATE accounts SET alacak = alacak + $1 WHERE id = $2", [tx.amount, tx.accountId]);
  } else {
    await db.execute("UPDATE accounts SET borc = borc + $1 WHERE id = $2", [tx.amount, tx.accountId]);
  }
}

export async function getDashboardStats() {
  const db = await getDb();
  const result = await db.select<any[]>(`SELECT SUM(borc) as totalBorc, SUM(alacak) as totalAlacak FROM accounts`);
  const recentTx = await db.select<any[]>(`
    SELECT t.*, a.name as accountName 
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    ORDER BY t.date DESC, t.id DESC LIMIT 5
  `);
  return {
    totalBorc: result[0].totalBorc || 0,
    totalAlacak: result[0].totalAlacak || 0,
    recentTransactions: recentTx
  };
}
// Belirli bir carinin işlemlerini getir
export async function getTransactionsByAccount(accountId: string) {
  const db = await getDb();
  const result = await db.select<any[]>(`
    SELECT * FROM transactions 
    WHERE account_id = $1 
    ORDER BY date DESC, created_at DESC 
    LIMIT 10
  `, [accountId]);
  return result;
}
// Mevcut cariyi güncelle
export async function updateAccount(id: string, account: any) {
  const db = await getDb();
  
  // Not: Borç ve Alacak bakiyesini buradan güncellemeyi kapattık. 
  // Bakiyeler sadece "İşlem (Tahsilat/Ödeme)" yapılarak değişmeli.
  // Ancak isim, telefon, adres, vergi no gibi bilgiler değişebilir.

  const query = `
    UPDATE accounts SET 
      type = $1,
      name = $2,
      tax_number = $3,
      tax_office = $4,
      phone = $5,
      email = $6,
      city = $7,
      district = $8,
      land_share = $9,
      block_number = $10,
      parcel = $11,
      flat_count = $12,
      currency = $13
    WHERE id = $14
  `;

  await db.execute(query, [
    account.type,
    account.name,
    account.tax_number,
    account.tax_office,
    account.phone,
    account.email,
    account.city,
    account.district,
    account.land_share,
    account.block_number,
    account.parcel,
    account.flat_count,
    account.currency,
    Number(id) // ID'yi en sona ekledik
  ]);
}
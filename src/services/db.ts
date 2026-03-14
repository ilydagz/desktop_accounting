import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "limes_v5.db"; // YENİ SÜRÜM (method eklendi)

let dbPromise: Promise<Database> | null = null;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load(`sqlite:${DB_NAME}`);
  }
  return await dbPromise;
}

export async function initDB() {
  const db = await getDb();
  
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
      land_share TEXT,
      block_number TEXT,
      parcel TEXT,
      flat_count TEXT,
      owner_id INTEGER,
      currency TEXT DEFAULT 'TRY',
      borc REAL DEFAULT 0,
      alacak REAL DEFAULT 0,
      bakiye REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      method TEXT DEFAULT 'Nakit', -- YENİ EKLENDİ (Ödeme Yöntemi)
      date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);
}

export async function getAccounts() {
  const db = await getDb();
  const result = await db.select<any[]>("SELECT * FROM accounts ORDER BY id DESC");
  return result.map(acc => ({...acc, id: acc.id.toString(), owner_id: acc.owner_id ? acc.owner_id.toString() : null}));
}

export async function addAccount(account: any) {
  const db = await getDb();
  const query = `
    INSERT INTO accounts (
      type, name, tax_number, tax_office, phone, email, 
      city, district, land_share, block_number, parcel, flat_count,
      owner_id, currency, borc, alacak, bakiye
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
  `;
  await db.execute(query, [
    account.type, account.name, account.tax_number, account.tax_office, 
    account.phone, account.email, account.city, account.district, 
    account.land_share, account.block_number, account.parcel, account.flat_count, 
    account.owner_id ? Number(account.owner_id) : null,
    account.currency, account.borc, account.alacak, account.bakiye
  ]);
}

export async function deleteAccount(id: string) {
  const db = await getDb();
  await db.execute("DELETE FROM accounts WHERE id = $1", [Number(id)]);
}

export async function updateAccount(id: string, account: any) {
  const db = await getDb();
  const query = `
    UPDATE accounts SET 
      type = $1, name = $2, tax_number = $3, tax_office = $4, phone = $5, 
      email = $6, city = $7, district = $8, land_share = $9, block_number = $10, 
      parcel = $11, flat_count = $12, owner_id = $13, currency = $14,
      borc = $15, alacak = $16, bakiye = $17
    WHERE id = $18
  `;
  await db.execute(query, [
    account.type, account.name, account.tax_number, account.tax_office, account.phone, 
    account.email, account.city, account.district, account.land_share, account.block_number, 
    account.parcel, account.flat_count, account.owner_id ? Number(account.owner_id) : null, 
    account.currency, account.borc, account.alacak, account.bakiye, Number(id)
  ]);
}

export async function getTransactionsByAccount(accountId: string, startDate?: string, endDate?: string) {
  const db = await getDb();
  let query = "SELECT * FROM transactions WHERE account_id = $1";
  const params: any[] = [accountId];

  if (startDate) { query += ` AND date >= $${params.length + 1}`; params.push(startDate); }
  if (endDate) { query += ` AND date <= $${params.length + 1}`; params.push(endDate); }
  query += " ORDER BY date DESC, created_at DESC";
  return await db.select<any[]>(query, params);
}

export async function getTransactions() {
  const db = await getDb();
  return await db.select<any[]>("SELECT t.*, a.name as accountName FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id ORDER BY t.date DESC, t.created_at DESC");
}

// YÖNTEM PARAMETRESİ EKLENDİ
export async function addTransaction(tx: { accountId: number, type: 'tahsilat' | 'odeme', amount: number, description: string, date: string, method: string }) {
  const db = await getDb();
  await db.execute(
      "INSERT INTO transactions (account_id, type, amount, description, date, method) VALUES ($1, $2, $3, $4, $5, $6)", 
      [tx.accountId, tx.type, tx.amount, tx.description, tx.date, tx.method]
  );
  if (tx.type === 'tahsilat') {
    await db.execute("UPDATE accounts SET alacak = alacak + $1, bakiye = bakiye + $1 WHERE id = $2", [tx.amount, tx.accountId]);
  } else {
    await db.execute("UPDATE accounts SET borc = borc + $1, bakiye = bakiye - $1 WHERE id = $2", [tx.amount, tx.accountId]);
  }
}

export async function deleteTransaction(txId: string) {
  const db = await getDb();
  const result = await db.select<any[]>("SELECT * FROM transactions WHERE id = $1", [Number(txId)]);
  if (result.length === 0) return;
  const tx = result[0];

  if (tx.type === 'tahsilat') {
    await db.execute("UPDATE accounts SET alacak = alacak - $1, bakiye = bakiye - $1 WHERE id = $2", [tx.amount, tx.account_id]);
  } else {
    await db.execute("UPDATE accounts SET borc = borc - $1, bakiye = bakiye + $1 WHERE id = $2", [tx.amount, tx.account_id]);
  }
  await db.execute("DELETE FROM transactions WHERE id = $1", [Number(txId)]);
}

// YÖNTEM PARAMETRESİ EKLENDİ
export async function updateTransaction(txId: string, newData: { type: 'tahsilat' | 'odeme', amount: number, description: string, date: string, method: string }) {
  const db = await getDb();
  const result = await db.select<any[]>("SELECT * FROM transactions WHERE id = $1", [Number(txId)]);
  if (result.length === 0) return;
  const oldTx = result[0];

  if (oldTx.type === 'tahsilat') await db.execute("UPDATE accounts SET alacak = alacak - $1, bakiye = bakiye - $1 WHERE id = $2", [oldTx.amount, oldTx.account_id]);
  else await db.execute("UPDATE accounts SET borc = borc - $1, bakiye = bakiye + $1 WHERE id = $2", [oldTx.amount, oldTx.account_id]);

  if (newData.type === 'tahsilat') await db.execute("UPDATE accounts SET alacak = alacak + $1, bakiye = bakiye + $1 WHERE id = $2", [newData.amount, oldTx.account_id]);
  else await db.execute("UPDATE accounts SET borc = borc + $1, bakiye = bakiye - $1 WHERE id = $2", [newData.amount, oldTx.account_id]);

  await db.execute(
      "UPDATE transactions SET type = $1, amount = $2, description = $3, date = $4, method = $5 WHERE id = $6", 
      [newData.type, newData.amount, newData.description, newData.date, newData.method, Number(txId)]
  );
}
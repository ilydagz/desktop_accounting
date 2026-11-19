type Page<T> = { data: T[] | null; error: unknown; count: number | null };

export async function readAllPages<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>) {
  const rows: T[] = [];
  const ids = new Set<unknown>();
  let expectedCount: number | null = null;
  while (true) {
    const { data, error, count } = await fetchPage(rows.length, rows.length + 999);
    if (error) throw error;
    if (!data || count === null) throw new Error('Kayıtların tamamı doğrulanamadı. Yeniden deneyin.');
    if (expectedCount !== null && expectedCount !== count) {
      throw new Error('Liste okunurken değişti. Güncel kayıtlar için yeniden deneyin.');
    }
    expectedCount = count;
    for (const row of data) {
      if (row && typeof row === 'object' && 'id' in row) {
        if (ids.has(row.id)) throw new Error('Liste okunurken değişti. Yeniden deneyin.');
        ids.add(row.id);
      }
    }
    rows.push(...data);
    if (rows.length === count) return rows;
    if (!data.length || rows.length > count) throw new Error('Kayıtların tamamı yüklenemedi. Yeniden deneyin.');
  }
}

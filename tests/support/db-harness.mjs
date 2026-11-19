import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';

export async function databaseHarness({ accounts = [], transactions = [], ledgers = [], fail, serviceSource, env, online } = {}) {
  const tables = structuredClone({ accounts, transactions, ledgers, profiles: [{ id: 'user', institution_id: 'institution' }] });
  const calls = [];
  let counter = 0;
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'user' } }, error: null }) },
    from(table) {
      let operation = 'select', values, single = false, from = 0, to = Infinity;
      const filters = [];
      const builder = {
        select() { return builder; },
        insert(next) { operation = 'insert'; values = next; return builder; },
        update(next) { operation = 'update'; values = next; return builder; },
        delete() { operation = 'delete'; return builder; },
        eq(key, value) {
          const postgresTime = input => new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(input) ? input : input + 'Z').getTime();
          filters.push(row => key === 'date' ? postgresTime(row[key]) === postgresTime(value) : row[key] === value);
          return builder;
        },
        in(key, values) { filters.push(row => values.includes(row[key])); return builder; },
        gt(key, value) { filters.push(row => row[key] > value); return builder; },
        gte(key, value) { filters.push(row => row[key] >= value); return builder; },
        lte(key, value) { filters.push(row => row[key] <= value); return builder; },
        order() { return builder; },
        range(start, end) { from = start; to = end; return builder; },
        single() { single = true; return builder; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            calls.push({ table, operation, values });
            const error = fail?.({ table, operation, values, calls });
            if (error) return { data: null, error, count: null };
            const matching = tables[table].filter(row => filters.every(filter => filter(row)));
            if (operation === 'insert') {
              const rows = values.map(row => ({ id: `inserted-${++counter}`, ...structuredClone(row) }));
              tables[table].push(...rows);
              return { data: rows, error: null, count: rows.length };
            }
            if (operation === 'update') for (const row of matching) Object.assign(row, structuredClone(values));
            if (operation === 'delete') tables[table] = tables[table].filter(row => !matching.includes(row));
            const data = matching.slice(from, Math.min(to + 1, from + 1000));
            return { data: single ? data[0] ?? null : structuredClone(data), error: null, count: matching.length };
          }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  const context = vm.createContext({ console: { error() {}, warn() {} }, Map, Set, Date, ...(online === undefined ? {} : { navigator: { onLine: online } }) });
  const cache = new Map();
  const supabaseModule = new vm.SyntheticModule(['supabase'], function () { this.setExport('supabase', supabase); }, { context });
  async function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const source = serviceSource && filename === path.resolve('src/services/db.ts') ? serviceSource : await fs.readFile(filename, 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    const module = new vm.SourceTextModule(js, { context, identifier: filename, initializeImportMeta(meta) { meta.env = env || { VITE_SUPABASE_URL: 'test', VITE_SUPABASE_ANON_KEY: 'test' }; } });
    cache.set(filename, module);
    await module.link(specifier => specifier === '@/lib/supabase' ? supabaseModule : load(path.resolve('src', specifier.replace(/^@\//, '')) + '.ts'));
    return module;
  }
  const module = await load(path.resolve('src/services/db.ts'));
  await module.evaluate();
  return { db: module.namespace, tables, calls };
}

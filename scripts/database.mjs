import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

// D1-compatible adapter used by the local server and integration tests.
export function openDatabase(filename = ":memory:") {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
  if (!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()) {
    sqlite.exec(readFileSync(new URL("../worker/migrations/0001_initial.sql",import.meta.url),"utf8"));
  }
  function prepare(sql) {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() { return sqlite.prepare(sql).get(...values) || null; },
      async all() { return {results:sqlite.prepare(sql).all(...values),success:true}; },
      async run() {
        const r = sqlite.prepare(sql).run(...values);
        return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};
      }
    };
  }
  return {
    prepare,
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const results=[]; for (const s of statements) results.push(await s.run()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
    close() { sqlite.close(); }
  };
}

import initSqlJs, { Database } from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteDb: Database | null = null;
let dbFilePath: string = '';

export async function initDatabase(forceReload = false) {
  if (dbInstance && !forceReload) return dbInstance;

  let wasmBinary: Uint8Array | undefined = undefined;
  try {
    const candidates: (string | undefined)[] = [
      path.join(process.resourcesPath || '', 'sql-wasm.wasm'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    ];
    try {
      const require = createRequire(import.meta.url);
      candidates.push(require.resolve('sql.js/dist/sql-wasm.wasm'));
    } catch (_e) {}

    for (const wasmPath of candidates) {
      if (wasmPath && fs.existsSync(wasmPath)) {
        wasmBinary = new Uint8Array(fs.readFileSync(wasmPath));
        console.log(`[Database] Successfully loaded sql-wasm.wasm binary from: ${wasmPath}`);
        break;
      }
    }
  } catch (err) {
    console.warn('[Database] Could not load sql-wasm.wasm via candidate paths:', err);
  }

  const SQL = await initSqlJs(
    wasmBinary
      ? ({
          wasmBinary,
          locateFile: (file: string) => file,
        } as any)
      : undefined
  );
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'data');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbFilePath = path.join(dbDir, 'clothing_store.db');
  console.log(`[Database] Initializing SQLite (WASM) database at: ${dbFilePath}`);

  let fileBuffer: Uint8Array | undefined;
  if (fs.existsSync(dbFilePath)) {
    fileBuffer = new Uint8Array(fs.readFileSync(dbFilePath));
  }

  sqliteDb = new SQL.Database(fileBuffer);
  dbInstance = drizzle(sqliteDb, { schema });

  createInitialTables(sqliteDb);
  saveDatabaseToDisk();

  return dbInstance;
}

export function saveDatabaseToDisk() {
  if (sqliteDb && dbFilePath) {
    const data = sqliteDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  }
}

function createInitialTables(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      image TEXT,
      category_id INTEGER REFERENCES categories(id),
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      current_stock INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      notes TEXT,
      points INTEGER NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      movement_type TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reference_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id),
      invoice_number TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      invoice_number TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL,
      paid_amount REAL NOT NULL,
      payment_type TEXT NOT NULL DEFAULT 'CASH',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      total_amount REAL NOT NULL,
      refund_amount REAL NOT NULL,
      payment_type TEXT NOT NULL DEFAULT 'CASH',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL REFERENCES sales_returns(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      total_amount REAL NOT NULL,
      refund_amount REAL NOT NULL,
      payment_type TEXT NOT NULL DEFAULT 'CASH',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL REFERENCES purchase_returns(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      expense_date TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SELLER',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      last_activity_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      description TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Safe Additive Column Migration for sales.created_by_user_id
  try {
    db.run(`ALTER TABLE sales ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);`);
  } catch (_colErr) {}

  // Safe Additive Column Migrations for Phase 9 Historical Cost Protection
  try {
    db.run(`ALTER TABLE sale_items ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0;`);
  } catch (_colErr) {}
  try {
    db.run(`ALTER TABLE sale_items ADD COLUMN total_cost REAL NOT NULL DEFAULT 0;`);
  } catch (_colErr) {}
  try {
    db.run(`ALTER TABLE sales_return_items ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0;`);
  } catch (_colErr) {}
  try {
    db.run(`ALTER TABLE sales_return_items ADD COLUMN total_cost REAL NOT NULL DEFAULT 0;`);
  } catch (_colErr) {}

  // Safe Additive Column Migrations for Finalization (Customers & Expenses)
  try {
    db.run(`ALTER TABLE customers ADD COLUMN notes TEXT;`);
  } catch (_colErr) {}
  try {
    db.run(`ALTER TABLE customers ADD COLUMN updated_at TEXT;`);
  } catch (_colErr) {}
  try {
    db.run(`ALTER TABLE expenses ADD COLUMN user_id INTEGER REFERENCES users(id);`);
  } catch (_colErr) {}
  try {
    db.run(`ALTER TABLE expenses ADD COLUMN updated_at TEXT;`);
  } catch (_colErr) {}
}

export function getDb() {
  return dbInstance;
}

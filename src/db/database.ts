import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

export async function getDb() {
  if (!db) {
    const isProduction = process.env.NODE_ENV === 'production';
    const dbFolder = isProduction ? '/app/data' : process.cwd();
    
    // Ensure folder exists in production if using persistent disk
    if (isProduction && !fs.existsSync(dbFolder)) {
      try {
        fs.mkdirSync(dbFolder, { recursive: true });
      } catch (e) {
        console.error('Error creating db folder:', e);
      }
    }

    const dbPath = path.join(dbFolder, 'database.sqlite');
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('Successfully connected to local SQLite database at', dbPath);
  }
  return db;
}

export async function initDb() {
  const database = await getDb();
  
  try {
    await database.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        logo TEXT,
        cover_image TEXT,
        primary_color TEXT,
        secondary_color TEXT,
        payment_config TEXT,
        admin_username TEXT,
        admin_password TEXT,
        status TEXT DEFAULT 'active',
        subscription_due_date DATETIME,
        subscription_status TEXT DEFAULT 'active',
        address TEXT,
        is_exempt BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        duration INTEGER NOT NULL,
        price REAL NOT NULL,
        promotional_price REAL,
        image TEXT,
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        push_subscription TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, phone),
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        service_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Agendado',
        notified_1day BOOLEAN DEFAULT 0,
        notified_1hour BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS working_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        start_time_2 TEXT,
        end_time_2 TEXT,
        is_active BOOLEAN DEFAULT 1,
        UNIQUE(tenant_id, day_of_week),
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        value TEXT,
        UNIQUE(tenant_id, setting_key),
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS processed_payments (
        id TEXT PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        amount REAL,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS superadmin_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: add admin_username and admin_password if they don't exist
    try {
      const columns = await database.all('PRAGMA table_info(tenants)');
      const hasAdminUser = columns.some((c: any) => c.name === 'admin_username');
      if (!hasAdminUser) {
        await database.exec('ALTER TABLE tenants ADD COLUMN admin_username TEXT');
        await database.exec('ALTER TABLE tenants ADD COLUMN admin_password TEXT');
      }
    } catch (e) {
      console.log('Migration admin_username skipped or failed:', e);
    }

    // Migration: add subscription fields
    try {
      const columns = await database.all('PRAGMA table_info(tenants)');
      const hasSub = columns.some((c: any) => c.name === 'subscription_due_date');
      if (!hasSub) {
        await database.exec('ALTER TABLE tenants ADD COLUMN subscription_due_date DATETIME');
        await database.exec('ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT "active"');
      }
    } catch (e) {
      console.log('Migration subscription skipped or failed:', e);
    }

    // Migration: add address field
    try {
      const columns = await database.all('PRAGMA table_info(tenants)');
      const hasAddress = columns.some((c: any) => c.name === 'address');
      if (!hasAddress) {
        await database.exec('ALTER TABLE tenants ADD COLUMN address TEXT');
      }
    } catch (e) {
      console.log('Migration address skipped or failed:', e);
    }

    // Migration: add user status and push subscription
    try {
      const columns = await database.all('PRAGMA table_info(users)');
      const hasStatus = columns.some((c: any) => c.name === 'status');
      if (!hasStatus) {
        await database.exec('ALTER TABLE users ADD COLUMN status TEXT DEFAULT "active"');
      }
      const hasPush = columns.some((c: any) => c.name === 'push_subscription');
      if (!hasPush) {
        await database.exec('ALTER TABLE users ADD COLUMN push_subscription TEXT');
      }
    } catch (e) {
      console.log('Migration users skipped or failed:', e);
    }

    // Migration: add is_exempt field
    try {
      const columns = await database.all('PRAGMA table_info(tenants)');
      const hasExempt = columns.some((c: any) => c.name === 'is_exempt');
      if (!hasExempt) {
        await database.exec('ALTER TABLE tenants ADD COLUMN is_exempt BOOLEAN DEFAULT 0');
      }
    } catch (e) {
      console.log('Migration is_exempt skipped or failed:', e);
    }

    // Seed initial tenant if empty
    const tenantCount = await database.get('SELECT COUNT(*) as count FROM tenants');
    if (tenantCount.count === 0) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const result = await database.run(`
        INSERT INTO tenants (slug, name, primary_color, secondary_color, admin_username, admin_password, subscription_due_date, subscription_status) 
        VALUES ('salao-beleza-premium', 'Salão de Beleza Premium', '#DB2777', '#FDF2F8', 'admin', 'admin123', ?, 'active')
      `, futureDate.toISOString());
      const tenantId = result.lastID;

      await database.run(`
        INSERT INTO settings (tenant_id, setting_key, value) VALUES 
        (?, 'cover_photo', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80'),
        (?, 'profile_photo', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80')
      `, tenantId, tenantId);

      await database.run(`
        INSERT INTO working_hours (tenant_id, day_of_week, start_time, end_time, is_active) VALUES 
        (?, 0, '09:00', '18:00', 0),
        (?, 1, '09:00', '18:00', 1),
        (?, 2, '09:00', '18:00', 1),
        (?, 3, '09:00', '18:00', 1),
        (?, 4, '09:00', '18:00', 1),
        (?, 5, '09:00', '18:00', 1),
        (?, 6, '09:00', '18:00', 1)
      `, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId);

      await database.run(`
        INSERT INTO services (tenant_id, name, description, duration, price, promotional_price, image) VALUES 
        (?, 'Corte Feminino', 'Corte moderno com lavagem e finalização.', 60, 120.00, 100.00, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=500&q=80'),
        (?, 'Escova e Hidratação', 'Tratamento profundo para brilho e maciez.', 45, 80.00, NULL, 'https://images.unsplash.com/photo-1522337300258-03d13c84b164?w=500&q=80'),
        (?, 'Manicure e Pedicure', 'Cuidado completo para suas unhas.', 90, 70.00, 60.00, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&q=80'),
        (?, 'Design de Sobrancelha', 'Alinhamento e limpeza do olhar.', 30, 45.00, NULL, 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=500&q=80'),
        (?, 'Limpeza de Pele', 'Remoção de impurezas e revitalização facial.', 60, 150.00, 130.00, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&q=80'),
        (?, 'Depilação Completa', 'Pele lisinha com cera hipoalergênica.', 90, 180.00, NULL, 'https://images.unsplash.com/photo-1590439471364-192aa70c0b53?w=500&q=80'),
        (?, 'Maquiagem Social', 'Para eventos e ocasiões especiais.', 60, 150.00, NULL, 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=500&q=80')
      `, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId);
    }
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
  }
}


const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database(path.join(__dirname, 'cobranza.db'));

db.serialize(() => {
  // Tabla de usuarios
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    active INTEGER DEFAULT 1
  )`);

  // Tabla de CLIENTES
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    collector_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted INTEGER DEFAULT 0,
    deleted_by INTEGER,
    deleted_at DATETIME,
    FOREIGN KEY (collector_id) REFERENCES users(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id)
  )`);

  // Tabla de préstamos
  db.run(`CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    principal_amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 20,
    total_amount DECIMAL(10,2) NOT NULL,
    daily_payment DECIMAL(10,2) NOT NULL,
    days_term INTEGER DEFAULT 24,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    collector_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (collector_id) REFERENCES users(id)
  )`);

  // Tabla de pagos
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    collector_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_by TEXT DEFAULT 'collector',
    edited INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    deleted_reason TEXT,
    deleted_by INTEGER,
    deleted_at DATETIME,
    FOREIGN KEY (loan_id) REFERENCES loans(id),
    FOREIGN KEY (collector_id) REFERENCES users(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id),
    UNIQUE(loan_id, day_number, deleted)
  )`);

  // Usuarios de demo
  const adminPass = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, password, role, name) 
          VALUES ('admin', ?, 'admin', 'Administrador')`, [adminPass]);

  const collectorPass = bcrypt.hashSync('cobrador123', 10);
  const collectors = ['Juan', 'Pedro', 'Carlos', 'Maria', 'Luis'];
  collectors.forEach((name, i) => {
    db.run(`INSERT OR IGNORE INTO users (username, password, role, name) 
            VALUES (?, ?, 'collector', ?)`, 
            [`cobrador${i+1}`, collectorPass, name]);
  });
});

module.exports = db;
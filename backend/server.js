const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro';

// Middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administrador' });
  }
  next();
};

// LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ? AND active = 1', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    
    const validPass = bcrypt.compareSync(password, user.password);
    if (!validPass) return res.status(401).json({ error: 'Contraseña incorrecta' });
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  });
});

// CLIENTES
app.post('/api/clients', authenticate, (req, res) => {
  const { name, phone, address } = req.body;
  const collector_id = req.user.role === 'collector' ? req.user.id : (req.body.collector_id || req.user.id);
  
  db.run(`INSERT INTO clients (name, phone, address, collector_id) VALUES (?, ?, ?, ?)`,
    [name, phone, address || '', collector_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Cliente registrado' });
    }
  );
});

app.get('/api/clients', authenticate, (req, res) => {
  let query = `SELECT c.*, u.name as collector_name FROM clients c LEFT JOIN users u ON c.collector_id = u.id WHERE c.deleted = 0`;
  const params = [];
  
  if (req.user.role === 'collector') {
    query += ' AND c.collector_id = ?';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY c.name ASC';
  
  db.all(query, params, (err, clients) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(clients);
  });
});

app.put('/api/clients/:id', authenticate, (req, res) => {
  const { name, phone, address } = req.body;
  
  db.get('SELECT * FROM clients WHERE id = ? AND deleted = 0', [req.params.id], (err, client) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    
    if (req.user.role === 'collector' && client.collector_id !== req.user.id) {
      return res.status(403).json({ error: 'No puedes editar clientes de otros' });
    }
    
    db.run(`UPDATE clients SET name = ?, phone = ?, address = ?, updated_at = ? WHERE id = ?`,
      [name, phone, address, new Date().toISOString(), req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cliente actualizado' });
      }
    );
  });
});

app.delete('/api/clients/:id', authenticate, requireAdmin, (req, res) => {
  db.run(`UPDATE clients SET deleted = 1, deleted_by = ?, deleted_at = ? WHERE id = ?`,
    [req.user.id, new Date().toISOString(), req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Cliente eliminado' });
    }
  );
});

app.put('/api/clients/:id/reassign', authenticate, requireAdmin, (req, res) => {
  const { new_collector_id } = req.body;
  db.run('UPDATE clients SET collector_id = ? WHERE id = ?', 
    [new_collector_id, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Cliente reasignado' });
    }
  );
});

// PRÉSTAMOS
app.post('/api/loans', authenticate, (req, res) => {
  const { client_id, principal_amount } = req.body;
  
  db.get('SELECT * FROM clients WHERE id = ? AND deleted = 0', [client_id], (err, client) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    
    if (req.user.role === 'collector' && client.collector_id !== req.user.id) {
      return res.status(403).json({ error: 'Este cliente no te está asignado' });
    }
    
    const interest_rate = 20;
    const total_amount = principal_amount * 1.20;
    const daily_payment = total_amount / 24;
    const start_date = new Date().toISOString().split('T')[0];
    const end_date = new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const loan_collector_id = req.user.role === 'admin' ? client.collector_id : req.user.id;
    
    db.run(`INSERT INTO loans (client_id, principal_amount, interest_rate, total_amount, daily_payment, days_term, start_date, end_date, collector_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, principal_amount, interest_rate, total_amount, daily_payment, 24, start_date, end_date, loan_collector_id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Préstamo creado', total_amount, daily_payment });
      }
    );
  });
});

app.get('/api/loans', authenticate, (req, res) => {
  let query = `SELECT l.*, c.name as client_name, c.phone as client_phone, u.name as collector_name FROM loans l JOIN clients c ON l.client_id = c.id LEFT JOIN users u ON l.collector_id = u.id WHERE l.status = 'active' AND c.deleted = 0`;
  const params = [];
  
  if (req.user.role === 'collector') {
    query += ' AND l.collector_id = ?';
    params.push(req.user.id);
  }
  
  db.all(query, params, (err, loans) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const promises = loans.map(loan => {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM payments WHERE loan_id = ? AND deleted = 0', [loan.id], (err, payments) => {
          if (err) reject(err);
          loan.payments = payments || [];
          loan.paid_days = payments ? payments.length : 0;
          loan.remaining = loan.total_amount - (loan.paid_days * loan.daily_payment);
          resolve(loan);
        });
      });
    });
    
    Promise.all(promises).then(results => res.json(results));
  });
});

// PAGOS
app.post('/api/payments', authenticate, (req, res) => {
  const { loan_id, day_number, amount, notes } = req.body;
  
  db.get('SELECT * FROM loans WHERE id = ?', [loan_id], (err, loan) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
    
    if (req.user.role === 'collector' && loan.collector_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    db.get('SELECT * FROM payments WHERE loan_id = ? AND day_number = ? AND deleted = 0', 
      [loan_id, day_number], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });
        if (existing) return res.status(400).json({ error: 'Este día ya fue cobrado' });
        
        db.run(`INSERT INTO payments (loan_id, collector_id, day_number, amount, notes, created_by) VALUES (?, ?, ?, ?, ?, 'collector')`,
          [loan_id, req.user.id, day_number, amount, notes],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Pago registrado' });
          }
        );
      }
    );
  });
});

app.put('/api/payments/:id', authenticate, requireAdmin, (req, res) => {
  const { action, reason, new_amount } = req.body;
  
  if (action === 'delete') {
    db.run(`UPDATE payments SET deleted = 1, deleted_reason = ?, deleted_by = ?, deleted_at = ? WHERE id = ?`, 
      [reason, req.user.id, new Date().toISOString(), req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pago anulado' });
      }
    );
  } else if (action === 'edit') {
    db.run(`UPDATE payments SET amount = ?, edited = 1, notes = COALESCE(notes, '') || ' [Editado: ' || ? || ']' WHERE id = ?`, 
      [new_amount, reason, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pago corregido' });
      }
    );
  }
});

// REPORTES
app.get('/api/collectors', authenticate, requireAdmin, (req, res) => {
  db.all("SELECT id, name, username FROM users WHERE role = 'collector' AND active = 1", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/reports/weekly', authenticate, requireAdmin, (req, res) => {
  const { start_date, end_date } = req.query;
  
  db.all(`SELECT u.name as collector_name, DATE(p.payment_date) as date, COUNT(*) as collections_count, SUM(p.amount) as total_collected FROM payments p JOIN users u ON p.collector_id = u.id WHERE p.deleted = 0 AND DATE(p.payment_date) BETWEEN ? AND ? GROUP BY u.name, DATE(p.payment_date) ORDER BY u.name, date`,
    [start_date, end_date],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const report = {};
      rows.forEach(row => {
        if (!report[row.collector_name]) {
          report[row.collector_name] = { name: row.collector_name, total: 0, daily: {} };
        }
        report[row.collector_name].daily[row.date] = row.total_collected;
        report[row.collector_name].total += row.total_collected;
      });
      
      res.json(Object.values(report));
    }
  );
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
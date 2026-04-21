const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DB_FILE = path.join(__dirname, '..', 'customers.json');

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
  catch { return []; }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function tsNow() {
  return new Date(Date.now() + 8 * 3600000).toISOString().replace('T', ' ').substring(0, 19);
}

// GET /api/customers
router.get('/customers', (req, res) => {
  const db = loadDB().filter(c => c.active !== false);
  let r = db;
  const { search, stage } = req.query;
  if (stage) r = r.filter(c => c.stage === stage);
  if (search) {
    const s = search.toLowerCase();
    r = r.filter(c =>
      (c.name || '').toLowerCase().includes(s) ||
      (c.phone || '').toLowerCase().includes(s) ||
      (c.destination || '').toLowerCase().includes(s)
    );
  }
  r.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(r);
});

// POST /api/customers
router.post('/customers', (req, res) => {
  const body = req.body;
  const db = loadDB();
  const customer = {
    id: Date.now(),
    created_at: tsNow(),
    active: true,
    name: body.name || '',
    phone: body.phone || '',
    destination: body.destination || '',
    people_count: body.people_count || '',
    travel_date: body.travel_date || '',
    budget: body.budget || '',
    objections: body.objections || '',
    summary: body.summary || body.raw_text || '',
    stage: body.stage || '初询',
    notes: body.notes || '',
    reminder_at: body.reminder_at || null
  };
  db.push(customer);
  saveDB(db);
  res.json({ success: true, id: customer.id });
});

// GET /api/customers/:id
router.get('/customers/:id', (req, res) => {
  const db = loadDB();
  const c = db.find(x => x.id === parseInt(req.params.id));
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

// PUT /api/customers/:id
router.put('/customers/:id', (req, res) => {
  const db = loadDB();
  const idx = db.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const allowed = ['name', 'phone', 'stage', 'notes', 'destination', 'people_count',
    'travel_date', 'budget', 'objections', 'summary', 'reminder_at'];
  allowed.forEach(k => { if (req.body[k] !== undefined) db[idx][k] = req.body[k]; });

  saveDB(db);
  res.json({ success: true });
});

// DELETE /api/customers/:id (soft delete)
router.delete('/customers/:id', (req, res) => {
  const db = loadDB();
  const idx = db.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db[idx].active = false;
  saveDB(db);
  res.json({ success: true });
});

module.exports = router;
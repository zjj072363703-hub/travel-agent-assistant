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

function tsMinute() {
  return new Date(Date.now() + 8 * 3600000).toISOString().replace('T', ' ').substring(0, 16);
}

// GET /api/reminders — 逾期未跟进的客户
router.get('/reminders', (req, res) => {
  const db = loadDB().filter(c => c.active !== false);
  const nowStr = tsMinute();
  const due = db.filter(c =>
    c.reminder_at &&
    c.reminder_at <= nowStr &&
    !['成交', '已出行', '流失'].includes(c.stage)
  ).sort((a, b) => (a.reminder_at || '').localeCompare(b.reminder_at || ''));

  res.json(due);
});

// GET /api/reminders/upcoming — 未来24小时内的提醒
router.get('/reminders/upcoming', (req, res) => {
  const db = loadDB().filter(c => c.active !== false);
  const now = Date.now();
  const in24h = new Date(now + 24 * 3600000).toISOString().replace('T', ' ').substring(0, 16);

  const upcoming = db.filter(c =>
    c.reminder_at &&
    c.reminder_at > tsMinute() &&
    c.reminder_at <= in24h &&
    !['成交', '已出行', '流失'].includes(c.stage)
  ).sort((a, b) => (a.reminder_at || '').localeCompare(b.reminder_at || ''));

  res.json(upcoming);
});

module.exports = router;
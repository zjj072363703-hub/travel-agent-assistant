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

// GET /api/stats
router.get('/stats', (req, res) => {
  const db = loadDB().filter(c => c.active !== false);
  const today = new Date().toISOString().substring(0, 10);
  const nowStr = tsMinute();

  const stageCount = {};
  db.forEach(c => { stageCount[c.stage] = (stageCount[c.stage] || 0) + 1; });

  const dueCount = db.filter(c =>
    c.reminder_at &&
    c.reminder_at <= nowStr &&
    !['成交', '已出行', '流失'].includes(c.stage)
  ).length;

  res.json({
    total: db.length,
    new_today: db.filter(c => c.created_at && c.created_at.startsWith(today)).length,
    due_reminders: dueCount,
    by_stage: stageCount
  });
});

module.exports = router;
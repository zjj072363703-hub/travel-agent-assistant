require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const analyzeRouter = require('./routes/analyze');
const customersRouter = require('./routes/customers');
const remindersRouter = require('./routes/reminders');
const statsRouter = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

// Routes
app.use('/api', analyzeRouter);
app.use('/api', customersRouter);
app.use('/api', remindersRouter);
app.use('/api', statsRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧳 TourBoost 后端启动 → http://localhost:${PORT}`);
  if (!process.env.KIMI_API_KEY) {
    console.warn('⚠️ 未设置 KIMI_API_KEY 环境变量');
  }
});
const express = require('express');
const multer = require('multer');
const { generateResponse } = require('../lib/llm-adapter');
const imagePrompt = require('../prompts/analyze-image');
const salesPrompt = require('../prompts/analyze-sales');
const replyMasterPrompt = require('../prompts/reply-master');

const router = express.Router();

// ============ Image Upload Config ============
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只支持图片文件'));
  }
});

// ============ JSON 解析工具（模型中立） ============
function parseJSON(raw) {
  let cleaned = (raw || '').trim();
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
  try { return JSON.parse(cleaned); }
  catch { return null; }
}

// ============ POST /api/analyze-text ============
router.post('/analyze-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: '请提供有效的聊天文字（至少5个字符）' });
    }
    const raw = await generateResponse({
      systemPrompt: imagePrompt.systemPrompt(),
      prompt: imagePrompt.textAnalyzePrompt(text),
      timeout: 60000,
    });
    const parsed = parseJSON(raw);
    res.json(parsed || { summary: raw, raw_text: text });
  } catch (err) {
    console.error('analyze-text error:', err.message);
    res.status(500).json({ error: 'AI分析失败: ' + err.message });
  }
});

// ============ POST /api/analyze-image ============
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传图片文件' });
    const base64 = req.file.buffer.toString('base64');
    const raw = await generateResponse({
      systemPrompt: imagePrompt.systemPrompt(),
      prompt: imagePrompt.analyzePrompt(''),
      imageBase64: base64,
      timeout: 120000,
    });
    const parsed = parseJSON(raw);
    if (!parsed) return res.status(200).json({ summary: raw });
    res.json({ ...parsed, has_image: true });
  } catch (err) {
    console.error('analyze-image error:', err.message);
    res.status(500).json({ error: 'AI分析失败: ' + err.message });
  }
});

// ============ POST /api/analyze-images ============
router.post('/analyze-images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请上传至少一张图片' });
    }
    const results = [];
    for (const file of req.files) {
      const base64 = file.buffer.toString('base64');
      try {
        const raw = await generateResponse({
          systemPrompt: imagePrompt.systemPrompt(),
          prompt: imagePrompt.analyzePrompt(''),
          imageBase64: base64,
          timeout: 120000,
        });
        results.push({ success: true, data: parseJSON(raw) || { summary: raw } });
      } catch (e) {
        results.push({ success: false, error: e.message });
      }
    }
    res.json({ images: results, count: results.length });
  } catch (err) {
    console.error('analyze-images error:', err.message);
    res.status(500).json({ error: 'AI分析失败: ' + err.message });
  }
});

// ============ POST /api/analyze-chat ============
router.post('/analyze-chat', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: '请提供聊天记录' });
    }
    const raw = await generateResponse({
      systemPrompt: imagePrompt.systemPrompt(),
      prompt: imagePrompt.textAnalyzePrompt(text),
      timeout: 60000,
    });
    const parsed = parseJSON(raw);
    res.json(parsed || { summary: raw });
  } catch (err) {
    console.error('analyze-chat error:', err.message);
    res.status(500).json({ error: 'AI分析失败: ' + err.message });
  }
});

// ============ POST /api/analyze-sales ============
router.post('/analyze-sales', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: '请提供聊天记录（至少10个字符）' });
    }
    const raw = await generateResponse({
      systemPrompt: salesPrompt.systemPrompt(),
      prompt: salesPrompt.analyzePrompt(text),
      timeout: 90000,
    });
    const parsed = parseJSON(raw);
    if (!parsed) return res.status(200).json({ summary: raw, raw_text: text });
    res.json({ ...parsed, raw_text: text });
  } catch (err) {
    console.error('analyze-sales error:', err.message);
    res.status(500).json({ error: 'AI分析失败: ' + err.message });
  }
});

module.exports = router;

// ============ POST /api/reply-master ============
// 三合一话术生成 - 军师模式
router.post('/reply-master', async (req, res) => {
  try {
    const { text, keywords } = req.body;
    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: '请提供聊天记录（至少5个字符）' });
    }

    const raw = await generateResponse({
      systemPrompt: replyMasterPrompt.systemPrompt(),
      prompt: replyMasterPrompt.analyzePrompt(text, keywords || {}),
      timeout: 60000,
    });

    const parsed = parseJSON(raw);
    if (!parsed) return res.status(200).json({ summary: raw, raw_text: text });
    res.json({ ...parsed, raw_text: text });

  } catch (err) {
    console.error('reply-master error:', err.message);
    res.status(500).json({ error: 'AI分析失败: ' + err.message });
  }
});

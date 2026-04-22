const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');

const router = express.Router();

// ============ MiniMax / Kimi API Client ============
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.KIMI_API_KEY,
    baseURL: 'https://api.moonshot.cn/v1'
  });
}

// ============ Image Upload Config (内存存储，不落磁盘) ============
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只支持图片文件'));
  }
});

// ============ POST /api/analyze-text ============
// TourBoost 销售专家视角
router.post('/analyze-text', async (req, res) => {
  try {
    const { text, destination, stage } = req.body;

    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: '请提供有效的聊天文字（至少5个字符）' });
    }

    const client = getOpenAIClient();

    const prompt = `你是旅游行业顶级销售专家，负责提升客服成交率。

分析以下微信聊天记录，提取信息并生成销售推进话术。

聊天记录：
${text}

请以JSON格式返回（必须严格符合JSON格式，不要有任何额外文字）：
{
  "customer_type": "客户类型，如：价格敏感型、犹豫型、急性子、随和型、谨慎型等",
  "destination": "目的地（如果聊天中未提及则填null）",
  "people_count": "出行人数（如果未提及则填null）",
  "travel_date": "计划出行日期（如果未提及则填null）",
  "budget": "预算范围（如果未提及则填null）",
  "objections": "客户的主要疑虑或担忧（如果没有则填null）",
  "summary": "一段话总结客户的咨询需求",
  "next_sentence": "下一句成交话术（必须推进成交，直接可用，30字以内，语气专业自信）",
  "sales_tips": ["销售技巧1", "销售技巧2", "销售技巧3"]
}`;

    const completion = await client.chat.completions.create({
      model: 'moonshot-v1-8k',
      messages: [
        {
          role: 'system',
          content: '你是一个智能旅行助手后端的API解析器。你的唯一任务是分析内容并输出严格的纯JSON格式数据。不要输出任何解释性文本，不要包含Markdown标记。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    const raw = completion.choices[0]?.message?.content || '';
    
    // 精准截取 JSON 内容（处理 Kimi 可能添加的前缀/后缀）
    let cleaned = raw.trim();
    // 移除可能的 markdown 标记
    cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '');
    // 截取第一个 { 和最后一个 } 之间的内容
    const startIndex = cleaned.indexOf('{');
    const endIndex = cleaned.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(200).json({ summary: raw, raw_text: text });
    }

    res.json({ ...parsed, raw_text: text });

  } catch (err) {
    console.error('analyze-text error:', err.message);
    res.status(500).json({ error: 'AI分析失败: ' + err.message });
  }
});

// ============ POST /api/analyze-image ============
// 单张图片分析
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片文件' });
    }

    const base64Data = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Data}`;

    const client = getOpenAIClient();

    const prompt = `你是一个旅游咨询分析助手。请分析这张微信聊天截图，提取结构化信息。

请以JSON格式返回（如果无法确定某字段，填null）：
{
  "destination": "想去去的旅游目的地，如张家界、凤凰古城等",
  "people_count": "出行人数，如2大1小、5人、团队等",
  "travel_date": "计划出行日期，如5月1日、下周末等",
  "budget": "预算范围，如3000-5000元、5000元左右",
  "objections": "客户表达的疑虑或担忧，如价格太高、时间不确定等",
  "summary": "一段话总结客户咨询的核心需求"
}`;

    const completion = await client.chat.completions.create({
      model: 'moonshot-v1-8k-vision-preview',
      messages: [
        {
          role: 'system',
          content: '你是一个智能旅行助手后端的API解析器。你的唯一任务是分析内容并输出严格的纯JSON格式数据。不要输出任何解释性文本，不要包含Markdown标记。'
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt }
          ]
        }
      ],
      temperature: 0.3
    }, {
      timeout: 60000,  // 60秒超时，防止视觉模型处理过慢
      maxRetries: 1
    });

    const raw = completion.choices[0]?.message?.content || '';
    
    // 精准截取 JSON 内容（处理 Kimi 可能添加的前缀/后缀）
    let cleaned = raw.trim();
    // 移除可能的 markdown 标记
    cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '');
    // 截取第一个 { 和最后一个 } 之间的内容
    const startIndex = cleaned.indexOf('{');
    const endIndex = cleaned.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { error: '解析AI响应失败', raw };
    }

    res.json(parsed);

  } catch (err) {
    console.error('analyze-image error:', err.message);
    res.status(500).json({ error: '图片分析失败: ' + err.message });
  }
});

// ============ POST /api/analyze-images ============
// 长截图/多图分析 — 支持多张图片一起发送
router.post('/analyze-images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请上传至少一张图片' });
    }

    const client = getOpenAIClient();

    // 构建多图内容（直接从内存buffer转base64）
    const content = req.files.map(file => ({
      type: 'image_url',
      image_url: { url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}` }
    }));

    const imgCount = req.files.length;
    const prompt = `你是一个旅游咨询分析助手。现在有${imgCount}张微信聊天截图（属于同一段对话的连续截图），请按顺序识别并提取所有聊天内容，合并为完整的对话记录，然后输出结构化分析结果。

注意：
- 截图可能来自同一对话的不同位置，请完整读取所有文字
- 如果多张图是同一个人发的连续消息，也要读取
- 请综合所有截图信息，输出完整分析

请以JSON格式返回（如果无法确定某字段，填null）：
{
  "destination": "想去去的旅游目的地，如张家界、凤凰古城等",
  "people_count": "出行人数，如2大1小、5人、团队等",
  "travel_date": "计划出行日期，如5月1日、下周末等",
  "budget": "预算范围，如3000-5000元、5000元左右",
  "objections": "客户表达的疑虑或担忧，如价格太高、时间不确定等",
  "chat_summary": "从截图中提取的完整对话要点（按时间顺序）",
  "summary": "一段话总结客户咨询的核心需求"
}`;

    content.push({ type: 'text', text: prompt });

    const completion = await client.chat.completions.create({
      model: 'moonshot-v1-8k-vision-preview',
      messages: [
        {
          role: 'system',
          content: '你是一个智能旅行助手后端的API解析器。你的唯一任务是分析内容并输出严格的纯JSON格式数据。不要输出任何解释性文本，不要包含Markdown标记。'
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.3
    }, {
      timeout: 60000,  // 60秒超时，防止视觉模型处理过慢
      maxRetries: 1
    });

    const raw = completion.choices[0]?.message?.content || '';
    
    // 精准截取 JSON 内容（处理 Kimi 可能添加的前缀/后缀）
    let cleaned = raw.trim();
    // 移除可能的 markdown 标记
    cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '');
    // 截取第一个 { 和最后一个 } 之间的内容
    const startIndex = cleaned.indexOf('{');
    const endIndex = cleaned.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { error: '解析AI响应失败', raw };
    }

    parsed.image_count = imgCount;
    res.json(parsed);

  } catch (err) {
    console.error('analyze-images error:', err.message);
    res.status(500).json({ error: '长截图分析失败: ' + err.message });
  }
});

// ============ POST /api/analyze-chat ============
// 深度聊天分析：优缺点 + 改进方法
router.post('/analyze-chat', async (req, res) => {
  try {
    const { chat } = req.body;

    if (!chat || chat.trim().length < 10) {
      return res.status(400).json({ error: '请提供有效的聊天记录（至少10个字符）' });
    }

    const client = getOpenAIClient();

    const prompt = `你是旅游行业顶级销售培训专家。请深度分析以下客服与客户的微信聊天记录。

聊天记录：
${chat}

请严格以JSON格式返回，不要有任何额外文字：
{
  "summary": "聊天概要：客户需求是什么，成交概率多大（0-100%），用一句话概括",
  "score": 85,
  "strengths": ["优点1","优点2","优点3"],
  "weaknesses": ["缺点1","缺点2","缺点3"],
  "improvements": [
    {
      "point": "改进点描述",
      "from": "原来的做法/说法",
      "to": "应该这样做/说",
      "reason": "为什么这样改更好"
    }
  ],
  "recommended_script": "如果重新聊，推荐使用的下一句完美开场白（40字以内，专业自信，推进成交）",
  "customer_type": "客户性格类型判断",
  "closing_probability": "高/中/低"
}`;

    const completion = await client.chat.completions.create({
      model: 'moonshot-v1-8k',
      messages: [
        {
          role: 'system',
          content: '你是一个智能旅行助手后端的API解析器。你的唯一任务是分析内容并输出严格的纯JSON格式数据。不要输出任何解释性文本，不要包含Markdown标记。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    const raw = completion.choices[0]?.message?.content || '';
    
    // 精准截取 JSON 内容（处理 Kimi 可能添加的前缀/后缀）
    let cleaned = raw.trim();
    // 移除可能的 markdown 标记
    cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '');
    // 截取第一个 { 和最后一个 } 之间的内容
    const startIndex = cleaned.indexOf('{');
    const endIndex = cleaned.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(200).json({ summary: raw, raw_text: chat });
    }

    res.json({ ...parsed, raw_text: chat });

  } catch (err) {
    console.error('analyze-chat error:', err.message);
    res.status(500).json({ error: '深度分析失败: ' + err.message });
  }
});

module.exports = router;
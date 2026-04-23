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

    const prompt = `你是张家界旅游公司资深客服销售专家。请分析这张微信聊天截图，像销售经理一样给出推进成交的建议。

【第一阶段：逐字识别（必须先完成，禁止跳过）】
请先逐字识别图中所有文字，重点区分：
- 绿色/浅色的文字 = 销售（客服）的话术
- 白色/深色的文字 = 客户的话术
请按消息顺序逐条列出所有识别到的话术内容。

【第二阶段：结构化分析】
在逐字识别完成后，才进行以下分析。如果图片下半部分模糊无法识别，请明确说明"图片下半部分模糊"，不要捏造内容。

请以JSON格式返回（如果无法确定某字段，填null）：
{
  "destination": "目的地（必填）",
  "people_count": "出行人数",
  "travel_date": "计划日期（如五一出游/端午/具体日期）",
  "budget": "客户透露的预算或消费层次（高/中/低/未提及）",
  "objections": "客户的核心疑虑（用一句话描述）",
  "purchase_signal": "购买信号强不强：高/中/低，并说明理由",
  "customer_mood": "客户当前情绪：认真考虑中/随便问问/货比三家/急切",
  "summary": "30字内概括客户此刻的状态",
  "sales_advice": "销售建议：遇到这类客户正确应对方式（50字内）",
  "next_sentence": "下一句话术：发一句能推进成交的话，20字以内，直接发给客户用",
  "urgency": "是否紧迫：五一/端午/暑假等节点临近程度",
  "sales_tips": ["技巧1","技巧2","技巧3"]
}`;

    const completion = await client.chat.completions.create({
      model: 'moonshot-v1-8k-vision-preview',
      messages: [
        {
          role: 'system',
          content: '你是张家界旅游公司资深客服销售专家，拥有10年旅游行业经验和极高成交率。你的任务是分析微信聊天截图，输出能让客服立刻提升成交率的实用建议。输出必须是严格JSON，不要任何解释性文字。'
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
    const prompt = `你是张家界旅游公司资深客服销售专家。请分析这${imgCount}张微信聊天截图，像销售经理一样给出推进成交的建议。

【第一阶段：逐字识别（必须先完成，禁止跳过）】
请先逐字识别图中所有文字，重点区分：
- 绿色/浅色的文字 = 销售（客服）的话术
- 白色/深色的文字 = 客户的话术
请按消息顺序逐条列出所有识别到的话术内容。

【第二阶段：结构化分析】
在逐字识别完成后，才进行以下分析。如果图片下半部分模糊无法识别，请明确说明"图片下半部分模糊"，不要捏造内容。

【重要】请完整读取所有${imgCount}张截图的文字，这是同一段对话的连续截图，请按顺序合并信息。

请以JSON格式返回（如果无法确定某字段，填null）：
{
  "destination": "目的地（必填）",
  "people_count": "出行人数",
  "travel_date": "计划日期（如五一出游/端午/具体日期）",
  "budget": "客户透露的预算或消费层次（高/中/低/未提及）",
  "objections": "客户的核心疑虑（用一句话描述）",
  "purchase_signal": "购买信号强不强：高/中/低，并说明理由",
  "customer_mood": "客户当前情绪：认真考虑中/随便问问/货比三家/急切",
  "summary": "30字内概括客户此刻的状态",
  "sales_advice": "销售建议：遇到这类客户正确应对方式（50字内）",
  "next_sentence": "下一句话术：发一句能推进成交的话，20字以内，直接发给客户用",
  "urgency": "是否紧迫：五一/端午/暑假等节点临近程度",
  "sales_tips": ["技巧1","技巧2","技巧3"]
}`;

    content.push({ type: 'text', text: prompt });

    const completion = await client.chat.completions.create({
      model: 'moonshot-v1-8k-vision-preview',
      messages: [
        {
          role: 'system',
          content: '你是张家界旅游公司资深客服销售专家，拥有10年旅游行业经验和极高成交率。你的任务是分析微信聊天截图，输出能让客服立刻提升成交率的实用建议。输出必须是严格JSON，不要任何解释性文字。'
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

// ============ POST /api/analyze-sales ============
// 销售诊断：犀利分析致命错误 + 销冠话术重构
router.post('/analyze-sales', async (req, res) => {
  try {
    const { chat } = req.body;

    if (!chat || chat.trim().length < 20) {
      return res.status(400).json({ error: '请提供有效的聊天记录（至少20个字符）' });
    }

    const client = getOpenAIClient();

    const prompt = `你是一名顶尖的销售沟通专家，擅长通过分析聊天记录发现销售人员的致命错误，并提供顾问级的改进策略。

分析以下旅游客服与客户的微信聊天记录，输出一份结构化的诊断报告。

聊天记录：
${chat}

请严格以JSON格式返回（必须严格遵循格式，不要有任何额外文字）：
{
  "scores": {
    "opening": "开场破冰得分（0-20）",
    "needs_discovery": "需求挖掘得分（0-20）",
    "objection_handling": "异议处理得分（0-20）",
    "closing": "成交闭环得分（0-20）",
    "relationship": "关系维护得分（0-20）"
  },
  "total_score": "总分（0-100）",
  "fatal_flaws": [
    {
      "title": "致命缺点1的小标题",
      "customer_quote": "客户原话引用（加引号）",
      "sales_quote": "销售原话引用（加引号）",
      "why_fatal": "为什么这个做法致命（30字内）"
    },
    {
      "title": "致命缺点2的小标题",
      "customer_quote": "客户原话引用",
      "sales_quote": "销售原话引用",
      "why_fatal": "为什么致命"
    },
    {
      "title": "致命缺点3的小标题",
      "customer_quote": "客户原话引用",
      "sales_quote": "销售原话引用",
      "why_fatal": "为什么致命"
    }
  ],
  "improvement_strategies": [
    {
      "flaw": "对应致命缺点标题",
      "strategy": "新的销售思维和改进方向（50字内）"
    }
  ],
  "rewritten_scripts": [
    {
      "turn": "第几句发言",
      "original": "原销售话术",
      "rewritten": "销冠级别重构话术",
      "why_better": "为什么这样改更好（20字内）"
    }
  ],
  "one_liner_verdict": "用一句话对比普通销售与顶尖销售的核心差异",
  "overall_comment": "整体评价（1-2句话，犀利直接）"
}`;

    const completion = await client.chat.completions.create({
      model: 'moonshot-v1-8k',
      messages: [
        {
          role: 'system',
          content: '你是一名顶尖销售沟通专家，犀利、直接、不客气，能一针见血指出销售致命错误并给出可落地的话术重构。分析必须引用聊天记录原文作为证据。输出必须是严格JSON，不要任何解释性文字。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4
    });

    const raw = completion.choices[0]?.message?.content || '';

    let cleaned = raw.trim();
    cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '');
    const startIndex = cleaned.indexOf('{');
    const endIndex = cleaned.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(200).json({ error: 'AI响应解析失败', raw, raw_text: chat });
    }

    res.json({ ...parsed, raw_text: chat });

  } catch (err) {
    console.error('analyze-sales error:', err.message);
    res.status(500).json({ error: '销售诊断分析失败: ' + err.message });
  }
});

module.exports = router;
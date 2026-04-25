/**
 * LLM Adapter - 模型中立统一适配层
 * 
 * 更换模型：修改 config/models.json 的 active 字段
 * 添加新模型：在 config/models.json 添加新条目
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/models.json');
const MODEL_CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));

/**
 * 统一调用接口
 * @param {Object} params
 * @param {string} params.systemPrompt - 系统提示词
 * @param {string} [params.prompt] - 用户提示词
 * @param {string} [params.imageBase64] - Base64图片（可选）
 * @param {string} [params.modelName] - 模型名，不填则用配置的默认模型
 * @param {number} [params.maxTokens] - 最大Token数
 * @param {number} [params.temperature] - 温度参数
 * @param {number} [params.timeout] - 超时毫秒
 */
async function generateResponse({
  systemPrompt,
  prompt = '',
  imageBase64 = null,
  modelName = null,
  maxTokens = null,
  temperature = null,
  timeout = null
}) {
  const cfg = MODEL_CONFIG.models[MODEL_CONFIG.active];
  if (!cfg) throw new Error(`未配置模型: ${MODEL_CONFIG.active}`);

  const apiKey = getApiKey(cfg.apiKeyEnv);
  if (!apiKey) throw new Error(`API Key 未配置: ${cfg.apiKeyEnv}`);

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

  // 根据是否有图片决定消息格式
  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt || '请分析这张图片' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const requestBody = {
    model: imageBase64 ? (cfg.visionModel || cfg.defaultModel) : cfg.defaultModel,
    messages,
  };
  if (maxTokens) requestBody.max_tokens = maxTokens;
  if (temperature !== null) requestBody.temperature = temperature;

  const response = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeout || cfg.timeout * 1000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`LLM API 错误 ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function getApiKey(envName) {
  const keyMap = {
    KIMI_API_KEY: process.env.KIMI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
  };
  return keyMap[envName] || process.env[envName];
}

function setActiveModel(name) {
  if (!MODEL_CONFIG.models[name]) {
    throw new Error(`未知模型: ${name}，可用: ${Object.keys(MODEL_CONFIG.models).join(', ')}`);
  }
  MODEL_CONFIG.active = name;
}

function getActiveModel() { return MODEL_CONFIG.active; }
function listModels() { return Object.keys(MODEL_CONFIG.models); }

module.exports = { generateResponse, setActiveModel, getActiveModel, listModels };

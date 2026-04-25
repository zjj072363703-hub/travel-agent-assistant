/**
 * Prompt 版本管理 - 截图分析 v1.0
 * 
 * 模型更换时，只需在这里调整 Few-shot 示例
 */

module.exports = {
  version: '1.0',
  updatedAt: '2026-04-25',

  // 通用前缀（张家界知识库）
  knowledgeBase: require('fs').readFileSync(require('path').join(__dirname,'tourism-knowledge.md'),'utf8'),

  // System Prompt
  systemPrompt() {
    return `${this.knowledgeBase}

【角色】你是张家界旅游公司资深客服销售专家，拥有10年旅游行业经验和极高成交率。

【核心原则】输出必须是严格JSON，不要任何解释性文字，不要包含Markdown标记。`;
  },

  // 用户分析 Prompt（图片模式）
  analyzePrompt(chatText) {
    return `你是一个智能旅行助手后端的API解析器。

【任务】分析以下微信聊天截图，严格输出JSON。

【输出格式】
{
  "success": true/false,
  "analysis": {
    "customer": { "mood": string, "intent": string, "key_demand": string },
    "sales": { "strengths": string[], "weaknesses": string[] },
    "purchase_signal": string,
    "customer_mood": string,
    "sales_advice": string,
    "next_sentence": string,
    "urgency": "high" | "medium" | "low"
  }
}

【聊天内容】
${chatText}

严格输出JSON：`; // 触发模型输出
  },

  // 备用文字分析（无图片时）
  textAnalyzePrompt(chatText) {
    return `你是一个智能旅行助手后端的API解析器。

【任务】分析以下微信聊天记录，严格输出JSON。

【识别规则】绿色/浅色文字=导游话术，白色/深色文字=客户话术。
如果无法区分，默认第一条为客户，第二条为导游。

【聊天内容】
${chatText}

严格输出JSON：`; // 触发模型输出
  }
};

// ============ 三合一话术生成 Prompt ============
function replyMasterPrompt(chatText, keywords = {}) {
  const has580Trap = keywords.price || keywords.lowPrice;
  const hasBailong = keywords.bailong || keywords.timing;
  const hasBudget = keywords.budget || keywords.upgrade;

  let strategies = `【核心策略】客户买的是体验和信任，不是价格。`;

  if (has580Trap) {
    strategies += `
【580陷阱拆解】：客户提到低价团 → 绝对不要贬低对手，先认同"确实便宜"，然后拆解背后的代价："580含的是什么？落地还要交多少钱？有没有购物？您肯定不想把旅游变成购物团吧？"`;
  }
  if (hasBailong) {
    strategies += `
【百龙天梯VIP策略】：客户担心行程紧凑 → 体现VIP通道的价值："百龙天梯普通通道旺季排队2小时，我们走VIP通道10分钟上山，您和家人孩子不用晒太阳。"`;
  }
  if (hasBudget) {
    strategies += `
【升单策略】：客户犹豫价格 → 不打折，给价值："价格确实比低价团贵一点，但您看这包含百龙天梯VIP、山顶民宿、专属司机，这些都是别人要另外付的。"`;
  }

  return `${chatText}

【输入对话】
${chatText}

【输出JSON（严格格式）】:
{
  "reply": "一键复制话术（20字以内，直接发给客户）",
  "opinion": "专业意见：为什么要这样说（30字内）",
  "logic": "思维方法：以后遇到此类问题的万能公式（50字内）"
}${strategies}`;
}

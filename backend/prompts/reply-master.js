const fs = require('fs');
const path = require('path');

const knowledgeBase = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/knowledge-base.json'), 'utf8')
);
const tourismKnowledge = fs.readFileSync(
  path.join(__dirname, 'tourism-knowledge.md'), 'utf8'
);

module.exports = {
  version: '1.0',
  updatedAt: '2026-04-25',

  systemPrompt() {
    return `${tourismKnowledge}\n\n【角色】${knowledgeBase.persona}\n\n【核心任务】分析客服粘贴的微信对话，生成"一击必杀"的回复话术。输出必须是严格JSON。`;
  },

  analyzePrompt(chatText) {
    const text = chatText.toLowerCase();
    const triggered = [];

    for (const [key, scenario] of Object.entries(knowledgeBase.scenarios)) {
      const hit = scenario.keywords.some(k =>
        text.includes(k.toLowerCase()) || text.includes(k)
      );
      if (hit) triggered.push({ key, scenario });
    }

    const strategies = triggered.length
      ? triggered.map(t =>
        `- 【${t.key}】${t.scenario.response_template}`
      ).join('\n')
      : '（本对话未触发特定场景，使用通用策略）';

    const scenarioNote = triggered.length
      ? `\n【触发场景】${triggered.map(t => t.key).join('、')}\n`
      : '\n';

    return `【任务】分析以下微信对话，生成"一键复制话术"。

【识别规则】绿色/浅色文字=导游话术，白色/深色文字=客户话术。

【输出JSON（三合一结构）】：
{
  "reply": "一键复制话术：下一句直接发给客户，20字以内，专业自信",
  "opinion": "专业意见：为什么要这样说，30字内",
  "logic": "思维方法：此类问题的万能公式，50字内"
}${scenarioNote}【激活策略】：
${strategies}

【输入对话】
${chatText}`;
  }
};

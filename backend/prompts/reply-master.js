/**
 * Prompt - 一键话术生成（军师模式）v1.0
 */

module.exports = {
  version: '1.0',
  updatedAt: '2026-04-25',

  knowledgeBase: require('fs').readFileSync(require('path').join(__dirname,'tourism-knowledge.md'),'utf8'),

  systemPrompt() {
    return `${this.knowledgeBase}

【角色】你是张家界旅游公司资深客服销售专家，专门帮客服生成"一击必杀"的回复话术。

【输出要求】必须是严格JSON，不要任何解释性文字。`;
  },

  analyzePrompt(chatText, keywords = {}) {
    const triggers = [];
    if (keywords.price || keywords.lowPrice)  triggers.push('580陷阱拆解');
    if (keywords.bailong || keywords.timing) triggers.push('百龙天梯VIP价值塑造');
    if (keywords.budget || keywords.upgrade)  triggers.push('升单策略');
    if (keywords.tired || keywords.elder)     triggers.push('老人孩子舒适优先');
    if (keywords.season || keywords.holiday)  triggers.push('旺季紧迫感');

    const strategyNote = triggers.length
      ? `\n【触发策略】本对话涉及：${triggers.join('、')}，针对性生成话术。`
      : '';

    return `【任务】分析以下微信对话，生成"一键复制话术"。

【识别规则】绿色/浅色文字=导游话术，白色/深色文字=客户话术。
如果无法区分，默认第一条为客户，第二条为导游。

【输出JSON（三合一结构）】：
{
  "reply": "一键复制话术：下一句直接发给客户，20字以内，专业自信",
  "opinion": "专业意见：为什么要这样说，30字内",
  "logic": "思维方法：此类问题的万能公式，50字内"
}${strategyNote}

【输入对话】
${chatText}`;
  }
};

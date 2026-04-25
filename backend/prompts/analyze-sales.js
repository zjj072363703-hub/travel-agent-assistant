/**
 * Prompt 版本管理 - 销售诊断 v1.0
 */

module.exports = {
  version: '1.0',
  updatedAt: '2026-04-25',

  knowledgeBase: require('./tourism-knowledge.md'),

  systemPrompt() {
    return `${this.knowledgeBase}

【角色】你是张家界旅游公司资深客服销售专家，拥有10年旅游行业经验和极高成交率。
你的任务是分析微信聊天截图，输出能让客服立刻提升成交率的实用建议。

【输出要求】必须是严格JSON，不要任何解释性文字。`;
  },

  analyzePrompt(chatText) {
    return `【任务】深度分析以下销售对话。

【识别规则】绿色/浅色文字=导游话术，白色/深色文字=客户话术。
如果无法区分，默认第一条为客户，第二条为导游。

【五维评分 - 每个维度0-20分，总分100】
- 开场白与破冰（0-20）
- 需求挖掘（0-20）
- 异议处理（0-20）
- 成交闭环（0-20）
- 关系维护（0-20）

【输出JSON】
{
  "success": true/false,
  "error": "错误信息（仅失败时）",
  "analysis": {
    "scores": {
      "opening": number,      // 开场白
      "needs_discovery": number,  // 需求挖掘
      "objection_handling": number, // 异议处理
      "closing": number,      // 成交闭环
      "relationship": number, // 关系维护
      "total": number         // 总分
    },
    "fatal_flaws": [
      {
        "description": "致命缺点描述",
        "customer_quote": "客户原话",
        "sales_quote": "销售原话",
        "severity": "critical" | "major"
      }
    ],
    "top_performer_sentence": "这句话如果是销冠会怎么说",
    "one_sentence_summary": "一句话总结普通销售和销冠的差距",
    "next_sentence": "下一步最应该说什么"
  }
}

【聊天内容】
${chatText}

严格输出JSON：`; // 触发模型输出
  }
};

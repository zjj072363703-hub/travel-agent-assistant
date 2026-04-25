const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const W = 900;
const H = 700;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// 背景
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, W, H);

// ========== 左列：失败案例（红色）==========
// 红色背景
ctx.fillStyle = '#fff5f5';
ctx.fillRect(0, 0, W/2, H);

// 标题
ctx.fillStyle = '#d93025';
ctx.font = 'bold 28px PingFang SC, Microsoft YaHei, sans-serif';
ctx.fillText('❌ 失败案例', 30, 50);

// 副标题
ctx.fillStyle = '#999';
ctx.font = '14px PingFang SC, Microsoft YaHei, sans-serif';
ctx.fillText('普通销售话术', 30, 76);
ctx.strokeStyle = '#ffe0e0';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(30, 86);
ctx.lineTo(W/2 - 30, 86);
ctx.stroke();

// 聊天气泡
const leftChats = [
  { role: '👤 客户', text: '五大一小，五一假期去玩，橘子洲、\n天门山、凤凰古城，多少钱？', isCustomer: true },
  { role: '💬 导游天赐', text: '您好！长沙进出六天五晚，三种方式：\n结伴游1880/人、精品小团2780/人、\n私家独立小包团…', isCustomer: false },
  { role: '👤 客户', text: '太长了，五一就五天假', isCustomer: true },
  { role: '💬 导游天赐', text: '还有四天三晚的行程，精品小团\n长沙进出，但不到凤凰古城', isCustomer: false },
];

let y = 105;
leftChats.forEach(chat => {
  ctx.fillStyle = '#666';
  ctx.font = 'bold 12px PingFang SC, Microsoft YaHei, sans-serif';
  ctx.fillText(chat.role, 30, y);
  y += 18;

  // 气泡背景
  const lines = chat.text.split('\n');
  const lineHeight = 20;
  const bubbleH = lines.length * lineHeight + 20;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = chat.isCustomer ? '#4a90d9' : '#ddd';
  ctx.lineWidth = chat.isCustomer ? 3 : 1;
  roundRect(ctx, 30, y, W/2 - 60, bubbleH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = '13px PingFang SC, Microsoft YaHei, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 42, y + 18 + i * lineHeight));
  y += bubbleH + 14;
});

// 结果框
ctx.fillStyle = '#ffe0e0';
roundRect(ctx, 30, y + 10, W/2 - 60, 50, 10);
ctx.fill();
ctx.fillStyle = '#c62828';
ctx.font = 'bold 15px PingFang SC, Microsoft YaHei, sans-serif';
ctx.fillText('❌ 结果：客户删除好友', 50, y + 40);

// ========== 右列：销冠话术（绿色）==========
// 绿色背景
ctx.fillStyle = '#f5fff5';
ctx.fillRect(W/2, 0, W/2, H);

// 标题
ctx.fillStyle = '#2e7d32';
ctx.font = 'bold 28px PingFang SC, Microsoft YaHei, sans-serif';
ctx.fillText('✅ 销冠话术', W/2 + 30, 50);

// 副标题
ctx.fillStyle = '#999';
ctx.font = '14px PingFang SC, Microsoft YaHei, sans-serif';
ctx.fillText('顾问式销售', W/2 + 30, 76);
ctx.strokeStyle = '#e0ffe0';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(W/2 + 30, 86);
ctx.lineTo(W - 30, 86);
ctx.stroke();

// 销冠气泡
const rightChats = [
  { role: '💬 销冠', text: '欢迎！您眼光真好，橘子洲+天门山\n+凤凰是湖南最经典的线路。\n\n五一旺季+五大一小，我建议您做专属\n商务车小包团，6人最划算，时间紧\n我帮您做最优路线规划，直接砍凤凰\n是不专业的方案。请问高铁票买了吗？' },
];

y = 105;
rightChats.forEach(chat => {
  ctx.fillStyle = '#666';
  ctx.font = 'bold 12px PingFang SC, Microsoft YaHei, sans-serif';
  ctx.fillText(chat.role, W/2 + 30, y);
  y += 18;

  const lines = chat.text.split('\n');
  const lineHeight = 20;
  const bubbleH = lines.length * lineHeight + 20;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#c8e6c9';
  ctx.lineWidth = 1;
  roundRect(ctx, W/2 + 30, y, W/2 - 60, bubbleH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = '13px PingFang SC, Microsoft YaHei, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W/2 + 42, y + 18 + i * lineHeight));
  y += bubbleH + 14;
});

// 结果框
ctx.fillStyle = '#e8f5e9';
roundRect(ctx, W/2 + 30, y + 10, W/2 - 60, 50, 10);
ctx.fill();
ctx.fillStyle = '#2e7d32';
ctx.font = 'bold 15px PingFang SC, Microsoft YaHei, sans-serif';
ctx.fillText('✅ 结果：成功签单 · 高客单价', W/2 + 50, y + 40);

// ========== 中间分割线 ==========
ctx.strokeStyle = '#e0e0e0';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(W/2, 0);
ctx.lineTo(W/2, H);
ctx.stroke();

// ========== 底部标签 ==========
ctx.fillStyle = '#888';
ctx.font = '14px PingFang SC, Microsoft YaHei, sans-serif';
ctx.textAlign = 'center';
ctx.fillText('由 TourBoost AI 智能分析生成 · tourboost.cn', W/2, H - 20);
ctx.textAlign = 'left';

// 保存
const buf = canvas.toBuffer('image/png');
fs.writeFileSync('/home/th321456/tourboost/comparison-card.png', buf);
console.log('PNG saved:', buf.length, 'bytes');

// 辅助函数：圆角矩形
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
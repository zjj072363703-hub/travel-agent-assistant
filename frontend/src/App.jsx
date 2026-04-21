import { useState, useEffect, useRef } from 'react'

const API = 'https://travel-agent-vxyp.onrender.com'

const STAGES = ['初询', '需求确认', '方案已发', '价格谈判', '成交', '已出行', '流失']

export default function App() {
  const [view, setView] = useState('home')
  const [tab, setTab] = useState('image')
  const [chatText, setChatText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [deepResult, setDeepResult] = useState(null)
  const [deepText, setDeepText] = useState('')
  const [deepLoading, setDeepLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const fileRef = useRef()
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  useEffect(() => { if (view === 'customers') loadCustomers(); if (view === 'home' || view === 'customers') loadStats() }, [view])

  async function loadStats() {
    try {
      const r = await fetch(`${API}/api/stats`)
      const d = await r.json()
      setStats(d)
    } catch {}
  }

  async function loadCustomers() {
    try {
      const r = await fetch(`${API}/api/customers`)
      const d = await r.json()
      setCustomers(d)
    } catch {}
  }

  async function handleTextAnalyze() {
    if (!chatText.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat: chatText })
      })
      const data = await res.json()
      setResult(data)
    } catch (e) { setResult({ error: e.message }) }
    setLoading(false)
  }

  async function handleDeepAnalyze() {
    if (!deepText.trim()) return
    setDeepLoading(true)
    try {
      const res = await fetch(`${API}/api/analyze-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat: deepText })
      })
      const data = await res.json()
      setDeepResult(data)
    } catch (e) { setDeepResult({ error: e.message }) }
    setDeepLoading(false)
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('images', f))
      const endpoint = files.length > 1 ? '/api/analyze-images' : '/api/analyze-image'
      const res = await fetch(`${API}${endpoint}`, { method: 'POST', body: formData })
      const data = await res.json()
      setResult(data)
    } catch (e) { setResult({ error: e.message }) }
    setLoading(false)
  }

  async function handleSaveCustomer(data) {
    await fetch(`${API}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, stage: data.stage || '初询' })
    })
    setShowCustomerModal(false)
    loadCustomers()
    loadStats()
  }

  async function handleUpdateStage(id, stage) {
    await fetch(`${API}/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage })
    })
    loadCustomers()
    loadStats()
  }

  async function handleDeleteCustomer(id) {
    await fetch(`${API}/api/customers/${id}`, { method: 'DELETE' })
    loadCustomers()
    loadStats()
  }

  const stageColor = (s) => {
    const map = { '初询': '#6b7280', '需求确认': '#3b82f6', '方案已发': '#8b5cf6', '价格谈判': '#f59e0b', '成交': '#10b981', '已出行': '#06b6d4', '流失': '#ef4444' }
    return map[s] || '#6b7280'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: '#1e293b', padding: '14px 24px', display: 'flex', gap: 24, borderBottom: '1px solid #334155', alignItems: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8' }}>🏔️ TourBoost</span>
        {[['首页', 'home'], ['分析工具', 'analyze'], ['客户列表', 'customers']].map(([label, v]) => (
          <button key={v} onClick={() => setView(v)} style={{ background: view === v ? '#38bdf8' : 'transparent', color: view === v ? '#0f172a' : '#94a3b8', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>{label}</button>
        ))}
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {/* Stats Bar */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
            {[
              ['总客户', stats.total, '#38bdf8'],
              ['今日新增', stats.new_today, '#10b981'],
              ['待跟进', stats.due_reminders, '#f59e0b'],
              ['已成交', stats.by_stage?.['成交'] || 0, '#22c55e']
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', border: `1px solid ${color}30` }}>
                <div style={{ fontSize: 28, fontWeight: 700, color }}>{val}</div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* HOME */}
        {view === 'home' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h1 style={{ fontSize: 42, fontWeight: 800, background: 'linear-gradient(135deg, #38bdf8, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              旅游客服成交神器
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 18, marginTop: 12, marginBottom: 36 }}>
              截图识别客户需求 · AI 生成成交话术 · 客户跟进管理
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['截图分析', 'analyze', '📸'], ['客户管理', 'customers', '👥'], ['文字分析', 'analyze', '💬']].map(([label, v, icon]) => (
                <button key={v} onClick={() => { setView(v.split(':')[0]); if (v === 'analyze') setTab('image') }}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '14px 28px', borderRadius: 10, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{icon}</span>{label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ANALYZE */}
        {view === 'analyze' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>AI 智能分析</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['📸 截图分析', 'image'], ['💬 文字分析', 'text'], ['🎯 深度分析', 'deep']].map(([label, t]) => (
                <button key={t} onClick={() => { setTab(t); setResult(null); setDeepResult(null) }}
                  style={{ background: tab === t ? '#38bdf8' : '#1e293b', color: tab === t ? '#0f172a' : '#94a3b8', border: '1px solid ' + (tab === t ? '#38bdf8' : '#334155'), padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'image' && (
              <div style={{ background: '#1e293b', borderRadius: 14, padding: 28, border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', marginBottom: 16 }}>上传微信聊天截图（支持长截图/多张图）</p>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current.click()} disabled={loading}
                  style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  {loading ? '分析中...' : '📤 上传截图'}
                </button>
                <p style={{ color: '#64748b', fontSize: 12, marginTop: 10 }}>支持单图或一次性上传多张（长截图）</p>
              </div>
            )}

            {tab === 'text' && (
              <div style={{ background: '#1e293b', borderRadius: 14, padding: 28, border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', marginBottom: 16 }}>粘贴客服与客户的聊天记录文本，AI 生成成交话术</p>
                <textarea value={chatText} onChange={e => setChatText(e.target.value)} rows={6}
                  placeholder="例：客户问张家界3日游多少钱，客服报价2800，客户说考虑一下..."
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff', padding: 12, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
                <button onClick={handleTextAnalyze} disabled={loading || !chatText.trim()}
                  style={{ marginTop: 12, background: loading ? '#1e3a5f' : '#38bdf8', color: '#0f172a', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? '分析中...' : '🚀 AI 分析'}
                </button>
              </div>
            )}

            {tab === 'deep' && (
              <div style={{ background: '#1e293b', borderRadius: 14, padding: 28, border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', marginBottom: 16 }}>粘贴完整聊天记录，AI 深度分析优缺点并给出改进方法</p>
                <textarea value={deepText} onChange={e => setDeepText(e.target.value)} rows={8}
                  placeholder="粘贴客服与客户的完整聊天记录..."
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff', padding: 12, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
                <button onClick={handleDeepAnalyze} disabled={deepLoading || !deepText.trim()}
                  style={{ marginTop: 12, background: deepLoading ? '#1e3a5f' : '#f59e0b', color: deepLoading ? '#94a3b8' : '#0f172a', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: deepLoading ? 'not-allowed' : 'pointer' }}>
                  {deepLoading ? '分析中...' : '🎯 深度分析'}
                </button>
              </div>
            )}

            {/* Deep Result */}
            {deepResult && !deepResult.error && (
              <div style={{ marginTop: 20 }}>
                <div style={{ background: '#1e293b', borderRadius: 14, padding: 24, border: '1px solid #f59e0b40', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ color: '#f59e0b', margin: 0 }}>🎯 深度分析报告</h3>
                    <span style={{ background: '#f59e0b', color: '#0f172a', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      评分 {deepResult.score}/100
                    </span>
                  </div>
                  <p style={{ color: '#94a3b8', margin: '0 0 8px', fontSize: 13 }}>📋 {deepResult.summary}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <span style={{ background: deepResult.closing_probability === '高' ? '#10b98130' : deepResult.closing_probability === '中' ? '#f59e0b30' : '#ef444430', color: deepResult.closing_probability === '高' ? '#10b981' : deepResult.closing_probability === '中' ? '#f59e0b' : '#ef4444', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
                      成交概率：{deepResult.closing_probability}
                    </span>
                    <span style={{ background: '#334155', color: '#94a3b8', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
                      客户类型：{deepResult.customer_type}
                    </span>
                  </div>
                </div>

                {deepResult.strengths?.length > 0 && (
                  <div style={{ background: '#1e293b', borderRadius: 14, padding: 20, border: '1px solid #10b98140', marginBottom: 12 }}>
                    <h4 style={{ color: '#10b981', margin: '0 0 12px' }}>✅ 优点</h4>
                    {deepResult.strengths.map((s, i) => (
                      <div key={i} style={{ color: '#d1fae5', fontSize: 14, marginBottom: 6 }}>• {s}</div>
                    ))}
                  </div>
                )}

                {deepResult.weaknesses?.length > 0 && (
                  <div style={{ background: '#1e293b', borderRadius: 14, padding: 20, border: '1px solid #ef444440', marginBottom: 12 }}>
                    <h4 style={{ color: '#ef4444', margin: '0 0 12px' }}>❌ 缺点</h4>
                    {deepResult.weaknesses.map((w, i) => (
                      <div key={i} style={{ color: '#fecaca', fontSize: 14, marginBottom: 6 }}>• {w}</div>
                    ))}
                  </div>
                )}

                {deepResult.improvements?.length > 0 && (
                  <div style={{ background: '#1e293b', borderRadius: 14, padding: 20, border: '1px solid #38bdf840', marginBottom: 12 }}>
                    <h4 style={{ color: '#38bdf8', margin: '0 0 12px' }}>📝 改进方法</h4>
                    {deepResult.improvements.map((imp, i) => (
                      <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < deepResult.improvements.length - 1 ? '1px solid #334155' : 'none' }}>
                        <div style={{ color: '#f59e0b', fontSize: 14, fontWeight: 600 }}>{imp.point}</div>
                        <div style={{ marginTop: 6, fontSize: 13 }}><span style={{ color: '#ef4444' }}>❌ 原来：</span>{imp.from}</div>
                        <div style={{ fontSize: 13 }}><span style={{ color: '#10b981' }}>✅ 改进：</span>{imp.to}</div>
                        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>💡 {imp.reason}</div>
                      </div>
                    ))}
                  </div>
                )}

                {deepResult.recommended_script && (
                  <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f3728)', borderRadius: 14, padding: 20, border: '1px solid #10b98140' }}>
                    <h4 style={{ color: '#10b981', margin: '0 0 8px' }}>💬 推荐下一句完美话术</h4>
                    <p style={{ color: '#fbbf24', fontSize: 16, fontWeight: 600, margin: 0 }}>{deepResult.recommended_script}</p>
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {result && !result.error && (
              <div style={{ marginTop: 20, background: '#1e293b', borderRadius: 14, padding: 24, border: '1px solid #10b98140' }}>
                <h3 style={{ color: '#10b981', marginBottom: 16 }}>✅ 分析结果</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {result.type && <div><span style={{ color: '#94a3b8' }}>客户类型：</span><strong>{result.type}</strong></div>}
                  {result.destination && <div><span style={{ color: '#94a3b8' }}>目的地：</span><strong>{result.destination}</strong></div>}
                  {result.people_count && <div><span style={{ color: '#94a3b8' }}>人数：</span><strong>{result.people_count}</strong></div>}
                  {result.budget && <div><span style={{ color: '#94a3b8' }}>预算：</span><strong>{result.budget}</strong></div>}
                  {result.objections && <div><span style={{ color: '#94a3b8' }}>疑虑：</span><strong>{result.objections}</strong></div>}
                  {result.reply && <div><span style={{ color: '#94a3b8' }}>💬 推荐话术：</span><p style={{ margin: '8px 0 0', color: '#fbbf24', fontSize: 15 }}>{result.reply}</p></div>}
                  {result.summary && <div><span style={{ color: '#94a3b8' }}>摘要：</span>{result.summary}</div>}
                </div>
                <button onClick={() => setShowCustomerModal(true)} style={{ marginTop: 16, background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  + 保存到客户列表
                </button>
              </div>
            )}
            {result?.error && (
              <div style={{ marginTop: 16, background: '#2d1b1b', borderRadius: 10, padding: 16, color: '#f87171', border: '1px solid #f8717140' }}>
                错误：{result.error}
              </div>
            )}
          </div>
        )}

        {/* CUSTOMERS */}
        {view === 'customers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>客户列表</h2>
              <button onClick={() => { setSelectedCustomer(null); setShowCustomerModal(true) }}
                style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                + 新增客户
              </button>
            </div>

            <div style={{ background: '#1e293b', borderRadius: 14, overflow: 'hidden', border: '1px solid #334155' }}>
              {customers.length === 0 && <p style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>暂无客户数据</p>}
              {customers.map(c => (
                <div key={c.id} style={{ padding: '14px 20px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{c.name || c.destination || '未知客户'} {c.phone && <span style={{ color: '#64748b', fontSize: 13 }}>({c.phone})</span>}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      {c.destination} · {c.people_count} · {c.travel_date} · 预算{c.budget}
                    </div>
                  </div>
                  <select value={c.stage} onChange={e => handleUpdateStage(c.id, e.target.value)}
                    style={{ background: stageColor(c.stage), color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => handleDeleteCustomer(c.id)} style={{ background: 'transparent', color: '#64748b', border: '1px solid #334155', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>删除</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Customer Modal */}
      {showCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <CustomerModal result={result} onSave={handleSaveCustomer} onClose={() => setShowCustomerModal(false)} stages={STAGES} />
        </div>
      )}
    </div>
  )
}

function CustomerModal({ result, onSave, onClose, stages }) {
  const [form, setForm] = useState({
    name: '', phone: '', destination: result?.destination || '', people_count: result?.people_count || '',
    travel_date: result?.travel_date || '', budget: result?.budget || '', objections: result?.objections || '',
    stage: '初询', notes: ''
  })
  return (
    <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, width: '90%', maxWidth: 480, border: '1px solid #334155' }}>
      <h3 style={{ marginTop: 0 }}>保存客户</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {[['姓名', 'name'], ['电话', 'phone'], ['目的地', 'destination'], ['人数', 'people_count'], ['出行日期', 'travel_date'], ['预算', 'budget']].map(([label, key]) => (
          <input key={key} placeholder={label} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
            style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff', padding: '8px 12px', fontSize: 14 }} />
        ))}
        <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff', padding: '8px 12px', fontSize: 14 }}>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea placeholder="备注" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff', padding: '8px 12px', fontSize: 14, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={() => onSave(form)} style={{ flex: 1, background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>保存</button>
        <button onClick={onClose} style={{ flex: 1, background: '#334155', color: '#fff', border: 'none', padding: '10px', borderRadius: 8, cursor: 'pointer' }}>取消</button>
      </div>
    </div>
  )
}

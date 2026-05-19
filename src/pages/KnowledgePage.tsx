import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { marked } from 'marked'

interface KnowledgeItem {
  id: string
  title: string
  summary: string
  user_notes: string | null
  created_at: string
  conversation_id: string
  categories?: { name: string } | null
}

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/knowledge')
      const data = await res.json()
      setItems((data || []) as KnowledgeItem[])
    } catch (err) {
      console.error('获取知识点失败:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const deleteItem = async (id: string) => {
    if (!confirm('确定要删除这个知识点吗？')) return
    await apiFetch(`/knowledge/${id}`, { method: 'DELETE' })
    setItems(items.filter((item) => item.id !== id))
  }

  const buildHtml = () => {
    const rows = items.map((item) => {
      const categoryTag = item.categories?.name
        ? ` | 分类：${item.categories.name}`
        : ''
      const notesHtml = item.user_notes
        ? `<div class="notes"><strong>\u{1f4dd} 我的笔记：</strong><br>${item.user_notes.replace(/\n/g, '<br>')}</div>`
        : ''
      return `
    <div class="item">
      <h2>${item.title}</h2>
      <div class="meta">${new Date(item.created_at).toLocaleString('zh-CN')}${categoryTag}</div>
      <div class="summary">${marked.parse(item.summary)}</div>
      ${notesHtml}
    </div>`
    }).join('')

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>英语知识点导出</title>
  <style>
    body { font-family: -apple-system, "Segoe UI", sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { text-align: center; color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
    .item { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0; page-break-inside: avoid; }
    .item h2 { font-size: 18px; margin: 0 0 4px; color: #1f2937; }
    .meta { font-size: 12px; color: #9ca3af; margin-bottom: 12px; }
    .summary { font-size: 14px; line-height: 1.8; }
    .summary table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    .summary th, .summary td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; font-size: 13px; }
    .summary th { background: #f3f4f6; font-weight: 600; }
    .notes { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 10px; margin-top: 12px; font-size: 13px; color: #92400e; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>\u{1f4da} 英语知识点汇总</h1>
  <p style="text-align:center;color:#6b7280;">导出时间：${new Date().toLocaleString('zh-CN')} | 共 ${items.length} 个知识点</p>
  ${rows}
</body>
</html>`
  }

  const exportWord = () => {
    if (items.length === 0) { alert('没有知识点可导出'); return }
    const html = buildHtml()
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `英语知识点_${new Date().toISOString().slice(0, 10)}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    if (items.length === 0) { alert('没有知识点可导出'); return }
    const html = buildHtml()
    const w = window.open('', '_blank')
    if (!w) { alert('请允许弹窗，或使用Word导出'); return }
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.print() }, 500)
  }

  const filtered = items.filter((item) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      (item.user_notes && item.user_notes.toLowerCase().includes(q))
    )
  })

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return d.toLocaleDateString('zh-CN')
  }

  return (
    <div className="max-w-3xl mx-auto h-full overflow-y-auto">
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
          placeholder="搜索知识点..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          onClick={exportWord}
          disabled={items.length === 0}
        >
          导出 Word
        </button>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 whitespace-nowrap"
          onClick={exportPdf}
          disabled={items.length === 0}
        >
          导出 PDF
        </button>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        共 {filtered.length} 个知识点
        {search && `（搜索: "${search}"）`}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <p className="text-4xl mb-3">{'\u{1f4d6}'}</p>
          {search ? (
            <p>没有找到匹配的知识点</p>
          ) : (
            <>
              <p className="text-lg">知识库还是空的</p>
              <p className="text-sm mt-1">去“对话”页面开始学习，保存你的第一个知识点吧</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md"
            >
              <div
                className="flex items-start justify-between p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm mb-1 truncate">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatDate(item.created_at)}</span>
                    {item.categories?.name && (
                      <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                        {item.categories.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                    onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }}
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expandedId === item.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="pt-3 prose prose-sm prose-headings:my-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-table:my-2 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-gray-300 prose-td:px-2 prose-td:py-1 max-w-none text-sm text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {item.summary}
                    </ReactMarkdown>
                  </div>
                  {item.user_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {'\u{1f4dd}'} 我的笔记
                      </span>
                      <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                        {item.user_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-6 text-center text-xs text-gray-400">
          Word文件可用Word/WPS打开，PDF通过浏览器打印对话框保存
        </div>
      )}
    </div>
  )
}

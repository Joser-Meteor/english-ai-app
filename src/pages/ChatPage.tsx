import { useState, useRef, useEffect } from 'react'
import { useChat } from '../lib/ChatContext'
import { apiFetch, apiStream } from '../lib/api'
import MessageBubble from '../components/MessageBubble'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ChatPage() {
  const { messages, setMessages, loading, setLoading } = useChat()
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [aiTitle, setAiTitle] = useState('')
  const [aiSummary, setAiSummary] = useState('')
  const [editingSummary, setEditingSummary] = useState(false)
  const [userNotes, setUserNotes] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = { role: 'user' as const, content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setStreamingContent('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await apiStream('/chat', { messages: newMessages }, controller.signal)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }))
        throw new Error(err.error || '请求失败')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.error) throw new Error(parsed.error)
              if (parsed.content) {
                fullContent += parsed.content
                setStreamingContent(fullContent)
              }
            } catch (e: any) {
              if (e.message && !e.message.includes('JSON')) throw e
            }
          }
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: fullContent }])
      setStreamingContent('')
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setMessages([...newMessages, {
        role: 'assistant',
        content: '抱歉，出错了：' + err.message + '\n\n请确认后端服务已启动，且 API Key 配置正确。'
      }])
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startSave = async () => {
    if (messages.length === 0) return
    setSaving(true)

    try {
      const res = await apiFetch('/summarize', { method: 'POST', body: JSON.stringify({ messages }) })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '总结失败')
      }

      const data = await res.json()
      setAiTitle(data.title)
      setAiSummary(data.summary)
      setEditingSummary(false)
      setUserNotes('')
      setShowSaveModal(true)
    } catch (err: any) {
      alert('总结失败：' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmSave = async () => {
    setSaving(true)
    try {
      const convRes = await apiFetch('/conversations', { method: 'POST', body: JSON.stringify({ title: aiTitle, messages }) })
      const convData = await convRes.json()

      await apiFetch('/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: convData.id,
          title: aiTitle,
          summary: aiSummary,
          user_notes: userNotes.trim() || null
        })
      })

      setShowSaveModal(false)
      setMessages([])
      alert('知识点已保存！')
    } catch (err: any) {
      alert('保存失败：' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-200 mb-4 p-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-lg font-medium">英语知识点AI助手</p>
              <p className="text-sm mt-1">输入你的英语学习问题，开始深度探讨</p>
              <div className="mt-4 text-xs space-y-1">
                <p>试试问：</p>
                <p>"英语中虚拟语气的用法有哪些？"</p>
                <p>"affect和effect怎么区分？"</p>
                <p>"如何分析一个长难句的结构？"</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {streamingContent && (
              <MessageBubble role="assistant" content={streamingContent} />
            )}
          </>
        )}
        {loading && !streamingContent && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-2xl px-4 py-2.5 text-gray-400">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 输入区 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            rows={2}
            placeholder="输入你的英语问题..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <div className="flex flex-row sm:flex-col gap-2">
            <button
              className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              发送
            </button>
            <button
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              onClick={startSave}
              disabled={saving || messages.length === 0 || loading}
            >
              {saving ? '总结中...' : '结束并保存'}
            </button>
          </div>
        </div>
      </div>

      {/* 保存确认弹窗 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">保存知识点</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">标题</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={aiTitle}
                  onChange={(e) => setAiTitle(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-600">
                    AI 精简总结
                  </label>
                  <button
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={() => setEditingSummary(!editingSummary)}
                  >
                    {editingSummary ? '预览' : '编辑'}
                  </button>
                </div>
                {editingSummary ? (
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    rows={12}
                    value={aiSummary}
                    onChange={(e) => setAiSummary(e.target.value)}
                  />
                ) : (
                  <div className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 max-h-64 overflow-y-auto prose prose-sm prose-headings:my-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-table:my-2 prose-th:border prose-th:border-gray-300 prose-th:bg-white prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-gray-300 prose-td:px-2 prose-td:py-1 max-w-none text-sm text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {aiSummary}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  我的笔记 <span className="text-gray-400">（可选，补充自己的心得）</span>
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  rows={4}
                  placeholder="可以在这里记录自己的理解、记忆技巧、或其他备注..."
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowSaveModal(false)}
                >
                  取消
                </button>
                <button
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  onClick={confirmSave}
                  disabled={saving}
                >
                  {saving ? '保存中...' : '确认保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useChat } from '../lib/ChatContext'
import { apiFetch, apiStream } from '../lib/api'
import MessageBubble from '../components/MessageBubble'

export default function ChatPage() {
  const { messages, setMessages, loading, setLoading } = useChat()
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [aiTitle, setAiTitle] = useState('')
  const [editingSummary, setEditingSummary] = useState('')
  const [userNotes, setUserNotes] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const msgListRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const jumpToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }

  const handleScroll = () => {
    const el = msgListRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200)
  }

  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === 'user') {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [messages])

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
      const res = await apiStream('/chat', { messages: newMessages.filter(m => m.role !== 'separator') }, controller.signal)

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
      const chatMsgs = messages.filter(m => m.role !== 'separator')
      const res = await apiFetch('/summarize', {
        method: 'POST',
        body: JSON.stringify({ messages: chatMsgs })
      })
      const data = await res.json()
      setAiTitle(data.title)
      setEditingSummary(data.summary)
      setUserNotes('')
      setShowSaveModal(true)
    } catch (err: any) {
      alert('总结失败：' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmSave = async () => {
    if (!aiTitle.trim()) { alert('请输入标题'); return }
    setSaving(true)
    try {
      const convRes = await apiFetch('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: aiTitle,
          messages
        })
      })
      const convData = await convRes.json()

      await apiFetch('/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: convData.id,
          title: aiTitle,
          summary: editingSummary,
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
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* 消息列表 */}
      <div ref={msgListRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-200 mb-2 p-4">
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
        {showScrollBtn && (
          <button
            className="sticky bottom-2 float-right z-10 w-9 h-9 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-lg hover:bg-indigo-700 transition-colors"
            onClick={jumpToBottom}
            title="跳到底部"
          >
            ↓
          </button>
        )}
      </div>

      {/* 输入区 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex-shrink-0">
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
          <div className="flex flex-row gap-2">
            <button
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              发送
            </button>
            <button
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              onClick={startSave}
              disabled={saving || messages.length === 0 || loading}
            >
              {saving ? '总结中...' : '结束并保存'}
            </button>
          </div>
        </div>
      </div>

      {/* 总结编辑弹窗 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">AI 总结</h2>
              <p className="text-sm text-gray-500 mb-4">AI 已根据对话生成知识点，你可以编辑后保存</p>

              <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={aiTitle}
                onChange={(e) => setAiTitle(e.target.value)}
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">知识点总结</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                rows={10}
                value={editingSummary}
                onChange={(e) => setEditingSummary(e.target.value)}
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">我的笔记（可选）</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50/30 resize-y"
                rows={3}
                placeholder="添加自己的笔记..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
              />

              <div className="flex gap-3 justify-end">
                <button
                  className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  onClick={() => { setShowSaveModal(false); setSaving(false) }}
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

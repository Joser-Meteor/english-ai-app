import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

export default function SettingsPage() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  const checkBackend = async () => {
    setBackendStatus('checking')
    try {
      await apiFetch('/knowledge')
      setBackendStatus('ok')
    } catch {
      setBackendStatus('error')
    }
  }

  useEffect(() => {
    checkBackend()
  }, [])

  return (
    <div className="max-w-2xl mx-auto h-full overflow-y-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">设置</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-medium text-gray-700 mb-3">服务状态</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">后端服务</span>
          <span className="flex items-center gap-2 text-sm">
            {backendStatus === 'checking' && <span className="text-yellow-500">检测中...</span>}
            {backendStatus === 'ok' && <span className="text-green-600">已连接</span>}
            {backendStatus === 'error' && <span className="text-red-500">无法连接</span>}
            <button
              className="text-indigo-600 hover:underline text-xs"
              onClick={checkBackend}
            >
              重试
            </button>
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-medium text-gray-700 mb-3">API 配置</h3>
        <p className="text-sm text-gray-500 mb-2">
          API Key 在服务端 <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">server/.env</code> 文件中配置。
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono leading-relaxed">
          DEEPSEEK_API_KEY=sk-xxxxxxxx<br />
          DEEPSEEK_BASE_URL=https://api.deepseek.com<br />
          SUPABASE_URL=https://xxxxxxxx.supabase.co<br />
          SUPABASE_SERVICE_KEY=eyJxxxxxxxx
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="font-medium text-gray-700 mb-3">使用说明</h3>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>在"对话"页面输入英语问题，与AI深入探讨</li>
          <li>讨论结束后，点击"结束并保存"，AI会自动总结知识点</li>
          <li>你可以编辑AI总结，并添加自己的笔记</li>
          <li>保存后，在"知识库"页面按时间线浏览所有知识点</li>
          <li>点击知识点可展开查看完整内容</li>
        </ol>
      </div>
    </div>
  )
}

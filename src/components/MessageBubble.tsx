import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  role: 'user' | 'assistant' | 'separator'
  content: string
}

export default function MessageBubble({ role, content }: Props) {
  if (role === 'separator') {
    return (
      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 border-t border-indigo-200" />
        <span className="text-xs text-indigo-500 font-medium px-2.5 py-0.5 bg-indigo-50 rounded-full whitespace-nowrap">
          {content}
        </span>
        <div className="flex-1 border-t border-indigo-200" />
      </div>
    )
  }

  const isUser = role === 'user'

  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`${isUser ? 'max-w-[80%]' : 'max-w-[95%] sm:max-w-[92%]'} rounded-2xl px-3 sm:px-4 py-2.5 ${
        isUser
          ? 'bg-indigo-500 text-white'
          : 'bg-gray-100 text-gray-800'
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        ) : (
          <div className="prose prose-sm prose-headings:my-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-table:my-2 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-gray-300 prose-td:px-2 prose-td:py-1 prose-strong:text-gray-900 prose-a:text-indigo-600 max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

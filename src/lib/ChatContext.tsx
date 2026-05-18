import { createContext, useContext, useState, type ReactNode } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatContextType {
  messages: Message[]
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void
  loading: boolean
  setLoading: (v: boolean) => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  return (
    <ChatContext.Provider value={{ messages, setMessages, loading, setLoading }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}

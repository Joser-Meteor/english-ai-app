import { Routes, Route } from 'react-router-dom'
import { ChatProvider } from './lib/ChatContext'
import Layout from './components/Layout'
import ChatPage from './pages/ChatPage'
import KnowledgePage from './pages/KnowledgePage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <ChatProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </ChatProvider>
  )
}

export default App

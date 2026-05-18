import { Outlet, NavLink } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-indigo-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold">英语知识点AI助手</h1>
          <nav className="flex gap-1 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${
                  isActive ? 'bg-indigo-700' : 'hover:bg-indigo-500'
                }`
              }
            >
              对话
            </NavLink>
            <NavLink
              to="/knowledge"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${
                  isActive ? 'bg-indigo-700' : 'hover:bg-indigo-500'
                }`
              }
            >
              知识库
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${
                  isActive ? 'bg-indigo-700' : 'hover:bg-indigo-500'
                }`
              }
            >
              设置
            </NavLink>
          </nav>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4">
        <Outlet />
      </main>
    </div>
  )
}

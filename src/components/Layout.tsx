import { Outlet, NavLink } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <header className="bg-indigo-600 text-white shadow-md flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-3 sm:px-4 h-14 gap-2">
          <h1 className="text-base sm:text-lg font-bold whitespace-nowrap">英语AI助手</h1>
          <nav className="flex gap-0.5 sm:gap-1 text-xs sm:text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-1.5 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  isActive ? 'bg-indigo-700' : 'hover:bg-indigo-500'
                }`
              }
            >
              对话
            </NavLink>
            <NavLink
              to="/knowledge"
              className={({ isActive }) =>
                `px-1.5 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  isActive ? 'bg-indigo-700' : 'hover:bg-indigo-500'
                }`
              }
            >
              知识库
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `px-1.5 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  isActive ? 'bg-indigo-700' : 'hover:bg-indigo-500'
                }`
              }
            >
              设置
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-4 pb-4">
        <Outlet />
      </main>
    </div>
  )
}

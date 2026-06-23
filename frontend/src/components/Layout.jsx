import React from 'react'

function Layout({ children, currentScreen, onNavigate }) {
  const navItems = [
    { id: 'dashboard', icon: '▦', label: 'Dashboard' },
    { id: 'upload', icon: '↑', label: 'Upload Logs' },
    { id: 'timeline', icon: '≡', label: 'Timeline' },
    { id: 'output', icon: '📄', label: 'Postmortem' },
  ]

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className="w-56 bg-[#0D1B2A] flex flex-col flex-shrink-0">
        <div className="px-5 py-6 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0D9488] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">PM</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Postmortem</p>
              <p className="text-slate-500 text-xs">Generator</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-2 mb-3">Workflow</p>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate && onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                currentScreen === item.id
                  ? 'bg-[#0D9488] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-[#0D9488] rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-400">AWS CloudWatch</span>
          </div>
          <p className="text-xs text-slate-600">Digitide · Cloud Infra</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

export default Layout
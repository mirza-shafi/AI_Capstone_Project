import { BarChart3, Inbox as InboxIcon, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { NewMessageModal } from './NewMessageModal'

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary-light text-primary' : 'text-slate-600 hover:bg-slate-100'
  }`

export function Layout() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Brand />
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClasses}>
              <InboxIcon size={16} />
              <span className="hidden sm:inline">Inbox</span>
            </NavLink>
            <NavLink to="/analytics" className={navLinkClasses}>
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Analytics</span>
            </NavLink>
          </nav>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover cursor-pointer"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Simulate message</span>
        </button>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>

      {modalOpen && <NewMessageModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

function Brand(): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
        T
      </div>
      <span className="text-base font-bold tracking-tight text-slate-900">TriageIQ</span>
    </div>
  )
}

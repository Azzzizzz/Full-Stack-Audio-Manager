import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, Upload, LogOut, Menu, X } from 'lucide-react'
import { useAuthStore } from '../stores/auth'

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`

  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="h-7 w-7 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
            <rect x="1"  y="9"  width="3" height="6" rx="1.5"/>
            <rect x="6"  y="5"  width="3" height="14" rx="1.5"/>
            <rect x="11" y="2"  width="3" height="20" rx="1.5"/>
            <rect x="16" y="5"  width="3" height="14" rx="1.5"/>
            <rect x="21" y="9"  width="3" height="6" rx="1.5"/>
          </svg>
          <span className="text-lg font-bold text-indigo-700 tracking-tight">Meeami</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <NavLink to="/audio" className={linkClass} onClick={onClose}>
          <LayoutGrid className="h-5 w-5 flex-shrink-0" />
          Library
        </NavLink>
        <NavLink to="/upload" className={linkClass} onClick={onClose}>
          <Upload className="h-5 w-5 flex-shrink-0" />
          Upload Audio
        </NavLink>
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-gray-100 flex-shrink-0 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {user.first_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">
                {user.first_name} {user.last_name}
              </p>
              <p className="truncate text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          Logout
        </button>
      </div>
    </>
  )
}

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile (drawer), static on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0`}
      >
        <SidebarContent onClose={() => setOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div className="flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <svg className="h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
              <rect x="1"  y="9"  width="3" height="6" rx="1.5"/>
              <rect x="6"  y="5"  width="3" height="14" rx="1.5"/>
              <rect x="11" y="2"  width="3" height="20" rx="1.5"/>
              <rect x="16" y="5"  width="3" height="14" rx="1.5"/>
              <rect x="21" y="9"  width="3" height="6" rx="1.5"/>
            </svg>
            <span className="text-base font-bold text-indigo-700">Meeami</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

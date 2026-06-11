import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

const navItems = [
  { to: '/browse', label: 'Browse' },
  { to: '/map', label: 'Map' },
  { to: '/compare', label: 'Compare' },
  { to: '/chat', label: 'AI Assistant' },
]

export default function Navbar() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-8">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-md bg-teal-600 flex items-center justify-center text-white font-bold text-sm">EV</span>
          <span className="font-semibold text-slate-900 text-sm hidden sm:block">Policy Intel</span>
        </NavLink>

        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 hidden md:block">India EV Policy Platform</span>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              clsx(
                'px-2 py-1 rounded text-xs transition-colors',
                isActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600',
              )
            }
          >
            Admin
          </NavLink>
        </div>
      </div>
    </header>
  )
}

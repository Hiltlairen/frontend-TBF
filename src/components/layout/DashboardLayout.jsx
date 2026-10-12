import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import PrivacyNoticeGate from './PrivacyNoticeGate.jsx'
import ThemeToggle from '../../theme/ThemeToggle.jsx'
import './DashboardLayout.css'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="dashboard-shell">
      <PrivacyNoticeGate />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="topbar-burger"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>
          <div className="topbar-title">Panel del docente</div>
          <div className="topbar-user">
            <ThemeToggle />
            <span className="badge badge-ok">Demo</span>
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

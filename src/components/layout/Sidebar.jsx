import { NavLink } from 'react-router-dom'
import { useAuth, ROL_NOMBRE } from '../../auth/AuthContext.jsx'
import { useCerrarConEscape } from '../../lib/a11y.js'
import './Sidebar.css'

// Cada entrada declara qué roles la ven. El menú se arma según
// quién está dentro, así nadie ve secciones que no puede abrir.
const MENU = [
  { to: '/dashboard',                   label: 'Inicio',            icono: '🏠', roles: ['docente', 'admin'], exacto: true },
  { to: '/dashboard/actividades/crear', label: 'Crear actividad',   icono: '🧩', roles: ['docente', 'admin'] },
  { to: '/dashboard/resultados',        label: 'Gestión de cursos', icono: '📊', roles: ['docente', 'admin'] },
  { to: '/dashboard/vocabulario',       label: 'Vocabulario',       icono: '📚', roles: ['docente', 'admin'] },
  { to: '/dashboard/usuarios',          label: 'Usuarios',          icono: '👥', roles: ['admin'] },
  { to: '/dashboard/clases',            label: 'Clases',            icono: '🏫', roles: ['admin'] },
  { to: '/dashboard/perfil',            label: 'Mi perfil',         icono: '⚙️', roles: ['docente', 'admin'] },
  { to: '/curaduria',                   label: 'Curaduría',         icono: '🔍', roles: ['curador', 'admin'], exacto: true },
  { to: '/curaduria/vocabulario',       label: 'Vocabulario',       icono: '📚', roles: ['curador'] },
  { to: '/curaduria/resultados',        label: 'Entregas',          icono: '📊', roles: ['curador'] },
  { to: '/curaduria/clases',            label: 'Clases',            icono: '🏫', roles: ['curador'] },
  { to: '/curaduria/perfil',            label: 'Mi perfil',         icono: '⚙️', roles: ['curador'] },
]

export default function Sidebar({ open, onClose }) {
  const { usuario, salir } = useAuth()
  const visibles = MENU.filter((m) => m.roles.includes(usuario?.rol))
  // En mobile el sidebar es un drawer superpuesto (como un modal): Escape
  // debe cerrarlo igual que el click afuera.
  useCerrarConEscape(onClose, open)

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">EN</span>
          <div>
            <strong>English Lessons</strong>
            <div className="sidebar-brand-sub">{ROL_NOMBRE[usuario?.rol] ?? 'Panel'}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibles.map((item) => (
            <NavLink
              key={item.to} to={item.to} end={item.exacto} onClick={onClose}
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
            >
              <span className="sidebar-icon">{item.icono}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-usuario">
          {usuario?.avatar
            ? <img className="sidebar-avatar sidebar-avatar-img" src={usuario.avatar} alt="" />
            : <div className="sidebar-avatar">{usuario?.nombre?.[0] ?? '?'}</div>}
          <div className="sidebar-usuario-txt">
            <strong>{usuario?.nombre}</strong>
            <small>{usuario?.email}</small>
          </div>
        </div>
        <button className="sidebar-salir" onClick={salir}>Cerrar sesión</button>

        <NavLink to="/" className="sidebar-student-link">← Vista del estudiante</NavLink>
      </aside>
    </>
  )
}

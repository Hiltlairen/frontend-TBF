// ============================================================
// AdminUsers.jsx — Gestión de cuentas (solo ADMIN)
// ============================================================
// Solo se crean cuentas de admin, curador y docente.
// Los estudiantes NO tienen cuenta: entran con código de sala.
//
// IMPORTANTE: el admin NO puede ELIMINAR cuentas, solo DARLAS DE
// BAJA (desactivarlas) y reactivarlas. Así no se pierde la
// autoría de las actividades ni el historial.
// ============================================================
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { ROL_NOMBRE, useAuth } from '../auth/AuthContext.jsx'
import './Admin.css'

const ROLES_CREABLES = ['docente', 'curador', 'admin']
const VACIO = { email: '', nombre: '', rol: 'docente' }

function Avatar({ nombre, avatar }) {
  if (avatar) return <img className="adm-avatar" src={avatar} alt="" />
  return <span className="adm-avatar adm-avatar-ini">{nombre?.[0] ?? '?'}</span>
}

export default function AdminUsers() {
  const { usuario: yo } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [panorama, setPanorama] = useState(null)
  const [nuevo, setNuevo] = useState(VACIO)
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [cargando, setCargando] = useState(true)

  function cargar() {
    Promise.all([api.admin.usuarios(), api.admin.panorama()])
      .then(([u, p]) => { setUsuarios(u.usuarios); setPanorama(p) })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }
  useEffect(cargar, [])

  async function crear(e) {
    e.preventDefault()
    setError(null); setAviso(null)
    try {
      await api.admin.crearUsuario(nuevo)
      setAviso(`Cuenta creada para ${nuevo.email}. Le mandamos un correo para que la active y elija su contraseña.`)
      setNuevo(VACIO); setAbriendo(false)
      cargar()
    } catch (err) { setError(err.message) }
  }

  async function reenviarInvitacion(u) {
    setError(null); setAviso(null)
    try {
      await api.admin.reenviarInvitacion(u.id)
      setAviso(`Reenviamos el enlace de activación a ${u.email}.`)
    } catch (err) { setError(err.message) }
  }

  // Reactivar = editar activo:true. Dar de baja = endpoint dedicado.
  async function alternarActivo(u) {
    setError(null); setAviso(null)
    try {
      if (u.activo) {
        if (!confirm(`¿Dar de baja a ${u.nombre}? No podrá iniciar sesión, pero su cuenta e historial se conservan y puedes reactivarla luego.`)) return
        await api.admin.darDeBaja(u.id)
        setAviso(`${u.nombre} fue dado de baja.`)
      } else {
        await api.admin.editarUsuario(u.id, { activo: true })
        setAviso(`${u.nombre} fue reactivado.`)
      }
      cargar()
    } catch (e) { setError(e.message) }
  }

  async function cambiarRol(u, rol) {
    setError(null)
    try { await api.admin.editarUsuario(u.id, { rol }); cargar() }
    catch (e) { setError(e.message) }
  }

  return (
    <div className="adm-page">
      <h2>Usuarios y permisos</h2>
      <p className="muted">
        Los estudiantes no aparecen aquí: no tienen cuenta, entran con el código de sala
        que genera su docente. Las cuentas no se eliminan; se dan de baja para conservar
        el historial y la autoría de las actividades.
      </p>

      {panorama && (
        <div className="adm-metricas">
          <div><strong>{panorama.porRol.docente}</strong><small>Docentes</small></div>
          <div><strong>{panorama.porRol.curador}</strong><small>Curadores</small></div>
          <div><strong>{panorama.porRol.admin}</strong><small>Admins</small></div>
          <div><strong>{panorama.salasActivas}</strong><small>Salas activas</small></div>
          <div><strong>{panorama.partidas}</strong><small>Partidas</small></div>
          <div className={panorama.revisionesPendientes ? 'alerta' : ''}>
            <strong>{panorama.revisionesPendientes}</strong><small>En curaduría</small>
          </div>
        </div>
      )}

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}
      {aviso && <p className="badge badge-ok" style={{ display: 'block' }}>{aviso}</p>}

      <div className="adm-barra">
        <button className="adm-btn" onClick={() => setAbriendo((v) => !v)}>
          {abriendo ? 'Cancelar' : '+ Nueva cuenta'}
        </button>
      </div>

      {abriendo && (
        <form className="adm-form" onSubmit={crear}>
          <label>
            <span>Nombre</span>
            <input value={nuevo.nombre} required
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={nuevo.email} required
              onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
          </label>
          <label>
            <span>Rol</span>
            <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
              {ROLES_CREABLES.map((r) => <option key={r} value={r}>{ROL_NOMBRE[r]}</option>)}
            </select>
          </label>
          <p className="muted" style={{ margin: 0 }}>
            No pones una contraseña: le mandamos un correo de activación a la persona para
            que confirme su email y elija la suya. Tú nunca la conoces.
          </p>
          <button className="adm-btn adm-btn-ok" type="submit">Crear cuenta e invitar</button>
        </form>
      )}

      <div className="adm-tabla-scroll">
        <table className="adm-tabla">
          <thead>
            <tr>
              <th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th />
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan={6} className="muted">Cargando…</td></tr>}
            {usuarios.map((u) => (
              <tr key={u.id} className={u.activo ? '' : 'inactivo'}>
                <td>
                  <div className="adm-usuario-celda">
                    <Avatar nombre={u.nombre} avatar={u.avatar} />
                    <span>{u.nombre}</span>
                  </div>
                </td>
                <td className="adm-email">{u.email}</td>
                <td>
                  <select value={u.rol} onChange={(e) => cambiarRol(u, e.target.value)}
                    disabled={u.id === yo?.id} title={u.id === yo?.id ? 'No puedes cambiar tu propio rol' : undefined}>
                    {ROLES_CREABLES.map((r) => <option key={r} value={r}>{ROL_NOMBRE[r]}</option>)}
                  </select>
                </td>
                <td>
                  {!u.activo ? (
                    <span className="adm-pill off">de baja</span>
                  ) : u.emailVerificado ? (
                    <span className="adm-pill on">activa</span>
                  ) : (
                    <span className="adm-pill off" title="Todavía no confirmó su correo ni eligió contraseña">pendiente</span>
                  )}
                </td>
                <td className="muted">
                  {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-BO') : '—'}
                </td>
                <td className="cls-acciones">
                  {u.activo && !u.emailVerificado && (
                    <button className="adm-btn" onClick={() => reenviarInvitacion(u)}>Reenviar invitación</button>
                  )}
                  {u.id === yo?.id ? (
                    <small className="muted">Tu cuenta</small>
                  ) : (
                    <button
                      className={`adm-baja ${u.activo ? '' : 'reactivar'}`}
                      onClick={() => alternarActivo(u)}>
                      {u.activo ? 'Dar de baja' : 'Reactivar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

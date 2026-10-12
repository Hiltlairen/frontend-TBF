// ============================================================
// ConfirmarEmail.jsx — Momento 3: confirmar el correo NUEVO
// ============================================================
// Se abre desde el enlace que mandamos al correo NUEVO cuando
// alguien cambia el email de su perfil. Confirma solo — no pide
// contraseña, porque quien lo abre ya demostró tener acceso a esa
// bandeja de entrada, que es justo lo que se quería verificar.
// ============================================================
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import './Login.css'

export default function ConfirmarEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [estado, setEstado] = useState('cargando') // cargando | ok | error
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (!token) { setEstado('error'); setMensaje('Este enlace no trae el código de confirmación.'); return }
    api.auth.confirmarCambioEmail(token)
      .then(({ email }) => { setEstado('ok'); setMensaje(email) })
      .catch((e) => { setEstado('error'); setMensaje(e.message) })
  }, [token])

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">EN</div>
        <h1>Confirmar tu correo</h1>

        {estado === 'cargando' && <p className="login-sub">Confirmando…</p>}
        {estado === 'ok' && (
          <p className="badge badge-ok" style={{ display: 'block' }}>
            Listo — tu cuenta ahora usa <strong>{mensaje}</strong>. Ya puedes iniciar sesión con ese correo.
          </p>
        )}
        {estado === 'error' && <p className="login-error">{mensaje}</p>}

        <Link to="/entrar" className="login-alumno">Ir a iniciar sesión →</Link>
      </div>
    </div>
  )
}

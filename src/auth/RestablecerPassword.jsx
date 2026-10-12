// ============================================================
// RestablecerPassword.jsx — Momento 2: fijar la contraseña nueva
// ============================================================
import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import './Login.css'

export default function RestablecerPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState(null)
  const [hecho, setHecho] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('La contraseña necesita al menos 8 caracteres.')
    if (password !== password2) return setError('Las dos contraseñas no coinciden.')
    setCargando(true)
    try {
      await api.auth.resetPassword(token, password)
      setHecho(true)
    } catch (err) { setError(err.message) }
    finally { setCargando(false) }
  }

  if (!token) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">EN</div>
          <h1>Enlace incompleto</h1>
          <p className="login-sub">Ábrelo desde el correo que te mandamos, o pide uno nuevo.</p>
          <Link to="/olvide-password" className="login-alumno">Pedir un enlace nuevo →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={enviar}>
        <div className="login-brand">EN</div>
        <h1>Elige tu nueva contraseña</h1>

        {hecho ? (
          <>
            <p className="badge badge-ok" style={{ display: 'block' }}>
              Listo. Ya puedes entrar con tu contraseña nueva.
            </p>
            <Link to="/entrar" className="login-alumno">Ir a iniciar sesión →</Link>
          </>
        ) : (
          <>
            <label className="login-campo">
              <span>Contraseña nueva (mín. 8 caracteres)</span>
              <input type="password" value={password} autoComplete="new-password" required minLength={8}
                onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="login-campo">
              <span>Repítela</span>
              <input type="password" value={password2} autoComplete="new-password" required minLength={8}
                onChange={(e) => setPassword2(e.target.value)} />
            </label>

            {error && (
              <>
                <p className="login-error">{error}</p>
                <Link to="/olvide-password" className="login-alumno">¿El enlace venció? Pide uno nuevo →</Link>
              </>
            )}

            <button className="login-btn" type="submit" disabled={cargando}>
              {cargando ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

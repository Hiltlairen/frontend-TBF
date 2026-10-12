// ============================================================
// OlvidePassword.jsx — Momento 2: pedir el enlace de reset
// ============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import './Login.css'

export default function OlvidePassword() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError(null); setCargando(true)
    try {
      // La respuesta es siempre genérica: no delata si el correo existe.
      await api.auth.olvidePassword(email.trim())
      setEnviado(true)
    } catch (err) { setError(err.message) }
    finally { setCargando(false) }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={enviar}>
        <div className="login-brand">EN</div>
        <h1>Restablecer contraseña</h1>
        <p className="login-sub">Escribe tu correo institucional y te mandamos un enlace.</p>

        {enviado ? (
          <p className="badge badge-ok" style={{ display: 'block' }}>
            Si ese correo existe en el sistema, te mandamos instrucciones. Revisa tu bandeja de entrada.
          </p>
        ) : (
          <>
            <label className="login-campo">
              <span>Correo institucional</span>
              <input type="email" value={email} autoComplete="username" required
                onChange={(e) => setEmail(e.target.value)} />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button className="login-btn" type="submit" disabled={cargando || !email}>
              {cargando ? 'Enviando…' : 'Mandar enlace'}
            </button>
          </>
        )}

        <Link to="/entrar" className="login-alumno">← Volver a iniciar sesión</Link>
      </form>
    </div>
  )
}

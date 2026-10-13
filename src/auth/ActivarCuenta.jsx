// ============================================================
// ActivarCuenta.jsx — Momento 1: primer login con verificación
// ============================================================
// Enlace que llega por correo cuando el admin crea una cuenta de
// staff. Confirma el correo Y fija la contraseña en un solo paso, tras
// resolver el captcha ("No soy un robot"), que valida el servidor.
// ============================================================
import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth, INICIO_POR_ROL } from './AuthContext.jsx'
import Captcha, { captchaActivo } from '../components/ui/Captcha.jsx'
import './Login.css'

export default function ActivarCuenta() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState(null)
  const [hecho, setHecho] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [reiniciarCaptcha, setReiniciarCaptcha] = useState(0)
  const navegar = useNavigate()
  const { entrarConToken } = useAuth()

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('La contraseña necesita al menos 8 caracteres.')
    if (password !== password2) return setError('Las dos contraseñas no coinciden.')
    if (captchaActivo && !captcha) return setError('Completa la verificación "No soy un robot".')
    setCargando(true)
    try {
      const { token: sesion, usuario } = await api.auth.verificarCuenta(token, password, captcha)
      entrarConToken(sesion, usuario)
      setHecho(true)
      setTimeout(() => navegar(INICIO_POR_ROL[usuario.rol] ?? '/dashboard', { replace: true }), 1200)
    } catch (err) {
      setError(err.message)
      setReiniciarCaptcha((n) => n + 1)   // el token del captcha es de un solo uso
    }
    finally { setCargando(false) }
  }

  if (!token) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">EN</div>
          <h1>Enlace incompleto</h1>
          <p className="login-sub">Este enlace no trae el código de activación. Ábrelo desde el correo que te mandamos.</p>
          <Link to="/entrar" className="login-alumno">Ir al inicio de sesión →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={enviar}>
        <div className="login-brand">EN</div>
        <h1>Activa tu cuenta</h1>
        <p className="login-sub">Confirma tu correo eligiendo tu contraseña. Es la única vez que la vas a escribir.</p>

        {hecho ? (
          <p className="badge badge-ok" style={{ display: 'block' }}>Cuenta activada. Entrando…</p>
        ) : (
          <>
            <label className="login-campo">
              <span>Contraseña (mín. 8 caracteres)</span>
              <input type="password" value={password} autoComplete="new-password" required minLength={8}
                onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="login-campo">
              <span>Repite la contraseña</span>
              <input type="password" value={password2} autoComplete="new-password" required minLength={8}
                onChange={(e) => setPassword2(e.target.value)} />
            </label>

            <Captcha onToken={setCaptcha} reiniciar={reiniciarCaptcha} />

            {error && <p className="login-error">{error}</p>}

            <button className="login-btn" type="submit" disabled={cargando || (captchaActivo && !captcha)}>
              {cargando ? 'Activando…' : 'Activar mi cuenta'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

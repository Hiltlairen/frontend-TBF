import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth, INICIO_POR_ROL } from './AuthContext.jsx'
import { useIdioma } from '../i18n/LanguageContext.jsx'
import LanguageSwitch from '../i18n/LanguageSwitch.jsx'
import ThemeToggle from '../theme/ThemeToggle.jsx'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const { entrar } = useAuth()
  const { t } = useIdioma()

  async function enviar(e) {
    e?.preventDefault()
    setCargando(true); setError(null)
    try {
      const u = await entrar(email.trim(), password)
      navegar(ubicacion.state?.desde ?? INICIO_POR_ROL[u.rol] ?? '/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={enviar}>
        <div className="login-top">
          <div className="login-brand">EN</div>
          <div className="login-acciones">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
        <h1>English Lessons</h1>
        <p className="login-sub">{t('login.sub')}</p>

        <label className="login-campo">
          <span>{t('login.email_label')}</span>
          <input
            type="email" value={email} autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@englishlessons.edu" required
          />
        </label>

        <label className="login-campo">
          <span>{t('login.password_label')}</span>
          <div className="login-pass">
            <input
              type={verPass ? 'text' : 'password'} value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} required
            />
            <button type="button" onClick={() => setVerPass((v) => !v)}
              aria-label={verPass ? t('login.hide_pass') : t('login.show_pass')}>
              {verPass ? t('login.hide') : t('login.show')}
            </button>
          </div>
        </label>

        {error && <p className="login-error">{error}</p>}

        <button className="login-btn" type="submit" disabled={cargando || !email || !password}>
          {cargando ? t('login.signing_in') : t('login.sign_in')}
        </button>

        <Link to="/olvide-password" className="login-alumno" style={{ marginTop: '-.3rem' }}>
          {t('login.forgot_password')}
        </Link>

        <Link to="/" className="login-alumno">
          {t('login.student_link')}
        </Link>
      </form>
    </div>
  )
}

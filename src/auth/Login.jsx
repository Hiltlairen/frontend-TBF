// ============================================================
// Login.jsx — Inicio de sesión del personal, en dos pasos
// ============================================================
//   1. Correo + contraseña + captcha ("No soy un robot").
//   2. El código de 6 dígitos que llega al correo (si el servidor tiene
//      LOGIN_CODIGO_EMAIL activo). Se puede reenviar (cada 30 s).
// ============================================================
import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth, INICIO_POR_ROL } from './AuthContext.jsx'
import { useIdioma } from '../i18n/LanguageContext.jsx'
import { api } from '../lib/api.js'
import LanguageSwitch from '../i18n/LanguageSwitch.jsx'
import ThemeToggle from '../theme/ThemeToggle.jsx'
import Captcha, { captchaActivo } from '../components/ui/Captcha.jsx'
import './Login.css'

const ESPERA_REENVIO_S = 30

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [reiniciarCaptcha, setReiniciarCaptcha] = useState(0)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [cargando, setCargando] = useState(false)

  // Paso 2: código por correo
  const [desafio, setDesafio] = useState(null)   // { desafio, enviadoA, minutos }
  const [codigo, setCodigo] = useState('')
  const [espera, setEspera] = useState(0)

  const navegar = useNavigate()
  const ubicacion = useLocation()
  const { entrar, verificarCodigo } = useAuth()
  const { t, idioma } = useIdioma()

  // Cuenta regresiva para poder reenviar el código
  useEffect(() => {
    if (espera <= 0) return
    const id = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [espera])

  const irAlInicio = (u) => navegar(ubicacion.state?.desde ?? INICIO_POR_ROL[u.rol] ?? '/dashboard', { replace: true })

  async function enviarCredenciales(e) {
    e?.preventDefault()
    if (captchaActivo && !captcha) { setError(t('login.captcha_needed')); return }
    setCargando(true); setError(null); setAviso(null)
    try {
      const r = await entrar(email.trim(), password, captcha)
      if (r.requiereCodigo) {
        setDesafio(r); setCodigo(''); setEspera(ESPERA_REENVIO_S)
      } else {
        irAlInicio(r.usuario)
      }
    } catch (err) {
      setError(err.message)
      // El token del captcha es de un solo uso: se pide otro.
      setReiniciarCaptcha((n) => n + 1)
    } finally {
      setCargando(false)
    }
  }

  async function enviarCodigo(e) {
    e?.preventDefault()
    setCargando(true); setError(null); setAviso(null)
    try {
      irAlInicio(await verificarCodigo(desafio.desafio, codigo))
    } catch (err) {
      setError(err.message)
      // Venció o se agotaron los intentos: hay que volver a empezar.
      if (err.datos?.motivo === 'invalido' || err.datos?.motivo === 'agotado') volverACredenciales(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function reenviar() {
    setError(null); setAviso(null)
    try {
      await api.auth.reenviarCodigoLogin(desafio.desafio)
      setAviso(t('login.code_resent')); setEspera(ESPERA_REENVIO_S); setCodigo('')
    } catch (err) { setError(err.message) }
  }

  function volverACredenciales(mensaje = null) {
    setDesafio(null); setCodigo(''); setPassword('')
    setReiniciarCaptcha((n) => n + 1)
    setError(mensaje)
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={desafio ? enviarCodigo : enviarCredenciales}>
        <div className="login-top">
          <div className="login-brand">EN</div>
          <div className="login-acciones">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>

        {!desafio ? (
          <>
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

            <Captcha onToken={setCaptcha} reiniciar={reiniciarCaptcha} idioma={idioma} />

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-btn" type="submit"
              disabled={cargando || !email || !password || (captchaActivo && !captcha)}>
              {cargando ? t('login.signing_in') : t('login.sign_in')}
            </button>

            <Link to="/olvide-password" className="login-alumno" style={{ marginTop: '-.3rem' }}>
              {t('login.forgot_password')}
            </Link>

            <Link to="/" className="login-alumno">
              {t('login.student_link')}
            </Link>
          </>
        ) : (
          <>
            <h1>{t('login.code_title')}</h1>
            <p className="login-sub">{t('login.code_sent', { email: desafio.enviadoA, n: desafio.minutos })}</p>

            <label className="login-campo">
              <span>{t('login.code_label')}</span>
              <input
                className="login-codigo" value={codigo} required autoFocus
                inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}"
                placeholder="000000"
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </label>

            {error && <p className="login-error" role="alert">{error}</p>}
            {aviso && <p className="badge badge-ok" style={{ display: 'block' }} role="status">{aviso}</p>}

            <button className="login-btn" type="submit" disabled={cargando || codigo.length !== 6}>
              {cargando ? t('login.code_verifying') : t('login.code_verify')}
            </button>

            <div className="login-codigo-acciones">
              <button type="button" className="login-enlace" onClick={() => volverACredenciales()}>
                {t('login.code_back')}
              </button>
              <button type="button" className="login-enlace" onClick={reenviar} disabled={espera > 0}>
                {espera > 0 ? t('login.code_resend_wait', { n: espera }) : t('login.code_resend')}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

// ============================================================
// StudentHome.jsx — Entrada del estudiante (SIN cuenta)
// ============================================================
// Dos pasos: código de 5 dígitos → nombre. A cambio recibe un
// token de invitado atado a esa sala, que caduca solo.
// ============================================================
import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useIdioma } from '../../i18n/LanguageContext.jsx'
import LanguageSwitch from '../../i18n/LanguageSwitch.jsx'
import ThemeToggle from '../../theme/ThemeToggle.jsx'
import './StudentHome.css'

const CLAVE_TOKEN_ALUMNO = 'el.token.alumno'

export default function StudentHome() {
  const [paso, setPaso] = useState('codigo')      // codigo | nombre
  const [digitos, setDigitos] = useState(['', '', '', '', ''])
  const [sala, setSala] = useState(null)
  const [nombre, setNombre] = useState('')
  const [codigoMatricula, setCodigoMatricula] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  const refs = useRef([])
  const navegar = useNavigate()
  const { t } = useIdioma()

  const codigo = digitos.join('')
  const completo = digitos.every((d) => d !== '')

  function escribirDigito(i, valor) {
    if (!/^\d?$/.test(valor)) return
    const siguiente = [...digitos]
    siguiente[i] = valor
    setDigitos(siguiente)
    setError(null)
    if (valor && i < 4) refs.current[i + 1]?.focus()
  }

  function teclaEspecial(i, e) {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'Enter' && completo) verificarCodigo()
  }

  function pegar(e) {
    const texto = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5)
    if (texto.length === 5) { setDigitos(texto.split('')); refs.current[4]?.focus() }
    e.preventDefault()
  }

  async function verificarCodigo() {
    setCargando(true); setError(null)
    try {
      const { sala } = await api.salas.info(codigo)
      setSala(sala)
      setPaso('nombre')
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  async function entrar() {
    if (sala.claseVinculada) {
      if (!codigoMatricula.trim()) { setError(t('student.error_missing_student_code')); return }
    } else if (!nombre.trim()) {
      setError(t('student.error_missing_name')); return
    }
    setCargando(true); setError(null)
    try {
      const { token } = await api.auth.invitado(
        codigo,
        sala.claseVinculada ? undefined : nombre.trim(),
        sala.claseVinculada ? codigoMatricula.trim() : undefined,
      )
      sessionStorage.setItem(CLAVE_TOKEN_ALUMNO, token)
      navegar(`/jugar/${codigo}`)
    } catch (e) { setError(e.message); setCargando(false) }
  }

  return (
    <div className="student-shell">
      <div className="student-top"><LanguageSwitch /><ThemeToggle /></div>

      <div className="student-hero">
        <div className="student-brand">EN</div>
        <h1 className="student-title">English Lessons</h1>
        <p className="student-sub">
          {paso === 'codigo' ? t('student.enter_code_prompt') : t('student.what_is_your_name')}
        </p>
      </div>

      <div className="student-card">
        {paso === 'codigo' ? (
          <>
            <div className="code-label">{t('student.room_code_label')}</div>
            <div className="code-inputs" onPaste={pegar}>
              {digitos.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (refs.current[i] = el)}
                  className={`code-input ${error ? 'code-input-error' : ''}`}
                  type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={(e) => escribirDigito(i, e.target.value)}
                  onKeyDown={(e) => teclaEspecial(i, e)}
                  autoFocus={i === 0}
                  aria-label={t('student.digit_aria', { n: i + 1 })}
                />
              ))}
            </div>

            {error && <p className="student-error">{error}</p>}

            <button
              className={`student-btn ${completo ? 'student-btn-ready' : ''}`}
              onClick={verificarCodigo} disabled={cargando || !completo}
            >
              {cargando ? t('student.searching_room') : t('student.continue')}
            </button>

            <p className="student-privacidad">{t('student.privacy_note')}</p>
          </>
        ) : (
          <>
            <div className="student-sala">
              <span className="badge badge-ok">
                {sala.modo === 'juego' ? t('student.mode_adventure') : t('student.mode_activity')}
              </span>
              <strong>{sala.titulo}</strong>
              {sala.curso && <span className="student-curso">📘 {sala.curso}</span>}
              <small>{t('student.teacher_prefix', { nombre: sala.docente })}</small>
              {sala.cupo?.limite != null && (
                <small className="student-cupo">
                  {t('student.capacity', { dentro: sala.cupo.dentro, limite: sala.cupo.limite })}
                </small>
              )}
            </div>

            {sala.claseVinculada ? (
              <>
                <div className="code-label">{t('student.your_student_code_label')}</div>
                <input
                  className="student-nombre" value={codigoMatricula} autoFocus
                  onChange={(e) => { setCodigoMatricula(e.target.value.toUpperCase()); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && entrar()}
                  placeholder={t('student.code_placeholder')} maxLength={12}
                />
                <p className="student-nota">{t('student.code_note')}</p>
              </>
            ) : (
              <>
                <div className="code-label">{t('student.your_name_label')}</div>
                <input
                  className="student-nombre" value={nombre} autoFocus
                  onChange={(e) => { setNombre(e.target.value); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && entrar()}
                  placeholder={t('student.name_placeholder')} maxLength={60}
                />
                <p className="student-nota">{t('student.name_note')}</p>
              </>
            )}

            {error && <p className="student-error">{error}</p>}

            <button
              className={`student-btn ${(sala.claseVinculada ? codigoMatricula.trim() : nombre.trim()) ? 'student-btn-ready' : ''}`}
              onClick={entrar} disabled={cargando || !(sala.claseVinculada ? codigoMatricula.trim() : nombre.trim())}
            >
              {cargando ? t('student.entering') : t('student.start')}
            </button>
            <button className="student-volver" onClick={() => { setPaso('codigo'); setError(null) }}>
              {t('student.use_other_code')}
            </button>
          </>
        )}
      </div>

      <Link to="/entrar" className="student-teacher-link">
        {t('student.teacher_link')}
      </Link>
    </div>
  )
}

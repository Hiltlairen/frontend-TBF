// ============================================================
// PrivacyNoticeGate.jsx — Aceptación ACTIVA del aviso de privacidad
// ============================================================
// A diferencia del aviso del estudiante (informativo, sin botón),
// el del staff exige un clic explícito antes de dejarlo seguir. Se
// vuelve a pedir si sube la VERSION del texto en el backend.
// ============================================================
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import './PrivacyNoticeGate.css'

export default function PrivacyNoticeGate() {
  const [aviso, setAviso] = useState(null)   // { version, texto, pendiente }
  const [aceptando, setAceptando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.auth.avisoPrivacidad().then(setAviso).catch(() => {})
  }, [])

  async function aceptar() {
    setAceptando(true); setError(null)
    try {
      await api.auth.aceptarAvisoPrivacidad()
      setAviso((prev) => (prev ? { ...prev, pendiente: false } : prev))
    } catch (e) { setError(e.message) }
    finally { setAceptando(false) }
  }

  if (!aviso?.pendiente) return null

  return (
    <div className="privacy-gate" role="dialog" aria-modal="true" aria-label="Aviso de privacidad">
      <div className="privacy-gate-caja">
        <h2>Antes de continuar</h2>
        <p className="privacy-gate-sub">Aviso de privacidad y tratamiento de datos de estudiantes</p>
        <div className="privacy-gate-texto">
          {aviso.texto.split('\n').map((linea, i) => <p key={i}>{linea || ' '}</p>)}
        </div>
        {error && <p className="privacy-gate-error">{error}</p>}
        <button className="privacy-gate-btn" onClick={aceptar} disabled={aceptando}>
          {aceptando ? 'Guardando…' : 'Entiendo y acepto'}
        </button>
      </div>
    </div>
  )
}

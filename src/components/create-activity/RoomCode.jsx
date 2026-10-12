// ============================================================
// RoomCode.jsx — El código que el docente proyecta
// ============================================================
import { useState } from 'react'

export default function RoomCode({ sala }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(sala.codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch { /* sin permiso de portapapeles: el código se ve igual */ }
  }

  const expira = sala.expira_en
    ? new Date(sala.expira_en).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="room-code">
      <p className="room-code-label">Código de sala</p>
      <div className="room-code-digits" onClick={copiar} role="button" tabIndex={0}
        aria-label="Copiar código de sala"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copiar() } }}>
        {sala.codigo.split('').map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <button className="room-code-copy" onClick={copiar}>
        {copiado ? '✓ copiado' : 'Copiar código'}
      </button>
      <p className="room-code-hint">
        Tus estudiantes entran desde la pantalla de inicio y escriben este código.
        {expira && <> Vence a las {expira}.</>}
      </p>
    </div>
  )
}

// ============================================================
// AvisoSinIA.jsx — La IA no está disponible: qué se puede hacer
// ============================================================
// Se muestra cuando Gemini se quedó sin cuota, está saturado, no hay
// internet o falta la API key. Explica que solo quedan las actividades
// de vocabulario (se arman sin IA, a 0 tokens), cuándo se vuelve a
// intentar solo, y deja comprobar ahora mismo.
// ============================================================
import { useState } from 'react'
import BotonIA from '../ui/BotonIA.jsx'

const hora = (iso) => new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

export default function AvisoSinIA({ ia, cantidadVocabulario, minimoAventura, modo, onComprobar }) {
  const [comprobando, setComprobando] = useState(false)

  async function comprobar() {
    setComprobando(true)
    try { await onComprobar() } finally { setComprobando(false) }
  }

  return (
    <div className="card aviso-sin-ia" role="status">
      <p className="aviso-sin-ia-titulo">⚠️ La IA no está disponible ahora</p>
      <p>
        Motivo: {ia.mensaje}.{' '}
        Mientras tanto solo puedes usar las <strong>{cantidadVocabulario} actividades de vocabulario</strong>{' '}
        (palabra ↔ traducción): se arman sin IA con el vocabulario de la lección y no gastan tokens.
        Las que necesitan redactar diálogos, canciones u oraciones quedan bloqueadas.
      </p>
      {modo === 'aventura' && cantidadVocabulario <= minimoAventura && (
        <p className="muted">
          Una aventura necesita {minimoAventura} actividades: sin IA solo se puede armar con las {cantidadVocabulario} de vocabulario.
        </p>
      )}
      {ia.motivo !== 'sin_clave' && (
        <div className="aviso-sin-ia-acciones">
          <BotonIA className="btn btn-outline" onClick={comprobar} cargando={comprobando} textoCargando="Comprobando la IA">
            🔄 Comprobar ahora
          </BotonIA>
          {ia.reintentarEn && <small className="muted">Se vuelve a intentar sola a las {hora(ia.reintentarEn)}.</small>}
        </div>
      )}
    </div>
  )
}

// ============================================================
// HojaRespuestas.jsx — Lo que generó la IA, antes de lanzarlo
// ============================================================
// Dos formas de revisar una variante:
//   · Leerla: cada pregunta con su respuesta correcta (la arma el
//     servidor con el mismo código que después la califica).
//   · Probarla: abre la actividad tal cual la verá el estudiante, en
//     el mismo celular. Lo que se responde ahí NO se guarda.
// ============================================================
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useCerrarConEscape } from '../../lib/a11y.js'
import ActivityRunner from '../../game/ActivityRunner.jsx'
import PhoneOverlay from '../../game/PhoneOverlay.jsx'
import '../../game/Game.css'

export default function HojaRespuestas({ registroId, variante = 1 }) {
  const [hoja, setHoja] = useState(null)
  const [error, setError] = useState(null)
  const [probando, setProbando] = useState(null)   // sección abierta en el celular
  const [prueba, setPrueba] = useState(null)       // { codigo, nota } de la última prueba

  useEffect(() => {
    let vigente = true
    setHoja(null); setError(null); setPrueba(null)
    api.actividades.hoja(registroId, variante)
      .then((h) => vigente && setHoja(h))
      .catch((e) => vigente && setError(e.message))
    return () => { vigente = false }
  }, [registroId, variante])

  useCerrarConEscape(() => setProbando(null), Boolean(probando))

  if (error) return <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>
  if (!hoja) return <p className="muted">Cargando el contenido generado…</p>

  return (
    <div className="hoja">
      {hoja.historia?.tema && (
        <p className="hoja-historia">
          📖 <strong>Historia:</strong> {hoja.historia.tema}
          {hoja.historia.protagonista && <> · protagonista <strong>{hoja.historia.protagonista}</strong></>}
          {hoja.historia.npc && <> · conversa con <strong>{hoja.historia.npc}</strong></>}
        </p>
      )}

      {hoja.actividades.map((s) => (
        <details key={s.codigo} className="hoja-seccion" open={hoja.actividades.length === 1}>
          <summary>
            <span className="hoja-titulo">{s.titulo}</span>
            <small className="muted">{s.tipo} · {s.items.length} ítem{s.items.length === 1 ? '' : 's'}</small>
            {s.requiereRevision && <span className="badge badge-warn">corrección manual</span>}
          </summary>

          {s.instrucciones && <p className="hoja-instrucciones">{s.instrucciones}</p>}

          <ol className="hoja-items">
            {s.items.map((it, k) => (
              <li key={k}>
                {it.pregunta && <span className="hoja-pregunta">{it.pregunta}</span>}
                {it.esperado && <span className="hoja-respuesta">✓ {it.esperado}</span>}
              </li>
            ))}
          </ol>

          <div className="hoja-acciones">
            <button type="button" className="btn btn-outline" onClick={() => setProbando(s)}>
              ▶ Probar como estudiante
            </button>
            {prueba?.codigo === s.codigo && (
              <small className="muted" role="status">Tu prueba: {prueba.nota}/100 · no se guarda</small>
            )}
          </div>
        </details>
      ))}

      {probando && (
        <div className="hoja-probar">
          <PhoneOverlay titulo={`Vista del estudiante · ${probando.titulo}`}>
            <ActivityRunner
              codigo={probando.codigo}
              contenido={probando.contenido}
              onFinish={(nota) => { setPrueba({ codigo: probando.codigo, nota: Math.round(nota ?? 0) }); setProbando(null) }}
              onSalir={() => setProbando(null)}
            />
          </PhoneOverlay>
          <button type="button" className="hoja-cerrar" onClick={() => setProbando(null)}>
            ✕ Cerrar vista previa
          </button>
        </div>
      )}
    </div>
  )
}

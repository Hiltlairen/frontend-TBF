// ============================================================
// ReviewQueue.jsx — La sala de CURADURÍA
// ============================================================
// Aquí llega todo lo que se carga a los libros y lecciones antes
// de que lo vea un estudiante:
//   · vocabulario nuevo subido por docentes
//   · actividades generadas que requieren corrección humana
//   · entregas de estudiantes que no se autocorrigen (redacción)
//
// El curador aprueba, rechaza o corrige. Si corrige una entrega,
// el puntaje que escribe reemplaza al automático.
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api.js'
import './Review.css'

const TIPOS = {
  vocabulario: { etiqueta: 'Vocabulario', icono: '📚' },
  actividad:   { etiqueta: 'Actividad',   icono: '🧩' },
  entrega:     { etiqueta: 'Entrega',     icono: '✍️' },
}

const ESTADOS = [
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'aprobado',  etiqueta: 'Aprobados' },
  { valor: 'corregido', etiqueta: 'Corregidos' },
  { valor: 'rechazado', etiqueta: 'Rechazados' },
  { valor: 'todos',     etiqueta: 'Todos' },
]

export default function ReviewQueue() {
  const [estado, setEstado] = useState('pendiente')
  const [items, setItems] = useState([])
  const [contadores, setContadores] = useState({})
  const [seleccionado, setSeleccionado] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [comentario, setComentario] = useState('')
  const [puntaje, setPuntaje] = useState('')
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const cargar = useCallback(() => {
    setCargando(true)
    api.curaduria.cola(estado)
      .then((r) => { setItems(r.items); setContadores(r.contadores) })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [estado])

  useEffect(cargar, [cargar])

  function abrir(item) {
    setSeleccionado(item); setDetalle(null); setComentario(''); setPuntaje(''); setError(null)
    api.curaduria.item(item.id).then(setDetalle).catch((e) => setError(e.message))
  }

  async function decidir(decision) {
    setEnviando(true); setError(null)
    try {
      // En una entrega, el puntaje escrito por el curador manda sobre el automático
      const correcciones = (seleccionado.tipo === 'entrega' && puntaje !== '')
        ? { puntaje: Number(puntaje) }
        : null
      await api.curaduria.decidir(seleccionado.id, { decision, comentario, correcciones })
      setSeleccionado(null); setDetalle(null)
      cargar()
    } catch (e) { setError(e.message) }
    finally { setEnviando(false) }
  }

  return (
    <div className="rev-page">
      <div className="rev-cab">
        <div>
          <h2>Curaduría de contenido</h2>
          <p className="muted">
            Revisa lo que se carga a los libros y lecciones antes de que llegue a los estudiantes.
          </p>
        </div>
        {contadores.pendiente > 0 && (
          <span className="badge badge-warn rev-pendientes">{contadores.pendiente} pendiente(s)</span>
        )}
      </div>

      <div className="rev-filtros">
        {ESTADOS.map((e) => (
          <button key={e.valor}
            className={estado === e.valor ? 'activo' : ''}
            onClick={() => { setEstado(e.valor); setSeleccionado(null) }}>
            {e.etiqueta}
            {contadores[e.valor] != null && <span>{contadores[e.valor]}</span>}
          </button>
        ))}
      </div>

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}

      <div className="rev-layout">
        {/* ── Lista ── */}
        <ul className="rev-lista">
          {cargando && <li className="rev-vacio">Cargando…</li>}
          {!cargando && items.length === 0 && (
            <li className="rev-vacio">
              {estado === 'pendiente' ? 'Nada pendiente. Todo al día.' : 'Sin resultados.'}
            </li>
          )}
          {items.map((it) => (
            <li key={it.id}>
              <button
                className={`rev-item ${seleccionado?.id === it.id ? 'sel' : ''}`}
                onClick={() => abrir(it)}>
                <span className="rev-icono">{TIPOS[it.tipo]?.icono ?? '📄'}</span>
                <div className="rev-item-txt">
                  <strong>{it.resumen}</strong>
                  <small>
                    {TIPOS[it.tipo]?.etiqueta} · {it.enviado_por_nombre ?? 'sistema'} ·{' '}
                    {new Date(it.creado_en).toLocaleDateString('es-BO')}
                  </small>
                </div>
                <span className={`rev-estado rev-${it.estado}`}>{it.estado}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* ── Detalle ── */}
        <div className="rev-detalle">
          {!seleccionado && <p className="muted">Elige un item de la lista para revisarlo.</p>}

          {seleccionado && (
            <>
              <h3>{seleccionado.resumen}</h3>
              <p className="muted">
                {TIPOS[seleccionado.tipo]?.etiqueta} enviado por {seleccionado.enviado_por_nombre ?? 'el sistema'}
              </p>

              {!detalle && <p className="muted">Cargando contenido…</p>}

              {detalle?.contenido && (
                <div className="rev-contenido">
                  {seleccionado.tipo === 'vocabulario' && (
                    <dl className="rev-vocab">
                      <dt>Inglés</dt><dd>{detalle.contenido.ingles}</dd>
                      <dt>Español</dt><dd>{detalle.contenido.espanol}</dd>
                      <dt>Categoría</dt><dd>{detalle.contenido.categoria}</dd>
                    </dl>
                  )}

                  {seleccionado.tipo === 'entrega' && (
                    <>
                      <p><strong>Estudiante:</strong> {detalle.contenido.estudiante}</p>
                      <p><strong>Puntaje automático:</strong> {detalle.contenido.puntaje}</p>
                      {detalle.contenido.detalle?.texto && (
                        <blockquote className="rev-texto">{detalle.contenido.detalle.texto}</blockquote>
                      )}
                    </>
                  )}

                  {seleccionado.tipo === 'actividad' && (
                    <pre className="rev-json">{JSON.stringify(detalle.contenido.contenido, null, 2)}</pre>
                  )}
                </div>
              )}

              {seleccionado.estado === 'pendiente' && (
                <div className="rev-acciones">
                  {seleccionado.tipo === 'entrega' && (
                    <label className="rev-campo">
                      <span>Puntaje corregido (0–100)</span>
                      <input type="number" min={0} max={100} value={puntaje}
                        onChange={(e) => setPuntaje(e.target.value)}
                        placeholder="Dejar vacío para mantener el automático" />
                    </label>
                  )}

                  <label className="rev-campo">
                    <span>Comentario</span>
                    <textarea rows={3} value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Opcional: qué corregir o por qué se rechaza" />
                  </label>

                  <div className="rev-botones">
                    <button className="rev-btn rev-btn-ok" disabled={enviando}
                      onClick={() => decidir('aprobar')}>
                      {enviando ? '…' : '✓ Aprobar'}
                    </button>
                    <button className="rev-btn rev-btn-no" disabled={enviando}
                      onClick={() => decidir('rechazar')}>
                      ✕ Rechazar
                    </button>
                  </div>
                </div>
              )}

              {seleccionado.estado !== 'pendiente' && (
                <div className="rev-cerrado">
                  <p>
                    <strong>{seleccionado.estado}</strong> por {seleccionado.revisado_por_nombre}
                    {seleccionado.revisado_en && ` · ${new Date(seleccionado.revisado_en).toLocaleString('es-BO')}`}
                  </p>
                  {seleccionado.comentario && <blockquote>{seleccionado.comentario}</blockquote>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PanelActividad.jsx — Resultados de una actividad, ordenables y
// filtrables, con gráfica de la distribución y exportación
// ============================================================
// Punto 4: "resultados ordenables/filtrables por puntaje u otro
// criterio" + "exportación en CSV o PDF, como reporte con distintas
// gráficas". El servidor manda todo el lote ya resuelto (nombre según
// el rol, ver services/identidad.js) y el orden/filtro se hace acá —
// son listas de un salón (decenas de filas), no hace falta ida y
// vuelta al servidor para reordenar.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import './Admin.css'
import '../components/results/Results.css'
import './Panel.css'

const CRITERIOS = [
  { valor: 'puntaje', etiqueta: 'Puntaje' },
  { valor: 'estudiante', etiqueta: 'Nombre' },
  { valor: 'creado_en', etiqueta: 'Fecha de entrega' },
]

export default function PanelActividad() {
  const { claseId, salaId } = useParams()
  const [clase, setClase] = useState(null)
  const [sala, setSala] = useState(null)
  const [resultados, setResultados] = useState([])
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [ordenPor, setOrdenPor] = useState('puntaje')
  const [ordenDesc, setOrdenDesc] = useState(true)

  useEffect(() => {
    api.clases.resultadosActividad(claseId, salaId)
      .then((r) => { setClase(r.clase); setSala(r.sala); setResultados(r.resultados); setResumen(r.resumen) })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [claseId, salaId])

  function cambiarOrden(criterio) {
    if (criterio === ordenPor) { setOrdenDesc((d) => !d); return }
    setOrdenPor(criterio)
    setOrdenDesc(criterio === 'puntaje')
  }

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    let lista = resultados.filter((r) => {
      if (soloPendientes && !r.requiere_revision) return false
      if (q && !r.estudiante?.toLowerCase().includes(q)) return false
      return true
    })
    lista = lista.slice().sort((a, b) => {
      let av = a[ordenPor], bv = b[ordenPor]
      if (ordenPor === 'estudiante') { av = av?.toLowerCase() ?? ''; bv = bv?.toLowerCase() ?? '' }
      if (ordenPor === 'creado_en') { av = new Date(av).getTime(); bv = new Date(bv).getTime() }
      if (av < bv) return ordenDesc ? 1 : -1
      if (av > bv) return ordenDesc ? -1 : 1
      return 0
    })
    return lista
  }, [resultados, busqueda, soloPendientes, ordenPor, ordenDesc])

  const maxHist = Math.max(1, ...(resumen?.histograma ?? []).map((b) => b.cantidad))

  return (
    <div className="adm-page">
      <p className="muted" style={{ marginBottom: '.2rem' }}>
        <Link to={`/dashboard/panel/${claseId}`}>← {clase?.nombre ?? 'Volver'}</Link>
      </p>
      <h2>{sala?.titulo ?? 'Cargando…'}</h2>
      {sala && (
        <p className="muted" style={{ marginBottom: '1.2rem' }}>
          {sala.modo === 'juego' ? 'Aventura' : 'Actividad simple'} · lanzada el{' '}
          {new Date(sala.creado_en).toLocaleString('es-BO')}{!sala.activa && ' · sala cerrada'}
        </p>
      )}

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}
      {cargando && <p className="muted">Cargando…</p>}

      {resumen && (
        <>
          <div className="res-metricas">
            <div><strong>{resumen.total}</strong><small>Entregas</small></div>
            <div><strong>{resumen.promedio ?? '—'}</strong><small>Promedio</small></div>
            <div className={resumen.pendientesRevision ? 'alerta' : ''}>
              <strong>{resumen.pendientesRevision}</strong><small>Por corregir</small>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Distribución de puntajes</h3>
            <div className="panel-chart">
              {resumen.histograma.map((b) => (
                <div key={b.etiqueta} className="panel-chart-col">
                  <span className="panel-chart-num">{b.cantidad || ''}</span>
                  <div className="panel-chart-bar" style={{ height: `${(b.cantidad / maxHist) * 100}%` }} />
                  <span className="panel-chart-label">{b.etiqueta}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-barra" style={{ marginBottom: '.6rem' }}>
            <button className="adm-btn" onClick={() => api.clases.exportarActividadCSV(claseId, salaId).catch((e) => setError(e.message))}>
              Exportar CSV
            </button>
            <button className="adm-btn" onClick={() => api.clases.exportarActividadPDF(claseId, salaId).catch((e) => setError(e.message))}>
              Exportar PDF (reporte con gráfica)
            </button>
          </div>

          <div className="panel-controles">
            <input type="text" placeholder="Buscar por estudiante…" value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} />
            <label>
              <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
              Solo pendientes de revisión
            </label>
          </div>

          <div className="cls-tabla-scroll">
            <table className="adm-tabla">
              <thead>
                <tr>
                  {CRITERIOS.map((c) => (
                    <th key={c.valor}>
                      <button type="button" className="panel-th-btn" onClick={() => cambiarOrden(c.valor)}>
                        {c.etiqueta}{ordenPor === c.valor ? (ordenDesc ? ' ↓' : ' ↑') : ''}
                      </button>
                    </th>
                  ))}
                  <th>Revisión</th>
                </tr>
              </thead>
              <tbody>
                {!filas.length && <tr><td colSpan={4} className="muted">Ningún resultado con estos filtros.</td></tr>}
                {filas.map((r) => (
                  <tr key={r.id}>
                    <td>{r.puntaje} / {r.puntaje_maximo}</td>
                    <td>{r.estudiante}{r.estudiantePseudonimo && <small className="muted"> (pseudónimo)</small>}</td>
                    <td>{new Date(r.creado_en).toLocaleString('es-BO')}</td>
                    <td>
                      {r.requiere_revision
                        ? <span className="adm-pill off">pendiente</span>
                        : <span className="adm-pill on">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

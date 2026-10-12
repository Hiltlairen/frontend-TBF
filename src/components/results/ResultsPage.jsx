import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import ResultsTable from './ResultsTable.jsx'
import { useCerrarConEscape } from '../../lib/a11y.js'
import './Results.css'

export default function ResultsPage() {
  const [filas, setFilas] = useState([])
  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [detalle, setDetalle] = useState(null)
  useCerrarConEscape(() => setDetalle(null), detalle != null)

  useEffect(() => {
    Promise.all([api.resultados.listar(), api.resultados.estadisticas()])
      .then(([r, s]) => { setFilas(r.resultados); setStats(s) })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return filas
    return filas.filter((r) => r.estudiante?.toLowerCase().includes(q))
  }, [filas, busqueda])

  return (
    <div className="results-page">
      <h2>Resultados</h2>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        Cada fila es una partida terminada. En las aventuras puedes abrir el recorrido
        para ver por qué escenarios pasó el estudiante.
      </p>

      {stats && (
        <div className="res-metricas">
          <div><strong>{stats.total}</strong><small>Partidas</small></div>
          <div><strong>{stats.promedio}</strong><small>Promedio</small></div>
          <div><strong>{stats.modos.juego}</strong><small>Aventuras</small></div>
          <div><strong>{stats.modos.simple}</strong><small>Simples</small></div>
          <div className={stats.pendientesRevision ? 'alerta' : ''}>
            <strong>{stats.pendientesRevision}</strong><small>Por corregir</small>
          </div>
        </div>
      )}

      {/* Dónde terminan los estudiantes: dice si la dificultad está bien calibrada */}
      {stats && stats.modos.juego > 0 && (
        <div className="card res-carriles">
          <h3>Carril donde terminan</h3>
          <div className="res-barras">
            {['avanzado', 'estandar', 'refuerzo'].map((c) => {
              const n = stats.porCarril[c] ?? 0
              const total = Object.values(stats.porCarril).reduce((a, b) => a + b, 0) || 1
              return (
                <div key={c} className={`res-barra res-${c}`}>
                  <span style={{ width: `${(n / total) * 100}%` }} />
                  <em>{c} · {n}</em>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="field" style={{ maxWidth: 320, marginBottom: 0 }}>
          <label>Buscar por estudiante</label>
          <input placeholder="Nombre del estudiante…" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>

      {error && <p className="badge badge-error">{error}</p>}
      {cargando && <p className="muted">Cargando resultados…</p>}
      {!cargando && !error && <ResultsTable filas={filtradas} onVerRecorrido={setDetalle} />}

      {detalle && (
        <div className="res-modal" onClick={() => setDetalle(null)}>
          <div className="res-modal-caja" onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="recorrido-titulo">
            <h3 id="recorrido-titulo">Recorrido de {detalle.estudiante}</h3>
            <ol className="res-recorrido">
              {(detalle.historial ?? []).map((h) => (
                <li key={h.nodoId} className={h.resultado}>
                  <span className="res-etapa">{h.etapa}</span>
                  <div>
                    <strong>{h.actividad}</strong>
                    <small>📍 {h.escenario} · carril {h.carril}</small>
                  </div>
                  <span className="res-puntos">{h.puntaje}</span>
                </li>
              ))}
            </ol>
            <button className="adm-btn" onClick={() => setDetalle(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

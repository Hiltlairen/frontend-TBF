// ============================================================
// PanelDocente.jsx — Panel del docente: bandeja de "mis clases"
// ============================================================
// Punto de entrada del panel (punto 4 del encargo): lista las clases
// donde el usuario está a cargo (docente: las asignadas; admin: todas
// las activas — mismo criterio que api.clases.mias() ya usa en otros
// lados). Cada tarjeta lleva a las actividades lanzadas en esa clase.
// ============================================================
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import './Admin.css'
import './Panel.css'

export default function PanelDocente() {
  const [clases, setClases] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.clases.mias()
      .then((r) => setClases(r.clases))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="adm-page">
      <h2>Mis clases</h2>
      <p className="muted" style={{ marginBottom: '1.2rem' }}>
        Entra a una clase para ver sus actividades lanzadas, revisar los resultados de cada
        una y exportarlos en CSV o como reporte en PDF.
      </p>

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}
      {cargando && <p className="muted">Cargando…</p>}
      {!cargando && !clases.length && (
        <p className="muted">Todavía no tienes clases asignadas. Pídele a curaduría/admin que te asigne una.</p>
      )}

      <div className="panel-clases-grid">
        {clases.map((c) => (
          <Link key={c.id} to={`/dashboard/panel/${c.id}`} className="panel-clase-card">
            <h3>{c.nombre}</h3>
            <p className="muted">
              {c.periodo || 'Sin periodo'} · {c.libroNombre || 'Sin libro asignado'}
            </p>
            <div className="panel-clase-metricas">
              <div><strong>{c.totalEstudiantes}</strong><small>Estudiantes</small></div>
              <div>
                <strong>{c.finalizada_en ? '—' : c.activa ? 'Sí' : 'No'}</strong>
                <small>{c.finalizada_en ? 'Finalizada' : 'Activa'}</small>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// PanelClase.jsx — Actividades lanzadas en una clase, por día
// ============================================================
// "Actividad" = una sala ya lanzada para esta clase (simple o
// aventura). Se agrupan por día para que el docente ubique rápido
// la sesión que busca (punto 4: "agrupadas y en orden cronológico
// por clase/día"). Cada tarjeta lleva a la tabla de resultados de
// esa actividad puntual.
// ============================================================
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import './Admin.css'
import './Panel.css'

function tituloFecha(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`)
  const texto = d.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const TENDENCIA_INFO = {
  subiendo:     { icono: '📈', etiqueta: 'Mejorando', clase: 'ok' },
  bajando:      { icono: '📉', etiqueta: 'Bajando',   clase: 'mal' },
  estable:      { icono: '➡️', etiqueta: 'Estable',   clase: '' },
  insuficiente: { icono: '·',  etiqueta: 'Sin datos suficientes', clase: '' },
}

export default function PanelClase() {
  const { claseId } = useParams()
  const [vista, setVista] = useState('actividades') // actividades | progreso
  const [clase, setClase] = useState(null)
  const [dias, setDias] = useState([])
  const [progreso, setProgreso] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.clases.actividades(claseId)
      .then((r) => { setClase(r.clase); setDias(r.dias) })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [claseId])

  useEffect(() => {
    if (vista !== 'progreso' || progreso) return
    api.clases.progreso(claseId)
      .then((r) => setProgreso(r.estudiantes))
      .catch((e) => setError(e.message))
  }, [vista, progreso, claseId])

  return (
    <div className="adm-page">
      <p className="muted" style={{ marginBottom: '.2rem' }}>
        <Link to="/dashboard/panel">← Mis clases</Link>
      </p>
      <h2>{clase?.nombre ?? 'Cargando…'}</h2>
      {clase && (
        <p className="muted" style={{ marginBottom: '1.2rem' }}>
          {clase.periodo || 'Sin periodo'} · {clase.libroNombre || 'Sin libro'} · {clase.totalEstudiantes} estudiante(s)
        </p>
      )}

      <div className="panel-tabs" role="tablist">
        <button role="tab" aria-selected={vista === 'actividades'}
          className={vista === 'actividades' ? 'activo' : ''} onClick={() => setVista('actividades')}>
          Actividades
        </button>
        <button role="tab" aria-selected={vista === 'progreso'}
          className={vista === 'progreso' ? 'activo' : ''} onClick={() => setVista('progreso')}>
          Progreso por estudiante
        </button>
      </div>

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}
      {cargando && <p className="muted">Cargando…</p>}

      {vista === 'actividades' && !cargando && !error && (
        <>
          {!dias.length && <p className="muted">Todavía no se lanzó ninguna actividad para esta clase.</p>}
          {dias.map((dia) => (
            <div key={dia.fecha} className="panel-dia">
              <h4 className="panel-dia-fecha">{tituloFecha(dia.fecha)}</h4>
              <div className="panel-actividades-lista">
                {dia.actividades.map((a) => (
                  <Link key={a.id} to={`/dashboard/panel/${claseId}/${a.id}`} className="panel-actividad-card">
                    <div className="panel-actividad-info">
                      <strong>{a.titulo}</strong>
                      <small>
                        {new Date(a.creado_en).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                        {!a.activa && ' · cerrada'}
                      </small>
                    </div>
                    <span className="panel-badge-modo">{a.modo === 'juego' ? 'Aventura' : 'Actividad simple'}</span>
                    <div className="panel-actividad-metricas">
                      <div><strong>{a.totalResultados}</strong><small>Entregas</small></div>
                      <div><strong>{a.promedio ?? '—'}</strong><small>Promedio</small></div>
                      <div className={a.pendientesRevision ? 'alerta' : ''}>
                        <strong>{a.pendientesRevision}</strong><small>Por corregir</small>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {vista === 'progreso' && (
        <>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Cómo le fue a cada estudiante a través de TODAS las actividades de esta clase, en orden —
            para notar quién mejora, quién se estanca y quién necesita apoyo, más allá de una sola entrega.
            Solo tiene sentido completo con estudiantes con código de matrícula (roster de la clase).
          </p>
          {!progreso && !error && <p className="muted">Cargando progreso…</p>}
          {progreso && !progreso.length && (
            <p className="muted">Todavía no hay entregas para calcular progreso en esta clase.</p>
          )}
          {progreso?.map((e, i) => {
            const info = TENDENCIA_INFO[e.tendencia] ?? TENDENCIA_INFO.insuficiente
            return (
              <div key={i} className="panel-progreso-fila card">
                <div className="panel-progreso-cabecera">
                  <strong>{e.estudiante}</strong>
                  <span className={`badge ${info.clase === 'ok' ? 'badge-ok' : info.clase === 'mal' ? 'badge-error' : ''}`}>
                    {info.icono} {info.etiqueta}
                  </span>
                </div>
                <div className="panel-progreso-metricas">
                  <div><strong>{e.promedio ?? '—'}</strong><small>Promedio</small></div>
                  <div><strong>{e.totalActividades}</strong><small>Actividades</small></div>
                </div>
                <div className="panel-progreso-puntos">
                  {e.puntos.map((p, k) => (
                    <div key={k} className="panel-progreso-punto" title={`${p.actividad}: ${p.puntaje}`}>
                      <span style={{ height: `${Math.max(6, p.puntaje)}%` }} />
                      <small>{p.puntaje}</small>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

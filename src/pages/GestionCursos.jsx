// ============================================================
// GestionCursos.jsx — Notas de cada curso (antes "Resultados")
// ============================================================
// Tres niveles en una sola pantalla:
//   1. Los cursos ACTUALES (clases activas asignadas al docente; el
//      admin ve todas).
//   2. Al elegir uno: arriba, el selector de actividades generadas
//      para ESE curso (todas o una sola).
//   3. Abajo, la planilla: estudiantes × actividades con su nota y la
//      nota final hasta hoy, y el botón para exportarla en CSV.
// Los datos salen de GET /api/clases/:id/notas (classes.routes.js →
// planillaDeNotas); el CSV, de /notas.csv con el mismo cálculo.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import './Admin.css'
import './Panel.css'
import './GestionCursos.css'

const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' })

/** Color de la nota: misma escala que la ramificación del juego (≥80 / ≥50). */
const tonoNota = (n) => (n == null ? '' : n >= 80 ? 'gc-alta' : n >= 50 ? 'gc-media' : 'gc-baja')

export default function GestionCursos() {
  const [cursos, setCursos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [cursoId, setCursoId] = useState(null)
  const [planilla, setPlanilla] = useState(null)   // { clase, actividades, estudiantes }
  const [cargandoPlanilla, setCargandoPlanilla] = useState(false)
  const [actividadSel, setActividadSel] = useState('todas')
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    api.clases.mias()
      .then(({ clases }) => setCursos(clases.filter((c) => c.activa && !c.finalizada_en)))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    if (!cursoId) { setPlanilla(null); return }
    let vigente = true
    setCargandoPlanilla(true); setActividadSel('todas'); setError(null)
    api.clases.notas(cursoId)
      .then((p) => vigente && setPlanilla(p))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargandoPlanilla(false))
    return () => { vigente = false }
  }, [cursoId])

  const columnas = useMemo(() => {
    if (!planilla) return []
    return actividadSel === 'todas'
      ? planilla.actividades
      : planilla.actividades.filter((a) => a.salaId === actividadSel)
  }, [planilla, actividadSel])

  async function exportar() {
    setExportando(true); setError(null)
    try { await api.clases.exportarNotas(cursoId) }
    catch (e) { setError(e.message) }
    finally { setExportando(false) }
  }

  return (
    <div className="adm-page gc-page">
      <h2>Gestión de cursos</h2>
      <p className="muted">
        Elige uno de tus cursos actuales para ver la nota de cada estudiante en cada actividad
        y su nota final hasta hoy.
      </p>

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}

      {/* ── 1. Cursos actuales ── */}
      <section aria-labelledby="gc-cursos">
        <h3 id="gc-cursos" className="gc-subtitulo">Cursos actuales</h3>
        {cargando && <p className="muted">Cargando…</p>}
        {!cargando && !cursos.length && (
          <p className="muted">No tienes cursos activos. Pídele a curaduría o al admin que te asigne uno.</p>
        )}
        <div className="panel-clases-grid">
          {cursos.map((c) => (
            <button key={c.id} type="button" onClick={() => setCursoId(c.id === cursoId ? null : c.id)}
              className={`panel-clase-card gc-curso ${c.id === cursoId ? 'gc-curso-sel' : ''}`}
              aria-pressed={c.id === cursoId}>
              <h3>{c.nombre}</h3>
              <p className="muted">{c.periodo || '—'} · {c.libroNombre || 'Sin libro asignado'}</p>
              <div className="panel-clase-metricas">
                <div><strong>{c.totalEstudiantes}</strong><small>Estudiantes</small></div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── 2 y 3. Actividades del curso + planilla de notas ── */}
      {cursoId && (
        <section className="card gc-detalle" aria-labelledby="gc-detalle-titulo">
          <h3 id="gc-detalle-titulo" className="gc-subtitulo">
            {planilla?.clase.nombre ?? 'Cargando…'}
          </h3>

          {cargandoPlanilla && <p className="muted">Cargando notas…</p>}

          {planilla && !planilla.actividades.length && (
            <p className="muted">Todavía no se lanzó ninguna actividad para este curso.</p>
          )}

          {planilla && planilla.actividades.length > 0 && (
            <>
              <div className="gc-actividades" role="group" aria-label="Actividades del curso">
                <span className="gc-actividades-label">Actividades:</span>
                <button type="button" aria-pressed={actividadSel === 'todas'}
                  className={actividadSel === 'todas' ? 'activo' : ''} onClick={() => setActividadSel('todas')}>
                  Todas ({planilla.actividades.length})
                </button>
                {planilla.actividades.map((a) => (
                  <button key={a.salaId} type="button" aria-pressed={actividadSel === a.salaId}
                    className={actividadSel === a.salaId ? 'activo' : ''} onClick={() => setActividadSel(a.salaId)}
                    title={`${a.modo === 'juego' ? 'Aventura' : 'Actividad'} · sala ${a.codigo}`}>
                    {fechaCorta(a.fecha)} · {a.titulo}
                  </button>
                ))}
              </div>

              <div className="adm-tabla-scroll">
                <table className="adm-tabla gc-tabla">
                  <thead>
                    <tr>
                      <th className="gc-col-nombre">Estudiante</th>
                      {columnas.map((a) => (
                        <th key={a.salaId} className="gc-col-nota" title={a.titulo}>
                          <small>{fechaCorta(a.fecha)}</small>
                          <span>{a.titulo}</span>
                        </th>
                      ))}
                      <th className="gc-col-final">Nota final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!planilla.estudiantes.length && (
                      <tr><td colSpan={columnas.length + 2} className="muted">Este curso todavía no tiene estudiantes.</td></tr>
                    )}
                    {planilla.estudiantes.map((e) => (
                      <tr key={e.id} className={e.activo ? '' : 'inactivo'}>
                        <td className="gc-col-nombre">
                          {e.purgado ? <em className="muted">{e.nombre}</em> : e.nombre}
                          {e.codigoExterno && <small className="muted gc-codigo">{e.codigoExterno}</small>}
                        </td>
                        {columnas.map((a) => {
                          const nota = e.notas[a.salaId]
                          const pendiente = e.pendientes.includes(a.salaId)
                          return (
                            <td key={a.salaId} className={`gc-col-nota ${tonoNota(nota)}`}>
                              {pendiente ? <span className="adm-pill off" title="Redacción: la corrige el docente">por corregir</span>
                                : nota ?? <span className="muted" title="No entregó">—</span>}
                            </td>
                          )
                        })}
                        <td className={`gc-col-final ${tonoNota(e.notaFinal)}`}>
                          <strong>{e.notaFinal ?? '—'}</strong>
                          <small className="muted">{e.entregadas}/{planilla.actividades.length}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="muted gc-nota-final">
                Nota final: promedio de las actividades que el estudiante entregó (debajo, cuántas
                entregó del total). Si jugó una actividad más de una vez, cuenta la última entrega.
              </p>
            </>
          )}

          {planilla && (
            <div className="adm-barra gc-exportar">
              <button className="adm-btn adm-btn-ok" onClick={exportar} disabled={exportando || !planilla.estudiantes.length}>
                {exportando ? 'Exportando…' : '⬇ Exportar CSV'}
              </button>
              <small className="muted">Todos los estudiantes, todas las actividades en orden cronológico y la nota final.</small>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

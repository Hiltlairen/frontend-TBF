// ============================================================
// Clases.jsx — Clases (cohortes por semestre) — admin/curador
// ============================================================
// Solo admin y curador crean clases y gestionan el roster de
// estudiantes; el docente solo las ve y las usa (en Crear actividad
// y al lanzar una sala) desde su propio panel. Cada estudiante es
// un usuario TEMPORAL identificado únicamente por un código de
// matrícula — sin email ni contraseña — que se genera aquí y se le
// entrega en papel/pantalla para que entre a las salas.
// ============================================================
import { Fragment, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import './Admin.css'

const VACIA = { nombre: '', periodo: '', bookId: '', docenteId: '' }

// Textos para el paso de revisión de la importación masiva (punto 3).
const ISSUE_TEXTO = {
  nombre_faltante: 'Falta el nombre',
  nombre_duplicado_en_lote: 'Nombre repetido en este mismo lote',
  nombre_ya_en_clase: 'Ya hay un estudiante con este nombre en la clase',
  codigo_duplicado_en_lote: 'Código externo repetido en este mismo lote',
  codigo_ya_en_clase: 'Ese código externo ya está en uso en esta clase',
}
const ADVERTENCIA_TEXTO = {
  sin_docente: 'Esta clase todavía no tiene un docente asignado.',
  sin_libro: 'Esta clase todavía no tiene libro asignado.',
}

export default function Clases() {
  const [clases, setClases] = useState([])
  const [docentes, setDocentes] = useState([])
  const [libros, setLibros] = useState([])
  const [abriendo, setAbriendo] = useState(false)
  const [nueva, setNueva] = useState(VACIA)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [cargando, setCargando] = useState(true)

  const [claseAbierta, setClaseAbierta] = useState(null)   // id de la clase con roster abierto
  const [roster, setRoster] = useState([])

  // ── Importación masiva: grilla editable + paso de revisión ──
  const filaVacia = () => ({ nombre: '', codigoExterno: '' })
  const filasVacias = (n) => Array.from({ length: n }, filaVacia)
  const [filasImport, setFilasImport] = useState(filasVacias(6))
  const [pasoImport, setPasoImport] = useState('editar')    // 'editar' | 'revisar'
  const [revision, setRevision] = useState(null)            // resultado de /previsualizar
  const [revisando, setRevisando] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [nuevosCodigos, setNuevosCodigos] = useState(null) // últimos códigos generados, para copiar/imprimir

  function cargar() {
    Promise.all([api.clases.listar(), api.clases.docentes(), api.biblioteca.libros()])
      .then(([c, d, l]) => { setClases(c.clases); setDocentes(d.docentes); setLibros(l.libros) })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }
  useEffect(cargar, [])

  async function crear(e) {
    e.preventDefault()
    setError(null); setAviso(null)
    try {
      await api.clases.crear({
        nombre: nueva.nombre.trim(),
        periodo: nueva.periodo.trim() || undefined,
        bookId: nueva.bookId || undefined,
        docenteId: nueva.docenteId || undefined,
      })
      setAviso(`Clase "${nueva.nombre.trim()}" creada.`)
      setNueva(VACIA); setAbriendo(false)
      cargar()
    } catch (err) { setError(err.message) }
  }

  async function reasignarDocente(c, docenteId) {
    setError(null)
    try { await api.clases.editar(c.id, { docenteId: docenteId || null }); cargar() }
    catch (e) { setError(e.message) }
  }

  async function reasignarLibro(c, bookId) {
    setError(null)
    try { await api.clases.editar(c.id, { bookId: bookId || null }); cargar() }
    catch (e) { setError(e.message) }
  }

  async function alternarActiva(c) {
    setError(null)
    try {
      if (c.activa) {
        if (!confirm(`¿Dar de baja "${c.nombre}"? El docente ya no podrá lanzar salas con esta clase, pero el historial se conserva.`)) return
      }
      await api.clases.editar(c.id, { activa: !c.activa })
      cargar()
    } catch (e) { setError(e.message) }
  }

  async function abrirRoster(c) {
    setError(null); setNuevosCodigos(null)
    setFilasImport(filasVacias(6)); setPasoImport('editar'); setRevision(null)
    if (claseAbierta === c.id) { setClaseAbierta(null); return }
    setClaseAbierta(c.id)
    try {
      const { estudiantes } = await api.clases.roster(c.id)
      setRoster(estudiantes)
    } catch (e) { setError(e.message) }
  }

  function actualizarFila(i, campo, valor) {
    setFilasImport((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)))
  }
  function agregarFilaGrid() {
    setFilasImport((prev) => [...prev, filaVacia()])
  }
  function quitarFilaGrid(i) {
    setFilasImport((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  // Soporta pegar varias filas de golpe (ej. copiadas de Excel/Sheets,
  // separadas por tab, o un CSV separado por comas): cada línea pegada
  // llena una fila nueva a partir de la celda donde se pegó.
  function manejarPegado(e, filaIndex, campo) {
    const texto = e.clipboardData?.getData('text') ?? ''
    if (!texto.includes('\n') && !texto.includes('\t') && !texto.includes(',')) return // pegado normal de una celda
    e.preventDefault()
    const lineas = texto.split(/\r\n|\n|\r/).filter((l) => l.trim().length)
    if (!lineas.length) return
    setFilasImport((prev) => {
      const copia = [...prev]
      lineas.forEach((linea, li) => {
        const cols = linea.includes('\t') ? linea.split('\t') : linea.split(',')
        const destino = filaIndex + li
        while (copia.length <= destino) copia.push(filaVacia())
        const fila = { ...copia[destino] }
        if (campo === 'nombre') {
          fila.nombre = (cols[0] ?? '').trim()
          if (cols[1] !== undefined) fila.codigoExterno = cols[1].trim()
        } else {
          fila.codigoExterno = (cols[0] ?? '').trim()
        }
        copia[destino] = fila
      })
      return copia
    })
  }

  async function revisarImport(c) {
    const limpias = filasImport
      .map((f) => ({ nombre: f.nombre.trim(), codigoExterno: f.codigoExterno.trim() }))
      .filter((f) => f.nombre || f.codigoExterno)
    if (!limpias.length) { setError('Agrega al menos un nombre a la grilla.'); return }
    setRevisando(true); setError(null)
    try {
      const resultado = await api.clases.previsualizarEstudiantes(c.id, limpias)
      setRevision(resultado)
      setPasoImport('revisar')
    } catch (e) { setError(e.message) }
    finally { setRevisando(false) }
  }

  function volverAEditarImport() {
    setPasoImport('editar')
  }

  async function confirmarImport(c) {
    if (!revision || revision.resumen.invalidas > 0) return
    setAgregando(true); setError(null)
    try {
      const filas = revision.filas.map(({ nombre, codigoExterno }) => ({ nombre, codigoExterno }))
      const { estudiantes } = await api.clases.agregarEstudiantes(c.id, filas)
      setNuevosCodigos(estudiantes)
      setFilasImport(filasVacias(6)); setPasoImport('editar'); setRevision(null)
      const { estudiantes: todos } = await api.clases.roster(c.id)
      setRoster(todos)
      cargar()
    } catch (e) { setError(e.message) }
    finally { setAgregando(false) }
  }

  async function darDeBajaEstudiante(e) {
    if (!confirm(`¿Dar de baja a ${e.nombre}? Ya no podrá entrar a salas con su código. Su identidad se anonimizará sola en unos días (retención configurable), o puedes purgarla ahora mismo.`)) return
    setError(null)
    try {
      const { estudiante } = await api.clases.darDeBajaEstudiante(e.id)
      setRoster((prev) => prev.map((x) => (x.id === e.id ? estudiante : x)))
      cargar()
    } catch (err) { setError(err.message) }
  }

  async function purgarEstudianteAhora(e) {
    if (!confirm(`¿Purgar la identidad de ${e.nombre} AHORA, sin esperar la ventana de retención? Su nombre y código se borran de forma permanente; sus puntajes quedan de forma anónima. No se puede deshacer.`)) return
    setError(null)
    try {
      const { estudiante } = await api.clases.purgarEstudiante(e.id)
      setRoster((prev) => prev.map((x) => (x.id === e.id ? estudiante : x)))
      setAviso('Identidad purgada.')
    } catch (err) { setError(err.message) }
  }

  async function finalizarClase(c) {
    if (!confirm(`¿Finalizar "${c.nombre}"? Arranca la ventana de retención para todos sus estudiantes activos: su identidad se anonimizará automáticamente al vencer el plazo. Exporta el registro antes si tu institución necesita conservarlo.`)) return
    setError(null)
    try {
      const { mensaje } = await api.clases.finalizar(c.id)
      setAviso(mensaje)
      cargar()
      if (claseAbierta === c.id) { const { estudiantes } = await api.clases.roster(c.id); setRoster(estudiantes) }
    } catch (err) { setError(err.message) }
  }

  async function exportarClase(c) {
    setError(null)
    try {
      await api.clases.exportar(c.id)
    } catch (err) { setError(err.message) }
  }

  function copiarCodigos() {
    if (!nuevosCodigos?.length) return
    const texto = nuevosCodigos
      .map((e) => `${e.nombre}\t${e.codigo_matricula}\t${e.codigo_externo ?? ''}`)
      .join('\n')
    navigator.clipboard?.writeText(texto).then(
      () => setAviso('Códigos copiados al portapapeles.'),
      () => setError('No se pudo copiar. Cópialos manualmente de la lista.'),
    )
  }

  return (
    <div className="adm-page">
      <h2>Clases</h2>
      <p className="muted">
        Una clase agrupa a los estudiantes de un curso durante un semestre. Regístralos aquí
        una sola vez a inicio de semestre: cada uno recibe un código de matrícula fijo (sin
        correo ni contraseña) con el que entra a cualquier sala que su docente lance para esa
        clase, sin tener que volver a escribir su nombre cada vez.
      </p>

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}
      {aviso && <p className="badge badge-ok" style={{ display: 'block' }}>{aviso}</p>}

      <div className="adm-barra">
        <button className="adm-btn" onClick={() => setAbriendo((v) => !v)}>
          {abriendo ? 'Cancelar' : '+ Nueva clase'}
        </button>
      </div>

      {abriendo && (
        <form className="adm-form" onSubmit={crear}>
          <label>
            <span>Nombre de la clase</span>
            <input value={nueva.nombre} required maxLength={80}
              placeholder='Ej. "3° B - Mañana"'
              onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} />
          </label>
          <label>
            <span>Periodo (opcional)</span>
            <input value={nueva.periodo} maxLength={40}
              placeholder='Ej. "2026-II"'
              onChange={(e) => setNueva({ ...nueva, periodo: e.target.value })} />
          </label>
          <label>
            <span>Libro</span>
            <select value={nueva.bookId} onChange={(e) => setNueva({ ...nueva, bookId: e.target.value })}>
              <option value="">— Sin asignar —</option>
              {libros.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </label>
          <label>
            <span>Docente asignado</span>
            <select value={nueva.docenteId} onChange={(e) => setNueva({ ...nueva, docenteId: e.target.value })}>
              <option value="">— Sin asignar —</option>
              {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </label>
          <button className="adm-btn adm-btn-ok" type="submit">Crear clase</button>
        </form>
      )}

      <div className="adm-tabla-scroll">
        <table className="adm-tabla">
          <thead>
            <tr>
              <th>Clase</th><th>Periodo</th><th>Libro</th><th>Docente</th>
              <th>Estudiantes</th><th>Estado</th><th />
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan={7} className="muted">Cargando…</td></tr>}
            {!cargando && !clases.length && <tr><td colSpan={7} className="muted">Todavía no hay clases creadas.</td></tr>}
            {clases.map((c) => (
              <Fragment key={c.id}>
                <tr className={c.activa ? '' : 'inactivo'}>
                  <td><strong>{c.nombre}</strong></td>
                  <td className="muted">{c.periodo || '—'}</td>
                  <td>
                    <select value={c.book_id ?? ''} onChange={(e) => reasignarLibro(c, e.target.value)}>
                      <option value="">— Sin asignar —</option>
                      {libros.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={c.docente_id ?? ''} onChange={(e) => reasignarDocente(c, e.target.value)}>
                      <option value="">— Sin asignar —</option>
                      {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </td>
                  <td>{c.totalEstudiantes}</td>
                  <td>
                    {c.finalizada_en
                      ? <span className="adm-pill off" title={`Finalizada el ${new Date(c.finalizada_en).toLocaleDateString('es-BO')}`}>finalizada</span>
                      : <span className={`adm-pill ${c.activa ? 'on' : 'off'}`}>{c.activa ? 'activa' : 'de baja'}</span>}
                  </td>
                  <td className="cls-acciones">
                    <button className="adm-btn" onClick={() => abrirRoster(c)}>
                      {claseAbierta === c.id ? 'Ocultar roster' : 'Ver roster'}
                    </button>
                    <button className="adm-btn" onClick={() => exportarClase(c)} title="Descargar registro (nombre, código, puntajes) para archivo del instituto">
                      Exportar CSV
                    </button>
                    {!c.finalizada_en && (
                      <button className="adm-btn" onClick={() => finalizarClase(c)} title="Arranca la ventana de retención para todos sus estudiantes">
                        Finalizar curso
                      </button>
                    )}
                    <button className={`adm-baja ${c.activa ? '' : 'reactivar'}`} onClick={() => alternarActiva(c)}>
                      {c.activa ? 'Dar de baja' : 'Reactivar'}
                    </button>
                  </td>
                </tr>

                {claseAbierta === c.id && (
                  <tr>
                    <td colSpan={7}>
                      <div className="cls-roster">
                        <div className="cls-roster-agregar">
                          <div className="cls-import-cab">
                            <span>Agregar estudiantes</span>
                            <small className="muted">
                              Escribe o pega varias filas de una vez (por ejemplo copiadas de Excel/Sheets):
                              nombre y, si tu instituto lo usa, un código externo de referencia. Ese código
                              es solo informativo — nunca reemplaza el código de matrícula, que siempre lo
                              genera el sistema. Antes de crear a nadie hay un paso de revisión.
                            </small>
                          </div>

                          {pasoImport === 'editar' && (
                            <>
                              <div className="cls-tabla-scroll">
                                <table className="adm-tabla cls-import-grid">
                                  <thead><tr><th>Nombre</th><th>Código externo (opcional)</th><th /></tr></thead>
                                  <tbody>
                                    {filasImport.map((f, i) => (
                                      <tr key={i}>
                                        <td>
                                          <input value={f.nombre} placeholder="Ej. Ana Pérez"
                                            onChange={(e) => actualizarFila(i, 'nombre', e.target.value)}
                                            onPaste={(e) => manejarPegado(e, i, 'nombre')} />
                                        </td>
                                        <td>
                                          <input value={f.codigoExterno} placeholder="Ej. 2026-0143"
                                            onChange={(e) => actualizarFila(i, 'codigoExterno', e.target.value)}
                                            onPaste={(e) => manejarPegado(e, i, 'codigoExterno')} />
                                        </td>
                                        <td>
                                          <button type="button" className="cls-fila-quitar" title="Quitar fila"
                                            onClick={() => quitarFilaGrid(i)}>✕</button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="adm-barra">
                                <button type="button" className="adm-btn" onClick={agregarFilaGrid}>+ Agregar fila</button>
                                <button type="button" className="adm-btn adm-btn-ok" disabled={revisando}
                                  onClick={() => revisarImport(c)}>
                                  {revisando ? 'Revisando…' : 'Revisar antes de confirmar'}
                                </button>
                              </div>
                            </>
                          )}

                          {pasoImport === 'revisar' && revision && (
                            <div className="cls-import-revision">
                              {revision.advertencias.length > 0 && (
                                <p className="badge badge-error" style={{ display: 'block' }}>
                                  {revision.advertencias.map((a) => ADVERTENCIA_TEXTO[a] ?? a).join(' ')}
                                </p>
                              )}
                              <p className="muted">
                                {revision.resumen.total} fila(s): {revision.resumen.validas} lista(s) para importar
                                {revision.resumen.invalidas > 0
                                  ? `, ${revision.resumen.invalidas} con problemas (corrígelas y vuelve a revisar)`
                                  : ''}.
                              </p>
                              <div className="cls-tabla-scroll">
                                <table className="adm-tabla cls-import-grid">
                                  <thead><tr><th>Nombre</th><th>Código externo</th><th>Revisión</th></tr></thead>
                                  <tbody>
                                    {revision.filas.map((f, i) => (
                                      <tr key={i} className={f.valido ? '' : 'cls-fila-invalida'}>
                                        <td>{f.nombre || <em className="muted">(vacío)</em>}</td>
                                        <td>{f.codigoExterno || '—'}</td>
                                        <td>
                                          {f.valido
                                            ? <span className="adm-pill on">lista</span>
                                            : <span className="adm-pill off">{f.issues.map((cod) => ISSUE_TEXTO[cod] ?? cod).join(' · ')}</span>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="adm-barra">
                                <button type="button" className="adm-btn" onClick={volverAEditarImport}>Volver a editar</button>
                                <button type="button" className="adm-btn adm-btn-ok"
                                  disabled={agregando || revision.resumen.invalidas > 0}
                                  onClick={() => confirmarImport(c)}>
                                  {agregando ? 'Confirmando…' : `Confirmar importación (${revision.resumen.validas})`}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {nuevosCodigos && (
                          <div className="cls-codigos-nuevos">
                            <div className="cls-codigos-cab">
                              <strong>{nuevosCodigos.length} código(s) nuevo(s)</strong>
                              <button className="adm-btn" onClick={copiarCodigos}>Copiar lista</button>
                            </div>
                            <ul className="cls-codigos-lista">
                              {nuevosCodigos.map((e) => (
                                <li key={e.id}>
                                  <span>{e.nombre}</span>
                                  <code>{e.codigo_matricula}</code>
                                  {e.codigo_externo && <small className="muted">ext: {e.codigo_externo}</small>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="cls-tabla-scroll">
                          <table className="adm-tabla">
                            <thead><tr><th>Nombre</th><th>Código</th><th>Código externo</th><th>Estado</th><th /></tr></thead>
                            <tbody>
                              {!roster.length && <tr><td colSpan={5} className="muted">Todavía no hay estudiantes en esta clase.</td></tr>}
                              {roster.map((e) => (
                                <tr key={e.id} className={e.activo ? '' : 'inactivo'}>
                                  <td>{e.purgado ? <em className="muted">— (purgado)</em> : e.nombre}</td>
                                  <td>{e.purgado ? '—' : <code>{e.codigo_matricula}</code>}</td>
                                  <td>{e.purgado ? '—' : (e.codigo_externo || <span className="muted">—</span>)}</td>
                                  <td>
                                    {e.purgado ? (
                                      <span className="adm-pill off">purgado</span>
                                    ) : (
                                      <>
                                        <span className={`adm-pill ${e.activo ? 'on' : 'off'}`}>{e.activo ? 'activo' : 'de baja'}</span>
                                        {!e.activo && e.diasParaPurga != null && (
                                          <small className="muted" style={{ display: 'block' }}>
                                            {e.diasParaPurga > 0 ? `se purga en ${e.diasParaPurga} día(s)` : 'lista para purgar'}
                                          </small>
                                        )}
                                      </>
                                    )}
                                  </td>
                                  <td>
                                    {e.activo && !e.purgado && (
                                      <button className="adm-baja" onClick={() => darDeBajaEstudiante(e)}>Dar de baja</button>
                                    )}
                                    {!e.activo && !e.purgado && (
                                      <button className="adm-baja" onClick={() => purgarEstudianteAhora(e)} title="Anonimizar su identidad ahora mismo, sin esperar la ventana de retención">
                                        Purgar ahora
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

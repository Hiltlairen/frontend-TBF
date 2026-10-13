// ============================================================
// CreateActivityPage.jsx — Crear y lanzar
// ============================================================
// Dos modos, en pestañas:
//
//   SIMPLE    → una actividad suelta. Sin escenarios, sin ramas.
//               El docente puede lanzar solo la actividad, sin juego.
//
//   AVENTURA  → mínimo 6 actividades encadenadas. El servidor
//               arma el grafo (6 etapas × 3 carriles) y genera
//               todo con LangGraph en ~2 llamadas.
//
// El CURSO no se escribe: es la clase que le asignaron al docente.
// De los estudiantes de esa clase sale cuántas VARIANTES se generan
// (juegos de preguntas distintos; con IA hasta 10, sin IA una por
// estudiante), y a cada estudiante le toca una al azar al entrar.
// Nada se lanza a ciegas: las variantes se revisan (PanelVariantes)
// sabiendo antes cuántos tokens van a costar.
//
// Si la IA no está disponible (sin cuota, saturada, sin internet), solo
// quedan habilitadas las actividades de vocabulario (AvisoSinIA).
//
// La API Key ya no se pide aquí: vive en el .env del servidor.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import LessonSelector from './LessonSelector.jsx'
import RoutePreview from './RoutePreview.jsx'
import RoomCode from './RoomCode.jsx'
import PanelVariantes from './PanelVariantes.jsx'
import AvisoSinIA from './AvisoSinIA.jsx'
import BotonIA from '../ui/BotonIA.jsx'
import { textoEstimacion } from '../../lib/tokens.js'
import './CreateActivity.css'
import './RoomCode.css'

const MINIMO_AVENTURA = 6

const ICONO_INTERACCION = {
  ninguna:         '👤 solo',
  dialogo_directo: '💬 cara a cara',
  dialogo_remoto:  '📞 por celular',
  escucha:         '🔊 escucha',
  performance:     '🎤 en público',
  transaccion:     '💳 transacción',
}

export default function CreateActivityPage() {
  const [modo, setModo] = useState('simple')

  const [libros, setLibros] = useState([])
  const [libroId, setLibroId] = useState(null)
  const [lecciones, setLecciones] = useState([])
  const [leccionesSel, setLeccionesSel] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [franjas, setFranjas] = useState([])
  const [cantidades, setCantidades] = useState({}) // { codigo: n }
  const [limiteEstudiantes, setLimiteEstudiantes] = useState(30)
  const [clases, setClases] = useState([])
  const [clasesCargando, setClasesCargando] = useState(true)
  const [claseId, setClaseId] = useState('')

  const [codigosSel, setCodigosSel] = useState([])
  const [vistaPrevia, setVistaPrevia] = useState(null)

  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)
  // Lo generado (con todas sus variantes) y lo que costaría generarlo
  const [resultado, setResultado] = useState(null)
  const [estimacion, setEstimacion] = useState(null)
  // { variantes, estudiantes, maxVariantesIA } según la clase y la IA
  const [plan, setPlan] = useState(null)
  const [sala, setSala] = useState(null)
  // Estado de la IA: { disponible, motivo, mensaje, reintentarEn }
  const [ia, setIa] = useState({ disponible: true })
  const sinIA = ia?.disponible === false

  // ── Carga inicial ──────────────────────────────────────
  useEffect(() => {
    api.biblioteca.libros().then(({ libros }) => setLibros(libros)).catch((e) => setError(e.message))
    // El servidor ya manda el catálogo ordenado de menor a mayor dificultad,
    // y agrupado en franjas (Básico → Experto) — ver GET /catalogo.
    api.actividades.catalogo()
      .then(({ catalogo, franjas, ia }) => { setCatalogo(catalogo); setFranjas(franjas ?? []); if (ia) setIa(ia) })
      .catch((e) => setError(e.message))
    // Clases asignadas a este docente (admin las ve todas). Ahora es el
    // PRIMER paso del flujo: de acá sale el libro automáticamente.
    api.clases.mias()
      .then(({ clases }) => setClases(clases))
      .catch(() => {})
      .finally(() => setClasesCargando(false))
  }, [])

  useEffect(() => {
    if (!libroId) { setLecciones([]); return }
    api.biblioteca.lecciones(libroId)
      .then(({ lecciones }) => setLecciones(lecciones))
      .catch((e) => setError(e.message))
  }, [libroId])

  // ── Vista previa del grafo (no gasta tokens) ───────────
  useEffect(() => {
    if (modo !== 'aventura' || codigosSel.length < MINIMO_AVENTURA) { setVistaPrevia(null); return }
    let vigente = true
    api.actividades.vistaPreviaRuta({ actividades: codigosSel })
      .then((r) => vigente && setVistaPrevia(r))
      .catch(() => vigente && setVistaPrevia(null))
    return () => { vigente = false }
  }, [modo, codigosSel])

  // ── IA en pausa ─────────────────────────────────────────
  // Lo elegido que necesite IA se quita (no se podría generar), y cuando
  // llega la hora en que el servidor vuelve a intentar, se consulta solo.
  useEffect(() => {
    if (!sinIA || !catalogo.length) return
    const conIA = new Set(catalogo.filter((a) => a.requiereIA).map((a) => a.codigo))
    setCodigosSel((prev) => (prev.some((c) => conIA.has(c)) ? prev.filter((c) => !conIA.has(c)) : prev))
  }, [sinIA, catalogo])

  useEffect(() => {
    if (!sinIA || !ia.reintentarEn) return
    const espera = Math.max(1000, new Date(ia.reintentarEn).getTime() - Date.now() + 1000)
    const t = setTimeout(() => { api.actividades.estadoIA().then((r) => setIa(r.ia)).catch(() => {}) }, espera)
    return () => clearTimeout(t)
  }, [sinIA, ia.reintentarEn])

  async function comprobarIA() {
    try { setIa((await api.actividades.comprobarIA()).ia) } catch (e) { setError(e.message) }
  }

  function limpiarSalida() {
    setResultado(null); setSala(null)
  }

  function alternarCodigo(codigo) {
    limpiarSalida()
    setCodigosSel((prev) => {
      if (prev.includes(codigo)) return prev.filter((c) => c !== codigo)
      if (modo === 'simple') return [codigo]      // en simple solo cabe una
      return [...prev, codigo]
    })
  }

  function cambiarModo(nuevo) {
    setModo(nuevo); setCodigosSel([]); limpiarSalida(); setError(null)
  }

  // Al elegir una clase: el CURSO es esa clase (no se escribe a mano),
  // el cupo por defecto es el tamaño de su lista y el LIBRO es el que
  // le asignaron (ver book_id en server/src/routes/classes.routes.js).
  // Lección y actividades siguen siendo de elección libre.
  function elegirClase(id) {
    setClaseId(id)
    limpiarSalida()
    const clase = clases.find((c) => c.id === id)
    if (!clase) { setLibroId(null); setLeccionesSel([]); return }

    setLimiteEstudiantes(Math.max(1, Math.min(30, clase.totalEstudiantes || 30)))

    const nuevoLibroId = clase.book_id ?? null
    if (nuevoLibroId !== libroId) {
      setLibroId(nuevoLibroId)
      setLeccionesSel([])
      setCodigosSel([])
    }
  }

  const claseSel = clases.find((c) => c.id === claseId) ?? null
  const listo = Boolean(claseSel) && leccionesSel.length > 0 && (
    modo === 'simple' ? codigosSel.length === 1 : codigosSel.length >= MINIMO_AVENTURA
  )

  // Lo mismo que se manda para generar, y para estimar cuánto costaría.
  function cuerpoBase() {
    const base = { lecciones: leccionesSel.map((l) => l.id), claseId }
    if (modo === 'simple') {
      const codigo = codigosSel[0]
      return { ...base, codigo, cantidad: cantidadDe(codigo) }
    }
    // Un objeto de config por actividad, solo con la cantidad elegida
    const configs = {}
    for (const c of codigosSel) {
      const n = cantidadDe(c)
      if (n != null) configs[c] = { cantidad: n }
    }
    return { ...base, actividades: codigosSel, configs }
  }

  // ── Cuántas variantes y cuánto costarían (no gasta tokens) ──
  // Se recalcula al cambiar lo elegido: depende de la clase (sus
  // estudiantes), de las actividades y de si la IA está disponible.
  useEffect(() => {
    if (!listo || resultado) { setEstimacion(null); return }
    let vigente = true
    const t = setTimeout(() => {
      api.actividades.estimar({ modo, ...cuerpoBase() })
        .then((r) => {
          if (!vigente) return
          setEstimacion(r.estimacion ?? null)
          setPlan({ variantes: r.variantes, estudiantes: r.estudiantes, maxVariantesIA: r.maxVariantesIA })
          if (r.ia) setIa(r.ia)
        })
        .catch(() => vigente && setEstimacion(null))
    }, 350)
    return () => { vigente = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, modo, codigosSel, leccionesSel, cantidades, claseId, resultado])

  async function generar() {
    setGenerando(true); setError(null)
    limpiarSalida()
    try {
      const r = modo === 'simple'
        ? await api.actividades.generar(cuerpoBase())
        : await api.actividades.generarRuta(cuerpoBase())
      setResultado({
        tipo: modo === 'simple' ? 'simple' : 'aventura',
        registro: r.actividad ?? r.ruta,
        telemetria: r.telemetria, fallidas: r.fallidas,
      })
    } catch (e) {
      // La IA se cayó justo ahora: el panel pasa a modo "solo vocabulario".
      if (e.datos?.sinIA && e.datos.ia) setIa(e.datos.ia)
      setError(e.message + (e.detalle ? ` — ${JSON.stringify(e.detalle).slice(0, 180)}` : ''))
    } finally {
      setGenerando(false)
    }
  }

  async function lanzar() {
    setError(null)
    try {
      // La sala es de la clase de la actividad: los estudiantes entran
      // con el código de sala + su código de matrícula.
      const cuerpo = resultado.tipo === 'simple'
        ? { modo: 'simple', actividadId: resultado.registro.id, limiteEstudiantes, claseId }
        : { modo: 'juego', rutaId: resultado.registro.id, limiteEstudiantes, claseId }
      const { sala } = await api.salas.crear(cuerpo)
      setSala(sala)
    } catch (e) { setError(e.message) }
  }

  // Respaldo por si el servidor todavía no manda `franjas` (compatibilidad
  // hacia atrás): agrupa el catálogo ya ordenado por dificultad del lado
  // del cliente, con las mismas 5 etiquetas.
  const ETIQUETA_DIFICULTAD_RESPALDO = { 1: 'Básico', 2: 'Elemental', 3: 'Intermedio', 4: 'Avanzado', 5: 'Experto' }
  const franjasVista = useMemo(() => {
    if (franjas.length) return franjas
    const ordenado = [...catalogo].sort((a, b) => a.dificultad - b.dificultad)
    return [1, 2, 3, 4, 5]
      .map((n) => ({ dificultad: n, etiqueta: ETIQUETA_DIFICULTAD_RESPALDO[n], actividades: ordenado.filter((a) => a.dificultad === n) }))
      .filter((f) => f.actividades.length > 0)
  }, [catalogo, franjas])

  // El nivel ya no lo elige el docente: lo fija el libro (1A→A1, 1B→A2).
  const libroSel = useMemo(() => libros.find((b) => b.id === libroId) ?? null, [libros, libroId])
  const catPorCodigo = useMemo(() => Object.fromEntries(catalogo.map((a) => [a.codigo, a])), [catalogo])

  // Cantidad efectiva de una actividad (respeta el rango; fija si no es configurable)
  function cantidadDe(codigo) {
    const cfg = catPorCodigo[codigo]?.preguntas
    if (!cfg) return undefined
    if (!cfg.configurable) return cfg.def
    return cantidades[codigo] ?? cfg.def
  }
  function fijarCantidad(codigo, valor) {
    const cfg = catPorCodigo[codigo]?.preguntas
    if (!cfg?.configurable) return
    const n = Math.max(cfg.min, Math.min(cfg.max, Number(valor) || cfg.def))
    setCantidades((prev) => ({ ...prev, [codigo]: n }))
    limpiarSalida()
  }

  return (
    <div className="create-activity-page">
      <h2>Crear actividad</h2>

      <div className="modo-tabs" role="tablist">
        <button role="tab" aria-selected={modo === 'simple'}
          className={modo === 'simple' ? 'activo' : ''} onClick={() => cambiarModo('simple')}>
          <strong>Actividad simple</strong>
          <small>Una sola actividad, sin juego</small>
        </button>
        <button role="tab" aria-selected={modo === 'aventura'}
          className={modo === 'aventura' ? 'activo' : ''} onClick={() => cambiarModo('aventura')}>
          <strong>Aventura</strong>
          <small>{MINIMO_AVENTURA}+ actividades con escenarios y rutas</small>
        </button>
      </div>

      {/* 1. Elige tu clase — el libro ya no se elige a mano: lo fija la
          clase asignada (book_id). Lección y actividades siguen libres. */}
      <div className="card">
        <div className="section-title">
          <h3>1. Elige tu clase</h3>
        </div>

        {clasesCargando && <p className="muted">Cargando tus clases…</p>}

        {!clasesCargando && !clases.length && (
          <p className="muted">
            Todavía no tenés ninguna clase asignada — pedile a un admin que te asigne una antes de crear actividades.
          </p>
        )}

        {clases.length > 0 && (
          <div className="book-grid">
            {clases.map((c) => {
              const active = c.id === claseId
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`book-option ${active ? 'book-option-active' : ''}`}
                  onClick={() => elegirClase(c.id)}
                >
                  <div className="book-option-title">{c.nombre}</div>
                  <div className="book-option-desc">
                    {c.libroNombre ? `📖 ${c.libroNombre}` : '⚠️ sin libro asignado'}
                    {' · '}{c.totalEstudiantes} estudiante{c.totalEstudiantes === 1 ? '' : 's'}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {claseId && !libroId && (
          <p className="badge badge-warn" style={{ display: 'block', marginTop: '.7rem' }}>
            Esta clase no tiene un libro asignado todavía — pedile a un admin que le asigne uno para poder generar actividades.
          </p>
        )}
      </div>

      {libroId && (
        <LessonSelector
          lessons={lecciones} selectedLessons={leccionesSel}
          onChange={(l) => { setLeccionesSel(l); limpiarSalida() }}
          loading={!lecciones.length}
        />
      )}

      {sinIA && libroId && (
        <AvisoSinIA
          ia={ia} modo={modo} minimoAventura={MINIMO_AVENTURA} onComprobar={comprobarIA}
          cantidadVocabulario={catalogo.filter((a) => !a.requiereIA).length}
        />
      )}

      {libroId && (
        <div className="card">
          <div className="section-title">
            <h3>{modo === 'simple' ? '3. Elige la actividad' : `3. Elige al menos ${MINIMO_AVENTURA} actividades`}</h3>
            <span className={`badge ${listo ? 'badge-ok' : 'badge-warn'}`}>{codigosSel.length} elegida(s)</span>
          </div>

          {/* El catálogo se pinta en 5 franjas de dificultad creciente
              (Básico → Experto), en vez de una sola grilla plana: así se ve
              de un vistazo qué actividades conviene poner al principio de
              una aventura y cuáles cerca del final. */}
          {franjasVista.map((f) => (
            <div key={f.dificultad} className="act-franja">
              <div className="act-franja-titulo">
                <span title="Dificultad">{'●'.repeat(f.dificultad)}{'○'.repeat(5 - f.dificultad)}</span>
                <strong>{f.etiqueta}</strong>
                <small className="muted">{f.actividades.length} actividad{f.actividades.length === 1 ? '' : 'es'}</small>
              </div>

              <div className="act-grid">
                {f.actividades.map((a) => {
                  const sel = codigosSel.includes(a.codigo)
                  const preg = a.preguntas
                  const bloqueada = sinIA && a.requiereIA
                  return (
                    <div key={a.codigo} className={`act-card ${sel ? 'act-card-sel' : ''} ${bloqueada ? 'act-card-bloqueada' : ''}`}>
                      <button type="button" className="act-card-btn"
                        onClick={() => alternarCodigo(a.codigo)}
                        disabled={leccionesSel.length === 0 || bloqueada}
                        title={bloqueada ? 'Necesita IA: no disponible ahora' : undefined}>
                        <div className="act-cab">
                          <strong>{a.titulo}</strong>
                          {a.nuevo && <span className="badge badge-warn">nueva</span>}
                        </div>
                        <code className="act-codigo">{a.codigo}</code>
                        <div className="act-marcas">
                          <span title="Escenario">📍 {a.escenarioResuelto?.nombre ?? a.escenario}</span>
                          <span title="Interacción">{ICONO_INTERACCION[a.interaccion] ?? a.interaccion}</span>
                        </div>
                        {a.requiereRevision && <small className="act-revision">requiere corrección del docente</small>}
                        {bloqueada && <small className="act-sin-ia">🔒 necesita IA</small>}
                        {sinIA && !a.requiereIA && <small className="act-con-vocab">✓ funciona sin IA</small>}
                      </button>

                      {/* Cantidad de preguntas: solo si está elegida */}
                      {sel && preg && (
                        preg.configurable ? (
                          <div className="act-cantidad">
                            <label>Preguntas ({preg.unidad})</label>
                            <div className="act-cantidad-ctrl">
                              <button type="button"
                                onClick={() => fijarCantidad(a.codigo, cantidadDe(a.codigo) - 1)}
                                disabled={cantidadDe(a.codigo) <= preg.min}>−</button>
                              <input type="number" min={preg.min} max={preg.max}
                                value={cantidadDe(a.codigo)}
                                onChange={(e) => fijarCantidad(a.codigo, e.target.value)} />
                              <button type="button"
                                onClick={() => fijarCantidad(a.codigo, cantidadDe(a.codigo) + 1)}
                                disabled={cantidadDe(a.codigo) >= preg.max}>+</button>
                            </div>
                            <small className="muted">{preg.min}–{preg.max}</small>
                          </div>
                        ) : (
                          <div className="act-cantidad act-cantidad-fija">
                            <span>🔒 {preg.def} {preg.unidad}</span>
                            <small className="muted">{preg.motivoFijo}</small>
                          </div>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {modo === 'aventura' && codigosSel.length > 0 && codigosSel.length < MINIMO_AVENTURA && (
            <p className="badge badge-warn" style={{ display: 'block', marginTop: '.7rem' }}>
              Faltan {MINIMO_AVENTURA - codigosSel.length} para poder armar la ruta.
            </p>
          )}
        </div>
      )}

      {codigosSel.length > 0 && claseSel && (
        <div className="card">
          <div className="section-title">
            <h3>Curso y nivel</h3>
            {libroSel && (
              <span className="badge badge-ok" title="El nivel lo define el libro de la clase">
                Nivel {libroSel.nivel} · {libroSel.nombre}
              </span>
            )}
          </div>

          {/* El curso NO se escribe: es la clase que le asignaron al docente. */}
          <dl className="curso-fijo">
            <div><dt>Curso</dt><dd>🏫 {claseSel.nombre}{claseSel.periodo ? ` · ${claseSel.periodo}` : ''}</dd></div>
            <div><dt>Estudiantes</dt><dd>{plan?.estudiantes ?? claseSel.totalEstudiantes}</dd></div>
            <div><dt>Variantes</dt><dd><strong>{plan?.variantes ?? '…'}</strong></dd></div>
          </dl>
          <p className="muted curso-fijo-nota">
            El curso es la clase que te asignaron (no se puede cambiar aquí) y el nivel lo fija su libro.
            Se generan <strong>{plan?.variantes ?? '…'} variantes</strong> con preguntas distintas
            {sinIA
              ? ' — sin IA, una por estudiante (se arman gratis con el vocabulario de la lección)'
              : ` — con IA, hasta ${plan?.maxVariantesIA ?? 10} (cada una gasta tokens)`}.
            Cada estudiante entra con el código de sala y su código de matrícula, y le toca una variante al azar.
          </p>
        </div>
      )}

      {modo === 'aventura' && vistaPrevia && <RoutePreview datos={vistaPrevia} />}

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent2)' }}>
          <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>
        </div>
      )}

      {listo && !resultado && (
        <>
          <BotonIA className="btn-generar" onClick={generar} cargando={generando}
            textoCargando={plan?.variantes > 1 ? `Generando ${plan.variantes} variantes` : 'Generando'}>
            {modo === 'simple' ? 'Generar actividad' : `Generar aventura de ${codigosSel.length} actividades`}
            {plan?.variantes > 1 && ` (${plan.variantes} variantes)`}
          </BotonIA>
          {estimacion && (
            <p className="costo-estimado muted">
              Costo estimado: <strong>{textoEstimacion(estimacion)}</strong>
              {!estimacion.desdeCache && !estimacion.sinIA && estimacion.muestrasCalibracion === 0 && ' (aproximado: todavía no hay generaciones para calibrar)'}
            </p>
          )}
        </>
      )}

      {resultado && (
        <PanelVariantes resultado={resultado}>
          {!sala && (
            <div className="lanzar-config">
              <div className="field" style={{ maxWidth: 260 }}>
                <label>Límite de estudiantes</label>
                <div className="act-cantidad-ctrl">
                  <button type="button"
                    onClick={() => setLimiteEstudiantes((n) => Math.max(1, n - 1))}
                    disabled={limiteEstudiantes <= 1}>−</button>
                  <input type="number" min={1} max={30} value={limiteEstudiantes}
                    onChange={(e) => setLimiteEstudiantes(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
                  <button type="button"
                    onClick={() => setLimiteEstudiantes((n) => Math.min(30, n + 1))}
                    disabled={limiteEstudiantes >= 30}>+</button>
                </div>
                <small className="muted">
                  Por defecto, los estudiantes de {claseSel?.nombre ?? 'la clase'}. La sala se cierra sola al entrar {limiteEstudiantes}.
                </small>
              </div>
              <button className="btn-generar" onClick={lanzar} disabled={generando}>
                Lanzar a {claseSel?.nombre ?? 'la clase'} →
              </button>
            </div>
          )}
          {sala && <RoomCode sala={sala} />}
        </PanelVariantes>
      )}
    </div>
  )
}

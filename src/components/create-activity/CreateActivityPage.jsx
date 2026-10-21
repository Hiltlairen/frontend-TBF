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
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import LessonSelector from './LessonSelector.jsx'
import RoutePreview from './RoutePreview.jsx'
import RoomCode from './RoomCode.jsx'
import PanelVariantes from './PanelVariantes.jsx'
import AvisoSinIA from './AvisoSinIA.jsx'
import ConfigCancion from './ConfigCancion.jsx'
import BotonIA from '../ui/BotonIA.jsx'
import { textoEstimacion } from '../../lib/tokens.js'
import './CreateActivity.css'
import './RoomCode.css'

const MINIMO_AVENTURA = 6
const CANCION = '10-canciones'
const REDACCION = '05-redaccion'

// El asistente: un paso a la vez, con la barra de progreso arriba.
const PASOS = [
  { n: 1, titulo: 'Curso',       ayuda: 'Tu clase asignada' },
  { n: 2, titulo: 'Lecciones',   ayuda: 'De qué vocabulario' },
  { n: 3, titulo: 'Actividades', ayuda: 'Simple o aventura' },
  { n: 4, titulo: 'Generar',     ayuda: 'Resumen y costo' },
  { n: 5, titulo: 'Lanzar',      ayuda: 'Revisa y abre la sala' },
]

const ICONO_INTERACCION = {
  ninguna:         '👤 solo',
  dialogo_directo: '💬 cara a cara',
  dialogo_remoto:  '📞 por celular',
  escucha:         '🔊 escucha',
  performance:     '🎤 en público',
  transaccion:     '💳 transacción',
}

export default function CreateActivityPage() {
  const [paso, setPaso] = useState(1)
  // Asistente vertical: al abrir un paso, la página baja hasta él
  // (como una ruleta) y los anteriores quedan arriba, resumidos.
  const refsPaso = useRef({})
  const primeraVez = useRef(true)
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return }
    const el = refsPaso.current[paso]
    if (!el) return
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => el.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' }))
  }, [paso])
  const [modo, setModo] = useState('simple')

  const [libros, setLibros] = useState([])
  const [libroId, setLibroId] = useState(null)
  const [lecciones, setLecciones] = useState([])
  const [leccionesSel, setLeccionesSel] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [franjas, setFranjas] = useState([])
  const [tipos, setTipos] = useState([])          // catálogo agrupado por tipo de actividad
  const [abiertos, setAbiertos] = useState([])    // tipos desplegados
  const [cantidades, setCantidades] = useState({}) // { codigo: n }
  // Configuración propia de algunas actividades: { '05-redaccion': { escenario, tipoTexto }, '10-canciones': { cancion } }
  const [extras, setExtras] = useState({})
  const [tiposTexto, setTiposTexto] = useState({})
  const [escenarios, setEscenarios] = useState([])
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
      .then(({ catalogo, franjas, tipos, ia, tiposTexto }) => {
        setCatalogo(catalogo); setFranjas(franjas ?? []); setTipos(tipos ?? []); setTiposTexto(tiposTexto ?? {}); if (ia) setIa(ia)
      })
      .catch((e) => setError(e.message))
    api.actividades.escenarios().then(({ escenarios }) => setEscenarios(escenarios ?? [])).catch(() => {})
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

  // Si algo de los pasos anteriores cambió (y se descartó lo generado),
  // el paso 5 ya no tiene qué mostrar: se vuelve a "Generar".
  useEffect(() => {
    if (paso === 5 && !resultado) setPaso(4)
  }, [paso, resultado])

  // Después de lanzar: otra actividad para el mismo curso y lecciones.
  function nuevaActividad() {
    setCodigosSel([]); setCantidades({}); setExtras({}); limpiarSalida(); setError(null)
    setPaso(3)
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
    // Una sola opción: elegirla ya es avanzar (sin "Siguiente").
    if (nuevoLibroId) { setPaso(2); setError(null) }
  }

  const claseSel = clases.find((c) => c.id === claseId) ?? null
  // La canción necesita que el docente la elija (y su audio) antes de generar.
  const faltaCancion = codigosSel.includes(CANCION) && !extras[CANCION]?.cancion
  const listo = Boolean(claseSel) && leccionesSel.length > 0 && !faltaCancion && (
    modo === 'simple' ? codigosSel.length === 1 : codigosSel.length >= MINIMO_AVENTURA
  )

  function fijarExtra(codigo, cambios) {
    setExtras((prev) => ({ ...prev, [codigo]: { ...prev[codigo], ...cambios } }))
    limpiarSalida()
  }
  // Lo que viaja en config: en simple, el ambiente y el tipo de texto de la
  // redacción; en los dos modos, la canción (en aventura, la redacción se
  // adapta sola al ambiente donde cae).
  function extrasDe(codigo) {
    const x = extras[codigo] ?? {}
    if (codigo === CANCION) return x.cancion ? { cancion: x.cancion } : {}
    if (codigo === REDACCION && modo === 'simple') {
      return { ...(x.escenario ? { escenario: x.escenario } : {}), ...(x.tipoTexto ? { tipoTexto: x.tipoTexto } : {}) }
    }
    return {}
  }

  // Lo mismo que se manda para generar, y para estimar cuánto costaría.
  function cuerpoBase() {
    const base = { lecciones: leccionesSel.map((l) => l.id), claseId }
    if (modo === 'simple') {
      const codigo = codigosSel[0]
      return { ...base, codigo, cantidad: cantidadDe(codigo), config: extrasDe(codigo) }
    }
    // Un objeto de config por actividad: la cantidad elegida (y la canción)
    const configs = {}
    for (const c of codigosSel) {
      const n = cantidadDe(c)
      const cfg = { ...(n != null ? { cantidad: n } : {}), ...extrasDe(c) }
      if (Object.keys(cfg).length) configs[c] = cfg
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
  }, [listo, modo, codigosSel, leccionesSel, cantidades, claseId, resultado, extras])

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
      setPaso(5)
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

  // Grupos plegables: por tipo de actividad (Vocabulario, Gramática…). Si
  // el servidor no los manda, se usan las franjas de dificultad.
  const grupos = useMemo(() => (tipos.length
    ? tipos
    : franjasVista.map((f) => ({ id: `d${f.dificultad}`, etiqueta: f.etiqueta, icono: '●'.repeat(f.dificultad), descripcion: null, actividades: f.actividades }))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tipos, franjas, catalogo])
  const alternarGrupo = (id) => setAbiertos((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))
  const todosAbiertos = grupos.length > 0 && grupos.every((g) => abiertos.includes(g.id))


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

  const [cancionElegida, setCancionElegida] = useState(null)   // "Título — Artista", para los resúmenes

  // ── Asistente por pasos ─────────────────────────────────
  const pasoListo = {
    1: Boolean(claseSel && libroId),
    2: leccionesSel.length > 0,
    3: listo,
    4: Boolean(resultado),
  }
  // Se puede ir a un paso si todos los anteriores están completos.
  const alcanzable = (n) => PASOS.slice(0, n - 1).every((x) => pasoListo[x.n])
  const ir = (n) => { if (alcanzable(n)) { setPaso(n); setError(null) } }
  // Lo que se eligió en cada paso, para verlo en su cabecera cuando está cerrado.
  const resumenPaso = {
    1: claseSel && `${claseSel.nombre}${libroSel ? ` · ${libroSel.nombre}` : ''}`,
    2: leccionesSel.length > 0 && leccionesSel.map((l) => `L${l.numero}`).join(', '),
    3: codigosSel.length > 0 && `${modo === 'simple' ? 'Simple' : 'Aventura'} · ${codigosSel.map((c) => catPorCodigo[c]?.titulo ?? c).join(', ')}`
      + (cancionElegida ? ` · 🎤 ${cancionElegida}` : ''),
    4: resultado && `${resultado.registro.variantes?.length ?? 1} variante(s) generadas`,
  }
  const propsPaso = (n) => ({
    n, refs: refsPaso, abierto: paso === n,
    hecho: pasoListo[n] && n !== paso, bloqueado: !alcanzable(n),
    resumen: resumenPaso[n], onAbrir: () => ir(n),
    error: paso === n ? error : null,
  })
  const actividadesElegidas = codigosSel.map((c) => catPorCodigo[c]).filter(Boolean)
  const nombreEscenario = (id) => escenarios.find((e) => e.id === id)?.nombre ?? id
  const redaccion = catPorCodigo[REDACCION]

  return (
    <div className="create-activity-page">
      <h2>Crear actividad</h2>

      {/* ── Progreso: los 5 pasos ── */}
      <ol className="wiz-pasos" aria-label="Pasos para crear una actividad">
        {PASOS.map((x) => {
          const estado = x.n === paso ? 'actual' : pasoListo[x.n] && x.n < paso ? 'hecho' : ''
          return (
            <li key={x.n} className={`wiz-paso ${estado}`}>
              <button type="button" onClick={() => ir(x.n)} disabled={!alcanzable(x.n) || x.n === paso}
                aria-current={x.n === paso ? 'step' : undefined}>
                <span className="wiz-num">{estado === 'hecho' ? '✓' : x.n}</span>
                <span className="wiz-txt">
                  <strong>{x.titulo}</strong>
                  <small>{x.ayuda}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* ══ Paso 1 · Curso ══ (elegir avanza solo: es una sola opción) */}
      <Paso {...propsPaso(1)} titulo="¿Para qué curso es?">
          <p className="muted wiz-intro">Solo aparecen los cursos que te asignaron. El libro y el nivel salen del curso.</p>
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
      </Paso>

      {/* ══ Paso 2 · Lecciones ══ (varias: se confirma con "Continuar") */}
      <Paso {...propsPaso(2)} titulo="¿De qué lecciones?">
        {libroId && (
          <LessonSelector
            lessons={lecciones} selectedLessons={leccionesSel}
            onChange={(l) => { setLeccionesSel(l); limpiarSalida() }}
            loading={!lecciones.length}
          />
        )}
        <Continuar listo={pasoListo[2]} onClick={() => ir(3)}
          falta="Elige al menos una lección" />
      </Paso>

      {/* ══ Paso 3 · Actividades ══ */}
      <Paso {...propsPaso(3)} titulo="¿Qué actividades?">
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

          {sinIA && (
            <AvisoSinIA
              ia={ia} modo={modo} minimoAventura={MINIMO_AVENTURA} onComprobar={comprobarIA}
              cantidadVocabulario={catalogo.filter((a) => !a.requiereIA).length}
            />
          )}

          <div className="card">
            <div className="section-title">
              <h3>{modo === 'simple' ? 'Elige la actividad' : `Elige al menos ${MINIMO_AVENTURA} actividades`}</h3>
              <span className={`badge ${listo ? 'badge-ok' : 'badge-warn'}`}>{codigosSel.length} elegida(s)</span>
            </div>

          {/* El catálogo va plegado por TIPO de actividad: el docente abre
              solo los que le interesan en vez de ver las 20 a la vez. Dentro
              de cada tipo, de más fácil a más difícil (los puntos ●○ de cada
              tarjeta). */}
          <div className="act-grupos-acciones">
            <button type="button" className="act-grupos-toggle" onClick={() => setAbiertos(todosAbiertos ? [] : grupos.map((g) => g.id))}>
              {todosAbiertos ? 'Plegar todos' : 'Desplegar todos'}
            </button>
          </div>
          {grupos.map((g) => {
            const abierto = abiertos.includes(g.id)
            const elegidasGrupo = g.actividades.filter((a) => codigosSel.includes(a.codigo)).length
            return (
            <div key={g.id} className={`act-grupo ${abierto ? 'abierto' : ''}`}>
              <button type="button" className="act-grupo-cab" onClick={() => alternarGrupo(g.id)}
                aria-expanded={abierto} aria-controls={`grupo-${g.id}`}>
                <span className="act-grupo-icono" aria-hidden="true">{g.icono}</span>
                <span className="act-grupo-txt">
                  <strong>{g.etiqueta}</strong>
                  {g.descripcion && <small className="muted">{g.descripcion}</small>}
                </span>
                {elegidasGrupo > 0 && <span className="badge badge-ok">{elegidasGrupo} elegida{elegidasGrupo === 1 ? '' : 's'}</span>}
                <small className="muted act-grupo-n">{g.actividades.length} actividad{g.actividades.length === 1 ? '' : 'es'}</small>
                <span className="act-grupo-flecha" aria-hidden="true">▾</span>
              </button>

              {abierto && (
              <div className="act-grid" id={`grupo-${g.id}`}>
                {g.actividades.map((a) => {
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
                        {a.resumen && <p className="act-resumen">{a.resumen}</p>}
                        <span className="act-dificultad" title={`Dificultad ${a.dificultad} de 5`}>
                          {'●'.repeat(a.dificultad)}{'○'.repeat(5 - a.dificultad)}
                        </span>
                        <div className="act-marcas">
                          <span title="Escenario">📍 {a.escenarioResuelto?.nombre ?? a.escenario}</span>
                          <span title="Interacción">{ICONO_INTERACCION[a.interaccion] ?? a.interaccion}</span>
                        </div>
                        {a.requiereRevision && (
                          <small className="act-revision">
                            {a.codigo === REDACCION ? 'la evalúa la IA · tú confirmas la nota' : 'requiere corrección del docente'}
                          </small>
                        )}
                        {a.requiereCancion && <small className="act-con-vocab">🎵 eliges la canción · sin IA</small>}
                        {a.requiereMapa && <small className="act-con-vocab">🗺️ mapa real de La Paz</small>}
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
              )}
            </div>
            )
          })}

          {modo === 'aventura' && codigosSel.includes(REDACCION) && (
            <p className="muted" style={{ marginTop: '.7rem' }}>
              ✍️ <strong>{redaccion?.titulo ?? 'La redacción'}</strong> se adapta sola al ambiente donde caiga en la aventura
              (escribirle a alguien en la cafetería, contar lo que leyó en la biblioteca…).
            </p>
          )}

          {modo === 'aventura' && codigosSel.length > 0 && codigosSel.length < MINIMO_AVENTURA && (
            <p className="badge badge-warn" style={{ display: 'block', marginTop: '.7rem' }}>
              Faltan {MINIMO_AVENTURA - codigosSel.length} para poder armar la ruta.
            </p>
          )}
          </div>

          {/* Redacción suelta: el docente elige la situación y el tipo de texto */}
          {modo === 'simple' && codigosSel[0] === REDACCION && redaccion && (
            <div className="card config-redaccion">
              <div className="section-title"><h3>✍️ ¿En qué situación escribe?</h3></div>
              <p className="muted">La consigna se arma para ese ambiente. La IA evalúa solo dos cosas: que el texto encaje en la situación y que esté bien escrito; tú confirmas la nota.</p>
              <div className="config-redaccion-campos">
                <div className="field">
                  <label htmlFor="red-escenario">Ambiente</label>
                  <select id="red-escenario" value={extras[REDACCION]?.escenario ?? redaccion.escenario}
                    onChange={(e) => fijarExtra(REDACCION, { escenario: e.target.value })}>
                    {[redaccion.escenario, ...(redaccion.escenariosAlt ?? [])].map((id) => (
                      <option key={id} value={id}>{nombreEscenario(id)}</option>
                    ))}
                  </select>
                  <small className="muted">{escenarios.find((e) => e.id === (extras[REDACCION]?.escenario ?? redaccion.escenario))?.descripcion}</small>
                </div>
                <div className="field">
                  <label htmlFor="red-tipo">Tipo de texto</label>
                  <select id="red-tipo" value={extras[REDACCION]?.tipoTexto ?? 'auto'}
                    onChange={(e) => fijarExtra(REDACCION, { tipoTexto: e.target.value })}>
                    {Object.entries(tiposTexto).map(([id, etiqueta]) => <option key={id} value={id}>{etiqueta}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {codigosSel.includes(CANCION) && (
            <ConfigCancion
              valor={extras[CANCION]?.cancion}
              lecciones={leccionesSel.map((l) => l.id)}
              nivel={libroSel?.nivel}
              onChange={(cancion, nombre) => {
                setCancionElegida(nombre ?? null)
                if (JSON.stringify(cancion ?? null) === JSON.stringify(extras[CANCION]?.cancion ?? null)) return
                fijarExtra(CANCION, { cancion })
              }}
            />
          )}

          {modo === 'aventura' && vistaPrevia && <RoutePreview datos={vistaPrevia} />}
        <Continuar listo={pasoListo[3]} onClick={() => ir(4)}
          falta={faltaCancion ? 'Elige la canción, el enlace del audio y al menos una palabra para ocultar'
            : modo === 'simple' ? 'Elige una actividad' : `Elige al menos ${MINIMO_AVENTURA} actividades`} />
      </Paso>

      {/* ══ Paso 4 · Resumen y generar ══ (al terminar, baja solo al 5) */}
      <Paso {...propsPaso(4)} titulo="Revisa y genera">
        {claseSel && (<>
          <div className="section-title">
            <span />
            {libroSel && (
              <span className="badge badge-ok" title="El nivel lo define el libro del curso">
                Nivel {libroSel.nivel} · {libroSel.nombre}
              </span>
            )}
          </div>

          <dl className="curso-fijo wiz-resumen">
            <div><dt>Curso</dt><dd>🏫 {claseSel.nombre}{claseSel.periodo ? ` · ${claseSel.periodo}` : ''}</dd></div>
            <div><dt>Lecciones</dt><dd>{leccionesSel.map((l) => `L${l.numero}`).join(', ')}</dd></div>
            <div><dt>Tipo</dt><dd>{modo === 'simple' ? 'Actividad simple' : `Aventura · ${codigosSel.length} actividades`}</dd></div>
            <div><dt>Estudiantes</dt><dd>{plan?.estudiantes ?? claseSel.totalEstudiantes}</dd></div>
            <div><dt>Variantes</dt><dd><strong>{plan?.variantes ?? '…'}</strong></dd></div>
          </dl>

          <ul className="wiz-actividades">
            {actividadesElegidas.map((a) => (
              <li key={a.codigo}>
                <strong>{a.titulo}</strong>
                {a.preguntas && <small className="muted"> · {cantidadDe(a.codigo)} {a.preguntas.unidad}</small>}
                {a.codigo === REDACCION
                  ? <small className="act-revision"> · la evalúa la IA, tú confirmas{modo === 'simple' ? ` · ${nombreEscenario(extras[REDACCION]?.escenario ?? a.escenario)}` : ''}</small>
                  : a.requiereRevision && <small className="act-revision"> · la corriges tú</small>}
                {a.codigo === CANCION && cancionElegida && <small className="muted"> · 🎤 {cancionElegida}</small>}
              </li>
            ))}
          </ul>

          <p className="muted curso-fijo-nota">
            Se generan <strong>{plan?.variantes ?? '…'} variantes</strong> con preguntas distintas
            {sinIA
              ? ' — sin IA, una por estudiante (se arman gratis con el vocabulario de la lección)'
              : ` — con IA, hasta ${plan?.maxVariantesIA ?? 10} (cada una gasta tokens)`}.
            Cada estudiante entra con el código de sala y su código de matrícula, y le toca una al azar.
          </p>

          <div className="wiz-generar">
            <BotonIA className="btn-generar" onClick={generar} cargando={generando}
              textoCargando={plan?.variantes > 1 ? `Generando ${plan.variantes} variantes` : 'Generando'}>
              ✨ {modo === 'simple' ? 'Generar actividad' : `Generar aventura de ${codigosSel.length} actividades`}
              {plan?.variantes > 1 && ` (${plan.variantes} variantes)`}
            </BotonIA>
            {estimacion && (
              <p className="costo-estimado muted">
                Costo estimado: <strong>{textoEstimacion(estimacion)}</strong>
                {!estimacion.desdeCache && !estimacion.sinIA && !estimacion.local && estimacion.muestrasCalibracion === 0 && ' (aproximado: todavía no hay generaciones para calibrar)'}
              </p>
            )}
          </div>
        </>)}
      </Paso>

      {/* ══ Paso 5 · Revisar variantes y lanzar ══ */}
      <Paso {...propsPaso(5)} titulo="Revisa las variantes y lanza la sala">
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
          {sala && (
            <div className="wiz-otra">
              <button type="button" className="btn btn-outline" onClick={nuevaActividad}>
                + Crear otra actividad para {claseSel?.nombre ?? 'este curso'}
              </button>
            </div>
          )}
      </Paso>

    </div>
  )
}

// ── Un paso del asistente vertical ─────────────────────────
// Siempre visible: cerrado muestra su número, título y lo que se eligió
// (con "Cambiar" para volver a abrirlo); abierto muestra su contenido.
// Los pasos a los que todavía no se puede llegar se ven apagados.
function Paso({ n, refs, titulo, abierto, hecho, bloqueado, resumen, onAbrir, error, children }) {
  const estado = abierto ? 'abierto' : hecho ? 'hecho' : bloqueado ? 'bloqueado' : ''
  return (
    <section ref={(el) => { refs.current[n] = el }} className={`wiz-seccion ${estado}`} aria-labelledby={`wiz-t${n}`}>
      <button type="button" className="wiz-seccion-cab" onClick={onAbrir} disabled={abierto || bloqueado}
        aria-expanded={abierto}>
        <span className="wiz-num">{hecho ? '✓' : n}</span>
        <span className="wiz-seccion-titulo">
          <strong id={`wiz-t${n}`}>{titulo}</strong>
          {!abierto && resumen && <small>{resumen}</small>}
          {bloqueado && <small>Completa el paso anterior</small>}
        </span>
        {hecho && !abierto && <span className="wiz-cambiar">Cambiar</span>}
      </button>
      {abierto && (
        <div className="wiz-seccion-cuerpo">
          {children}
          {error && <p className="badge badge-error wiz-error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  )
}

/** "Continuar" al final del paso, justo donde termina de elegir. */
function Continuar({ listo, onClick, falta }) {
  return (
    <div className="wiz-continuar">
      {!listo && <small className="muted">{falta}</small>}
      <button type="button" className="btn btn-primary" onClick={onClick} disabled={!listo}>
        Continuar ↓
      </button>
    </div>
  )
}

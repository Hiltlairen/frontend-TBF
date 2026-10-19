// ============================================================
// ActivityRunner.jsx — Ejecuta CUALQUIERA de las 20 actividades
// ============================================================
// Recibe { codigo, contenido, onFinish(puntaje, respuestas) } y se
// encarga de pintarla. Sirve tanto para el modo simple del docente
// como para cada etapa de la aventura.
//
// `puntaje` es solo la nota que se muestra durante la actividad: la
// nota OFICIAL la calcula el servidor a partir de `respuestas`
// (server/src/domain/calificador.js). Si cambias cómo una primitiva
// arma sus ítems o sus respuestas, cambia el calificador también.
//
// ── ESTRUCTURA VISUAL (estilo "lección móvil") ──────────────
// Toda actividad se dibuja dentro del mismo MARCO de 3 zonas:
//
//   ┌───────────────────────────────────────┐
//   │  ✕   ▓▓▓▓▓░░░░░░░░░░░░░░░   ⚡ 12      │  ← .ar-top
//   ├───────────────────────────────────────┤
//   │  ▣ PALABRA NUEVA                      │  ← .ar-eyebrow
//   │  Traduce esta oración                 │  ← .ar-titulo
//   │  [personaje]  ( 🔊 It's hot. )        │  ← .ar-escena
//   │  ______________________________       │  ← .ar-renglones
//   │  [ calor ] [ ciudad ] [ Hace ]        │  ← .ar-fichas
//   ├───────────────────────────────────────┤
//   │        [    COMPROBAR    ]            │  ← .ar-pie (fijo)
//   └───────────────────────────────────────┘
//
// El flujo es SIEMPRE: elegir → COMPROBAR → hoja de feedback
// (¡Buen trabajo! / Significado…) → CONTINUAR. Nunca avanza solo.
//
// En vez de 20 componentes, hay 12 PRIMITIVAS reutilizables:
//   Quiz · Escribir · Emparejar · Ordenar · Sopa · Libre · Pronunciacion
//   Laberinto · Rompecabezas · ArmarEscenario · Impostor · Basquet
// (las 5 últimas son las que se sumaron para 15–20) y un normalizador
// que traduce cada esquema de Gemini a la primitiva que le corresponde.
// ============================================================
import { useMemo, useState, useEffect, useRef, lazy, Suspense } from 'react'
import { buildWordSearchGrid } from '../lib/wordsearch.js'
import { construirLaberinto } from '../lib/wordmaze.js'
import { generarPiezas, GLIFO_FORMA } from '../lib/sentencePuzzle.js'
import ReproductorCancion, { versoActual } from '../components/ui/ReproductorCancion.jsx'
// El mapa (Leaflet) solo se descarga cuando se abre una actividad 07.
import Caminante, { direccionDe } from './Caminante.jsx'
const MapaCiudad = lazy(() => import('./MapaCiudad.jsx'))
import npcImg from './assets/objects/npc.png'
import Sprite from './Sprite.jsx'
import './ActivityRunner.css'

const pct = (ok, total) => (total ? Math.round((ok / total) * 100) : 0)
const barajar = (a) => [...a].sort(() => Math.random() - 0.5)

// ── Texto a voz del navegador (actividades de escucha) ─────
function hablar(texto, lang = 'en-US', velocidad = 0.9) {
  try {
    window.speechSynthesis?.cancel()
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = lang
    u.rate = velocidad
    window.speechSynthesis?.speak(u)
  } catch { /* si el navegador no soporta TTS, se ve el texto igual */ }
}

// ════════════════════════════════════════════════════════════
//  PIEZAS DE INTERFAZ COMPARTIDAS
//  Son las que dan a las 14 actividades la misma forma.
// ════════════════════════════════════════════════════════════

// ── Barra superior: salir · progreso · restantes · combo ───
function BarraSuperior({ hechos = 0, total = 1, combo = 0, onSalir }) {
  const avance = total ? Math.min(100, (hechos / total) * 100) : 0
  const restantes = Math.max(0, total - hechos)
  return (
    <div className="ar-top">
      {combo >= 2 && <span className="ar-combo">COMBO <b>x{combo}</b></span>}
      <div className="ar-top-fila">
        <button className="ar-x" onClick={onSalir} disabled={!onSalir} aria-label="Salir">✕</button>
        <div className="ar-barra" role="progressbar" aria-valuenow={Math.round(avance)}>
          <span style={{ width: `${avance}%` }} />
        </div>
        <span className="ar-energia" aria-label={`${restantes} restantes`}>
          <i className="ar-rayo">⚡</i>{restantes}
        </span>
      </div>
    </div>
  )
}

// ── Etiqueta pequeña + título grande ───────────────────────
function Encabezado({ etiqueta, icono = '✦', titulo }) {
  return (
    <div className="ar-encabezado">
      {etiqueta && (
        <p className="ar-eyebrow"><i>{icono}</i>{etiqueta}</p>
      )}
      {titulo && <h2 className="ar-titulo">{titulo}</h2>}
    </div>
  )
}

// ── Personaje + globo de diálogo con botón de audio ────────
function Escena({ texto, lang = 'en-US', conLento = false, subrayado = true, personaje = true }) {
  return (
    <div className="ar-escena">
      {personaje && <img className="ar-personaje" src={npcImg} alt="" />}
      <div className="ar-globo">
        <button className="ar-altavoz" onClick={() => hablar(texto, lang)} aria-label="Escuchar">🔊</button>
        {conLento && (
          <button className="ar-altavoz ar-lento" onClick={() => hablar(texto, lang, 0.55)} aria-label="Escuchar despacio">🐢</button>
        )}
        <span className={subrayado ? 'ar-punteado' : ''}>{texto}</span>
      </div>
    </div>
  )
}

// ── Renglones donde "cae" la respuesta ─────────────────────
function Renglones({ children, lineas = 2 }) {
  return (
    <div className="ar-renglones">
      <div className="ar-renglon-contenido">{children}</div>
      {Array.from({ length: lineas }).map((_, k) => <div key={k} className="ar-renglon" />)}
    </div>
  )
}

// ── Pie fijo con el botón principal ────────────────────────
function Pie({ children, secundario }) {
  return (
    <div className="ar-pie">
      {secundario}
      {children}
    </div>
  )
}

function BotonCTA({ children, tono = '', ...rest }) {
  return <button className={`ar-cta ${tono}`} {...rest}>{children}</button>
}

// ── Hoja de resultado que sube desde abajo ─────────────────
function HojaFeedback({ estado, titulo, significado, detalle, onContinuar, textoBoton = 'Continuar' }) {
  const ok = estado === 'ok'
  return (
    <div className={`ar-hoja ${ok ? 'ok' : 'mal'}`} role="status" aria-live="polite">
      <p className="ar-hoja-titulo">
        <span className="ar-hoja-icono">{ok ? '✓' : '✕'}</span>
        {titulo ?? (ok ? '¡Buen trabajo!' : 'Respuesta incorrecta')}
      </p>
      {significado && (
        <div className="ar-hoja-bloque">
          <strong>{ok ? 'Significado:' : 'Respuesta correcta:'}</strong>
          <p>{significado}</p>
        </div>
      )}
      {detalle && <p className="ar-hoja-nota">{detalle}</p>}
      <BotonCTA tono={ok ? 'ok' : 'mal'} onClick={onContinuar}>{textoBoton}</BotonCTA>
    </div>
  )
}

// ── Marco: une las 3 zonas en el mismo esqueleto ───────────
// `clave` (opcional) es el índice del ítem. Cuando cambia, React vuelve a
// montar el cuerpo y con eso la animación de entrada del CSS se ejecuta de
// nuevo: la pregunta siguiente entra deslizándose. Es puramente visual —
// el estado de la actividad vive en el componente de la primitiva, no acá,
// así que remontar este <div> no reinicia nada.
function Marco({ top, children, pie, hoja, clave }) {
  return (
    <div className={`ar-shell ${hoja ? 'con-hoja' : ''}`}>
      {top}
      <div className="ar-cuerpo" key={clave}>{children}</div>
      {pie}
      {hoja}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 1 — Quiz de opción múltiple por turnos
// ════════════════════════════════════════════════════════════
function Quiz({
  items, contexto = [], onFinish, penalizacion = 0,
  formato = 'chat', etiqueta, icono, titulo, onSalir,
}) {
  const [i, setI] = useState(0)
  const [elegida, setElegida] = useState(null)
  const [veredicto, setVeredicto] = useState(null)
  const [aciertos, setAciertos] = useState(0)
  const [combo, setCombo] = useState(0)
  const [respuestas, setRespuestas] = useState([])

  const item = items[i]
  if (!item) return null

  const visibles = contexto.slice(0, item.hasta ?? contexto.length)
  const correcta = item.opciones.find((o) => o.correcta === true)

  function comprobar() {
    if (!elegida || veredicto) return
    const ok = elegida.correcta === true
    setVeredicto(ok ? 'ok' : 'mal')
    setAciertos((a) => a + (ok ? 1 : 0))
    setCombo((c) => (ok ? c + 1 : 0))
    setRespuestas((r) => [...r, { i, opcion: elegida.texto }])
  }

  function continuar() {
    if (i + 1 >= items.length) {
      const bruto = pct(aciertos, items.length)
      const errores = items.length - aciertos
      onFinish(Math.max(0, bruto - (errores * penalizacion) / 10), { items: respuestas })
    } else {
      setI(i + 1); setElegida(null); setVeredicto(null)
    }
  }

  return (
    <Marco
      clave={i}
      top={<BarraSuperior hechos={i} total={items.length} combo={combo} onSalir={onSalir} />}
      pie={
        <Pie>
          <BotonCTA onClick={comprobar} disabled={!elegida || Boolean(veredicto)}>Comprobar</BotonCTA>
        </Pie>
      }
      hoja={veredicto && (
        <HojaFeedback
          estado={veredicto}
          significado={veredicto === 'mal' ? correcta?.texto : item.significado}
          onContinuar={continuar}
        />
      )}
    >
      <Encabezado etiqueta={etiqueta} icono={icono} titulo={titulo ?? item.enunciado} />

      {/* Contexto en formato conversación (burbujas) */}
      {formato === 'chat' && visibles.length > 0 && (
        <div className="ar-dialogo">
          {visibles.map((t, k) => (
            <div key={k} className={`ar-fila-burbuja ${t.mio ? 'mia' : ''}`}>
              {!t.mio && k === visibles.findIndex((x) => !x.mio) && (
                <img className="ar-personaje chico" src={npcImg} alt="" />
              )}
              <div className={`ar-burbuja ${t.mio ? 'ar-mia' : ''}`}>
                {!t.mio && <span className="ar-hablante">{t.hablante}</span>}
                {!t.mio && (
                  <button className="ar-altavoz mini" onClick={() => hablar(t.texto)} aria-label="Escuchar">🔊</button>
                )}
                <span>{t.texto}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contexto en formato panel (canción / anuncio / patrón) */}
      {formato === 'panel' && (
        <div className="ar-panel">
          {visibles.map((t, k) => (
            <p key={k} className="ar-panel-fila"><span className="ar-punteado">{t.texto}</span></p>
          ))}
          <p className="ar-panel-fila activa">
            <span className="ar-punteado">{item.enunciado}</span>
          </p>
        </div>
      )}

      {/* El enunciado sólo se repite si no es ya el título ni la fila activa */}
      {formato === 'chat' && titulo && <p className="ar-enunciado">{item.enunciado}</p>}

      <div className="ar-opciones">
        {item.opciones.map((op) => {
          // No se pinta en verde la opción correcta si no fue la elegida:
          // eso delataría la respuesta en un reintento y le quita
          // dificultad al ejercicio. Solo se marca la que el alumno
          // tocó (verde si acertó, roja si no) — el resto queda neutro.
          let estado = elegida === op ? 'sel' : ''
          if (veredicto) {
            if (op === elegida) estado = op.correcta ? 'ok' : 'mal'
            else estado = 'gris'
          }
          return (
            <button key={op.id} className={`ar-opcion ${estado}`}
              onClick={() => !veredicto && setElegida(op)} disabled={Boolean(veredicto)}>
              {op.texto}
            </button>
          )
        })}
      </div>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 2 — Escribir la respuesta
// ════════════════════════════════════════════════════════════
function Escribir({ items, onFinish, etiqueta = 'Palabra nueva', icono, titulo, onSalir }) {
  const [i, setI] = useState(0)
  const [valor, setValor] = useState('')
  const [veredicto, setVeredicto] = useState(null)
  const [aciertos, setAciertos] = useState(0)
  const [combo, setCombo] = useState(0)
  const [respuestas, setRespuestas] = useState([])
  const inputRef = useRef(null)

  const item = items[i]
  useEffect(() => { inputRef.current?.focus() }, [i])
  if (!item) return null

  const normalizarTexto = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ')

  function comprobar() {
    if (veredicto || !valor.trim()) return
    const aceptadas = [item.respuesta, ...(item.alternativas ?? [])].map(normalizarTexto)
    const ok = aceptadas.includes(normalizarTexto(valor))
    setVeredicto(ok ? 'ok' : 'mal')
    setAciertos((a) => a + (ok ? 1 : 0))
    setCombo((c) => (ok ? c + 1 : 0))
    setRespuestas((r) => [...r, { i, texto: valor }])
  }

  function continuar() {
    if (i + 1 >= items.length) onFinish(pct(aciertos, items.length), { items: respuestas })
    else { setI(i + 1); setValor(''); setVeredicto(null) }
  }

  return (
    <Marco
      clave={i}
      top={<BarraSuperior hechos={i} total={items.length} combo={combo} onSalir={onSalir} />}
      pie={
        <Pie>
          <BotonCTA onClick={comprobar} disabled={!valor.trim() || Boolean(veredicto)}>Comprobar</BotonCTA>
        </Pie>
      }
      hoja={veredicto && (
        <HojaFeedback
          estado={veredicto}
          significado={veredicto === 'mal' ? item.respuesta : item.prompt}
          onContinuar={continuar}
        />
      )}
    >
      <Encabezado etiqueta={item.regla ?? etiqueta} icono={icono} titulo={titulo ?? 'Traduce esta oración'} />

      <Escena texto={item.prompt} lang={item.lang ?? 'en-US'} subrayado />

      {item.pista && <p className="ar-pista">💡 {item.pista}</p>}

      <Renglones lineas={2}>
        <input
          ref={inputRef} className={`ar-input ${veredicto ?? ''}`} value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && comprobar()}
          placeholder="Escribe aquí…" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          disabled={Boolean(veredicto)}
        />
      </Renglones>
    </Marco>
  )
}

// ── Contenido de una celda de "Emparejar": texto o imagen ──
// 17-emparejar-imagenes reutiliza esta misma primitiva con
// items { tipo:'imagen', contenido:'archivo.png' }. El resto de
// actividades sigue mandando texto plano y se ve exactamente igual.
function CeldaContenido({ item }) {
  if (item?.tipo === 'imagen') {
    return (
      <span className="ar-celda-media">
        <Sprite archivo={item.contenido} alt={item.alt ?? ''} emoji="🖼️" className="ar-celda-img" />
        {item.alt && <small>{item.alt}</small>}
      </span>
    )
  }
  return item.contenido
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 3 — Emparejar dos columnas
// ════════════════════════════════════════════════════════════
function Emparejar({ izquierda, derecha, pares, penalizacion = 10, onFinish, onSalir }) {
  const [selIzq, setSelIzq] = useState(null)
  const [resueltos, setResueltos] = useState([])
  const [fallos, setFallos] = useState(0)
  const [intentos, setIntentos] = useState([])
  const [sacudida, setSacudida] = useState(null)
  const [listo, setListo] = useState(false)
  const mapa = useMemo(() => Object.fromEntries(pares.map((p) => [p.izquierda, p.derecha])), [pares])

  function tocarDerecha(idDer) {
    if (!selIzq || listo) return
    setIntentos((x) => [...x, { izq: selIzq, der: idDer }])
    if (mapa[selIzq] === idDer) {
      const nuevos = [...resueltos, selIzq]
      setResueltos(nuevos); setSelIzq(null)
      if (nuevos.length === pares.length) setTimeout(() => setListo(true), 350)
    } else {
      setFallos((f) => f + 1); setSacudida(idDer); setSelIzq(null)
      setTimeout(() => setSacudida(null), 400)
    }
  }

  const hechoIzq = (id) => resueltos.includes(id)
  const hechoDer = (id) => resueltos.some((l) => mapa[l] === id)
  const puntaje = Math.max(0, 100 - fallos * penalizacion)

  return (
    <Marco
      top={<BarraSuperior hechos={resueltos.length} total={pares.length} onSalir={onSalir} />}
      pie={
        <Pie>
          <BotonCTA disabled={!listo} onClick={() => onFinish(puntaje, { intentos })}>
            Comprobar
          </BotonCTA>
        </Pie>
      }
      hoja={listo && (
        <HojaFeedback
          estado={fallos === 0 ? 'ok' : 'mal'}
          titulo={fallos === 0 ? '¡Buen trabajo!' : 'Pares completados'}
          significado={`${pares.length} pares · ${fallos} error(es)`}
          onContinuar={() => onFinish(puntaje, { intentos })}
        />
      )}
    >
      <Encabezado etiqueta="Vocabulario" icono="⇄" titulo="Selecciona los pares" />

      <div className="ar-columnas">
        <div className="ar-col">
          {izquierda.map((it) => (
            <button key={it.id} disabled={hechoIzq(it.id)}
              className={`ar-celda ${selIzq === it.id ? 'sel' : ''} ${hechoIzq(it.id) ? 'hecho' : ''}`}
              onClick={() => setSelIzq(it.id)}>
              <CeldaContenido item={it} />
            </button>
          ))}
        </div>
        <div className="ar-col">
          {derecha.map((it) => (
            <button key={it.id} disabled={hechoDer(it.id)}
              className={`ar-celda ${hechoDer(it.id) ? 'hecho' : ''} ${sacudida === it.id ? 'sacude' : ''}`}
              onClick={() => tocarDerecha(it.id)}>
              <CeldaContenido item={it} />
            </button>
          ))}
        </div>
      </div>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 4 — Ordenar pasos (renglones + banco de fichas)
// ════════════════════════════════════════════════════════════
function Ordenar({ pasos, ordenCorrecto, onFinish, onSalir }) {
  const [disponibles, setDisponibles] = useState(() => barajar(pasos))
  const [elegidos, setElegidos] = useState([])
  const [comprobado, setComprobado] = useState(null)

  function agregar(p) {
    if (comprobado != null) return
    setDisponibles((d) => d.filter((x) => x.id !== p.id))
    setElegidos((e) => [...e, p])
  }
  function quitar(p) {
    if (comprobado != null) return
    setElegidos((e) => e.filter((x) => x.id !== p.id))
    setDisponibles((d) => [...d, p])
  }
  function comprobar() {
    const aciertos = elegidos.filter((p, k) => p.id === ordenCorrecto[k]).length
    setComprobado(pct(aciertos, ordenCorrecto.length))
  }

  const ordenBueno = useMemo(
    () => ordenCorrecto.map((id) => pasos.find((p) => p.id === id)?.texto).filter(Boolean).join(' → '),
    [ordenCorrecto, pasos]
  )

  return (
    <Marco
      top={<BarraSuperior hechos={elegidos.length} total={pasos.length} onSalir={onSalir} />}
      pie={
        <Pie>
          <BotonCTA onClick={comprobar} disabled={elegidos.length !== pasos.length || comprobado != null}>
            Comprobar
          </BotonCTA>
        </Pie>
      }
      hoja={comprobado != null && (
        <HojaFeedback
          estado={comprobado === 100 ? 'ok' : 'mal'}
          significado={comprobado === 100 ? null : ordenBueno}
          detalle={`Puntaje: ${comprobado}/100`}
          onContinuar={() => onFinish(comprobado, { orden: elegidos.map((p) => p.id) })}
        />
      )}
    >
      <Encabezado etiqueta="Nuevo patrón" icono="≡" titulo="Ordena los pasos" />

      <div className="ar-renglones ar-renglones-lista">
        <ol className="ar-elegidos">
          {elegidos.map((p, k) => {
            const estado = comprobado == null ? '' : (p.id === ordenCorrecto[k] ? 'ok' : 'mal')
            return (
              <li key={p.id} className={estado}>
                <button type="button" onClick={() => quitar(p)} disabled={comprobado != null}
                  aria-label={`Quitar "${p.texto}" del orden`}>
                  {p.texto}
                </button>
              </li>
            )
          })}
        </ol>
        {elegidos.length === 0 && <p className="ar-vacio">Toca las fichas en el orden correcto</p>}
        <div className="ar-renglon" />
      </div>

      <div className="ar-fichas">
        {disponibles.map((p) => (
          <button key={p.id} className="ar-ficha" onClick={() => agregar(p)}>{p.texto}</button>
        ))}
      </div>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 5 — Sopa de letras
// ════════════════════════════════════════════════════════════
function Sopa({ palabras, filas, columnas, direcciones, onFinish, onSalir }) {
  // La cuadrícula se dibuja aquí, de forma determinística: Gemini solo
  // eligió las palabras, así que la sopa siempre es válida.
  const { grid, placements } = useMemo(
    () => buildWordSearchGrid(palabras, filas, columnas, direcciones),
    [palabras, filas, columnas, direcciones]
  )
  const [encontradas, setEncontradas] = useState([])
  const [seleccion, setSeleccion] = useState([])
  const [arrastrando, setArrastrando] = useState(false)
  const [listo, setListo] = useState(false)
  // Selección por teclado/tap: primer Enter/click marca el inicio,
  // el segundo (en línea recta con el primero) cierra la palabra —
  // alternativa completa al arrastre con mouse/dedo, que por sí solo
  // no se puede operar con teclado (WCAG 2.1.1).
  const [inicioClic, setInicioClic] = useState(null)

  const clave = (r, c) => `${r},${c}`
  const celdasHalladas = useMemo(() => {
    const s = new Set()
    for (const w of placements) {
      if (!encontradas.includes(w.palabra)) continue
      for (const [r, c] of w.celdas) s.add(clave(r, c))
    }
    return s
  }, [encontradas, placements])

  /** Intenta cerrar una palabra con las celdas dadas (en cualquier sentido). */
  function intentarPalabra(celdas) {
    const texto = celdas.map(([r, c]) => grid[r][c]).join('')
    const alReves = [...texto].reverse().join('')
    const hallada = placements.find(
      (w) => !encontradas.includes(w.palabra) && (w.palabra === texto || w.palabra === alReves)
    )
    if (hallada) {
      const nuevas = [...encontradas, hallada.palabra]
      setEncontradas(nuevas)
      if (nuevas.length === placements.length) setTimeout(() => setListo(true), 350)
    }
  }

  function terminarSeleccion() {
    if (!arrastrando) return
    setArrastrando(false)
    intentarPalabra(seleccion)
    setSeleccion([])
  }

  /** Celdas en línea recta (horizontal/vertical/diagonal) entre dos puntos, inclusive. */
  function lineaEntre([r1, c1], [r2, c2]) {
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1)
    if (r1 !== r2 && c1 !== c2 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return null // no alineadas
    const pasos = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1))
    return Array.from({ length: pasos + 1 }, (_, i) => [r1 + dr * i, c1 + dc * i])
  }

  function activarCelda(r, c) {
    if (arrastrando) return // ya lo maneja el arrastre con mouse/dedo
    if (!inicioClic) { setInicioClic([r, c]); return }
    if (inicioClic[0] === r && inicioClic[1] === c) { setInicioClic(null); return } // deselecciona
    const linea = lineaEntre(inicioClic, [r, c])
    if (linea) intentarPalabra(linea)
    setInicioClic(linea ? null : [r, c]) // sin alinear: esta celda pasa a ser el nuevo inicio
  }

  const enSeleccion = (r, c) => seleccion.some(([a, b]) => a === r && b === c)
    || (inicioClic && inicioClic[0] === r && inicioClic[1] === c)
  const puntaje = pct(encontradas.length, placements.length)
  // La cuadrícula es aleatoria y alguna palabra puede no entrar: el
  // servidor solo califica sobre las que sí quedaron colocadas.
  const respuestas = { encontradas, colocadas: placements.map((p) => p.palabra) }

  return (
    <Marco
      top={<BarraSuperior hechos={encontradas.length} total={placements.length} onSalir={onSalir} />}
      pie={
        <Pie secundario={
          <button className="ar-enlace" onClick={() => onFinish(puntaje, respuestas)}>
            Terminar ahora
          </button>
        }>
          <BotonCTA disabled={!listo} onClick={() => onFinish(100, respuestas)}>Comprobar</BotonCTA>
        </Pie>
      }
      hoja={listo && (
        <HojaFeedback
          estado="ok"
          significado={`Encontraste las ${placements.length} palabras`}
          onContinuar={() => onFinish(100, respuestas)}
        />
      )}
    >
      <Encabezado etiqueta="Vocabulario" icono="⌗" titulo="Encuentra las palabras" />
      <p className="ar-instruccion-teclado">
        Arrastra de la primera a la última letra — o, con teclado, muévete con Tab y
        presiona Enter en la primera letra y de nuevo en la última.
      </p>

      {/* --cols/--filas: la vista de PC dimensiona el tablero según su forma (ActivityRunner.css) */}
      <div className="ar-grid" style={{ gridTemplateColumns: `repeat(${columnas}, 1fr)`, '--cols': columnas, '--filas': grid.length }}
        onPointerUp={terminarSeleccion} onPointerLeave={() => arrastrando && terminarSeleccion()}>
        {grid.map((fila, r) => fila.map((letra, c) => {
          const marcada = enSeleccion(r, c)
          return (
            <button key={`${r}-${c}`} type="button"
              className={`ar-celda-sopa ${celdasHalladas.has(clave(r, c)) ? 'hallada' : ''} ${marcada ? 'sel' : ''}`}
              onPointerDown={() => { setArrastrando(true); setSeleccion([[r, c]]) }}
              onPointerEnter={() => arrastrando && setSeleccion((s) => [...s, [r, c]])}
              onClick={() => activarCelda(r, c)}
              aria-pressed={marcada}
              aria-label={`Fila ${r + 1}, columna ${c + 1}: ${letra}`}>
              {letra}
            </button>
          )
        }))}
      </div>

      <div className="ar-lista-palabras">
        {placements.map((p) => (
          <span key={p.palabra} className={encontradas.includes(p.palabra) ? 'hallada' : ''}>{p.palabra}</span>
        ))}
      </div>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 6 — Producción libre (la corrige el docente)
// ════════════════════════════════════════════════════════════
function Libre({ consigna, contexto, minimo = 40, criterios = [], onFinish, onSalir }) {
  const [texto, setTexto] = useState('')
  const palabras = texto.trim() ? texto.trim().split(/\s+/).length : 0
  const suficiente = palabras >= minimo

  return (
    <Marco
      top={<BarraSuperior hechos={Math.min(palabras, minimo)} total={minimo} onSalir={onSalir} />}
      pie={
        <Pie secundario={
          <p className={`ar-contador ${suficiente ? 'ok' : ''}`}>{palabras} / {minimo} palabras</p>
        }>
          <BotonCTA disabled={!suficiente} onClick={() => onFinish(null, { texto, palabras })}>
            Entregar
          </BotonCTA>
        </Pie>
      }
    >
      <Encabezado etiqueta="Redacción" icono="✎" titulo="Escribe tu respuesta" />

      <div className="ar-panel">
        {contexto && <p className="ar-panel-fila ar-contexto">📍 {contexto}</p>}
        <p className="ar-panel-fila activa">{consigna}</p>
      </div>

      <textarea className="ar-textarea" value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="Write your answer in English…" rows={8} />

      {criterios.length > 0 && (
        <ul className="ar-criterios">
          {criterios.map((c) => <li key={c.id}>{c.nombre} · {c.peso}%</li>)}
        </ul>
      )}
      <p className="ar-aviso">Al entregar, una IA revisa dos cosas: que tu texto encaje en la situación y que esté bien escrito. Tu profesor confirma la nota.</p>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 13 — Letra con huecos (canción, actividad 10)
// ════════════════════════════════════════════════════════════
// Suena la canción (YouTube / Spotify / URL) y el estudiante escribe
// las palabras que faltan. Si la letra es sincronizada, se resalta el
// verso que suena y se puede saltar a un verso tocándolo. "Comprobar"
// compara con la letra original (sin mayúsculas, tildes ni signos,
// igual que el servidor) y muestra la nota y los errores.
const normalizarPalabra = (x) => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[’‘`´]/g, "'").toLowerCase().replace(/[^a-z0-9']/g, '')

function LetraConHuecos({ cancion, audio, lineas, huecos, onFinish, onSalir }) {
  const [escritos, setEscritos] = useState({})
  const [revisado, setRevisado] = useState(false)
  const [t, setT] = useState(0)
  const [desfase, setDesfase] = useState(0)
  const reproductor = useRef(null)
  const refsVerso = useRef({})
  const sincronizada = lineas.some((l) => l.t != null)
  const actual = sincronizada ? versoActual(lineas, t, desfase) : -1

  // El verso que suena queda a la vista (sin pelear con el que escribe).
  useEffect(() => {
    if (actual < 0 || revisado) return
    const el = refsVerso.current[actual]
    if (el && !el.contains(document.activeElement)) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [actual, revisado])

  const llenos = huecos.filter((h) => (escritos[h.id] ?? '').trim()).length
  const correcto = (h) => normalizarPalabra(escritos[h.id]) === normalizarPalabra(h.respuesta)
  const aciertos = huecos.filter(correcto).length
  const puntaje = pct(aciertos, huecos.length)
  const porId = Object.fromEntries(huecos.map((h) => [h.id, h]))

  return (
    <Marco
      top={<BarraSuperior hechos={revisado ? aciertos : llenos} total={huecos.length} onSalir={onSalir} />}
      pie={
        <Pie secundario={<p className="ar-contador">{llenos} / {huecos.length} palabras</p>}>
          <BotonCTA disabled={revisado || llenos === 0} onClick={() => { setRevisado(true); reproductor.current?.pause() }}>Comprobar</BotonCTA>
        </Pie>
      }
      hoja={revisado && (
        <HojaFeedback
          estado={puntaje >= 60 ? 'ok' : 'mal'}
          titulo={`${aciertos} de ${huecos.length} correctas · ${puntaje}%`}
          detalle={aciertos < huecos.length ? 'En la letra quedaron marcadas en rojo, con la palabra original al lado.' : '¡Completaste toda la letra!'}
          onContinuar={() => onFinish(puntaje, { huecos: escritos })}
        />
      )}
    >
      <Encabezado etiqueta="Canción" icono="🎤" titulo="Escucha y completa la letra" />
      <ReproductorCancion ref={reproductor} audio={audio} onTiempo={setT} compacto />
      {sincronizada && (
        <div className="ar-desfase">
          <small>¿La letra va adelantada o atrasada?</small>
          <button type="button" onClick={() => setDesfase((d) => d - 0.5)} aria-label="Retrasar la letra medio segundo">−0,5 s</button>
          <span>{desfase > 0 ? '+' : ''}{desfase.toFixed(1)} s</span>
          <button type="button" onClick={() => setDesfase((d) => d + 0.5)} aria-label="Adelantar la letra medio segundo">+0,5 s</button>
        </div>
      )}

      <ol className="ar-letra" aria-label={`Letra de ${cancion?.titulo ?? 'la canción'}`}>
        {lineas.map((l, i) => (
          <li key={l.id} ref={(el) => { refsVerso.current[i] = el }} className={i === actual ? 'sonando' : ''}>
            {l.t != null && (
              <button type="button" className="ar-letra-ir" onClick={() => reproductor.current?.irA(Math.max(0, l.t - desfase - 0.3))}
                aria-label={`Escuchar desde el verso ${i + 1}`} title="Escuchar desde aquí">▶</button>
            )}
            <span className="ar-letra-texto">
              {l.partes.map((p, k) => {
                if (!p.hueco) return <span key={k}>{p.texto}</span>
                const h = porId[p.hueco]
                const ok = revisado && correcto(h)
                return (
                  <span key={k} className="ar-hueco-caja">
                    <input
                      className={`ar-hueco ${revisado ? (ok ? 'ok' : 'mal') : ''}`}
                      value={escritos[p.hueco] ?? ''}
                      onChange={(e) => setEscritos((x) => ({ ...x, [p.hueco]: e.target.value }))}
                      readOnly={revisado}
                      size={Math.max(3, (h?.respuesta?.length ?? 4) + 1)}
                      maxLength={40}
                      autoCapitalize="off" autoCorrect="off" spellCheck={false}
                      aria-label={`Palabra que falta en el verso ${i + 1}`}
                    />
                    {revisado && !ok && <small className="ar-hueco-correcta">{h?.respuesta}</small>}
                  </span>
                )
              })}
            </span>
          </li>
        ))}
      </ol>
      {!sincronizada && <p className="ar-aviso">Esta letra no trae tiempos: sigue la canción con el oído.</p>}
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 14 — Indicaciones en el mapa de La Paz (07)
// ════════════════════════════════════════════════════════════
// En cada esquina, 3 opciones. Modo "seguir": te dan la indicación en
// inglés (se puede escuchar) y eliges qué entendiste. Modo "dar": el
// mapa muestra por dónde sigue la ruta y eliges la frase en inglés que
// le dices al conductor. Después de COMPROBAR, el auto maneja el tramo
// (siempre por la ruta correcta) y llega a la siguiente esquina.
const FLECHA = { izquierda: '↰', derecha: '↱', recto: '↑', llegar: '🏁' }

function Direcciones({ modo = 'seguir', destino = {}, guia, intro, pasos, llegada, mapa, onFinish, onSalir }) {
  const [i, setI] = useState(0)
  const [elegida, setElegida] = useState(null)
  const [revisado, setRevisado] = useState(false)
  const [manejando, setManejando] = useState(false)
  const [fin, setFin] = useState(false)
  const [aciertos, setAciertos] = useState(0)
  const [respuestas, setRespuestas] = useState([])
  const dar = modo === 'dar'
  const paso = pasos[i]
  const correcta = paso?.opciones.find((o) => o.correcta)
  const acerto = elegida?.correcta === true

  // La indicación se escucha sola al llegar a cada esquina (modo seguir)
  useEffect(() => {
    if (!dar && paso && !manejando && !fin) hablar(paso.instruccion)
  }, [i, dar, manejando, fin, paso])

  function comprobar() {
    setRevisado(true)
    if (acerto) setAciertos((n) => n + 1)
    setRespuestas((r) => [...r, { i, opcion: elegida.texto }])
  }
  function continuar() {
    setRevisado(false); setElegida(null); setManejando(true)
  }
  function llegoTramo() {
    setManejando(false)
    if (i + 1 >= pasos.length) { setFin(true); if (llegada) hablar(llegada) }
    else setI(i + 1)
  }

  return (
    <Marco
      top={<BarraSuperior hechos={fin ? pasos.length : i} total={pasos.length} onSalir={onSalir} />}
      pie={
        <Pie>
          {fin
            ? <BotonCTA onClick={() => onFinish(pct(aciertos, pasos.length), { items: respuestas })}>Terminar</BotonCTA>
            : <BotonCTA disabled={!elegida || revisado || manejando} onClick={comprobar}>{manejando ? 'Manejando…' : 'Comprobar'}</BotonCTA>}
        </Pie>
      }
      hoja={revisado && (
        <HojaFeedback
          estado={acerto ? 'ok' : 'mal'}
          titulo={acerto ? '¡Por ahí es!' : 'Por ahí no era'}
          significado={acerto ? null : correcta?.texto}
          detalle={dar && !acerto ? `Mira la flecha del mapa: el auto va ${correcta?.accion === 'llegar' ? 'a llegar' : `a la ${correcta?.accion}`}.` : null}
          onContinuar={continuar}
          textoBoton="Manejar"
        />
      )}
    >
      <Encabezado etiqueta={dar ? 'Da indicaciones' : 'Sigue las indicaciones'} icono="🚗"
        titulo={dar ? `Guía al conductor hasta ${destino.nombre}` : `Llega a ${destino.nombre}`} />
      {destino.motivo && i === 0 && !manejando && <p className="ar-mapa-motivo">📍 {destino.motivo}</p>}

      <Suspense fallback={<div className="mapa-ciudad mapa-cargando">Cargando el mapa de La Paz…</div>}>
        <MapaCiudad mapa={mapa} paso={i} conducir={manejando} verRuta={dar && !manejando && !fin}
          destino={destino} onLlego={llegoTramo} />
      </Suspense>

      {fin ? (
        <div className="ar-globo ar-mapa-llegada">🏁 <span>{llegada ?? `You arrived at ${destino.nombre}!`}</span></div>
      ) : (<>
        {i === 0 && intro && <p className="ar-mapa-intro">{intro}</p>}
        <div className="ar-escena">
          <div className="ar-globo">
            {!dar && <button className="ar-altavoz" onClick={() => hablar(paso.instruccion)} aria-label="Escuchar la indicación">🔊</button>}
            <span>{guia && <strong>{guia}: </strong>}{paso.instruccion}</span>
          </div>
        </div>
        <div className="ar-opciones ar-mapa-opciones" role="radiogroup" aria-label={dar ? '¿Qué le dices?' : '¿Qué entendiste?'}>
          {paso.opciones.map((o, k) => {
            const estado = revisado ? (o === elegida ? (o.correcta ? 'ok' : 'mal') : 'gris') : o === elegida ? 'sel' : ''
            return (
              <button key={k} type="button" role="radio" aria-checked={o === elegida}
                className={`ar-opcion ${estado}`} disabled={revisado || manejando}
                onClick={() => setElegida(o)}>
                {!dar && <span className="ar-mapa-flecha" aria-hidden="true">{FLECHA[o.accion] ?? '•'}</span>}
                {o.texto}
              </button>
            )
          })}
        </div>
      </>)}
    </Marco>
  )
}

// ── Referencia de pronunciación (sin puntaje) ──────────────
function Pronunciacion({ items, onFinish, onSalir }) {
  const [vistos, setVistos] = useState([])

  return (
    <Marco
      top={<BarraSuperior hechos={vistos.length} total={items.length} onSalir={onSalir} />}
      pie={
        <Pie>
          <BotonCTA onClick={() => onFinish(100, { revisado: true })}>Listo</BotonCTA>
        </Pie>
      }
    >
      <Encabezado etiqueta="Pronunciación" icono="🔊" titulo="Repite lo que escuchas" />

      <div className="ar-pron">
        {items.map((it) => (
          <div key={it.id} className="ar-pron-item">
            <div className="ar-escena">
              <div className="ar-globo">
                <button className="ar-altavoz"
                  onClick={() => { hablar(it.palabra); setVistos((v) => v.includes(it.id) ? v : [...v, it.id]) }}
                  aria-label={`Escuchar ${it.palabra}`}>🔊</button>
                <button className="ar-altavoz ar-lento"
                  onClick={() => hablar(it.palabra, 'en-US', 0.55)} aria-label="Escuchar despacio">🐢</button>
                <span className="ar-punteado">{it.palabra}</span>
              </div>
            </div>
            <div className="ar-silabas">
              {(it.silabas ?? []).map((s, k) => (
                <span key={k} className={k === it.acento ? 'acento' : ''}>{s}</span>
              ))}
            </div>
            {it.ipa && <code>{it.ipa}</code>}
            {it.consejo && <p className="ar-pista">{it.consejo}</p>}
          </div>
        ))}
      </div>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 7 — Laberinto de palabras (15-laberinto-palabras)
// ════════════════════════════════════════════════════════════
// Estilo Helltaker: cuadrícula construida por wordmaze.js. Hay que
// pisar cada palabra en el orden de la oración, con pasos y tiempo
// limitados por piso. Tocar una palabra distractora, o quedarse sin
// pasos/tiempo, cuesta una vida y pasa al piso siguiente (regla
// única para ambos casos: mantiene el juego avanzando sin trabar al
// estudiante). Sin vidas, se cierra la actividad.
function Laberinto({ niveles, vidasIniciales = 3, tiempoPorNivel = 40, onFinish, onSalir }) {
  const [nivelIdx, setNivelIdx] = useState(0)
  const [vidas, setVidas] = useState(vidasIniciales)
  const [completados, setCompletados] = useState(0)
  const [pisos, setPisos] = useState([]) // true/false por cada piso ya jugado
  const [siguienteObjetivo, setSiguienteObjetivo] = useState(0)
  const [tiempoRestante, setTiempoRestante] = useState(tiempoPorNivel)
  const [fase, setFase] = useState('jugando') // jugando | piso_ok | piso_perdido | fin
  const [mensajeFin, setMensajeFin] = useState(null)

  const nivel = niveles[nivelIdx]
  const mapa = useMemo(() => (nivel ? construirLaberinto(nivel) : null), [nivel])
  const [pos, setPos] = useState(() => mapa?.inicio ?? { fila: 0, columna: 0 })
  const [pasosRestantes, setPasosRestantes] = useState(() => mapa?.presupuestoPasos ?? 0)
  // El personaje mira hacia donde se movió y camina mientras se desliza a la casilla.
  const [direccion, setDireccion] = useState('abajo')
  const [caminando, setCaminando] = useState(false)
  const pasoTimer = useRef(null)
  const moverRef = useRef(null)

  // Flechas / WASD: un paso por tecla (además de tocar la casilla).
  useEffect(() => {
    const TECLAS = { ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0], ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
      ArrowLeft: [0, -1], a: [0, -1], A: [0, -1], ArrowRight: [0, 1], d: [0, 1], D: [0, 1] }
    const alPresionar = (e) => {
      const d = TECLAS[e.key]
      if (!d || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return
      e.preventDefault()
      moverRef.current?.(d)
    }
    window.addEventListener('keydown', alPresionar)
    return () => { window.removeEventListener('keydown', alPresionar); clearTimeout(pasoTimer.current) }
  }, [])

  // Reinicia el piso cada vez que cambia de nivel
  useEffect(() => {
    if (!mapa) return
    setPos(mapa.inicio)
    setDireccion('abajo'); setCaminando(false)
    setPasosRestantes(mapa.presupuestoPasos)
    setSiguienteObjetivo(0)
    setTiempoRestante(tiempoPorNivel)
    setFase('jugando')
    setMensajeFin(null)
  }, [nivelIdx, mapa, tiempoPorNivel])

  // Reloj del piso: si llega a 0 se trata igual que quedarse sin pasos.
  useEffect(() => {
    if (fase !== 'jugando') return
    if (tiempoRestante <= 0) { perderVida('Se acabó el tiempo de este piso.'); return }
    const id = setTimeout(() => setTiempoRestante((t) => t - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, tiempoRestante])

  if (!nivel || !mapa) return null

  function terminarConPuntaje(pisosFinales) {
    onFinish(pct(pisosFinales.filter(Boolean).length, niveles.length), { pisos: pisosFinales })
  }

  function avanzarNivel(gano) {
    const nuevosPisos = [...pisos, gano]
    setPisos(nuevosPisos)
    setCompletados(nuevosPisos.filter(Boolean).length)
    if (nivelIdx + 1 >= niveles.length) terminarConPuntaje(nuevosPisos)
    else setNivelIdx((n) => n + 1)
  }

  function perderVida(motivo) {
    const vidasNuevas = vidas - 1
    setVidas(vidasNuevas)
    setMensajeFin(motivo)
    setFase(vidasNuevas <= 0 ? 'fin' : 'piso_perdido')
  }

  function moverA(fila, columna) {
    if (fase !== 'jugando') return
    if (Math.abs(fila - pos.fila) + Math.abs(columna - pos.columna) !== 1) return // solo 1 casilla ortogonal
    const tipo = mapa.tipos[fila]?.[columna]
    if (!tipo || tipo === 'obstaculo') return

    const pasos = pasosRestantes - 1
    setDireccion(direccionDe(fila - pos.fila, columna - pos.columna))
    setCaminando(true)
    clearTimeout(pasoTimer.current)
    pasoTimer.current = setTimeout(() => setCaminando(false), 300)
    setPos({ fila, columna })
    setPasosRestantes(pasos)

    if (tipo === 'distractor') { perderVida('Pisaste una palabra que no es de la oración.'); return }

    if (tipo === 'objetivo') {
      const objetivo = mapa.objetivos.find((o) => o.fila === fila && o.columna === columna)
      if (objetivo && objetivo.indice === siguienteObjetivo) {
        const nuevoSiguiente = siguienteObjetivo + 1
        setSiguienteObjetivo(nuevoSiguiente)
        if (nuevoSiguiente >= mapa.objetivos.length) { setFase('piso_ok'); setMensajeFin('¡Oración completa!'); return }
      }
    }
    if (pasos <= 0) perderVida('Te quedaste sin pasos.')
  }

  moverRef.current = ([df, dc]) => moverA(pos.fila + df, pos.columna + dc)

  const oracionParcial = mapa.objetivos.map((o, i) => (i < siguienteObjetivo ? o.palabra : '▢')).join(' ')
  const esUltimoPiso = nivelIdx + 1 >= niveles.length

  return (
    <Marco
      clave={nivelIdx}
      top={<BarraSuperior hechos={completados} total={niveles.length} onSalir={onSalir} />}
      pie={
        <Pie secundario={
          <button className="ar-enlace" onClick={() => terminarConPuntaje(pisos)}>
            Terminar ahora
          </button>
        } />
      }
      hoja={fase !== 'jugando' && (
        <HojaFeedback
          estado={fase === 'piso_ok' ? 'ok' : 'mal'}
          titulo={fase === 'fin' ? 'Sin vidas — fin del juego' : (fase === 'piso_ok' ? '¡Oración completa!' : 'Piso perdido')}
          significado={mensajeFin}
          detalle={fase !== 'fin' ? `Oración: ${nivel.oracion}` : null}
          textoBoton={fase === 'fin' ? 'Ver resultado' : (esUltimoPiso ? 'Terminar' : 'Siguiente piso')}
          onContinuar={() => (fase === 'fin' ? terminarConPuntaje([...pisos, false]) : avanzarNivel(fase === 'piso_ok'))}
        />
      )}
    >
      <Encabezado etiqueta={`Piso ${nivelIdx + 1} de ${niveles.length}`} icono="🗼" titulo="Recorre la oración en orden" />

      <div className="lab-hud">
        <span className="lab-hud-item" title="Vidas">
          {'❤️'.repeat(Math.max(0, vidas))}{'🖤'.repeat(Math.max(0, vidasIniciales - vidas))}
        </span>
        <span className="lab-hud-item" title="Pasos restantes">👣 {Math.max(0, pasosRestantes)}</span>
        <span className={`lab-hud-item ${tiempoRestante <= 10 ? 'urgente' : ''}`} title="Tiempo restante">⏱ {tiempoRestante}s</span>
      </div>

      <p className="lab-oracion">{oracionParcial}<span className="lab-traduccion"> — {nivel.traduccion}</span></p>

      <div className="lab-grid" style={{
        gridTemplateColumns: `repeat(${mapa.columnas}, 1fr)`,
        '--cols': mapa.columnas, '--filas': mapa.tipos.length,
      }}>
        {mapa.tipos.map((filaCeldas, r) => filaCeldas.map((tipo, c) => {
          const esPersonaje = pos.fila === r && pos.columna === c
          const objetivo = tipo === 'objetivo' ? mapa.objetivos.find((o) => o.fila === r && o.columna === c) : null
          const distractor = tipo === 'distractor' ? mapa.distractoresColocados.find((o) => o.fila === r && o.columna === c) : null
          const hallado = objetivo && objetivo.indice < siguienteObjetivo
          return (
            <button key={`${r}-${c}`} type="button"
              className={`lab-celda lab-${tipo} ${esPersonaje ? 'con-personaje' : ''} ${hallado ? 'hallado' : ''}`}
              disabled={fase !== 'jugando'} onClick={() => moverA(r, c)}>
              {tipo === 'obstaculo' && <Sprite archivo="obstaculo.png" emoji="🧱" alt="obstáculo" />}
              {objetivo && <span className="lab-palabra">{objetivo.palabra}</span>}
              {distractor && <span className="lab-palabra lab-palabra-trampa">{distractor.palabra}</span>}
            </button>
          )
        }))}
        {/* El personaje va encima de la cuadrícula y se desliza entre casillas */}
        <div className="lab-caminante" style={{ '--c': pos.columna, '--f': pos.fila }}>
          <Caminante direccion={direccion} caminando={caminando} tamano="100%" fps={12} titulo="tú" />
        </div>
      </div>
      <p className="lab-ayuda">Toca una casilla vecina o usa las flechas del teclado.</p>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 8 — Rompecabezas de oración (16-rompecabezas-oracion)
// ════════════════════════════════════════════════════════════
// Igual esqueleto que "Ordenar", pero cada pieza trae un conector
// (forma + color) generado por sentencePuzzle.js: dos piezas
// consecutivas comparten conector en el borde que las une, como en
// un rompecabezas real — sin delatar la respuesta por sí solo, así
// que también hay que fijarse en la gramática de la oración.
function Rompecabezas({ rompecabezas, onFinish, onSalir }) {
  const [i, setI] = useState(0)
  const [disponibles, setDisponibles] = useState([])
  const [armadas, setArmadas] = useState([])
  const [comprobado, setComprobado] = useState(null)
  const [resueltos, setResueltos] = useState(0)
  const [respuestas, setRespuestas] = useState([])

  const item = rompecabezas[i]
  const piezas = useMemo(() => (item ? generarPiezas(item.piezas_en_orden) : []), [item])

  useEffect(() => {
    setDisponibles(barajar(piezas))
    setArmadas([])
    setComprobado(null)
  }, [i, piezas])

  if (!item) return null

  function agregar(p) {
    if (comprobado != null) return
    setDisponibles((d) => d.filter((x) => x.id !== p.id))
    setArmadas((a) => [...a, p])
  }
  function quitar(p) {
    if (comprobado != null) return
    setArmadas((a) => a.filter((x) => x.id !== p.id))
    setDisponibles((d) => [...d, p])
  }
  function comprobar() {
    const aciertos = armadas.filter((p, k) => p.indiceCorrecto === k).length
    const puntaje = pct(aciertos, piezas.length)
    setComprobado(puntaje)
    if (puntaje === 100) setResueltos((n) => n + 1)
    setRespuestas((r) => [...r, { i, piezas: armadas.map((p) => p.texto) }])
  }
  function continuar() {
    if (i + 1 >= rompecabezas.length) onFinish(pct(resueltos, rompecabezas.length), { items: respuestas })
    else setI((n) => n + 1)
  }

  return (
    <Marco
      clave={i}
      top={<BarraSuperior hechos={i} total={rompecabezas.length} onSalir={onSalir} />}
      pie={
        <Pie>
          {comprobado == null ? (
            <BotonCTA onClick={comprobar} disabled={armadas.length !== piezas.length}>Comprobar</BotonCTA>
          ) : (
            <BotonCTA tono={comprobado === 100 ? 'ok' : 'mal'} onClick={continuar}>
              {i + 1 >= rompecabezas.length ? 'Terminar' : 'Siguiente oración'}
            </BotonCTA>
          )}
        </Pie>
      }
    >
      <Encabezado etiqueta="Rompecabezas" icono="🧩" titulo="Arma la oración" />

      <div className="rc-tira">
        {armadas.length === 0 && <p className="ar-vacio">Toca las piezas en el orden correcto</p>}
        {armadas.map((p, k) => {
          const estado = comprobado == null ? '' : (p.indiceCorrecto === k ? 'ok' : 'mal')
          return <PiezaRompecabezas key={p.id} pieza={p} className={estado} onClick={() => quitar(p)} />
        })}
      </div>

      {comprobado != null && comprobado < 100 && <p className="ar-pista">💡 {item.oracion}</p>}
      <p className="ar-pista">🇪🇸 {item.traduccion}</p>

      <div className="rc-banco">
        {disponibles.map((p) => <PiezaRompecabezas key={p.id} pieza={p} onClick={() => agregar(p)} />)}
      </div>
    </Marco>
  )
}

function PiezaRompecabezas({ pieza, className = '', onClick }) {
  return (
    <button type="button" className={`rc-pieza ${className}`} onClick={onClick}>
      {pieza.conectorIzquierdo && (
        <span className="rc-conector" style={{ color: pieza.conectorIzquierdo.color }}>
          {GLIFO_FORMA[pieza.conectorIzquierdo.forma]}
        </span>
      )}
      <span className="rc-texto">{pieza.texto}</span>
      {pieza.conectorDerecho && (
        <span className="rc-conector" style={{ color: pieza.conectorDerecho.color }}>
          {GLIFO_FORMA[pieza.conectorDerecho.forma]}
        </span>
      )}
    </button>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 9 — Armar objetos en un escenario (18-armar-escenario)
// ════════════════════════════════════════════════════════════
// Sin agente/personaje: es una vista fija dentro del celular. Se
// selecciona un objeto de la bandeja y luego su zona (o el cesto de
// "no pertenece aquí" para los distractores).
const ZONA_DESCARTE = '__descartar__'

function ArmarEscenario({ escenarioInterior, objetos, onFinish, onSalir }) {
  const [colocados, setColocados] = useState({}) // { objetoId: zonaId | ZONA_DESCARTE }
  const [seleccionado, setSeleccionado] = useState(null)
  const [comprobado, setComprobado] = useState(null)

  const pendientes = objetos.filter((o) => !colocados[o.id])
  const listo = pendientes.length === 0
  const objetosEnZona = (zonaId) => objetos.filter((o) => colocados[o.id] === zonaId)

  function colocarEn(zonaId) {
    if (!seleccionado || comprobado != null) return
    setColocados((c) => ({ ...c, [seleccionado]: zonaId }))
    setSeleccionado(null)
  }
  function recoger(objetoId) {
    if (comprobado != null) return
    setColocados((c) => { const n = { ...c }; delete n[objetoId]; return n })
    setSeleccionado(objetoId)
  }
  function comprobar() {
    let ok = 0
    for (const o of objetos) {
      const correcto = o.zona_correcta == null ? ZONA_DESCARTE : o.zona_correcta
      if (colocados[o.id] === correcto) ok++
    }
    setComprobado(pct(ok, objetos.length))
  }

  return (
    <Marco
      top={<BarraSuperior hechos={objetos.length - pendientes.length} total={objetos.length} onSalir={onSalir} />}
      pie={<Pie>{comprobado == null && <BotonCTA onClick={comprobar} disabled={!listo}>Comprobar</BotonCTA>}</Pie>}
      hoja={comprobado != null && (
        <HojaFeedback
          estado={comprobado === 100 ? 'ok' : 'mal'}
          significado={`${comprobado}/100 · revisa los objetos marcados en rojo`}
          onContinuar={() => onFinish(comprobado, { colocados })}
        />
      )}
    >
      <Encabezado etiqueta="Escenografía" icono="🏠" titulo={`Arma: ${escenarioInterior?.nombre ?? 'la escena'}`} />

      <div className="ae-escena">
        <Sprite archivo={escenarioInterior?.imagen} emoji="🏠" className="ae-fondo" alt={escenarioInterior?.nombre} />
        <div className="ae-zonas">
          {/* La tarjeta de cada zona ya NO es un solo <button> gigante:
              adentro también hay chips clickeables para "devolver" un
              objeto, y un <button> no puede contener otro <button>
              (HTML inválido, y el lector de pantalla no sabría cuál de
              los dos activó). El botón de "colocar acá" queda en el
              encabezado; los chips son botones propios, hermanos, no
              anidados. */}
          {(escenarioInterior?.zonas ?? []).map((z) => (
            <div key={z.id}
              className={`ae-zona ${seleccionado ? 'activa' : ''} ${comprobado != null && objetosEnZona(z.id).length
                ? (objetosEnZona(z.id).every((o) => o.zona_correcta === z.id) ? 'ok' : 'mal') : ''}`}>
              <button type="button" className="ae-zona-titulo" onClick={() => colocarEn(z.id)} disabled={comprobado != null}>
                {z.nombre}
              </button>
              <span className="ae-zona-objetos">
                {objetosEnZona(z.id).map((o) => (
                  <button key={o.id} type="button" className="ae-chip" onClick={() => recoger(o.id)} disabled={comprobado != null}
                    aria-label={`Quitar ${o.nombre} de ${z.nombre}`}>
                    <Sprite archivo={o.imagen} emoji="📦" alt={o.nombre} />{o.nombre}
                  </button>
                ))}
              </span>
            </div>
          ))}
          <div className={`ae-zona ae-descarte ${seleccionado ? 'activa' : ''} ${comprobado != null && objetosEnZona(ZONA_DESCARTE).length
            ? (objetosEnZona(ZONA_DESCARTE).every((o) => o.zona_correcta == null) ? 'ok' : 'mal') : ''}`}>
            <button type="button" className="ae-zona-titulo" onClick={() => colocarEn(ZONA_DESCARTE)} disabled={comprobado != null}>
              🗑️ No pertenece aquí
            </button>
            <span className="ae-zona-objetos">
              {objetosEnZona(ZONA_DESCARTE).map((o) => (
                <button key={o.id} type="button" className="ae-chip" onClick={() => recoger(o.id)} disabled={comprobado != null}
                  aria-label={`Quitar ${o.nombre} de "No pertenece aquí"`}>
                  <Sprite archivo={o.imagen} emoji="📦" alt={o.nombre} />{o.nombre}
                </button>
              ))}
            </span>
          </div>
        </div>
      </div>

      <p className="ar-vacio">{seleccionado ? 'Toca la zona donde va' : 'Toca un objeto de la bandeja'}</p>

      <div className="ae-bandeja">
        {pendientes.map((o) => (
          <button key={o.id} type="button" className={`ae-objeto ${seleccionado === o.id ? 'sel' : ''}`}
            onClick={() => setSeleccionado(o.id)}>
            <Sprite archivo={o.imagen} emoji="📦" alt={o.nombre} />
            <small>{o.nombre}</small>
          </button>
        ))}
      </div>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 10 — Encuentra al impostor (19-impostor)
// ════════════════════════════════════════════════════════════
// Matriz fija de 3×2 (6 tarjetas: imagen + traducción). Una sola
// traducción está mal a propósito; el estudiante la señala.
function Impostor({ rondas, onFinish, onSalir }) {
  const [i, setI] = useState(0)
  const [elegida, setElegida] = useState(null)
  const [veredicto, setVeredicto] = useState(null)
  const [aciertos, setAciertos] = useState(0)
  const [respuestas, setRespuestas] = useState([])

  const ronda = rondas[i]
  if (!ronda) return null
  const impostor = ronda.tarjetas.find((t) => t.correcta === false)

  function elegir(t) {
    if (veredicto) return
    setElegida(t)
    const ok = t.correcta === false
    setVeredicto(ok ? 'ok' : 'mal')
    setAciertos((a) => a + (ok ? 1 : 0))
    setRespuestas((r) => [...r, { i, tarjeta: t.id }])
  }
  function continuar() {
    if (i + 1 >= rondas.length) onFinish(pct(aciertos, rondas.length), { items: respuestas })
    else { setI((n) => n + 1); setElegida(null); setVeredicto(null) }
  }

  return (
    <Marco
      clave={i}
      top={<BarraSuperior hechos={i} total={rondas.length} onSalir={onSalir} />}
      pie={<Pie secundario={<p className="ar-contador">Toca la tarjeta con la traducción incorrecta</p>} />}
      hoja={veredicto && (
        <HojaFeedback
          estado={veredicto}
          significado={`"${impostor.traduccion_mostrada}" no es la traducción de "${impostor.palabra_en}".`}
          textoBoton={i + 1 >= rondas.length ? 'Terminar' : 'Siguiente ronda'}
          onContinuar={continuar}
        />
      )}
    >
      <Encabezado etiqueta="Vocabulario" icono="🕵️" titulo="Una traducción está mal. ¿Cuál?" />

      <div className="imp-grid">
        {ronda.tarjetas.map((t) => {
          // Igual criterio que en Quiz: si el alumno erró, no se delata
          // cuál era la tarjeta impostora — solo se marca la que tocó.
          let estado = elegida === t ? 'sel' : ''
          if (veredicto) {
            if (t === elegida) estado = t.correcta === false ? 'ok' : 'mal'
            else estado = 'gris'
          }
          return (
            <button key={t.id} type="button" className={`imp-tarjeta ${estado}`}
              onClick={() => elegir(t)} disabled={Boolean(veredicto)}>
              <Sprite archivo={t.imagen} emoji="🖼️" alt={t.palabra_en} className="imp-img" />
              <span>{t.traduccion_mostrada}</span>
            </button>
          )
        })}
      </div>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  PRIMITIVA 11 — Tiro a la canasta (20-basquetbol)
// ════════════════════════════════════════════════════════════
// La palabra a traducir está en el tablero. Abajo hay 3 posiciones
// de tiro, cada una con una traducción posible. Al tocar una, el
// balón sale DESDE esa posición: si era la correcta entra al aro;
// si no, pega en el aro y se va hacia un lado.
//
// Coordenadas en % de la cancha (así no dependen del tamaño de
// pantalla). El vuelo es una curva de Bézier cuadrática muestreada
// en keyframes de la Web Animations API.
const BQ_ARO = { x: 50, y: 31 }          // centro del aro
const BQ_SPOTS = [18, 50, 82]            // x de las 3 posiciones de tiro
const BQ_SPOT_Y = 80
const BQ_DURACION = 1500                 // ms del tiro completo
const BQ_LLEGADA = 0.68                  // fracción del tiro en que el balón llega al aro

function bezier(p0, c, p2, t) {
  const u = 1 - t
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y }
}

/** Puntos (en %) del recorrido completo del balón: vuelo (fase 0) + caída/rebote (fase 1). */
function trayectoriaTiro(spotIdx, acierto) {
  const ini = { x: BQ_SPOTS[spotIdx], y: BQ_SPOT_Y - 6 }
  const pts = []
  if (acierto) {
    const fin = { x: BQ_ARO.x, y: BQ_ARO.y - 1 }
    const c = { x: (ini.x + fin.x) / 2, y: -14 }
    for (let k = 0; k <= 26; k++) pts.push({ ...bezier(ini, c, fin, k / 26), fase: 0 })
    // Cae a través de la red y se queda botando bajo el aro.
    for (const y of [36, 43, 52, 62, 70, 64, 70]) pts.push({ x: BQ_ARO.x, y, fase: 1 })
  } else {
    // Rebota en el lado del aro más cercano al tirador (el del centro, al azar).
    const lado = spotIdx === 0 ? -1 : spotIdx === 2 ? 1 : (Math.random() < 0.5 ? -1 : 1)
    const fin = { x: BQ_ARO.x + lado * 9, y: BQ_ARO.y - 2 }
    const c = { x: (ini.x + fin.x) / 2, y: -12 }
    for (let k = 0; k <= 26; k++) pts.push({ ...bezier(ini, c, fin, k / 26), fase: 0 })
    const salida = { x: BQ_ARO.x + lado * 58, y: 96 }
    const c2 = { x: BQ_ARO.x + lado * 30, y: 4 }
    for (let k = 1; k <= 14; k++) pts.push({ ...bezier(fin, c2, salida, k / 14), fase: 1 })
  }
  return pts
}

function Basquet({ tiros, onFinish, onSalir }) {
  const [i, setI] = useState(0)
  const [lanzado, setLanzado] = useState(null)     // índice de la posición elegida
  const [veredicto, setVeredicto] = useState(null)
  const [efecto, setEfecto] = useState(null)       // 'swish' | 'clank' al tocar el aro
  const [aciertos, setAciertos] = useState(0)
  const [combo, setCombo] = useState(0)
  const [respuestas, setRespuestas] = useState([])
  const canchaRef = useRef(null)
  const balonRef = useRef(null)
  const animRef = useRef(null)
  const timersRef = useRef([])

  const tiro = tiros[i]
  // Se baraja cada tiro una sola vez: la correcta no queda siempre en el mismo lado.
  const opciones = useMemo(() => (tiro ? barajar(tiro.opciones) : []), [tiro])

  const limpiarTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = [] }
  useEffect(() => () => { animRef.current?.cancel(); limpiarTimers() }, [])

  if (!tiro) return null
  const correcta = opciones.find((o) => o.correcta === true)

  function lanzar(idx) {
    if (lanzado !== null || veredicto) return
    const op = opciones[idx]
    const ok = op.correcta === true
    setLanzado(idx)

    const terminar = () => {
      setEfecto(ok ? 'swish' : 'clank')
      setVeredicto(ok ? 'ok' : 'mal')
      setAciertos((a) => a + (ok ? 1 : 0))
      setCombo((c) => (ok ? c + 1 : 0))
      setRespuestas((r) => [...r, { i, opcion: op.texto }])
    }

    const cancha = canchaRef.current, balon = balonRef.current
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!cancha || !balon?.animate || reducido) { terminar(); return }

    const { width: W, height: H } = cancha.getBoundingClientRect()
    const pts = trayectoriaTiro(idx, ok)
    const nVuelo = pts.filter((p) => p.fase === 0).length
    const nCaida = pts.length - nVuelo
    const frames = pts.map((p, k) => {
      const enVuelo = p.fase === 0
      // El balón "se aleja" (más chico) mientras viaja hacia el aro.
      const escala = enVuelo ? 1 - 0.32 * (k / (nVuelo - 1)) : 0.68
      return {
        transform: `translate(${(p.x / 100) * W}px, ${(p.y / 100) * H}px) translate(-50%, -50%) rotate(${k * 38}deg) scale(${escala})`,
        offset: enVuelo
          ? BQ_LLEGADA * (k / (nVuelo - 1))
          : BQ_LLEGADA + (1 - BQ_LLEGADA) * ((k - nVuelo + 1) / nCaida),
      }
    })
    balon.style.visibility = 'visible'
    animRef.current = balon.animate(frames, { duration: BQ_DURACION, easing: 'linear', fill: 'forwards' })
    // Justo cuando el balón llega al aro se dispara el efecto de red / aro.
    // Se usan temporizadores y no `onfinish`: el navegador solo despacha
    // los eventos de animación cuando pinta frames, y en una pestaña en
    // segundo plano eso puede no pasar — el tiro quedaría sin veredicto.
    timersRef.current = [
      setTimeout(() => setEfecto(ok ? 'swish' : 'clank'), BQ_DURACION * BQ_LLEGADA),
      setTimeout(terminar, BQ_DURACION),
    ]
  }

  function continuar() {
    animRef.current?.cancel()
    limpiarTimers()
    if (balonRef.current) balonRef.current.style.visibility = 'hidden'
    if (i + 1 >= tiros.length) {
      onFinish(pct(aciertos, tiros.length), { items: respuestas })
    } else {
      setI(i + 1); setLanzado(null); setVeredicto(null); setEfecto(null)
    }
  }

  const lang = tiro.idioma === 'en' ? 'en-US' : 'es-ES'

  return (
    <Marco
      clave={i}
      top={<BarraSuperior hechos={i} total={tiros.length} combo={combo} onSalir={onSalir} />}
      pie={<Pie secundario={<p className="ar-contador">Lanza desde la posición con la traducción correcta</p>} />}
      hoja={veredicto && (
        <HojaFeedback
          estado={veredicto}
          titulo={veredicto === 'ok' ? '¡Canasta!' : '¡Tiro fallado!'}
          significado={veredicto === 'mal' ? correcta?.texto : `${tiro.palabra} → ${correcta?.texto ?? ''}`}
          textoBoton={i + 1 >= tiros.length ? 'Terminar' : 'Siguiente tiro'}
          onContinuar={continuar}
        />
      )}
    >
      <Encabezado etiqueta="Básquet" icono="🏀" titulo="¿Desde dónde lanzas?" />

      <div className={`bq-cancha ${efecto ? `bq-${efecto}` : ''}`} ref={canchaRef}>
        <div className="bq-tablero">
          <span className="bq-palabra">{tiro.palabra}</span>
          <button type="button" className="bq-audio" onClick={() => hablar(tiro.palabra, lang)} aria-label="Escuchar">🔊</button>
        </div>
        <div className="bq-aro" aria-hidden="true">
          <span className="bq-red" />
          <span className="bq-aro-frente" />
        </div>
        <div className="bq-zona" aria-hidden="true" />

        {opciones.map((op, idx) => {
          let estado = ''
          if (lanzado === idx) estado = veredicto ? (op.correcta ? 'ok' : 'mal') : 'sel'
          else if (lanzado !== null) estado = 'gris'
          return (
            <button key={op.id} type="button" className={`bq-spot ${estado}`}
              style={{ left: `${BQ_SPOTS[idx]}%`, top: `${BQ_SPOT_Y}%` }}
              onClick={() => lanzar(idx)} disabled={lanzado !== null}>
              <span className={`bq-balon-quieto ${lanzado === idx ? 'oculto' : ''}`} aria-hidden="true" />
              <span className="bq-texto">{op.texto}</span>
            </button>
          )
        })}

        <span className="bq-balon" ref={balonRef} aria-hidden="true" />
        {efecto === 'swish' && <span className="bq-puntos" aria-hidden="true">+2</span>}
      </div>
    </Marco>
  )
}

// ════════════════════════════════════════════════════════════
//  NORMALIZADOR — esquema de Gemini → primitiva
//  Además de los datos, cada caso decide su ETIQUETA, ÍCONO,
//  TÍTULO y FORMATO de contexto ('chat' o 'panel').
// ════════════════════════════════════════════════════════════
function normalizar(codigo, d) {
  const meta = d?.actividad ?? {}
  const pen = meta.penalizacion_por_error ?? 10

  switch (codigo) {
    case '01-emparejar':
      return { tipo: 'emparejar', props: {
        izquierda: d.columna_izquierda.items,
        derecha: d.columna_derecha.items,
        pares: d.pares_correctos,
        penalizacion: pen,
      } }

    case '02-conversacion-completar': {
      const contexto = []
      const items = []
      for (const t of d.conversacion) {
        if (t.tipo === 'opciones') {
          items.push({
            enunciado: t.plantilla.replace('{blank}', '_____'),
            opciones: t.opciones, hasta: contexto.length,
          })
          contexto.push({ hablante: 'You', texto: t.plantilla.replace('{blank}', '…'), mio: true })
        } else {
          contexto.push({ hablante: t.hablante, texto: t.texto })
        }
      }
      return { tipo: 'quiz', props: {
        items, contexto, penalizacion: pen,
        formato: 'chat', etiqueta: 'Nuevo patrón', icono: '✦',
        titulo: 'Escoge la palabra que falta',
      } }
    }

    case '03-conversation-selection': {
      const contexto = []
      const items = []
      const preguntas = Object.fromEntries((d.preguntas ?? []).map((q) => [q.id, q]))
      for (const t of d.conversacion) {
        if (t.tipo === 'pregunta') {
          const q = preguntas[t.pregunta_id]
          if (q) items.push({ enunciado: '¿Qué respondes?', opciones: q.opciones, hasta: contexto.length })
        } else {
          contexto.push({ hablante: t.hablante, texto: t.texto })
        }
      }
      return { tipo: 'quiz', props: {
        items, contexto, penalizacion: pen,
        formato: 'chat', etiqueta: 'Conversación', icono: '💬',
        titulo: 'Elige la mejor respuesta',
      } }
    }

    case '04-sopa-letras': {
      const c = d.configuracion ?? {}
      return { tipo: 'sopa', props: {
        palabras: d.palabras, filas: c.filas ?? 12, columnas: c.columnas ?? 12,
        direcciones: c.direcciones ?? ['horizontal', 'vertical', 'diagonal'],
      } }
    }

    case '05-redaccion':
      return { tipo: 'libre', props: {
        consigna: d.consigna, contexto: d.contexto, minimo: d.minimo_palabras ?? 40, criterios: d.criterios ?? [],
      } }

    case '06-diccionario':
      return { tipo: 'escribir', props: {
        etiqueta: 'Palabra nueva', icono: '✦', titulo: 'Traduce esta oración',
        items: d.entradas.map((e) => ({
          prompt: e.contenido, lang: 'es-ES',
          significado: e.respuesta_correcta,
          respuesta: e.respuesta_correcta,
          alternativas: e.alternativas_aceptadas ?? [],
        })),
      } }

    case '07-direcciones':
      return { tipo: 'direcciones', props: {
        modo: d.modo, destino: d.destino ?? {}, guia: d.guia, intro: d.intro, pasos: d.pasos, llegada: d.llegada, mapa: d.mapa,
      } }

    // Formato anterior de la 07 (guía de pronunciación), de actividades ya guardadas
    case '07-pronunciacion':
      return { tipo: 'pronunciacion', props: { items: d.items } }

    case '08-inflexion': {
      const reglas = Object.fromEntries((d.reglas_mostradas ?? []).map((r) => [r.id, r]))
      return { tipo: 'escribir', props: {
        etiqueta: 'Nuevo patrón', icono: '◈', titulo: 'Completa la forma correcta',
        items: d.ejercicios.map((e) => ({
          prompt: e.tipo === 'completar'
            ? e.plantilla.replace('{blank}', '_____')
            : `${e.instruccion}: ${e.palabra_base}`,
          respuesta: e.respuesta_correcta, alternativas: [],
          regla: reglas[e.regla_id]?.titulo, pista: e.pista,
        })),
      } }
    }

    case '09-describir':
      return { tipo: 'quiz', props: {
        formato: 'chat', etiqueta: 'Describe', icono: '🖼️', titulo: null,
        items: d.items.map((it) => ({ enunciado: it.contenido, opciones: it.opciones })),
        penalizacion: pen,
      } }

    case '10-canciones':
      if (Array.isArray(d.huecos)) {
        return { tipo: 'cancion', props: {
          cabecera: { titulo: d.actividad?.titulo ?? d.cancion?.titulo },
          cancion: d.cancion, audio: d.audio, lineas: d.lineas, huecos: d.huecos,
        } }
      }
      // Formato anterior (letra inventada con opciones), de actividades ya guardadas
      return { tipo: 'quiz', props: {
        cabecera: d.cancion,
        formato: 'panel', etiqueta: 'Canción', icono: '🎤',
        titulo: 'Escoge la palabra que falta',
        items: d.lineas.map((l, idx) => ({
          enunciado: l.texto.replace('{blank}', '_____'),
          hasta: idx,
          opciones: barajar(l.opciones).map((o, k) => ({
            id: `${l.id}-${k}`, texto: o, correcta: o === l.respuesta_correcta,
          })),
        })),
        contexto: d.lineas.map((l) => ({
          texto: l.texto.replace('{blank}', l.respuesta_correcta), hablante: '♪',
        })),
        penalizacion: pen,
      } }

    case '11-indicaciones':
      return { tipo: 'ordenar', props: {
        pasos: d.pasos_desordenados, ordenCorrecto: d.orden_correcto,
      } }

    case '12-llamada':
    case '13-pedido': {
      const contexto = []
      const items = []
      for (const t of d.turnos) {
        if (t.tipo === 'opciones') {
          items.push({ enunciado: '¿Qué dices?', opciones: t.opciones, hasta: contexto.length })
          contexto.push({ hablante: 'You', texto: '…', mio: true })
        } else {
          contexto.push({ hablante: t.hablante === 'caller' ? (d.llamante?.nombre ?? 'Caller') : t.hablante, texto: t.texto })
        }
      }
      return { tipo: 'quiz', props: {
        items, contexto, penalizacion: pen,
        formato: 'chat', etiqueta: codigo === '12-llamada' ? 'Llamada' : 'Pedido',
        icono: codigo === '12-llamada' ? '📞' : '🍽️',
        titulo: 'Elige qué responder',
      } }
    }

    case '14-anuncios':
      return { tipo: 'quiz', props: {
        anuncio: d.anuncio,
        formato: 'panel', etiqueta: 'Escucha', icono: '🔊',
        titulo: 'Escucha y responde',
        items: d.preguntas.map((q) => ({ enunciado: q.texto, opciones: q.opciones })),
        penalizacion: pen,
      } }

    case '15-laberinto-palabras':
      return { tipo: 'laberinto', props: {
        niveles: d.niveles,
        vidasIniciales: d.vidas_iniciales ?? 3,
        tiempoPorNivel: d.tiempo_por_nivel ?? 40,
      } }

    case '16-rompecabezas-oracion':
      return { tipo: 'rompecabezas', props: { rompecabezas: d.rompecabezas } }

    case '17-emparejar-imagenes':
      // Reutiliza la primitiva "emparejar" de 01-emparejar: mismo shape,
      // solo que la columna izquierda puede traer tarjetas de imagen.
      return { tipo: 'emparejar', props: {
        izquierda: d.columna_izquierda.items,
        derecha: d.columna_derecha.items,
        pares: d.pares_correctos,
        penalizacion: pen,
      } }

    case '18-armar-escenario':
      return { tipo: 'armar-escenario', props: {
        escenarioInterior: d.escenario_interior,
        objetos: d.objetos,
      } }

    case '19-impostor':
      return { tipo: 'impostor', props: { rondas: d.rondas } }

    case '20-basquetbol':
      return { tipo: 'basquet', props: { tiros: d.tiros } }

    // Ronda de práctica de la pantalla final: solo lo que falló, armada
    // por el servidor (services/repaso.js). No se califica ni se guarda.
    case 'repaso':
      return { tipo: 'quiz', props: {
        items: d.items, formato: 'chat', etiqueta: 'Repaso', icono: '🔁',
        titulo: null, penalizacion: 0,
      } }

    default:
      return null
  }
}

// ════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function ActivityRunner({ codigo, contenido, onFinish, onSalir }) {
  const plan = useMemo(() => {
    try { return normalizar(codigo, contenido) } catch (e) { return { error: e.message } }
  }, [codigo, contenido])

  // El anuncio se lee en voz alta apenas se abre la actividad
  useEffect(() => {
    if (plan?.props?.anuncio?.texto) hablar(plan.props.anuncio.texto, plan.props.anuncio.voz)
    return () => window.speechSynthesis?.cancel()
  }, [plan])

  if (!plan || plan.error) {
    return (
      <div className="ar-shell">
        <div className="ar-cuerpo ar-error">
          <p>No se pudo mostrar la actividad <code>{codigo}</code>.</p>
          {plan?.error && <small>{plan.error}</small>}
        </div>
        <Pie><BotonCTA onClick={() => onFinish(0, { error: true })}>Saltar</BotonCTA></Pie>
      </div>
    )
  }

  const { tipo, props } = plan
  const comun = { ...props, onFinish, onSalir }

  return (
    <div className="ar-raiz">
      {/* Cintillos que van por encima del marco (canción / anuncio) */}
      {props.cabecera && (
        <div className="ar-cintillo">🎤 <strong>{props.cabecera.titulo}</strong></div>
      )}
      {props.anuncio && (
        <button className="ar-cintillo ar-cintillo-btn"
          onClick={() => hablar(props.anuncio.texto, props.anuncio.voz)}>
          🔊 Repetir el anuncio
        </button>
      )}
      {contenido?.actividad?.instrucciones && (
        <p className="ar-instrucciones">{contenido.actividad.instrucciones}</p>
      )}

      {tipo === 'quiz'          && <Quiz {...comun} />}
      {tipo === 'escribir'      && <Escribir {...comun} />}
      {tipo === 'emparejar'     && <Emparejar {...comun} />}
      {tipo === 'ordenar'       && <Ordenar {...comun} />}
      {tipo === 'sopa'          && <Sopa {...comun} />}
      {tipo === 'libre'         && <Libre {...comun} />}
      {tipo === 'pronunciacion' && <Pronunciacion {...comun} />}
      {tipo === 'laberinto'       && <Laberinto {...comun} />}
      {tipo === 'rompecabezas'    && <Rompecabezas {...comun} />}
      {tipo === 'armar-escenario' && <ArmarEscenario {...comun} />}
      {tipo === 'impostor'        && <Impostor {...comun} />}
      {tipo === 'basquet'         && <Basquet {...comun} />}
      {tipo === 'cancion'         && <LetraConHuecos {...comun} />}
      {tipo === 'direcciones'     && <Direcciones {...comun} />}
    </div>
  )
}

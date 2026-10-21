// ============================================================
// ConfigCancion.jsx — El docente arma "completar la letra" (actividad 10)
// ============================================================
//   1. Busca la canción por título (+ artista). Las letras salen de
//      LRCLIB (sincronizadas, si las hay) o de Musixmatch.
//   2. Elige de dónde sale el audio: YouTube, Spotify o una URL.
//   3. Elige qué parte usar: toda la canción, el estribillo o unos versos.
//   4. Elige qué palabras ocultar, de dos formas:
//        · A mano: toca las palabras en la letra (otra vez para quitarlas).
//        · Vocabulario de la lección: el sistema busca en la letra las
//          palabras de las lecciones elegidas y dice cuáles encontró. Si no
//          encuentra ninguna, avisa y pasa al modo a mano.
//      Nunca se ocultan verbos o tiempos al azar: solo lo que elige el docente.
// La configuración viaja en config.cancion al generar (sin IA, 0 tokens).
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import ReproductorCancion from '../ui/ReproductorCancion.jsx'

const FUENTES_AUDIO = [
  { tipo: 'youtube', etiqueta: 'YouTube', ayuda: 'Pega el enlace del video (youtube.com/watch?v=… o youtu.be/…).' },
  { tipo: 'spotify', etiqueta: 'Spotify', ayuda: 'Pega el enlace de la canción (open.spotify.com/track/…). Sin sesión de Spotify suena un fragmento de 30 s.' },
  { tipo: 'url',     etiqueta: 'URL de audio', ayuda: 'Un archivo .mp3 / .ogg que empiece con https:// y que puedas usar en clase.' },
]
// La MISMA expresión que el servidor (domain/cancionHuecos.js → PALABRA):
// así "verso:palabra" señala la misma palabra en los dos lados.
const PALABRA = /[A-Za-z][A-Za-z’']*/g

/** Lo mínimo para que el servidor pueda aceptar el enlace (él lo valida de verdad). */
function audioParece(tipo, ref) {
  const v = ref.trim()
  if (tipo === 'youtube') return /(?:v=|youtu\.be\/|embed\/|shorts\/)[\w-]{11}/.test(v) || /^[\w-]{11}$/.test(v)
  if (tipo === 'spotify') return /track[/:][A-Za-z0-9]{22}/.test(v)
  return /^https:\/\/\S+$/.test(v)
}
/** Para el reproductor de prueba: mismo recorte que hace el servidor. */
function audioNormalizado(tipo, ref) {
  const v = ref.trim()
  if (tipo === 'youtube') return { tipo, ref: v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? v }
  if (tipo === 'spotify') return { tipo, ref: v.match(/track[/:]([A-Za-z0-9]{22})/)?.[1] ?? v }
  return { tipo, ref: v }
}

/** Un verso partido en texto y palabras tocables: [{ texto } | { palabra, pi }]. */
function trozos(texto) {
  const salida = []
  let cursor = 0
  let pi = 0
  for (const m of texto.matchAll(PALABRA)) {
    if (m.index > cursor) salida.push({ texto: texto.slice(cursor, m.index) })
    salida.push({ palabra: m[0], pi: pi++ })
    cursor = m.index + m[0].length
  }
  if (cursor < texto.length) salida.push({ texto: texto.slice(cursor) })
  return salida
}

export default function ConfigCancion({ valor, onChange, lecciones, nivel }) {
  const [titulo, setTitulo] = useState('')
  const [artista, setArtista] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState(null)
  const [error, setError] = useState(null)

  // Lo elegido (se reconstruye de `valor` si el docente vuelve al paso)
  const [cancion, setCancion] = useState(null)        // { ...resumen, lineas }
  const [estribillo, setEstribillo] = useState(null)
  const [fuenteAudio, setFuenteAudio] = useState(valor?.audio?.tipo ?? 'youtube')
  const [refAudio, setRefAudio] = useState(valor?.audio?.ref ?? '')
  const [tramo, setTramo] = useState(typeof valor?.opciones?.tramo === 'object' ? 'rango' : (valor?.opciones?.tramo ?? 'completa'))
  const [rango, setRango] = useState(typeof valor?.opciones?.tramo === 'object' ? valor.opciones.tramo : { desde: 0, hasta: 3 })
  const [modo, setModo] = useState(valor?.opciones?.modo ?? 'manual')          // 'manual' | 'vocabulario'
  const [seleccion, setSeleccion] = useState(() => new Set(valor?.opciones?.seleccion ?? []))
  const [resumenVocab, setResumenVocab] = useState(null)   // { buscadas, encontradas, lecciones } | { vacio: true }
  const [buscandoVocab, setBuscandoVocab] = useState(false)

  const audioOk = audioParece(fuenteAudio, refAudio)
  const tramoCfg = tramo === 'rango' ? rango : tramo

  // Versos visibles según el tramo (índices de la letra original)
  const visibles = useMemo(() => {
    if (!cancion) return []
    const todos = cancion.lineas.map((_, i) => i)
    if (tramo === 'estribillo' && estribillo) return todos.slice(estribillo.desde, estribillo.hasta + 1)
    if (tramo === 'rango') return todos.slice(rango.desde, rango.hasta + 1)
    return todos
  }, [cancion, tramo, estribillo, rango])
  // Solo cuentan las palabras elegidas que caen en el tramo
  const elegidas = useMemo(() => {
    const enTramo = new Set(visibles.map(String))
    return [...seleccion].filter((k) => enTramo.has(k.split(':')[0]))
  }, [seleccion, visibles])

  const cfg = cancion && audioOk && elegidas.length
    ? { fuente: cancion.fuente, id: cancion.id, audio: { tipo: fuenteAudio, ref: refAudio.trim() }, opciones: { tramo: tramoCfg, modo, seleccion: elegidas } }
    : null
  const claveCfg = JSON.stringify(cfg)

  // Volver al paso: recupera la canción elegida
  useEffect(() => {
    if (!valor?.id || cancion) return
    api.canciones.obtener(valor.fuente, valor.id)
      .then((r) => { setCancion(r.cancion); setEstribillo(r.estribillo) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Avisar hacia arriba (null mientras falte algo). No mientras se recupera.
  const restaurando = Boolean(valor?.id) && !cancion
  useEffect(() => {
    if (restaurando) return
    onChange(cfg, cancion ? `${cancion.titulo} — ${cancion.artista}` : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveCfg, restaurando])

  // Modo vocabulario: buscar en el tramo las palabras de las lecciones
  async function buscarVocabulario() {
    if (!cancion) return
    setBuscandoVocab(true); setError(null)
    try {
      const r = await api.canciones.vistaPrevia({
        fuente: cancion.fuente, id: cancion.id,
        // el audio no importa para buscar palabras; si falta, va uno de relleno válido
        audio: audioOk ? { tipo: fuenteAudio, ref: refAudio.trim() } : { tipo: 'url', ref: 'https://example.com/a.mp3' },
        opciones: { tramo: tramoCfg, modo: 'vocabulario' },
      }, lecciones)
      if (!r.seleccion?.length) {
        // Sin coincidencias: se avisa y se pasa a elegir a mano
        setResumenVocab({ vacio: true, buscadas: r.vocabulario?.buscadas ?? 0, lecciones: r.vocabulario?.lecciones ?? [] })
        setModo('manual')
        setSeleccion(new Set())
      } else {
        setResumenVocab(r.vocabulario)
        setSeleccion(new Set(r.seleccion))
      }
    } catch (e) { setError(e.message) }
    finally { setBuscandoVocab(false) }
  }
  // Al cambiar de tramo en modo vocabulario, se vuelve a buscar
  useEffect(() => {
    if (modo === 'vocabulario' && cancion) buscarVocabulario()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, JSON.stringify(tramoCfg), cancion?.id])

  function elegirModo(nuevo) {
    setResumenVocab(null)
    setModo(nuevo)
    if (nuevo === 'manual') return   // conserva lo que haya (se puede ajustar a mano)
  }
  function alternarPalabra(vi, pi) {
    const k = `${vi}:${pi}`
    setSeleccion((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
    // Tocar una palabra en modo vocabulario = ajustarlo a mano
    if (modo === 'vocabulario') { setModo('manual'); setResumenVocab((r) => (r && !r.vacio ? { ...r, ajustado: true } : r)) }
  }

  async function buscar(e) {
    e?.preventDefault()
    if (titulo.trim().length < 2) return
    setBuscando(true); setError(null)
    try { setResultados((await api.canciones.buscar(titulo.trim(), artista.trim())).resultados) }
    catch (err) { setError(err.message); setResultados(null) }
    finally { setBuscando(false) }
  }

  async function elegir(r) {
    setError(null)
    try {
      const { cancion: c, estribillo: e } = await api.canciones.obtener(r.fuente, r.id)
      setCancion(c); setEstribillo(e); setResultados(null)
      setSeleccion(new Set()); setResumenVocab(null)
      setRango({ desde: 0, hasta: Math.min(3, c.lineas.length - 1) })
      if (tramo === 'estribillo' && !e) setTramo('completa')
    } catch (err) { setError(err.message) }
  }

  const ayudaAudio = FUENTES_AUDIO.find((f) => f.tipo === fuenteAudio)?.ayuda
  const palabrasDeLecciones = resumenVocab?.lecciones?.length ? ` de ${resumenVocab.lecciones.map((n) => `L${n}`).join(', ')}` : ' de la lección'

  return (
    <div className="card config-cancion">
      <div className="section-title">
        <h3>🎤 La canción</h3>
        {nivel && <span className="badge badge-ok" title="Nivel del libro del curso">Nivel {nivel}</span>}
      </div>

      {/* 1 · Buscar */}
      {!cancion ? (
        <form className="cancion-busqueda" onSubmit={buscar}>
          <div className="field">
            <label htmlFor="cancion-titulo">Título</label>
            <input id="cancion-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Count on Me" maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="cancion-artista">Artista (opcional)</label>
            <input id="cancion-artista" value={artista} onChange={(e) => setArtista(e.target.value)} placeholder="Ej.: Bruno Mars" maxLength={120} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={buscando || titulo.trim().length < 2}>
            {buscando ? 'Buscando…' : 'Buscar letra'}
          </button>
        </form>
      ) : (
        <div className="cancion-elegida">
          <div>
            <strong>{cancion.titulo}</strong> — {cancion.artista}
            <small className="muted"> · {cancion.lineas.length} versos{cancion.duracionTexto ? ` · ${cancion.duracionTexto}` : ''}</small>
            {cancion.sincronizada
              ? <span className="badge badge-ok">letra sincronizada</span>
              : <span className="badge badge-warn" title="La letra no trae tiempos: no se resalta el verso que suena">sin sincronizar</span>}
          </div>
          <button type="button" className="btn btn-outline" onClick={() => { setCancion(null); setSeleccion(new Set()); setResumenVocab(null) }}>Cambiar canción</button>
        </div>
      )}

      {resultados && (
        resultados.length === 0
          ? <p className="muted">No se encontró la letra. Prueba con otro título o agrega el artista.</p>
          : (
            <ul className="cancion-resultados">
              {resultados.map((r) => (
                <li key={`${r.fuente}-${r.id}`}>
                  <button type="button" onClick={() => elegir(r)}>
                    <strong>{r.titulo}</strong> — {r.artista}
                    <small className="muted">{r.album ? ` · ${r.album}` : ''}{r.duracionTexto ? ` · ${r.duracionTexto}` : ''}</small>
                    {r.sincronizada && <span className="badge badge-ok">sincronizada</span>}
                  </button>
                </li>
              ))}
            </ul>
          )
      )}

      {cancion && (<>
        {/* 2 · Audio */}
        <fieldset className="cancion-bloque">
          <legend>¿De dónde sale el audio?</legend>
          <div className="modo-tabs modo-tabs-chicas" role="radiogroup">
            {FUENTES_AUDIO.map((f) => (
              <button key={f.tipo} type="button" role="radio" aria-checked={fuenteAudio === f.tipo}
                className={fuenteAudio === f.tipo ? 'activo' : ''} onClick={() => setFuenteAudio(f.tipo)}>
                <strong>{f.etiqueta}</strong>
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="cancion-audio">Enlace</label>
            <input id="cancion-audio" value={refAudio} onChange={(e) => setRefAudio(e.target.value)} maxLength={500}
              placeholder={fuenteAudio === 'youtube' ? 'https://www.youtube.com/watch?v=…' : fuenteAudio === 'spotify' ? 'https://open.spotify.com/track/…' : 'https://…/cancion.mp3'} />
            <small className="muted">{ayudaAudio}</small>
            {refAudio && !audioOk && <small className="badge badge-warn">Ese enlace no parece válido para {FUENTES_AUDIO.find((f) => f.tipo === fuenteAudio)?.etiqueta}.</small>}
          </div>
          {audioOk && <ReproductorCancion audio={audioNormalizado(fuenteAudio, refAudio)} compacto />}
        </fieldset>

        {/* 3 · Tramo */}
        <fieldset className="cancion-bloque">
          <legend>¿Qué parte de la canción?</legend>
          <div className="field">
            <select id="cancion-tramo" value={tramo} onChange={(e) => setTramo(e.target.value)} aria-label="Parte de la canción">
              <option value="completa">Toda la canción</option>
              <option value="estribillo" disabled={!estribillo}>Solo el estribillo{estribillo ? ` (versos ${estribillo.desde + 1}–${estribillo.hasta + 1})` : ' (no se detectó)'}</option>
              <option value="rango">Unos versos</option>
            </select>
          </div>
          {tramo === 'rango' && (
            <div className="field cancion-rango">
              <label>Del verso</label>
              <select value={rango.desde} onChange={(e) => { const d = Number(e.target.value); setRango((r) => ({ desde: d, hasta: Math.max(d, r.hasta) })) }}>
                {cancion.lineas.map((l, i) => <option key={i} value={i}>{i + 1}. {l.texto.slice(0, 40)}</option>)}
              </select>
              <label>al verso</label>
              <select value={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: Number(e.target.value) }))}>
                {cancion.lineas.map((l, i) => i >= rango.desde && <option key={i} value={i}>{i + 1}. {l.texto.slice(0, 40)}</option>)}
              </select>
            </div>
          )}
        </fieldset>

        {/* 4 · Palabras a ocultar */}
        <fieldset className="cancion-bloque">
          <legend>¿Qué palabras tendrá que escribir el estudiante?</legend>
          <div className="modo-tabs modo-tabs-chicas cancion-modos" role="radiogroup">
            <button type="button" role="radio" aria-checked={modo === 'manual'} className={modo === 'manual' ? 'activo' : ''} onClick={() => elegirModo('manual')}>
              <strong>✋ Elegir a mano</strong>
              <small>Tocas las palabras en la letra</small>
            </button>
            <button type="button" role="radio" aria-checked={modo === 'vocabulario'} className={modo === 'vocabulario' ? 'activo' : ''} onClick={() => elegirModo('vocabulario')}>
              <strong>📚 Vocabulario de la lección</strong>
              <small>El sistema busca las palabras de tus lecciones</small>
            </button>
          </div>

          {/* Qué hacer / qué encontró */}
          {modo === 'manual' && !resumenVocab?.vacio && (
            <p className="cancion-guia">
              👆 <strong>Toca en la letra las palabras que quieres ocultar.</strong> Se marcan en azul y el estudiante
              tendrá que escribirlas al escuchar. Toca otra vez para quitarla.
              {resumenVocab?.ajustado && ' (Partiste de las palabras del vocabulario y las estás ajustando a mano.)'}
            </p>
          )}
          {resumenVocab?.vacio && (
            <p className="cancion-guia cancion-guia-aviso" role="status">
              ⚠️ Buscamos {resumenVocab.buscadas} palabra{resumenVocab.buscadas === 1 ? '' : 's'} del vocabulario{palabrasDeLecciones} y
              <strong> ninguna aparece en esta parte de la canción</strong>. Pasamos al modo a mano:
              toca en la letra las palabras que quieres ocultar.
            </p>
          )}
          {modo === 'vocabulario' && buscandoVocab && <p className="muted">Buscando las palabras del vocabulario en la letra…</p>}
          {modo === 'vocabulario' && !buscandoVocab && resumenVocab && !resumenVocab.vacio && (
            <div className="cancion-guia cancion-guia-ok" role="status">
              <p>
                ✅ Buscamos <strong>{resumenVocab.buscadas}</strong> palabras del vocabulario{palabrasDeLecciones} y encontramos
                <strong> {resumenVocab.encontradas.length}</strong> en esta parte de la canción
                ({elegidas.length} hueco{elegidas.length === 1 ? '' : 's'} en total):
              </p>
              <ul className="cancion-encontradas">
                {resumenVocab.encontradas.map((e) => <li key={e.palabra}>{e.palabra}{e.veces > 1 ? ` ×${e.veces}` : ''}</li>)}
              </ul>
              <small className="muted">Puedes tocar palabras en la letra para quitar o agregar huecos.</small>
            </div>
          )}

          {/* La letra, con las palabras tocables */}
          <div className="cancion-seleccion-cab">
            <span><strong>{elegidas.length}</strong> palabra{elegidas.length === 1 ? '' : 's'} elegida{elegidas.length === 1 ? '' : 's'}</span>
            {elegidas.length > 0 && (
              <button type="button" className="btn btn-outline btn-chico" onClick={() => { setSeleccion(new Set()); setResumenVocab(null); setModo('manual') }}>
                Quitar todas
              </button>
            )}
          </div>
          <ol className="letra-seleccion" aria-label="Letra: toca una palabra para ocultarla">
            {visibles.map((vi) => (
              <li key={vi} value={vi + 1}>
                {trozos(cancion.lineas[vi].texto).map((t, k) => (t.palabra
                  ? (
                    <button key={k} type="button"
                      className={`palabra-letra ${seleccion.has(`${vi}:${t.pi}`) ? 'elegida' : ''}`}
                      aria-pressed={seleccion.has(`${vi}:${t.pi}`)}
                      onClick={() => alternarPalabra(vi, t.pi)}>
                      {t.palabra}
                    </button>
                  )
                  : <span key={k}>{t.texto}</span>))}
              </li>
            ))}
          </ol>
          {!audioOk && <small className="muted">Falta el enlace del audio para poder generar.</small>}
        </fieldset>
        <small className="muted">La letra viene de {cancion.fuente === 'lrclib' ? 'LRCLIB' : 'Musixmatch'}. Úsala solo con fines educativos en tu clase.</small>
      </>)}

      {error && <p className="badge badge-error" role="alert">{error}</p>}
    </div>
  )
}

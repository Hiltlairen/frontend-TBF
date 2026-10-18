// ============================================================
// ConfigCancion.jsx — El docente arma "completar la letra" (actividad 10)
// ============================================================
//   1. Busca la canción por título (+ artista). Las letras salen de
//      LRCLIB (sincronizadas, si las hay) o de Musixmatch.
//   2. Elige de dónde sale el audio: YouTube, Spotify o una URL.
//   3. Decide qué ocultar: largo mínimo, aleatorias / verbos /
//      sustantivos, y si es toda la canción, el estribillo o unos versos.
//      El PORCENTAJE no se elige: lo fija el nivel del libro.
//   4. Ve la vista previa con las palabras ocultas marcadas y prueba
//      el audio. Cada estudiante recibe otras palabras ocultas.
// La configuración viaja en config.cancion al generar (sin IA, 0 tokens).
// ============================================================
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import ReproductorCancion from '../ui/ReproductorCancion.jsx'

const FUENTES_AUDIO = [
  { tipo: 'youtube', etiqueta: 'YouTube', ayuda: 'Pega el enlace del video (youtube.com/watch?v=… o youtu.be/…).' },
  { tipo: 'spotify', etiqueta: 'Spotify', ayuda: 'Pega el enlace de la canción (open.spotify.com/track/…). Sin sesión de Spotify suena un fragmento de 30 s.' },
  { tipo: 'url',     etiqueta: 'URL de audio', ayuda: 'Un archivo .mp3 / .ogg que empiece con https:// y que puedas usar en clase.' },
]
const TIPOS = [
  { id: 'aleatorio',   etiqueta: 'Palabras al azar' },
  { id: 'verbos',      etiqueta: 'Solo verbos' },
  { id: 'sustantivos', etiqueta: 'Solo sustantivos' },
]

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
  const [minLetras, setMinLetras] = useState(valor?.opciones?.minLetras ?? 4)
  const [tipo, setTipo] = useState(valor?.opciones?.tipo ?? 'aleatorio')
  const [tramo, setTramo] = useState(typeof valor?.opciones?.tramo === 'object' ? 'rango' : (valor?.opciones?.tramo ?? 'completa'))
  const [rango, setRango] = useState(typeof valor?.opciones?.tramo === 'object' ? valor.opciones.tramo : { desde: 0, hasta: 3 })
  const [previa, setPrevia] = useState(null)
  const [cargandoPrevia, setCargandoPrevia] = useState(false)

  const audioOk = audioParece(fuenteAudio, refAudio)
  const opciones = { minLetras, tipo, tramo: tramo === 'rango' ? rango : tramo }
  const cfg = cancion && audioOk ? { fuente: cancion.fuente, id: cancion.id, audio: { tipo: fuenteAudio, ref: refAudio.trim() }, opciones } : null
  const claveCfg = JSON.stringify(cfg)

  // Volver al paso: recupera la canción elegida
  useEffect(() => {
    if (!valor?.id || cancion) return
    api.canciones.obtener(valor.fuente, valor.id)
      .then((r) => { setCancion(r.cancion); setEstribillo(r.estribillo) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Avisar hacia arriba (null mientras falte algo) + vista previa
  // Mientras se recupera la canción elegida antes, no se avisa "sin canción".
  const restaurando = Boolean(valor?.id) && !cancion
  useEffect(() => {
    if (restaurando) return
    onChange(cfg, cancion ? `${cancion.titulo} — ${cancion.artista}` : null)
    if (!cfg) { setPrevia(null); return }
    let vigente = true
    setCargandoPrevia(true)
    const t = setTimeout(() => {
      api.canciones.vistaPrevia(cfg, lecciones)
        .then((r) => { if (vigente) { setPrevia(r); setError(null) } })
        .catch((e) => vigente && (setPrevia(null), setError(e.message)))
        .finally(() => vigente && setCargandoPrevia(false))
    }, 400)
    return () => { vigente = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveCfg])

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
      setRango({ desde: 0, hasta: Math.min(3, c.lineas.length - 1) })
      if (tramo === 'estribillo' && !e) setTramo('completa')
    } catch (err) { setError(err.message) }
  }

  const ayudaAudio = FUENTES_AUDIO.find((f) => f.tipo === fuenteAudio)?.ayuda

  return (
    <div className="card config-cancion">
      <div className="section-title">
        <h3>🎤 La canción</h3>
        {nivel && <span className="badge badge-ok" title="Lo fija el nivel del libro">Nivel {nivel}{previa ? ` · ${previa.porcentaje}% de palabras ocultas` : ''}</span>}
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
          <button type="button" className="btn btn-outline" onClick={() => { setCancion(null); setPrevia(null) }}>Cambiar canción</button>
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
        </fieldset>

        {/* 3 · Qué ocultar */}
        <fieldset className="cancion-bloque cancion-opciones">
          <legend>¿Qué palabras se ocultan?</legend>
          <div className="field">
            <label htmlFor="cancion-tipo">Tipo de palabra</label>
            <select id="cancion-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.etiqueta}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cancion-min">Largo mínimo (letras)</label>
            <input id="cancion-min" type="number" min={1} max={10} value={minLetras}
              onChange={(e) => setMinLetras(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
          </div>
          <div className="field">
            <label htmlFor="cancion-tramo">Parte de la canción</label>
            <select id="cancion-tramo" value={tramo} onChange={(e) => setTramo(e.target.value)}>
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

        {/* 4 · Vista previa */}
        <div className="cancion-bloque">
          <h4>Vista previa {cargandoPrevia && <small className="muted">· actualizando…</small>}</h4>
          {!audioOk && <p className="muted">Agrega el enlace del audio para ver la vista previa.</p>}
          {previa && (<>
            <p className="muted">
              <strong>{previa.actividad.huecos.length}</strong> palabras ocultas de {previa.actividad.total_palabras}
              {' '}({previa.porcentaje}% por el nivel {previa.nivel}). Así la ve el estudiante 1: a cada uno le tocan otras palabras.
            </p>
            <ReproductorCancion audio={audioNormalizado(fuenteAudio, refAudio)} compacto />
            <ol className="letra-previa">
              {previa.actividad.lineas.map((l) => (
                <li key={l.id}>
                  {l.partes.map((p, i) => (p.hueco
                    ? <mark key={i} className="hueco-previo" title="Palabra oculta">{previa.actividad.huecos.find((h) => h.id === p.hueco)?.respuesta}</mark>
                    : <span key={i}>{p.texto}</span>))}
                </li>
              ))}
            </ol>
          </>)}
        </div>
        <small className="muted">La letra viene de {cancion.fuente === 'lrclib' ? 'LRCLIB' : 'Musixmatch'}. Úsala solo con fines educativos en tu clase.</small>
      </>)}

      {error && <p className="badge badge-error" role="alert">{error}</p>}
    </div>
  )
}

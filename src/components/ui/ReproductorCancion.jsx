// ============================================================
// ReproductorCancion.jsx — Audio de la actividad 10 (3 fuentes)
// ============================================================
// Una sola interfaz para tres reproductores:
//   · youtube → YouTube IFrame Player API (video completo).
//   · spotify → Spotify Embed (iFrame API). Sin sesión de Spotify en el
//               navegador suena un fragmento de 30 s; con sesión, entera.
//               (El Web Playback SDK exige Premium y login: no sirve
//               para una sala de estudiantes.)
//   · url     → <audio> con un .mp3/.ogg por https.
// Hacia afuera expone, por ref: play(), pause(), alternar(), irA(seg),
// y avisa el segundo actual con onTiempo(seg) para sincronizar la letra.
// ============================================================
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

const cargados = {}
/** Carga un script de terceros una sola vez y espera su "listo". */
function cargarScript(src, global, callbackGlobal) {
  if (cargados[src]) return cargados[src]
  cargados[src] = new Promise((resolver) => {
    if (global && window[global]) return resolver(window[global])
    const previo = window[callbackGlobal]
    window[callbackGlobal] = (...args) => { previo?.(...args); resolver(global ? window[global] : args[0]) }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    document.head.appendChild(s)
  })
  return cargados[src]
}

const fmt = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, '0')}`

const ReproductorCancion = forwardRef(function ReproductorCancion({ audio, onTiempo, compacto = false }, ref) {
  const caja = useRef(null)
  const motor = useRef(null)          // { play, pause, irA, tiempo(), destruir }
  const [estado, setEstado] = useState({ listo: false, sonando: false, t: 0, duracion: 0, error: null })
  const avisar = useRef(onTiempo)
  avisar.current = onTiempo

  useEffect(() => {
    let vivo = true
    let reloj = null
    const fijar = (cambios) => vivo && setEstado((e) => ({ ...e, ...cambios }))
    const contenedor = document.createElement('div')
    caja.current?.appendChild(contenedor)

    async function montar() {
      if (audio?.tipo === 'youtube') {
        const YT = await cargarScript('https://www.youtube.com/iframe_api', 'YT', 'onYouTubeIframeAPIReady')
        if (!vivo) return
        const p = new YT.Player(contenedor, {
          videoId: audio.ref, width: '100%', height: compacto ? 160 : 220,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: () => fijar({ listo: true, duracion: p.getDuration?.() ?? 0 }),
            onStateChange: (e) => fijar({ sonando: e.data === YT.PlayerState.PLAYING, duracion: p.getDuration?.() ?? 0 }),
            onError: () => fijar({ error: 'No se pudo reproducir este video de YouTube (puede estar bloqueado para insertarse).' }),
          },
        })
        motor.current = {
          play: () => p.playVideo?.(), pause: () => p.pauseVideo?.(),
          irA: (s) => p.seekTo?.(s, true), tiempo: () => p.getCurrentTime?.() ?? 0,
          destruir: () => p.destroy?.(),
        }
        // YouTube no avisa el tiempo: se consulta 4 veces por segundo.
        reloj = setInterval(() => { const t = motor.current?.tiempo() ?? 0; fijar({ t }); avisar.current?.(t) }, 250)
      } else if (audio?.tipo === 'spotify') {
        const API = await cargarScript('https://open.spotify.com/embed/iframe-api/v1', null, 'onSpotifyIframeApiReady')
        if (!vivo) return
        API.createController(contenedor, { uri: `spotify:track:${audio.ref}`, width: '100%', height: compacto ? 80 : 152 }, (c) => {
          if (!vivo) { c.destroy?.(); return }
          fijar({ listo: true })
          c.addListener('playback_update', (e) => {
            const t = (e.data?.position ?? 0) / 1000
            fijar({ t, sonando: !e.data?.isPaused, duracion: (e.data?.duration ?? 0) / 1000 })
            avisar.current?.(t)
          })
          motor.current = {
            play: () => c.resume?.(), pause: () => c.pause?.(),
            irA: (s) => c.seek?.(s), tiempo: () => 0, destruir: () => c.destroy?.(),
          }
        })
      } else if (audio?.tipo === 'url') {
        const a = document.createElement('audio')
        a.src = audio.ref
        a.preload = 'metadata'
        a.onloadedmetadata = () => fijar({ listo: true, duracion: a.duration })
        a.onplay = () => fijar({ sonando: true })
        a.onpause = () => fijar({ sonando: false })
        a.ontimeupdate = () => { fijar({ t: a.currentTime }); avisar.current?.(a.currentTime) }
        a.onerror = () => fijar({ error: 'No se pudo cargar el audio de esa URL.' })
        contenedor.appendChild(a)
        motor.current = {
          play: () => a.play().catch(() => {}), pause: () => a.pause(),
          irA: (s) => { a.currentTime = Math.max(0, s) }, tiempo: () => a.currentTime,
          destruir: () => { a.pause(); a.src = '' },
        }
      }
    }
    montar().catch(() => fijar({ error: 'No se pudo cargar el reproductor.' }))

    return () => {
      vivo = false
      clearInterval(reloj)
      try { motor.current?.destruir() } catch { /* el reproductor ya no existe */ }
      motor.current = null
      contenedor.remove()
      setEstado({ listo: false, sonando: false, t: 0, duracion: 0, error: null })
    }
  }, [audio?.tipo, audio?.ref, compacto])

  const acciones = {
    play: () => motor.current?.play(),
    pause: () => motor.current?.pause(),
    alternar: () => (estado.sonando ? motor.current?.pause() : motor.current?.play()),
    irA: (s) => { motor.current?.irA(Math.max(0, s)); motor.current?.play() },
  }
  useImperativeHandle(ref, () => acciones)

  return (
    <div className="reproductor-cancion">
      <div ref={caja} className={`reproductor-marco reproductor-${audio?.tipo ?? 'ninguno'}`} />
      {estado.error && <p className="badge badge-error" role="alert">{estado.error}</p>}
      <div className="reproductor-controles">
        <button type="button" className="btn btn-outline" onClick={() => acciones.irA(estado.t - 5)} disabled={!estado.listo} aria-label="Retroceder 5 segundos">⏪ 5 s</button>
        <button type="button" className="btn btn-primary" onClick={acciones.alternar} disabled={!estado.listo}>
          {estado.sonando ? '⏸ Pausa' : '▶ Reproducir'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => acciones.irA(estado.t + 5)} disabled={!estado.listo} aria-label="Adelantar 5 segundos">5 s ⏩</button>
        <span className="muted reproductor-tiempo">{fmt(estado.t)}{estado.duracion ? ` / ${fmt(estado.duracion)}` : ''}</span>
      </div>
      {audio?.tipo === 'spotify' && (
        <small className="muted">Spotify: sin una sesión iniciada en este navegador suena un fragmento de 30 segundos.</small>
      )}
    </div>
  )
})

export default ReproductorCancion

/** Índice del verso que suena en el segundo `t` (letra sincronizada). */
export function versoActual(lineas, t, desfase = 0) {
  let actual = -1
  const ahora = t + desfase
  lineas.forEach((l, i) => { if (l.t != null && l.t <= ahora) actual = i })
  return actual
}

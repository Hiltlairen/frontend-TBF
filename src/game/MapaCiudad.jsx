// ============================================================
// MapaCiudad.jsx — Vista aérea de La Paz con el auto al centro (07)
// ============================================================
// Mapa real de OpenStreetMap (sus mosaicos estándar, sin API key) con Leaflet. El auto
// queda SIEMPRE en el centro mirando hacia arriba y es el mapa el que
// gira, como un GPS: así "izquierda" y "derecha" son las del auto.
//
// Para que al girar no se vean esquinas vacías, el mapa vive en un
// cuadrado del tamaño de la DIAGONAL del recuadro visible, centrado.
//
// Props:
//   mapa      → la ruta (pasos con geometría, referencias, fin)
//   paso      → índice del tramo que viene
//   conducir  → true: el auto recorre ese tramo; al terminar, onLlego()
//   verRuta   → dibuja el tramo que viene (modo "dar indicaciones")
//   destino   → { nombre } para el banderín de llegada
// ============================================================
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const ZOOM = 17
// Política de uso de OSM: tráfico liviano y con atribución visible (abajo a la derecha).
const MOSAICOS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ICONO_LUGAR = {
  pharmacy: '💊', school: '🏫', kindergarten: '🧸', university: '🎓', bank: '🏦', restaurant: '🍽️', 'café': '☕',
  'fast food place': '🍔', 'ice cream shop': '🍦', hospital: '🏥', clinic: '🩺', church: '⛪', library: '📚',
  'police station': '👮', 'gas station': '⛽', market: '🛒', cinema: '🎬', 'post office': '✉️', bakery: '🥖',
  supermarket: '🛒', bookstore: '📖', shop: '🏪', 'clothes shop': '👕', park: '🌳', playground: '🛝',
  stadium: '🏟️', museum: '🏛️', hotel: '🏨', landmark: '📍',
}

/** Rumbo en grados (0 = norte, 90 = este) de a hacia b. */
function rumbo(a, b) {
  const rad = Math.PI / 180
  const y = (b[1] - a[1]) * Math.cos(((a[0] + b[0]) / 2) * rad)
  const x = b[0] - a[0]
  return (Math.atan2(y, x) / rad + 360) % 360
}
function metros(a, b) {
  const rad = Math.PI / 180
  const x = (b[1] - a[1]) * rad * Math.cos(((a[0] + b[0]) / 2) * rad)
  const y = (b[0] - a[0]) * rad
  return Math.hypot(x, y) * 6371000
}
/** Rumbo con que arranca un tramo: ignora los primeros metros (vértices sueltos). */
function rumboInicial(g) {
  const lejos = g.find((p) => metros(g[0], p) >= 20) ?? g.at(-1)
  return rumbo(g[0], lejos)
}
/** Zoom para que el tramo (y el lugar de la esquina) entre en pantalla. */
const zoomDe = (p) => Math.max(15.6, Math.min(ZOOM, ZOOM - Math.log2(Math.max(1, (p?.distancia ?? 100) / 110))))
/** Gira lo mínimo: de 350° a 10° son +20°, no −340°. */
const girarHacia = (actual, nuevo) => actual + ((((nuevo - actual) % 360) + 540) % 360) - 180

export default function MapaCiudad({ mapa, paso = 0, conducir = false, verRuta = false, destino, onLlego }) {
  const marco = useRef(null)
  const lienzo = useRef(null)
  const mapaL = useRef(null)
  const capaRuta = useRef(null)
  const [giro, setGiro] = useState(0)
  const [lado, setLado] = useState(0)
  const avisar = useRef(onLlego)
  avisar.current = onLlego
  const geometria = mapa.pasos[paso]?.geometria ?? []

  // El cuadrado que gira mide la diagonal del recuadro visible.
  useEffect(() => {
    const medir = () => {
      const r = marco.current?.getBoundingClientRect()
      if (r) setLado(Math.ceil(Math.hypot(r.width, r.height)))
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(marco.current)
    return () => obs.disconnect()
  }, [])
  useEffect(() => { mapaL.current?.invalidateSize({ pan: false }) }, [lado])

  // Montar el mapa una vez: mosaicos, lugares de referencia y la meta.
  useEffect(() => {
    const m = L.map(lienzo.current, {
      zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, zoomSnap: 0,
      fadeAnimation: false,
    }).setView(mapa.inicio, zoomDe(mapa.pasos[0]))
    L.tileLayer(MOSAICOS, { maxZoom: 19 }).addTo(m)
    for (const p of mapa.pasos) {
      if (!p.referencia) continue
      L.marker([p.referencia.lat, p.referencia.lng], {
        interactive: false, keyboard: false,
        icon: L.divIcon({
          className: 'mapa-lugar', iconSize: null,
          html: `<span class="mapa-lugar-etq"><b>${ICONO_LUGAR[p.referencia.tipo] ?? '📍'}</b>${p.referencia.nombre.replace(/</g, '&lt;')}</span>`,
        }),
      }).addTo(m)
    }
    L.marker(mapa.fin, {
      interactive: false, keyboard: false,
      icon: L.divIcon({ className: 'mapa-lugar mapa-meta', iconSize: null, html: `<span class="mapa-lugar-etq"><b>🏁</b>${String(destino?.nombre ?? '').replace(/</g, '&lt;')}</span>` }),
    }).addTo(m)
    capaRuta.current = L.layerGroup().addTo(m)
    mapaL.current = m
    setGiro(rumboInicial(mapa.pasos[0].geometria))
    return () => { m.remove(); mapaL.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa])

  // Ruta del tramo que viene (solo cuando el estudiante da indicaciones)
  useEffect(() => {
    const capa = capaRuta.current
    if (!capa) return
    capa.clearLayers()
    if (!verRuta || !geometria.length) return
    const sig = mapa.pasos[paso + 1]?.geometria ?? []
    // Azul con borde blanco: el naranja se confunde con las avenidas de OSM.
    const linea = [...geometria, ...sig.slice(1, 3)]
    L.polyline(linea, { color: '#fff', weight: 11, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(capa)
    L.polyline(linea, { color: '#2563eb', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(capa)
    L.circleMarker(geometria.at(-1), { radius: 8, color: '#fff', weight: 3, fillColor: '#1d4ed8', fillOpacity: 1 }).addTo(capa)
  }, [verRuta, paso, mapa, geometria])

  // En cada esquina, el zoom se ajusta al tramo que viene.
  useEffect(() => {
    const m = mapaL.current
    if (m && !conducir) m.setView(m.getCenter(), zoomDe(mapa.pasos[paso]), { animate: true })
  }, [paso, conducir, mapa])

  // Conducir el tramo: el auto avanza por la geometría y el mapa gira.
  // Al llegar a la esquina, dobla hacia la calle siguiente (así el tramo
  // que viene arranca "hacia arriba" y el giro se ve al final).
  useEffect(() => {
    if (!conducir || geometria.length < 2) return
    const m = mapaL.current
    const largos = geometria.slice(1).map((p, i) => metros(geometria[i], p))
    const total = largos.reduce((a, b) => a + b, 0)
    const z = zoomDe(mapa.pasos[paso])
    const siguiente = mapa.pasos[paso + 1]?.geometria
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const duracion = reducido ? 300 : Math.min(5000, Math.max(1600, 1200 + total * 5))
    let inicio = null
    let marcoAnim = 0
    let tramoAnterior = -1
    const cuadro = (ahora) => {
      inicio ??= ahora
      const avance = Math.min(1, (ahora - inicio) / duracion)
      let recorrido = avance * total
      let k = 0
      while (k < largos.length - 1 && recorrido > largos[k]) { recorrido -= largos[k]; k++ }
      const f = largos[k] ? Math.min(1, recorrido / largos[k]) : 1
      const a = geometria[k]
      const b = geometria[k + 1]
      m?.setView([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], z, { animate: false })
      if (k !== tramoAnterior && largos[k] > 4) { tramoAnterior = k; setGiro((g) => girarHacia(g, rumbo(a, b))) }
      if (avance < 1) marcoAnim = requestAnimationFrame(cuadro)
      else {
        if (siguiente?.length > 1) setGiro((g) => girarHacia(g, rumboInicial(siguiente)))
        avisar.current?.()
      }
    }
    marcoAnim = requestAnimationFrame(cuadro)
    return () => cancelAnimationFrame(marcoAnim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conducir, paso, mapa])

  return (
    <div className="mapa-ciudad" ref={marco} style={{ '--giro': `${giro}deg` }}>
      <div className="mapa-giro" style={{ width: lado || '100%', height: lado || '100%' }}>
        <div ref={lienzo} className="mapa-lienzo" />
      </div>
      <div className="mapa-auto" aria-hidden="true">
        <svg viewBox="0 0 40 64" width="34" height="54">
          <rect x="4" y="4" width="32" height="56" rx="11" fill="#b45309" stroke="#7c2d12" strokeWidth="2.5" />
          <rect x="9" y="13" width="22" height="12" rx="3" fill="#e0f2fe" />
          <rect x="9" y="40" width="22" height="9" rx="3" fill="#bae6fd" />
          <rect x="1" y="16" width="4" height="9" rx="2" fill="#1f2937" /><rect x="35" y="16" width="4" height="9" rx="2" fill="#1f2937" />
          <rect x="1" y="41" width="4" height="9" rx="2" fill="#1f2937" /><rect x="35" y="41" width="4" height="9" rx="2" fill="#1f2937" />
          <circle cx="11" cy="6" r="2.4" fill="#fde68a" /><circle cx="29" cy="6" r="2.4" fill="#fde68a" />
        </svg>
      </div>
      <span className="mapa-norte" aria-hidden="true" title="Norte">N</span>
      <small className="mapa-creditos">© OpenStreetMap contributors</small>
    </div>
  )
}

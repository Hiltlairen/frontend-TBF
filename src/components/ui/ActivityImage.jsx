// ============================================================
// ActivityImage.jsx — Imagen de actividad servida por Picsum (ver lib/imagenes.js)
// ============================================================
//   <ActivityImage name="plaza-murillo" width={600} height={400} />
//
// · Pide la foto al doble de resolución para pantallas retina (srcSet).
// · Reserva su espacio con aspect-ratio: la página no "salta" al cargar.
// · Carga diferida (loading="lazy") y un fondo neutro mientras llega.
// · Si la foto no carga (sin internet), muestra `fallback` (o solo el fondo).
// ============================================================
import { useState } from 'react'
import { getImageUrl } from '../../lib/imagenes.js'

/** "english-classroom.png" → "English classroom" (para el texto alternativo). */
const altDe = (nombre) => {
  const t = String(nombre ?? '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Imagen de la actividad'
}

export default function ActivityImage({
  name, width = 600, height = 400, alt, className = '', style, fallback = null, ...resto
}) {
  const [fallo, setFallo] = useState(false)
  const caja = { aspectRatio: `${width} / ${height}`, borderRadius: 12, background: '#E5E7EB', ...style }

  if (fallo) {
    return fallback ?? <span className={`activity-image ${className}`} style={{ display: 'block', width: '100%', ...caja }} role="img" aria-label={alt ?? altDe(name)} />
  }
  return (
    <img
      src={getImageUrl(name, width, height)}
      srcSet={`${getImageUrl(name, width, height)} 1x, ${getImageUrl(name, width * 2, height * 2)} 2x`}
      width={width}
      height={height}
      alt={alt ?? altDe(name)}
      loading="lazy"
      decoding="async"
      onError={() => setFallo(true)}
      className={`activity-image ${className}`}
      style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'cover', ...caja }}
      {...resto}
    />
  )
}

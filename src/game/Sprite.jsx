// ============================================================
// Sprite.jsx — Imagen de una actividad a partir de su NOMBRE
// ============================================================
// Las actividades (lo que genera la IA) solo traen un nombre de imagen,
// p. ej. "apple.png" o "kitchen". De dónde sale la imagen, en orden:
//
//   1. Un archivo propio con ese nombre en web/src/game/assets/objects
//      (o /scenes, /puzzle) — ver assetManifest.js. Si existe, manda.
//   2. Picsum Photos con el nombre como semilla (lib/imagenes.js): no se
//      guarda nada en el servidor ni en la base de datos, y la misma
//      semilla da siempre la misma foto. OJO: es una foto al azar, no
//      una foto de la palabra. `remoto={false}` lo desactiva (p. ej. para
//      piezas de juego como el obstáculo del laberinto).
//   3. Un marcador (emoji) si no hay nombre o la foto no carga (sin internet).
//
// `ancho` / `alto` son los px de la foto que se pide (el tamaño en pantalla
// lo sigue fijando el CSS de cada actividad); se pide el doble para retina.
// ============================================================
import { useState } from 'react'
import { spriteUrl } from './assetManifest'
import { getImageUrl } from '../lib/imagenes.js'

export default function Sprite({
  archivo, alt = '', emoji = '❔', className = '', style, redondo = false,
  remoto = true, ancho = 160, alto = 120,
}) {
  const [fallo, setFallo] = useState(false)
  const local = spriteUrl(archivo)
  const radio = redondo ? '50%' : undefined

  if (local) {
    return (
      <img src={local} alt={alt || archivo || ''} className={`spr-img ${className}`} style={{ ...style, borderRadius: radio }} />
    )
  }

  if (archivo && remoto && !fallo) {
    return (
      <img
        src={getImageUrl(archivo, ancho, alto)}
        srcSet={`${getImageUrl(archivo, ancho, alto)} 1x, ${getImageUrl(archivo, ancho * 2, alto * 2)} 2x`}
        alt={alt || archivo}
        loading="lazy"
        decoding="async"
        onError={() => setFallo(true)}
        className={`spr-img spr-foto ${className}`}
        style={{ ...style, borderRadius: radio }}
      />
    )
  }

  // Respaldo: nunca deja el hueco vacío, y deja rastro de qué archivo falta
  // (útil en desarrollo; inofensivo para el estudiante).
  return (
    <span
      className={`spr-fallback ${className}`}
      style={style}
      role="img"
      aria-label={alt || archivo || emoji}
      title={archivo ? `falta: ${archivo}` : undefined}
    >
      {emoji}
    </span>
  )
}

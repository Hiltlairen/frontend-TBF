// ============================================================
// Sprite.jsx — <img> con respaldo honesto cuando falta el arte
// ============================================================
// Se usa en las actividades 15 a 19 para "objetos" (palabra, pieza
// de rompecabezas, ítem de escenario, tarjeta de imagen) que hoy no
// tienen PNG todavía. En vez de romper el build con un import a un
// archivo que no existe, busca el nombre en assetManifest.js y, si
// no lo encuentra, dibuja un marcador (emoji + texto) — el mismo
// criterio que ya usa el proyecto en SceneStage.jsx (PROPS_ESCENARIO)
// y en scenes.js (`fondo: null`).
//
// Cuando llegue el arte real: se copia el PNG con el mismo nombre
// dentro de web/src/game/assets/objects (o /scenes, /puzzle) y este
// componente empieza a mostrarlo solo, sin tocar nada más.
// ============================================================
import { spriteUrl } from './assetManifest'

export default function Sprite({ archivo, alt = '', emoji = '❔', className = '', style, redondo = false }) {
  const url = spriteUrl(archivo)

  if (url) {
    return (
      <img
        src={url}
        alt={alt || archivo || ''}
        className={`spr-img ${className}`}
        style={{ ...style, borderRadius: redondo ? '50%' : undefined }}
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

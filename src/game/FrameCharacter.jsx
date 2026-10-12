import { CHARACTER } from './gameConfig'
import { getFrames } from './spriteLoader'

const { frameSize, scale, states, facesRightByDefault, hitbox, defaultState } = CHARACTER
const displaySize = frameSize * scale

/**
 * Personaje animado por cuadros (sin esqueleto).
 * - state: nombre de la carpeta/animación ('inactivo', 'correr', ...)
 * - facing: 'derecha' | 'izquierda' (voltea el sprite)
 * - elapsedMs: reloj del game loop; elige el cuadro actual
 * - showHitbox: dibuja el contorno de la caja de colisión (debug)
 */
export default function FrameCharacter({ state = 'inactivo', facing = 'derecha', elapsedMs = 0, showHitbox = false }) {
  // Si la acción todavía no tiene sprites propios, usa la animación por
  // defecto (idle) para no dejar al personaje en blanco.
  let frames = getFrames(state)
  let activeState = state
  if (frames.length === 0) {
    frames = getFrames(defaultState)
    activeState = defaultState
  }
  if (frames.length === 0) {
    return (
      <div style={{ width: displaySize, height: displaySize, border: '2px dashed #f2a541', color: '#f2a541', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        sin sprites<br />/{state}
      </div>
    )
  }

  const cfg = states[activeState] || { fps: 8, loop: true }
  const frameDuration = 1000 / cfg.fps
  const rawIndex = Math.floor(elapsedMs / frameDuration)
  const index = cfg.loop
    ? rawIndex % frames.length
    : Math.min(rawIndex, frames.length - 1)

  // Volteo: si el sprite mira a la derecha por defecto, para ir a la
  // izquierda lo reflejamos (y viceversa).
  const mustFlip = facesRightByDefault ? facing === 'izquierda' : facing === 'derecha'

  return (
    <div style={{ position: 'relative', width: displaySize, height: displaySize }}>
      <img
        src={frames[index]}
        alt={state}
        width={displaySize}
        height={displaySize}
        style={{
          imageRendering: 'pixelated',        // pixel art nítido, sin desenfoque
          transform: mustFlip ? 'scaleX(-1)' : 'none',
          display: 'block',
        }}
      />
      {showHitbox && (
        <div
          style={{
            position: 'absolute',
            left: hitbox.x * scale,
            top: hitbox.y * scale,
            width: hitbox.w * scale,
            height: hitbox.h * scale,
            border: '2px solid rgba(46,204,113,0.9)',
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

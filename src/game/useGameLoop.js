import { useEffect, useRef } from 'react'

/**
 * Loop de juego clásico: llama a onTick(dtSeconds, elapsedMs) en cada
 * frame usando requestAnimationFrame. dt sirve para que el movimiento
 * sea independiente del framerate real del navegador; elapsedMs es un
 * cronómetro propio del loop, útil para animaciones periódicas.
 */
export function useGameLoop(onTick) {
  const rafId = useRef(null)
  const lastTime = useRef(null)
  const startTime = useRef(null)
  const callbackRef = useRef(onTick)
  callbackRef.current = onTick

  useEffect(() => {
    const step = (now) => {
      if (lastTime.current === null) lastTime.current = now
      if (startTime.current === null) startTime.current = now
      const dt = (now - lastTime.current) / 1000
      lastTime.current = now
      const elapsedMs = now - startTime.current
      callbackRef.current(dt, elapsedMs)
      rafId.current = requestAnimationFrame(step)
    }
    rafId.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId.current)
  }, [])
}

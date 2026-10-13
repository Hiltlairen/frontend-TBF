// ============================================================
// useVistaEscritorio.js — ¿la actividad se ve en una PC?
// ============================================================
// Las actividades nacieron dentro de un celular (PhoneOverlay). En una
// pantalla ancha ese celular de 420px desperdicia el espacio, así que
// se muestran en una "ventana" de escritorio con su propio diseño
// (ver .tel-escritorio en Game.css y ActivityRunner.css).
//
// Se decide por el tamaño de la pantalla, no por el dispositivo: una
// tablet apaisada grande también recibe la vista de escritorio, y una
// ventana de PC angosta se queda con la de celular. Se reevalúa si el
// usuario redimensiona la ventana.
// ============================================================
import { useEffect, useState } from 'react'

export const CONSULTA_ESCRITORIO = '(min-width: 900px) and (min-height: 560px)'

const coincide = () =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.(CONSULTA_ESCRITORIO).matches)

export function useVistaEscritorio() {
  const [escritorio, setEscritorio] = useState(coincide)

  useEffect(() => {
    const mq = window.matchMedia?.(CONSULTA_ESCRITORIO)
    if (!mq) return
    const cambiar = () => setEscritorio(mq.matches)
    cambiar()
    mq.addEventListener?.('change', cambiar)
    return () => mq.removeEventListener?.('change', cambiar)
  }, [])

  return escritorio
}

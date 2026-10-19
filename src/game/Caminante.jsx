// ============================================================
// Caminante.jsx — Personaje que camina en las 4 direcciones
// ============================================================
// Hoja de sprites assets/personajes/caminante.png: 256×256, cuadros de
// 64×64, 4 por fila (el ciclo de caminar). Una fila por dirección:
//   0 abajo · 1 arriba · 2 izquierda · 3 derecha
// Quieto = cuadro 0 de su fila; caminando = recorre los 4 cuadros.
// Se dibuja con background-position (un solo <div>, sin canvas), así
// escala nítido (pixelated) y se puede mover con CSS.
// ============================================================
import { useEffect, useState } from 'react'
import hoja from './assets/personajes/caminante.png'

const CUADROS_POR_FILA = 4
const FILA = { abajo: 0, arriba: 1, izquierda: 2, derecha: 3 }

/** Dirección según un desplazamiento en la cuadrícula (filas, columnas). */
export function direccionDe(dFila, dColumna) {
  if (Math.abs(dColumna) >= Math.abs(dFila)) return dColumna < 0 ? 'izquierda' : 'derecha'
  return dFila < 0 ? 'arriba' : 'abajo'
}

/**
 * tamano: número (px) o cualquier medida CSS ('100%'): la hoja se ubica
 * en porcentajes, así que el personaje llena la caja que le den.
 */
export default function Caminante({ direccion = 'abajo', caminando = false, tamano = 64, fps = 8, className = '', titulo }) {
  const [cuadro, setCuadro] = useState(0)

  useEffect(() => {
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!caminando || reducido) { setCuadro(0); return }
    const id = setInterval(() => setCuadro((c) => (c + 1) % CUADROS_POR_FILA), 1000 / fps)
    return () => clearInterval(id)
  }, [caminando, fps])

  const ultimo = CUADROS_POR_FILA - 1
  return (
    <div
      className={`caminante ${className}`}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      style={{
        width: tamano, height: tamano,
        backgroundImage: `url(${hoja})`,
        backgroundSize: `${CUADROS_POR_FILA * 100}% 400%`,
        backgroundPosition: `${(cuadro / ultimo) * 100}% ${((FILA[direccion] ?? 0) / 3) * 100}%`,
        imageRendering: 'pixelated',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}

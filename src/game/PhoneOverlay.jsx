import { useEffect, useState } from 'react'
import { useVistaEscritorio } from '../lib/useVistaEscritorio.js'

/**
 * Marco donde se juega cada actividad. Dos versiones:
 *
 *   · CELULAR (pantallas angostas): sube desde abajo y ocupa casi toda
 *     la pantalla, con muesca y barra de inicio.
 *   · ESCRITORIO (pantallas anchas, ver useVistaEscritorio): una
 *     ventana ancha con barra de título, y cada actividad reorganiza su
 *     contenido para aprovechar el ancho (.tel-escritorio en
 *     ActivityRunner.css). La lógica de la actividad es la misma.
 *
 * `vista` fuerza una de las dos ('movil' | 'escritorio'); por defecto
 * ('auto') se elige según el tamaño de la pantalla.
 *
 * `canal` cambia la barra superior:
 *   'telefono' → cabecera de llamada con el nombre del contacto
 *   resto      → título normal de la actividad
 *
 * NO se cierra al tocar fuera: la actividad debe terminarse para que el
 * juego avance.
 */
export default function PhoneOverlay({ titulo, canal, contacto, vista = 'auto', children }) {
  const [entrado, setEntrado] = useState(false)
  const pantallaAncha = useVistaEscritorio()
  const escritorio = vista === 'escritorio' || (vista === 'auto' && pantallaAncha)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntrado(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className={`tel-fondo ${entrado ? 'in' : ''} ${escritorio ? 'tel-fondo-escritorio' : ''}`}>
      <div className={`tel ${escritorio ? 'tel-escritorio' : ''} ${entrado ? 'in' : ''}`} role="region" aria-label={titulo}>
        {escritorio ? (
          <div className="tel-ventana-barra">
            <span className="tel-ventana-puntos" aria-hidden="true"><i /><i /><i /></span>
            <span className="tel-titulo">{titulo}</span>
          </div>
        ) : (
          <div className="tel-muesca" />
        )}

        {/* Sólo las llamadas conservan cabecera propia: en el resto de
            actividades la primera fila es la barra de progreso del
            ejercicio, igual que en las apps de idiomas. */}
        {canal === 'telefono' && (
          <div className="tel-barra llamada">
            <span className="tel-avatar">👤</span>
            <div className="tel-contacto">
              <strong>{contacto}</strong>
              <small>en llamada…</small>
            </div>
          </div>
        )}

        <div className="tel-pantalla">{children}</div>
        {!escritorio && <div className="tel-home" />}
      </div>
    </div>
  )
}

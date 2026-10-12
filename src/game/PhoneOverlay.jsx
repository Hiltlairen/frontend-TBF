import { useEffect, useState } from 'react'

/**
 * Celular que sube desde abajo con la actividad dentro.
 * En móvil ocupa casi toda la pantalla; en escritorio es un
 * teléfono centrado sobre el escenario.
 *
 * `canal` cambia la barra superior:
 *   'telefono' → cabecera de llamada con el nombre del contacto
 *   'audio'    → indicador de onda de sonido
 *   resto      → título normal de la actividad
 *
 * A diferencia del prototipo anterior, NO se cierra al tocar
 * fuera: la actividad debe terminarse para que el juego avance.
 */
export default function PhoneOverlay({ titulo, canal, contacto, children }) {
  const [entrado, setEntrado] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntrado(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className={`tel-fondo ${entrado ? 'in' : ''}`}>
      <div className={`tel ${entrado ? 'in' : ''}`} role="region" aria-label={titulo}>
        <div className="tel-muesca" />

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
        <div className="tel-home" />
      </div>
    </div>
  )
}

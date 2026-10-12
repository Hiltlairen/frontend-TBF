// ============================================================
// a11y.js — utilidades chicas de accesibilidad, compartidas (punto 7)
// ============================================================
import { useEffect } from 'react'

/**
 * Cierra con la tecla Escape — el atajo estándar para cualquier
 * diálogo/modal, y hoy ninguno de los modales del proyecto lo tenía
 * (solo se podían cerrar con mouse/touch, clickeando afuera o un
 * botón). `activo` deja el hook siempre declarado (regla de hooks)
 * pero sin escuchar nada cuando el modal está cerrado.
 */
export function useCerrarConEscape(onClose, activo = true) {
  useEffect(() => {
    if (!activo) return
    function alTeclear(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onClose, activo])
}

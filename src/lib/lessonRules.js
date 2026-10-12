// Reglas de selección de lecciones para "Crear actividad":
// - Máximo 3 lecciones.
// - Deben ser CONSECUTIVAS (por número de lección).
// - La primera lección elegida puede ser cualquiera; desde ahí solo
//   se pueden agregar lecciones contiguas al bloque actual (antes del
//   mínimo o después del máximo seleccionado).
// - Solo se puede quitar una lección si está en un extremo del bloque
//   (quitar una lección "del medio" rompería la continuidad).

export const MAX_LECCIONES = 3

export function puedeSeleccionar(numero, seleccionNumeros) {
  if (seleccionNumeros.length === 0) return true
  if (seleccionNumeros.length >= MAX_LECCIONES) return false
  const min = Math.min(...seleccionNumeros)
  const max = Math.max(...seleccionNumeros)
  return numero === min - 1 || numero === max + 1
}

export function puedeQuitar(numero, seleccionNumeros) {
  if (seleccionNumeros.length === 0) return false
  const min = Math.min(...seleccionNumeros)
  const max = Math.max(...seleccionNumeros)
  return numero === min || numero === max
}

/**
 * Alterna la selección de una lección respetando las reglas.
 * Devuelve el nuevo arreglo de lecciones seleccionadas (objetos
 * {id, numero, titulo}).
 */
export function toggleLeccion(leccion, seleccionActual) {
  const yaSeleccionada = seleccionActual.some((l) => l.id === leccion.id)
  const numeros = seleccionActual.map((l) => l.numero)

  if (yaSeleccionada) {
    if (!puedeQuitar(leccion.numero, numeros)) return seleccionActual // no permitido
    return seleccionActual.filter((l) => l.id !== leccion.id)
  }

  if (!puedeSeleccionar(leccion.numero, numeros)) return seleccionActual // no permitido
  return [...seleccionActual, leccion].sort((a, b) => a.numero - b.numero)
}

// Carga automáticamente todos los cuadros de todas las carpetas de estado.
// Estructura esperada:
//   src/assets/sprites/<estado>/1.png, 2.png, 3.png, ...
//
// Para agregar un estado nuevo (ej. "saltar"), solo crea la carpeta
// src/assets/sprites/saltar/ con sus cuadros y añádelo en gameConfig.states.
// No hay que tocar este archivo.

const modules = import.meta.glob('../assets/sprites/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

// Agrupa por carpeta (estado) y ordena por número de archivo.
const framesByState = {}
for (const path in modules) {
  const m = path.match(/sprites\/([^/]+)\/(\d+)\.png$/)
  if (!m) continue
  const [, state, num] = m
  ;(framesByState[state] ||= []).push({ n: parseInt(num, 10), url: modules[path] })
}
for (const state in framesByState) {
  framesByState[state].sort((a, b) => a.n - b.n)
  framesByState[state] = framesByState[state].map((f) => f.url)
}

export function getFrames(state) {
  return framesByState[state] || []
}

export function listStates() {
  return Object.keys(framesByState)
}

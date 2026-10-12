// ============================================================
// assetManifest.js — localiza sprites/objetos por NOMBRE DE ARCHIVO
// ============================================================
// Mismo espíritu que spriteLoader.js (que arma las animaciones del
// protagonista) pero para piezas SUELTAS: objetos, íconos de tarjeta,
// fondos de mini-escena, etc. usados por las actividades nuevas
// (15 a 19).
//
// Por qué existe: el contenido de una actividad (lo que genera
// Gemini o lo que arma el docente) solo conoce un NOMBRE de archivo,
// p. ej. "manzana.png". Ese archivo puede no existir todavía —
// "por el momento solo quiero la estructura, no generes ninguna
// imagen" — así que el motor tiene que poder LLAMAR a esa imagen sin
// romperse si no está. Cuando alguien copie el PNG real dentro de
// alguna de las carpetas de abajo con ese mismo nombre, aparece solo
// (igual que `fondo` en scenes.js): no hay que tocar ni una línea de
// código de las actividades.
//
// Carpetas que se rastrean (podés agregar más objetos ahí sin tocar
// este archivo):
//   assets/objects/   → objetos sueltos, íconos de tarjeta
//   assets/scenes/    → fondos de escenario / mini-escenas interiores
//   assets/puzzle/    → recortes o texturas para el rompecabezas de oraciones
// ============================================================

function manifestDe(glob) {
  const mapa = {}
  for (const ruta in glob) {
    const nombre = ruta.split('/').pop()
    mapa[nombre] = glob[ruta]
  }
  return mapa
}

const objetos = manifestDe(
  import.meta.glob('./assets/objects/*.{png,jpg,jpeg,webp,svg}', { eager: true, query: '?url', import: 'default' })
)
const escenas = manifestDe(
  import.meta.glob('./assets/scenes/*.{png,jpg,jpeg,webp,svg}', { eager: true, query: '?url', import: 'default' })
)
const puzzle = manifestDe(
  import.meta.glob('./assets/puzzle/*.{png,jpg,jpeg,webp,svg}', { eager: true, query: '?url', import: 'default' })
)

/** Busca un archivo por nombre en TODAS las carpetas rastreadas (en el orden objetos → escenas → puzzle). */
function buscarEnCualquiera(nombreArchivo) {
  if (!nombreArchivo) return null
  return objetos[nombreArchivo] ?? escenas[nombreArchivo] ?? puzzle[nombreArchivo] ?? null
}

export const objectSpriteUrl = (nombreArchivo) => objetos[nombreArchivo] ?? null
export const sceneSpriteUrl = (nombreArchivo) => escenas[nombreArchivo] ?? null
export const puzzleTextureUrl = (nombreArchivo) => puzzle[nombreArchivo] ?? null
export const spriteUrl = buscarEnCualquiera

export const listAssets = () => ({
  objetos: Object.keys(objetos),
  escenas: Object.keys(escenas),
  puzzle: Object.keys(puzzle),
})

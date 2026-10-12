// ============================================================
// wordmaze.js — construye el "piso" de 15-laberinto-palabras
// ============================================================
// Mismo criterio que wordsearch.js: Gemini SOLO elige el contenido
// (la oración, ya en el orden correcto, y los distractores). El
// laberinto — cuadrícula, casillas, punto de partida y presupuesto
// de pasos — se calcula aquí, de forma determinística, para que
// SIEMPRE exista una solución posible.
//
// Idea (estilo Helltaker): en vez de tirar objetos al azar en una
// grilla y esperar que quede un camino válido, se genera primero un
// CAMINO auto-evitante (nunca se cruza a sí mismo) de N casillas
// dentro de la cuadrícula. La primera casilla del camino es el punto
// de partida del personaje; las siguientes, en orden, son las
// palabras de la oración. Como el camino existe por construcción,
// recorrerlo en ese orden SIEMPRE es posible con el número exacto de
// pasos del camino (+ un pequeño margen). El resto de casillas
// libres se reparte entre "distractores" (palabras que no van en la
// oración) y "obstáculos" (bloquean el paso; obligan a rodear).
// ============================================================

const MAX_CELDAS = 20
const DIRECCIONES = [[0, 1], [0, -1], [1, 0], [-1, 0]]

function clave(r, c) { return `${r},${c}` }

/** Elige filas×columnas <= MAX_CELDAS que alcancen para `necesarias` casillas, lo más compacto posible. */
function elegirDimensiones(necesarias) {
  let mejor = null
  for (let filas = 3; filas <= 5; filas++) {
    for (let columnas = 3; columnas <= 6; columnas++) {
      const total = filas * columnas
      if (total > MAX_CELDAS || total < necesarias) continue
      if (!mejor || total < mejor.total) mejor = { filas, columnas, total }
    }
  }
  // Si nada calza (oración demasiado larga), usa el tablero máximo permitido.
  return mejor ?? { filas: 4, columnas: 5, total: 20 }
}

function vecinos(r, c, filas, columnas) {
  return DIRECCIONES
    .map(([dr, dc]) => [r + dr, c + dc])
    .filter(([r2, c2]) => r2 >= 0 && r2 < filas && c2 >= 0 && c2 < columnas)
}

/** Camino auto-evitante aleatorio de `n` casillas (backtracking con reintentos). */
function generarCamino(filas, columnas, n, intentosMax = 500) {
  for (let intento = 0; intento < intentosMax; intento++) {
    const visitadas = new Set()
    const camino = []
    let r = Math.floor(Math.random() * filas)
    let c = Math.floor(Math.random() * columnas)
    camino.push([r, c])
    visitadas.add(clave(r, c))

    let atascado = false
    while (camino.length < n) {
      const libres = vecinos(r, c, filas, columnas).filter(([r2, c2]) => !visitadas.has(clave(r2, c2)))
      if (!libres.length) { atascado = true; break }
      const [nr, nc] = libres[Math.floor(Math.random() * libres.length)]
      r = nr; c = nc
      camino.push([r, c])
      visitadas.add(clave(r, c))
    }
    if (!atascado && camino.length === n) return camino
  }
  return null
}

function barajarInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * @param {{palabras_en_orden:string[], distractores?:string[]}} nivel
 * @returns {{
 *   filas:number, columnas:number,
 *   inicio:{fila:number,columna:number},
 *   tipos:string[][],                                 // 'inicio'|'objetivo'|'distractor'|'obstaculo'|'vacio'
 *   objetivos:{fila:number,columna:number,palabra:string,indice:number}[],
 *   distractoresColocados:{fila:number,columna:number,palabra:string}[],
 *   presupuestoPasos:number,
 * }}
 */
export function construirLaberinto(nivel) {
  const palabras = nivel?.palabras_en_orden ?? []
  const distractores = nivel?.distractores ?? []
  if (!palabras.length) throw new Error('El nivel no trae palabras_en_orden.')

  const necesarias = Math.min(MAX_CELDAS, 1 + palabras.length)
  const { filas, columnas } = elegirDimensiones(1 + palabras.length + distractores.length)

  let camino = generarCamino(filas, columnas, necesarias)
  // Tablero demasiado chico para la oración completa: se recorta al máximo posible
  // en vez de romper la actividad (mejor un nivel más corto que uno sin solución).
  if (!camino) camino = generarCamino(filas, columnas, Math.min(necesarias, filas * columnas)) || [[0, 0]]

  const inicio = camino[0]
  const celdasObjetivo = camino.slice(1)
  const enCamino = new Set(camino.map(([r, c]) => clave(r, c)))

  const libres = []
  for (let r = 0; r < filas; r++) {
    for (let c = 0; c < columnas; c++) {
      if (!enCamino.has(clave(r, c))) libres.push([r, c])
    }
  }
  barajarInPlace(libres)

  const celdasDistractor = libres.slice(0, distractores.length)
  const restoLibres = libres.slice(distractores.length)
  // ~35% de lo que sobra se vuelve obstáculo; el resto queda como piso vacío
  // (así siempre hay margen para rodear sin quedar atrapado).
  const celdasObstaculo = restoLibres.filter(() => Math.random() < 0.35)

  const tipos = Array.from({ length: filas }, () => Array(columnas).fill('vacio'))
  tipos[inicio[0]][inicio[1]] = 'inicio'
  celdasObjetivo.forEach(([r, c]) => { tipos[r][c] = 'objetivo' })
  celdasDistractor.forEach(([r, c]) => { tipos[r][c] = 'distractor' })
  celdasObstaculo.forEach(([r, c]) => { tipos[r][c] = 'obstaculo' })

  const objetivos = celdasObjetivo.map(([r, c], i) => ({ fila: r, columna: c, palabra: palabras[i], indice: i }))
  const distractoresColocados = celdasDistractor.map(([r, c], i) => ({ fila: r, columna: c, palabra: distractores[i] }))

  // Presupuesto de pasos: el largo exacto del camino (mínimo posible) + un
  // margen chico para no castigar un desvío accidental de una sola casilla.
  const pasosMinimos = celdasObjetivo.length
  const presupuestoPasos = pasosMinimos + Math.max(1, Math.round(pasosMinimos * 0.25))

  return { filas, columnas, inicio: { fila: inicio[0], columna: inicio[1] }, tipos, objetivos, distractoresColocados, presupuestoPasos }
}

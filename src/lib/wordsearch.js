// Construye una cuadrícula de sopa de letras a partir de una lista
// de palabras. Gemini solo elige las palabras + pistas (ver
// el prompt del servidor); el "dibujo" de la sopa se hace aquí, de forma
// determinística, para que siempre sea válida.

const DIR_VECTORS = {
  horizontal: [[0, 1]],
  vertical: [[1, 0]],
  diagonal: [[1, 1], [1, -1]],
}

function randomLetter() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return letters[Math.floor(Math.random() * letters.length)]
}

function buildVectorPool(direcciones) {
  let vectors = []
  for (const dir of direcciones) {
    if (DIR_VECTORS[dir]) vectors = vectors.concat(DIR_VECTORS[dir])
  }
  return vectors.length ? vectors : DIR_VECTORS.horizontal
}

function canPlace(grid, word, row, col, dr, dc) {
  const rows = grid.length
  const cols = grid[0].length
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i
    const c = col + dc * i
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false
    const cell = grid[r][c]
    if (cell !== null && cell !== word[i]) return false
  }
  return true
}

function place(grid, word, row, col, dr, dc) {
  const positions = []
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i
    const c = col + dc * i
    grid[r][c] = word[i]
    positions.push([r, c])
  }
  return positions
}

/**
 * @param {{palabra:string, pista:string}[]} palabras
 * @param {number} filas
 * @param {number} columnas
 * @param {string[]} direcciones
 * @returns {{grid:string[][], placements:{palabra:string,pista:string,celdas:number[][]}[], noColocadas:string[]}}
 */
export function buildWordSearchGrid(palabras, filas = 12, columnas = 12, direcciones = ['horizontal', 'vertical', 'diagonal']) {
  const grid = Array.from({ length: filas }, () => Array(columnas).fill(null))
  const vectorPool = buildVectorPool(direcciones)
  const placements = []
  const noColocadas = []

  const ordenadas = [...palabras].sort((a, b) => b.palabra.length - a.palabra.length)

  for (const item of ordenadas) {
    const word = item.palabra.toUpperCase().replace(/[^A-Z]/g, '')
    if (!word || word.length > Math.max(filas, columnas)) {
      noColocadas.push(item.palabra)
      continue
    }

    let placed = false
    const intentosMax = 200
    for (let attempt = 0; attempt < intentosMax && !placed; attempt++) {
      const [dr, dc] = vectorPool[Math.floor(Math.random() * vectorPool.length)]
      const row = Math.floor(Math.random() * filas)
      const col = Math.floor(Math.random() * columnas)
      if (canPlace(grid, word, row, col, dr, dc)) {
        const celdas = place(grid, word, row, col, dr, dc)
        placements.push({ palabra: word, pista: item.pista, celdas })
        placed = true
      }
    }
    if (!placed) noColocadas.push(item.palabra)
  }

  for (let r = 0; r < filas; r++) {
    for (let c = 0; c < columnas; c++) {
      if (grid[r][c] === null) grid[r][c] = randomLetter()
    }
  }

  return { grid, placements, noColocadas }
}

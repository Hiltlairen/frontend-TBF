// ============================================================
// sentencePuzzle.js — forma visual de cada pieza de 16-rompecabezas-oracion
// ============================================================
// Determinístico a partir del propio contenido (mismo criterio que
// wordsearch.js / wordmaze.js: el "dibujo" nunca lo decide Gemini).
//
// Cada pieza tiene un CONECTOR a su izquierda y otro a su derecha:
// una forma + un color. Dos piezas CONSECUTIVAS en el orden correcto
// comparten forma y color en el borde que las une — como un
// rompecabezas real. Como las formas/colores se repiten en ciclo, una
// pieza puede "casi encajar" visualmente con más de una vecina: el
// estudiante tiene que fijarse también en la propia oración, no solo
// en el patrón (que es justo lo que pediste: que las figuras encajen
// entre sí pero no delaten la respuesta por sí solas).
// ============================================================

export const FORMAS_CONECTOR = ['circulo', 'triangulo', 'diamante', 'estrella']
export const GLIFO_FORMA = { circulo: '●', triangulo: '▲', diamante: '◆', estrella: '★' }
export const COLORES_CONECTOR = ['#ef8312', '#2f6fed', '#16a34a', '#dc2626', '#9333ea', '#0891b2']

/**
 * @param {string[]} piezasEnOrden  las palabras/piezas YA en el orden correcto
 * @returns {{id:string, texto:string, indiceCorrecto:number, conectorIzquierdo:{forma,color}|null, conectorDerecho:{forma,color}|null}[]}
 */
export function generarPiezas(piezasEnOrden) {
  const n = piezasEnOrden.length
  const conectores = Array.from({ length: Math.max(0, n - 1) }, (_, i) => ({
    forma: FORMAS_CONECTOR[i % FORMAS_CONECTOR.length],
    color: COLORES_CONECTOR[i % COLORES_CONECTOR.length],
  }))

  return piezasEnOrden.map((texto, i) => ({
    id: `P${i}`,
    texto,
    indiceCorrecto: i,
    conectorIzquierdo: i > 0 ? conectores[i - 1] : null,
    conectorDerecho: i < n - 1 ? conectores[i] : null,
  }))
}

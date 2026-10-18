// ============================================================
// tokens.js — Cómo se muestran tokens y costos al docente
// ============================================================

/** 12345 → "12.345" (formato de Bolivia, como el resto del panel). */
export const fmtTokens = (n) => Math.round(n ?? 0).toLocaleString('es-BO')

/**
 * Dólares con la precisión que tiene sentido para montos chicos: una
 * generación suele costar fracciones de centavo, y "$0.00" escondería
 * justo la diferencia que el docente quiere comparar.
 */
export function fmtUSD(usd) {
  if (usd == null) return null
  if (usd === 0) return '$0'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

const nVariantes = (n) => `${n} variante${n === 1 ? '' : 's'}`

/** "10 variantes · ≈ 43.000 tokens · ≈ $0.0210", o "… 0 tokens (caché)". */
export function textoEstimacion(est) {
  if (!est) return null
  const v = est.variantes ? `${nVariantes(est.variantes)} · ` : ''
  if (est.desdeCache) return `${v}ya están en caché: 0 tokens`
  if (est.sinIA) return `${v}sin IA: 0 tokens (se arman con el vocabulario de la lección)`
  if (est.local) return `${v}0 tokens (la letra con huecos se arma sin IA)`
  const usd = fmtUSD(est.costoUSD)
  return `${v}≈ ${fmtTokens(est.total)} tokens${usd ? ` · ≈ ${usd}` : ''}`
}

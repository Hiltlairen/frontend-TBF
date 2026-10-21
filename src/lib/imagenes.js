// ============================================================
// imagenes.js — Imágenes de las actividades sin guardar archivos
// ============================================================
// Las actividades solo conocen un NOMBRE de imagen ("plaza-murillo",
// "backpack.png", "English classroom"…). En vez de guardar archivos en el
// servidor o en la base de datos, la imagen se pide a Picsum Photos con ese
// nombre como semilla:
//
//   https://picsum.photos/seed/{nombre}/{ancho}/{alto}
//
// La misma semilla devuelve SIEMPRE la misma foto, así que todos los
// estudiantes ven lo mismo y el navegador la cachea. Sin API key.
//
// ⚠️ Picsum devuelve una foto al azar, NO una foto del nombre: "backpack" no
// muestra una mochila. Sirve como imagen decorativa/consistente; si una
// actividad necesita que la imagen represente la palabra (17 y 19), conviene
// poner la imagen real en game/assets/objects/ con ese nombre: tiene prioridad
// (ver game/Sprite.jsx).
//
// Uso:
//   import { getImageUrl } from '../lib/imagenes.js'
//   getImageUrl('plaza-murillo')        → https://picsum.photos/seed/plaza-murillo/600/400
//   getImageUrl('backpack', 400, 300)   → https://picsum.photos/seed/backpack/400/300
//
//   En React: <ActivityImage name="plaza-murillo" width={600} height={400} />
//   (components/ui/ActivityImage.jsx)
// ============================================================

const BASE = 'https://picsum.photos/seed'
const MAX_LADO = 5000   // Picsum no sirve imágenes más grandes

/**
 * Normaliza el nombre para usarlo como semilla:
 * "English Classroom.png" → "english-classroom", "Plaza Murillo" → "plaza-murillo".
 */
export function limpiarNombreImagen(nombre) {
  const limpio = String(nombre ?? '')
    .trim()
    .replace(/\.(png|jpe?g|webp|gif|svg|avif)$/i, '')   // sin extensión
    .normalize('NFD').replace(/[̀-ͯ]/g, '')    // sin tildes
    .toLowerCase()
    .replace(/[\s_]+/g, '-')                             // espacios y _ → -
    .replace(/[^a-z0-9-]/g, '')                          // solo lo que va en una URL
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return limpio || 'english-lessons'
}

const lado = (n, porDefecto) => {
  const v = Math.round(Number(n))
  return Number.isFinite(v) && v > 0 ? Math.min(v, MAX_LADO) : porDefecto
}

/** URL de Picsum para una imagen de actividad. */
export function getImageUrl(nombre, ancho = 600, alto = 400) {
  return `${BASE}/${encodeURIComponent(limpiarNombreImagen(nombre))}/${lado(ancho, 600)}/${lado(alto, 400)}`
}

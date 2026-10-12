// ─────────────────────────────────────────────────────────
// Configuración central del motor (modo animación por cuadros).
// Aquí ajustas mapa, escala del personaje y velocidad de cada
// animación. Un solo archivo para todo.
// ─────────────────────────────────────────────────────────

export const MAP = {
  width: 1400,        // ancho total del mapa (px)
  height: 380,        // alto total
  tileSize: 64,       // celda del grid visual
  groundY: 300,       // línea de piso: donde apoyan los pies
  viewportWidth: 720, // ancho visible de la cámara
}

export const CHARACTER = {
  frameSize: 32,   // tamaño original de cada sprite (px). Tus imágenes son 32x32.
  scale: 4,        // multiplicador en pantalla -> 32*4 = 128px de alto/ancho
  moveSpeed: 150,  // px/segundo al correr

  // "hitbox" real de colisión, MÁS PEQUEÑA que el sprite dibujado.
  // Se mide en px ORIGINALES del sprite (antes de escalar). Sirve
  // para colisión/límites; el dibujo puede sobresalir de la caja.
  hitbox: { x: 10, y: 4, w: 12, h: 28 },

  // Dirección original de tus sprites. Los tuyos miran a la derecha,
  // así que al ir a la izquierda se voltean con espejo.
  facesRightByDefault: true,

  // Cada estado = una carpeta en src/assets/sprites/<estado>/
  // con cuadros numerados 1.png, 2.png, ...
  states: {
    inactivo: { fps: 8,  loop: true },  // 9 cuadros
    correr:   { fps: 12, loop: true },  // 6 cuadros
    levantar: { fps: 10, loop: false }, // 6 cuadros: alza el celular y se queda
  },
  defaultState: 'inactivo',
}

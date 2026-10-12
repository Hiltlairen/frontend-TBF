// ============================================================
// BotonIA.jsx — Botón para acciones que esperan a la IA (Gemini)
// ============================================================
// Mientras `cargando` es true el botón se bloquea, cambia su texto
// por `textoCargando` y muestra la animación de espera: un anillo que
// gira, puntos suspensivos que laten y un brillo que recorre el botón.
// Las respuestas de Gemini pueden tardar varios segundos y sin esta
// señal parece que la app se colgó.
//
// Toma las clases de quien lo usa (`className`), así que hereda el
// aspecto de cada pantalla. La animación vive en index.css (.btn-ia).
// ============================================================
export default function BotonIA({
  cargando = false, textoCargando = 'Pensando', className = '', disabled, children, ...rest
}) {
  return (
    <button
      type="button"
      {...rest}
      className={`btn-ia ${cargando ? 'cargando' : ''} ${className}`}
      disabled={disabled || cargando}
      aria-busy={cargando}
    >
      {cargando ? (
        <>
          <span className="btn-ia-anillo" aria-hidden="true" />
          <span>{textoCargando}</span>
          <span className="btn-ia-puntos" aria-hidden="true"><i /><i /><i /></span>
        </>
      ) : children}
    </button>
  )
}

// ============================================================
// RoutePreview.jsx — Dibuja el grafo antes de gastar tokens
// ============================================================
// Muestra la retícula etapas × carriles y explica cómo se
// ramifica según el puntaje. Es solo cálculo del servidor, no
// hay ninguna llamada a Gemini detrás.
// ============================================================
const COLOR_CARRIL = {
  avanzado: '#16a34a',
  estandar: '#ef8312',
  refuerzo: '#dc2626',
}
const ETIQUETA_CARRIL = {
  avanzado: 'Avanzado',
  estandar: 'Estándar',
  refuerzo: 'Refuerzo',
}

export default function RoutePreview({ datos }) {
  const { resumen, actividadesAGenerar } = datos
  const { umbrales, inicio } = resumen
  const etapas = resumen.filas[0]?.etapas.length ?? 0

  return (
    <div className="card ruta-card">
      <div className="section-title">
        <h3>Así quedará la ruta</h3>
        <span className="badge badge-ok">{actividadesAGenerar} a generar</span>
      </div>

      <p className="muted ruta-explica">
        Cada estudiante juega {etapas} actividades, pero no las mismas.
        Con <strong>{umbrales.alto} o más</strong> sube de carril,
        entre <strong>{umbrales.medio} y {umbrales.alto - 1}</strong> se mantiene,
        y con <strong>menos de {umbrales.medio}</strong> baja a refuerzo.
        Todos empiezan en <code>{inicio}</code>.
      </p>

      <div className="ruta-scroll">
        <table className="ruta-tabla">
          <thead>
            <tr>
              <th>Carril</th>
              {Array.from({ length: etapas }, (_, i) => <th key={i}>Etapa {i + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {resumen.filas.map((fila) => (
              <tr key={fila.carril}>
                <th style={{ borderLeft: `4px solid ${COLOR_CARRIL[fila.carril]}` }}>
                  {ETIQUETA_CARRIL[fila.carril]}
                </th>
                {fila.etapas.map((e) => (
                  <td key={e.etapa} className={inicio === `e${e.etapa}-${fila.carril}` ? 'ruta-inicio' : ''}>
                    <strong>{e.titulo}</strong>
                    <small>📍 {e.escenario}</small>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

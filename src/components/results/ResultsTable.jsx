export default function ResultsTable({ filas, onVerRecorrido }) {
  if (!filas || filas.length === 0) {
    return (
      <div className="card empty-state">
        <p>Todavía no hay resultados.</p>
        <p className="muted">
          Aparecerán aquí en cuanto un estudiante termine una actividad o una aventura
          lanzada desde el panel.
        </p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Estudiante</th>
            <th>Modo</th>
            <th>Contenido</th>
            <th>Puntaje</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((r) => (
            <tr key={r.id}>
              <td className="muted">{new Date(r.creado_en).toLocaleString('es-BO', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
              })}</td>
              <td>{r.estudiante}</td>
              <td>
                <span className={`badge ${r.modo === 'juego' ? 'badge-ok' : 'badge-muted'}`}>
                  {r.modo === 'juego' ? 'Aventura' : 'Simple'}
                </span>
              </td>
              <td>
                {r.modo === 'juego' ? (
                  <button className="res-link" onClick={() => onVerRecorrido?.(r)}>
                    {r.ruta_titulo} · ver recorrido
                  </button>
                ) : (r.actividad_titulo ?? '—')}
              </td>
              <td><strong>{r.puntaje}</strong>/{r.puntaje_maximo}</td>
              <td>
                {r.requiere_revision
                  ? <span className="badge badge-warn">por corregir</span>
                  : <span className="badge badge-ok">listo</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

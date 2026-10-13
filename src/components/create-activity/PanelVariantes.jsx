// ============================================================
// PanelVariantes.jsx — Revisar las variantes y lanzar
// ============================================================
// Una actividad se genera en VARIAS variantes (juegos de preguntas
// distintos sobre el mismo vocabulario). El docente no elige cuál
// lanzar: se lanzan todas, y a cada estudiante le toca una al azar
// cuando entra a la sala con su código. Aquí el docente revisa cada
// variante (HojaRespuestas), ve cuántos tokens costó el juego completo
// y lanza.
// ============================================================
import { useState } from 'react'
import HojaRespuestas from './HojaRespuestas.jsx'
import { fmtTokens, fmtUSD } from '../../lib/tokens.js'

export default function PanelVariantes({ resultado, children }) {
  const { registro, telemetria: tel = {} } = resultado
  const total = registro.variantes?.length || 1
  const [variante, setVariante] = useState(1)
  const v = tel.variantes ?? {}
  const faltaron = (v.pedidas ?? total) - total

  return (
    <div className="card resultado-card">
      <div className="section-title">
        <h3>Revisa antes de lanzar</h3>
        <span className="badge badge-ok">{total} variante{total === 1 ? '' : 's'}</span>
      </div>

      <h4 className="ver-titulo">{registro.titulo}</h4>
      <div className="act-credito">
        {registro.curso && <span className="act-leccion">🏫 {registro.curso}</span>}
        {registro.leccion_titulo && <span className="act-leccion">📖 {registro.leccion_titulo}</span>}
        <span className="act-autor">
          {registro.autor_avatar
            ? <img className="act-autor-foto" src={registro.autor_avatar} alt="" />
            : <span className="act-autor-foto act-autor-ini">{registro.autor_nombre?.[0] ?? '?'}</span>}
          {registro.autor_nombre}
        </span>
      </div>

      <p className="ver-reparto">
        🎲 Al entrar a la sala con su código, a cada estudiante le toca <strong>una variante al azar</strong>
        {total > 1 && <> (se reparten en partes iguales: con {total} variantes, nadie tiene las mismas preguntas que su compañero de al lado)</>}.
        Si vuelve a entrar, conserva la suya.
      </p>

      {/* ── Gasto real del juego completo de variantes ── */}
      <dl className="ver-gasto">
        <div><dt>Entrada</dt><dd>{fmtTokens(tel.tokensEntrada)}</dd></div>
        <div><dt>Salida</dt><dd>{fmtTokens(tel.tokensSalida)}</dd></div>
        <div><dt>Total</dt><dd><strong>{fmtTokens(tel.tokensTotal)}</strong></dd></div>
        {tel.costoUSD != null && <div><dt>Costo</dt><dd>{fmtUSD(tel.costoUSD)}</dd></div>}
        <div><dt>Llamadas</dt><dd>{tel.llamadasGemini ?? 0}</dd></div>
        {tel.estimado && !tel.desdeCache && !tel.modoLocal && (
          <div><dt>Estimado</dt><dd className="muted">≈ {fmtTokens(tel.estimado.total)}</dd></div>
        )}
      </dl>
      <p className="ver-nota muted">
        La salida incluye los tokens de "razonamiento" del modelo, que Google también cobra.
        {tel.desdeCache && ' Estas variantes salieron de la caché: no costaron nada.'}
      </p>

      {tel.modoLocal && (
        <p className="badge badge-warn" style={{ display: 'block' }}>
          Variantes armadas sin IA, solo con el vocabulario de la lección (0 tokens): cada una pregunta otra combinación de palabras.
        </p>
      )}
      {faltaron > 0 && (
        <p className="badge badge-warn" style={{ display: 'block' }}>
          Se pidieron {v.pedidas} variantes y quedaron {total}
          {v.bloqueadas ? ` (${v.bloqueadas} no pasaron el filtro de moderación)` : ''}
          {v.incompletas ? ` (${v.incompletas} no se pudieron completar)` : ''}.
          Igual se reparten al azar entre todos los estudiantes.
        </p>
      )}
      {resultado.fallidas?.length > 0 && (
        <p className="badge badge-warn" style={{ display: 'block' }}>
          {resultado.fallidas.length} actividad(es) no pasaron la validación y se
          reemplazaron en el grafo: {resultado.fallidas.map((f) => f.codigo).join(', ')}
        </p>
      )}

      {/* ── Pestañas: una por variante ── */}
      {total > 1 && (
        <div className="ver-tabs" role="tablist" aria-label="Variantes generadas">
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" role="tab" aria-selected={n === variante}
              className={`ver-tab ${n === variante ? 'activa' : ''}`}
              onClick={() => setVariante(n)}>
              <strong>Variante {n}</strong>
            </button>
          ))}
        </div>
      )}

      <HojaRespuestas registroId={registro.id} variante={variante} />

      {children}
    </div>
  )
}

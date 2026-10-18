// ============================================================
// ResumenFinal.jsx — Pantalla de cierre del estudiante
// ============================================================
// Antes el flujo terminaba en un número. Ahora, en tres capas:
//   1. La nota (que ya calcula el servidor) con un conteo animado.
//   2. El repaso del SISTEMA: qué dominó, qué falló, cuál era la
//      respuesta y su traducción — instantáneo y siempre disponible
//      (server/src/services/repaso.js). Con un botón para practicar
//      solo lo que falló, reutilizando el Quiz de ActivityRunner.
//   3. Consejos del tutor IA (Gemini), a pedido: se cargan aparte, así
//      que si la IA tarda o falla el resumen del sistema sigue ahí.
// ============================================================
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useIdioma } from '../i18n/LanguageContext.jsx'
import ActivityRunner from './ActivityRunner.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import BotonIA from '../components/ui/BotonIA.jsx'

const barajar = (a) => [...a].sort(() => Math.random() - 0.5)

/** Sube de 0 a `objetivo` en ~0.9 s (o salta directo si se pidió menos movimiento). */
function useCuentaArriba(objetivo) {
  const [valor, setValor] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setValor(objetivo); return }
    const DURACION = 900
    let inicio = null, id
    const paso = (ts) => {
      inicio ??= ts
      const t = Math.min(1, (ts - inicio) / DURACION)
      setValor(Math.round(objetivo * (1 - (1 - t) ** 3)))
      if (t < 1) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [objetivo])
  return valor
}

export default function ResumenFinal({ resumen, partidaId, token, onSalir }) {
  const { t } = useIdioma()
  const nota = resumen?.puntajeTotal ?? 0
  const pendiente = !!resumen?.pendiente
  const cara = pendiente ? '📝' : nota >= 80 ? '🏆' : nota >= 50 ? '👍' : '💪'
  // 'tramo' decide el color de la tarjeta (franja, nota y barra): 80+ / 50+ / menos de 50.
  const tramo = pendiente ? 'pendiente' : nota >= 80 ? 'alto' : nota >= 50 ? 'medio' : 'bajo'
  const etapas = resumen?.resumen?.length ?? 0
  const repaso = resumen?.repaso ?? null
  const evaluacion = resumen?.evaluacionIA ?? null
  const errores = repaso?.errores ?? []
  const ronda = repaso?.ronda ?? []
  const mostrada = useCuentaArriba(pendiente ? 0 : nota)

  const [practica, setPractica] = useState(null)      // ítems de la ronda en curso
  const [notaPractica, setNotaPractica] = useState(null)
  const [retro, setRetro] = useState(null)
  const [pidiendo, setPidiendo] = useState(false)
  const [errorRetro, setErrorRetro] = useState(null)

  function practicar() {
    // Opciones rebarajadas en cada vuelta: repetir no es memorizar posiciones.
    setPractica(ronda.map((it) => ({ ...it, opciones: barajar(it.opciones) })))
  }

  async function pedirConsejos() {
    setPidiendo(true); setErrorRetro(null)
    try {
      const r = await api.juego.retroalimentacion(partidaId, token)
      setRetro(r.retroalimentacion)
    } catch (e) {
      setErrorRetro(e.message)
    } finally {
      setPidiendo(false)
    }
  }

  // ── Ronda de práctica: el mismo celular de las actividades ──
  if (practica) {
    return (
      <div className="juego-simple">
        <PhoneOverlay titulo={t('game.practice_btn', { n: practica.length })}>
          <ActivityRunner
            codigo="repaso"
            contenido={{ items: practica }}
            onFinish={(p) => { setNotaPractica(Math.round(p ?? 0)); setPractica(null) }}
            onSalir={() => setPractica(null)}
          />
        </PhoneOverlay>
      </div>
    )
  }

  return (
    <div className="juego-centro juego-fin">
      <div className={`juego-fin-card ${tramo}`}>
        <div className="juego-cara">{cara}</div>
        <h2>{pendiente ? t('game.submitted_title') : t('game.finished_title')}</h2>
        <p className="juego-fin-sub">
          {pendiente ? t('game.pending_review') : t(`game.verdict_${tramo}`)}
        </p>

        {!pendiente && (
          <div className="juego-nota-caja">
            {/* La nota se oculta a lectores de pantalla porque la barra de
                abajo ya la anuncia completa ("Puntaje: 80 de 100"). */}
            <p className="juego-nota" aria-hidden="true">{mostrada}<small>/100</small></p>
            <div className="juego-nota-barra" role="img" aria-label={t('game.score_aria', { n: nota })}>
              <span style={{ width: `${Math.min(100, Math.max(0, mostrada))}%` }} />
            </div>
            {repaso && (
              <small className="juego-fin-detalle">
                {t('game.correct_of', { ok: repaso.aciertos, total: repaso.total })}
              </small>
            )}
            {!repaso && etapas > 0 && (
              <small className="juego-fin-detalle">{t('game.stages_done', { n: etapas })}</small>
            )}
          </div>
        )}

        {etapas > 0 && (
          <>
            <p className="juego-fin-recorrido-titulo">{t('game.route_title')}</p>
            <ol className="juego-recorrido">
              {resumen.resumen.map((h) => (
                <li key={h.etapa} className={h.resultado}>
                  <span className="juego-etapa-n">{h.etapa}</span>
                  <div>
                    <strong>{h.titulo ?? h.actividad}</strong>
                    <small>{h.escenario}</small>
                  </div>
                  <span className="juego-puntos">{h.puntaje}</span>
                </li>
              ))}
            </ol>
          </>
        )}

        {evaluacion && <EvaluacionRedaccion ev={evaluacion} />}

        {repaso && (
          <section className="rep" aria-label={t('game.review_title')}>
            {repaso.dominadas.length > 0 && (
              <>
                <p className="juego-fin-recorrido-titulo">✅ {t('game.mastered_title')}</p>
                <ul className="rep-chips">
                  {repaso.dominadas.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </>
            )}

            {errores.length === 0 ? (
              <p className="rep-perfecto">🌟 {t('game.perfect')}</p>
            ) : (
              <>
                <p className="juego-fin-recorrido-titulo">🔁 {t('game.review_title')} ({errores.length})</p>
                <ul className="rep-errores">
                  {errores.map((e, k) => (
                    <li key={k} className="rep-error">
                      {e.pregunta && e.pregunta !== e.esperado && <p className="rep-pregunta">{e.pregunta}</p>}
                      <p className="rep-linea ok"><b>✓ {t('game.correct_answer')}:</b> {e.esperado}</p>
                      <p className="rep-linea mal">
                        <b>✗ {t('game.your_answer')}:</b> {e.respondio ?? <i>{t('game.no_answer')}</i>}
                      </p>
                      {e.traduccion && <p className="rep-trad">📖 {e.traduccion.en} = {e.traduccion.es}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="rep-acciones">
              {ronda.length > 0 && (
                <button type="button" className="rep-btn" onClick={practicar}>
                  🔁 {notaPractica == null ? t('game.practice_btn', { n: ronda.length }) : t('game.practice_again')}
                </button>
              )}
              {notaPractica != null && (
                <p className="rep-nota-practica" role="status">{t('game.practice_done', { n: notaPractica })}</p>
              )}

              {resumen.iaDisponible && errores.length > 0 && !retro && (
                <BotonIA className="rep-btn rep-btn-ia" onClick={pedirConsejos}
                  cargando={pidiendo} textoCargando={t('game.tutor_loading')}>
                  ✨ {errorRetro ? t('game.tutor_retry') : t('game.tutor_btn')}
                </BotonIA>
              )}
              {errorRetro && !pidiendo && <p className="rep-error-ia" role="alert">{errorRetro}</p>}
            </div>

            {retro && (
              <div className="rep-tutor" role="status" aria-live="polite">
                <p className="rep-tutor-titulo">✨ {t('game.tutor_title')}</p>
                {retro.resumen && <p>{retro.resumen}</p>}
                {retro.consejos?.length > 0 && (
                  <ul>
                    {retro.consejos.map((c, k) => (
                      <li key={k}>{c.tema && <b>{c.tema}: </b>}{c.explicacion}</li>
                    ))}
                  </ul>
                )}
                {retro.animo && <p className="rep-tutor-animo">{retro.animo}</p>}
              </div>
            )}
          </section>
        )}

        <button className="juego-btn-salir" onClick={onSalir}>
          {t('game.exit')} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}

// ── Redacción (05): lo que revisó la IA ────────────────────
// Nota PROVISIONAL (la confirma el docente), los dos criterios con su
// comentario y los errores con su corrección.
function EvaluacionRedaccion({ ev }) {
  return (
    <section className="rep eval-redaccion" aria-label="Revisión de tu texto">
      <h3 className="rep-titulo">✍️ Revisión de tu texto · {ev.total}/100 <small>(provisional: tu profesor la confirma)</small></h3>
      <ul className="eval-criterios">
        <li><strong>Contexto · {ev.contexto?.puntaje ?? 0}</strong>{ev.contexto?.comentario && <p>{ev.contexto.comentario}</p>}</li>
        <li><strong>Escritura correcta · {ev.escritura?.puntaje ?? 0}</strong>{ev.escritura?.comentario && <p>{ev.escritura.comentario}</p>}</li>
      </ul>
      {ev.errores?.length > 0 && (
        <ul className="eval-errores">
          {ev.errores.map((e, i) => (
            <li key={i}>
              <del>{e.original}</del> → <ins>{e.correccion}</ins>
              {e.explicacion && <small>{e.explicacion}</small>}
            </li>
          ))}
        </ul>
      )}
      {ev.resumen && <p className="muted">{ev.resumen}</p>}
    </section>
  )
}

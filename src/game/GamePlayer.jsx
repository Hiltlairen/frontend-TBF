// ============================================================
// GamePlayer.jsx — Orquesta la partida del estudiante
// ============================================================
// Es la pantalla a la que llega el alumno tras canjear su código.
// Cubre los DOS modos:
//   · simple → una actividad suelta, sin escenario ni ramas
//   · juego  → aventura: escena → actividad → puntaje → escena
//
// La decisión de qué viene después NO se toma aquí: se envían las
// RESPUESTAS a /api/game/avanzar, el servidor calcula la nota y
// devuelve la escena siguiente. Así el alumno no puede manipular ni
// su nota ni su propia ruta.
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import SceneStage from './SceneStage.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import ActivityRunner from './ActivityRunner.jsx'
import ResumenFinal from './ResumenFinal.jsx'
import { useIdioma } from '../i18n/LanguageContext.jsx'
import './Game.css'

const CLAVE_TOKEN_ALUMNO = 'el.token.alumno'

export default function GamePlayer() {
  const { codigo } = useParams()
  const navegar = useNavigate()
  const { t } = useIdioma()

  const [estado, setEstado] = useState('cargando')  // cargando | jugando | transicion | fin | error
  const [error, setError] = useState(null)
  const [token, setToken] = useState(() => sessionStorage.getItem(CLAVE_TOKEN_ALUMNO))
  const [partidaId, setPartidaId] = useState(null)
  const [modo, setModo] = useState(null)
  const [escena, setEscena] = useState(null)
  const [actividadSimple, setActividadSimple] = useState(null)
  const [curso, setCurso] = useState(null)
  const [progreso, setProgreso] = useState({ etapa: 1, totalEtapas: 6, puntajeTotal: 0 })
  const [transicion, setTransicion] = useState(null)
  const [resumen, setResumen] = useState(null)

  // ── Arranque ────────────────────────────────────────────
  useEffect(() => {
    const guardado = sessionStorage.getItem(CLAVE_TOKEN_ALUMNO)
    if (!guardado) { navegar('/', { replace: true }); return }

    api.juego.iniciar(codigo, guardado)
      .then((r) => {
        setModo(r.modo)
        setPartidaId(r.partidaId)
        if (r.token) { sessionStorage.setItem(CLAVE_TOKEN_ALUMNO, r.token); setToken(r.token) }
        if (r.modo === 'simple') setActividadSimple(r.actividad)
        else { setEscena(r.escena); setProgreso(r.progreso) }
        if (r.curso) setCurso(r.curso)
        setEstado('jugando')
      })
      .catch((e) => { setError(e.message); setEstado('error') })
  }, [codigo, navegar])

  // ── Fin de una etapa de la aventura ─────────────────────
  const alTerminarEtapa = useCallback(async (_puntaje, respuestas) => {
    setEstado('transicion')
    try {
      const r = await api.juego.avanzar({ partidaId, respuestas: respuestas ?? {} }, token)

      if (r.fin) {
        setResumen({ ...r, puntajeTotal: r.puntajeTotal })
        setEstado('fin')
        return
      }

      // Se muestra por qué se ramificó antes de cargar la escena nueva
      setTransicion({ resultado: r.resultado, puntaje: r.puntajeEtapa, porQue: r.porQue })
      setTimeout(() => {
        setEscena(r.escena)
        setProgreso(r.progreso)
        setTransicion(null)
        setEstado('jugando')
      }, 2200)
    } catch (e) {
      setError(e.message); setEstado('error')
    }
  }, [partidaId, token])

  // ── Fin de la actividad suelta ──────────────────────────
  const alTerminarSimple = useCallback(async (_puntaje, respuestas) => {
    try {
      const r = await api.juego.entregarSimple({ partidaId, respuestas: respuestas ?? {} }, token)
      setResumen({
        puntajeTotal: r.puntaje,
        pendiente: r.requiereRevision,
        resumen: [],
        repaso: r.repaso,
        iaDisponible: r.iaDisponible,
      })
      setEstado('fin')
    } catch (e) { setError(e.message); setEstado('error') }
  }, [partidaId, token])

  // ── Pantallas ───────────────────────────────────────────
  if (estado === 'cargando') {
    return <div className="juego-centro"><div className="juego-spinner" />{t('game.loading')}</div>
  }

  if (estado === 'error') {
    return (
      <div className="juego-centro juego-error">
        <h2>{t('game.error_title')}</h2>
        <p>{error}</p>
        <button className="ar-btn" onClick={() => navegar('/')}>{t('game.back_home')}</button>
      </div>
    )
  }

  if (estado === 'fin') {
    return (
      <ResumenFinal
        resumen={resumen}
        partidaId={partidaId}
        token={token}
        onSalir={() => { sessionStorage.removeItem(CLAVE_TOKEN_ALUMNO); navegar('/') }}
      />
    )
  }

  // ── Modo simple: sin escenario, el celular directo ──────
  if (modo === 'simple') {
    return (
      <div className="juego-simple">
        {(actividadSimple.leccionTitulo || actividadSimple.autor?.nombre || actividadSimple.curso) && (
          <div className="simple-credito">
            {actividadSimple.curso && (
              <span className="simple-leccion">📘 {actividadSimple.curso}</span>
            )}
            {actividadSimple.leccionTitulo && (
              <span className="simple-leccion">📖 {actividadSimple.leccionTitulo}</span>
            )}
            {actividadSimple.autor?.nombre && (
              <span className="simple-autor">
                {actividadSimple.autor.avatar
                  ? <img className="simple-autor-foto" src={actividadSimple.autor.avatar} alt="" />
                  : <span className="simple-autor-foto simple-autor-ini">{actividadSimple.autor.nombre[0]}</span>}
                {actividadSimple.autor.nombre}
              </span>
            )}
          </div>
        )}
        <PhoneOverlay titulo={actividadSimple.titulo}>
          <ActivityRunner
            codigo={actividadSimple.codigo}
            contenido={actividadSimple.contenido}
            onFinish={alTerminarSimple}
          />
        </PhoneOverlay>
      </div>
    )
  }

  // ── Modo juego ──────────────────────────────────────────
  return (
    <>
      {escena && (
        <SceneStage
          escena={escena.escena}
          guion={escena.guion}
          recorrido={escena.recorrido}
          actividad={escena.actividad}
          curso={curso}
          etapa={escena.etapa}
          totalEtapas={escena.totalEtapas}
          onTerminar={alTerminarEtapa}
        />
      )}

      {transicion && (
        <div className={`juego-transicion ${transicion.resultado}`}>
          <div className="juego-transicion-caja">
            <span className="juego-transicion-puntos">{transicion.puntaje}</span>
            <p>{transicion.porQue}</p>
            <small>{t('game.current_average', { n: progreso.puntajeTotal })}</small>
          </div>
        </div>
      )}

      {estado === 'transicion' && !transicion && (
        <div className="juego-transicion"><div className="juego-spinner" /></div>
      )}
    </>
  )
}

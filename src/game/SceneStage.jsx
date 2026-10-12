// ============================================================
// SceneStage.jsx — El escenario de la aventura
// ============================================================
// Ciclo de una etapa:
//   'entrada' → el personaje camina del punto A al punto B
//   'levanta' → saca el celular (animación "levantar")
//   'celular' → se abre la actividad dentro del teléfono
//   'salida'  → se muestra el resultado y se pasa al siguiente nodo
//
// El fondo todavía no existe como imagen: cada escenario se
// distingue por su degradado (escena.render.gradiente) y por sus
// props. Cuando tengas los PNG, `escena.render.usarFondo` pasa a
// true y se dibuja <img> en vez del degradado. Nada más cambia.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { useGameLoop } from './useGameLoop'
import { CHARACTER } from './gameConfig'
import FrameCharacter from './FrameCharacter'
import PhoneOverlay from './PhoneOverlay.jsx'
import ActivityRunner from './ActivityRunner.jsx'
import './Game.css'

const ANCHO_ESCENA = 960
const DURACION_LEVANTAR = (6 / 10) * 1000 + 250

// Emoji de utilería por escenario. Es un marcador de posición honesto:
// cuando llegue el arte real se borra este mapa.
const PROPS_ESCENARIO = {
  aula: '📋', biblioteca: '📚', parque: '🌳', dormitorio: '🛏️', galeria: '🖼️',
  cafeteria: '☕', calle: '🚦', restaurante: '🍽️', recepcion: '🛎️',
  karaoke: '🎤', estudio_radio: '📻', estacion: '🚉',
  casa_llamada: '🛋️', pasillo_llamada: '🪟',
  torre: '🗼', taller: '🧩', cancha: '🏀',
}

export default function SceneStage({
  escena,          // { id, nombre, render:{...}, props:[] }
  guion,           // línea de contexto
  recorrido,       // { puntoA, puntoB, gapDetencion }
  actividad,       // { codigo, titulo, interaccion, presencia, contenido }
  curso,           // nombre del curso (lo ve el estudiante)
  etapa, totalEtapas,
  onTerminar,      // (puntaje, detalle) => void
}) {
  const [fase, setFase] = useState('entrada')
  const [x, setX] = useState(recorrido?.puntoA ?? 0.1)
  const [estado, setEstado] = useState('correr')
  const [reloj, setReloj] = useState(0)
  const inicioLevantar = useRef(null)

  const destino = (recorrido?.puntoB ?? 0.5) - (recorrido?.gapDetencion ?? 0)
  const hayNpc = escena?.render?.dibujarNpc
  const canal = escena?.render?.canal   // 'presencial' | 'telefono' | 'audio' | null

  // Reinicia la escena cuando cambia la etapa
  useEffect(() => {
    setFase('entrada')
    setX(recorrido?.puntoA ?? 0.1)
    setEstado('correr')
    inicioLevantar.current = null
  }, [actividad?.codigo, etapa, recorrido?.puntoA])

  useGameLoop((dt, transcurrido) => {
    setReloj(transcurrido)

    if (fase === 'entrada') {
      setX((actual) => {
        const siguiente = actual + (CHARACTER.moveSpeed / ANCHO_ESCENA) * dt
        if (siguiente >= destino) {
          setEstado('levantar')
          setFase('levanta')
          inicioLevantar.current = transcurrido
          return destino
        }
        return siguiente
      })
    }

    if (fase === 'levanta' && inicioLevantar.current != null) {
      if (transcurrido - inicioLevantar.current > DURACION_LEVANTAR) setFase('celular')
    }
  })

  function alTerminarActividad(puntaje, detalle) {
    setFase('salida')
    onTerminar(puntaje, detalle)
  }

  const fondo = escena?.render?.usarFondo
    ? { backgroundImage: `url(${escena.fondo})`, backgroundSize: 'cover' }
    : { background: escena?.render?.gradiente ?? 'linear-gradient(180deg,#1e293b,#334155)' }

  return (
    <div className="escena-shell">
      {/* ── Barra superior: dónde estoy y en qué etapa ── */}
      <header className="escena-hud">
        <div className="escena-lugar">
          <span className="escena-emoji">{PROPS_ESCENARIO[escena?.id] ?? '📍'}</span>
          <div>
            <strong>{escena?.nombre ?? 'Escenario'}</strong>
            <small>{actividad?.titulo}</small>
          </div>
        </div>
        <div className="escena-etapa">
          {Array.from({ length: totalEtapas }, (_, i) => (
            <span key={i} className={i < etapa ? 'lleno' : ''} />
          ))}
          <em>{etapa}/{totalEtapas}</em>
        </div>
      </header>

      {/* ── Crédito: de qué lección es y qué docente la creó ── */}
      {(actividad?.leccionTitulo || actividad?.autor?.nombre || curso) && (
        <div className="escena-credito">
          {curso && <span className="escena-leccion">📘 {curso}</span>}
          {actividad?.leccionTitulo && (
            <span className="escena-leccion">📖 {actividad.leccionTitulo}</span>
          )}
          {actividad?.autor?.nombre && (
            <span className="escena-autor">
              {actividad.autor.avatar
                ? <img className="escena-autor-foto" src={actividad.autor.avatar} alt="" />
                : <span className="escena-autor-foto escena-autor-ini">{actividad.autor.nombre[0]}</span>}
              {actividad.autor.nombre}
            </span>
          )}
        </div>
      )}

      {/* ── El escenario ── */}
      <div className="escena-lienzo" style={fondo}>
        <div className="escena-suelo" />

        {/* Punto B marcado: adónde va el personaje */}
        <div className="escena-destino" style={{ left: `${(recorrido?.puntoB ?? 0.5) * 100}%` }}>
          <span>{PROPS_ESCENARIO[escena?.id] ?? '📍'}</span>
        </div>

        {/* La segunda persona SOLO si está físicamente presente */}
        {hayNpc && (
          <div className="escena-npc" style={{ left: `${(recorrido?.puntoB ?? 0.5) * 100}%` }}>
            <div className="escena-npc-cuerpo">🧍</div>
            {fase === 'celular' && <div className="escena-globo">…</div>}
          </div>
        )}

        {/* Si la charla es por celular, se avisa: no hay nadie que dibujar */}
        {canal === 'telefono' && fase !== 'entrada' && (
          <div className="escena-señal">📶 llamada entrante</div>
        )}
        {canal === 'audio' && fase !== 'entrada' && (
          <div className="escena-señal">🔊 solo se escucha una voz</div>
        )}

        {/* Protagonista */}
        <div className="escena-personaje" style={{ left: `${x * 100}%` }}>
          <FrameCharacter
            state={estado}
            facing={destino >= (recorrido?.puntoA ?? 0) ? 'derecha' : 'izquierda'}
            elapsedMs={reloj}
          />
        </div>

        {fase === 'entrada' && <p className="escena-guion">{guion}</p>}
        {fase === 'levanta' && <p className="escena-guion">saca el celular…</p>}
      </div>

      {/* ── El celular con la actividad ── */}
      {fase === 'celular' && (
        <PhoneOverlay
          titulo={actividad.titulo}
          canal={canal}
          contacto={canal === 'telefono' ? (actividad.contenido?.llamante?.nombre ?? 'Llamada') : null}
        >
          <ActivityRunner
            codigo={actividad.codigo}
            contenido={actividad.contenido}
            onFinish={alTerminarActividad}
          />
        </PhoneOverlay>
      )}
    </div>
  )
}

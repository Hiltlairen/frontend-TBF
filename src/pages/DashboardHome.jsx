import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function DashboardHome() {
  const { usuario, puede } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [salas, setSalas] = useState([])
  const [uso, setUso] = useState(null)

  useEffect(() => {
    api.biblioteca.resumen().then(setResumen).catch(() => {})
    api.salas.listar().then((r) => setSalas(r.salas.filter((s) => s.activa))).catch(() => {})
    api.actividades.uso().then(setUso).catch(() => {})
  }, [])

  async function cerrarSala(codigo) {
    await api.salas.cerrar(codigo).catch(() => {})
    setSalas((s) => s.filter((x) => x.codigo !== codigo))
  }

  return (
    <div>
      <h2>Hola, {usuario?.nombre?.split(' ').slice(-1)[0] ?? 'profe'} 👋</h2>
      <p className="muted" style={{ marginBottom: '1.2rem' }}>
        Puedes lanzar una actividad suelta o una aventura de 6 etapas donde el escenario
        siguiente depende del puntaje de cada estudiante.
      </p>

      {/* ── Salas abiertas ahora ── */}
      {salas.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="section-title"><h3>Salas abiertas</h3></div>
          <ul className="salas-lista">
            {salas.map((s) => (
              <li key={s.id}>
                <code className="salas-codigo">{s.codigo}</code>
                <div>
                  <strong>{s.titulo}</strong>
                  <small>{s.modo === 'juego' ? 'Aventura' : 'Actividad simple'}</small>
                </div>
                <button onClick={() => cerrarSala(s.codigo)}>Cerrar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid-2">
        <Link to="/dashboard/actividades/crear" className="card home-card">
          <div className="home-card-icon">🧩</div>
          <h3>Crear y lanzar</h3>
          <p className="muted">Actividad simple o aventura con escenarios y rutas.</p>
        </Link>

        <Link to="/dashboard/resultados" className="card home-card">
          <div className="home-card-icon">📊</div>
          <h3>Gestión de cursos</h3>
          <p className="muted">Las notas de cada estudiante por actividad, y su nota final.</p>
        </Link>

        <Link to="/dashboard/panel" className="card home-card">
          <div className="home-card-icon">📋</div>
          <h3>Mis clases</h3>
          <p className="muted">Actividades por clase y día, con exportación en CSV o PDF.</p>
        </Link>

        <Link to="/dashboard/vocabulario" className="card home-card">
          <div className="home-card-icon">📚</div>
          <h3>Vocabulario</h3>
          <p className="muted">
            {resumen
              ? `${resumen.vocabulario} palabras en ${resumen.lecciones} lecciones.`
              : 'Revisa o agrega palabras clave.'}
          </p>
        </Link>

        {puede('admin') && (
          <Link to="/dashboard/usuarios" className="card home-card">
            <div className="home-card-icon">👥</div>
            <h3>Usuarios</h3>
            <p className="muted">Cuentas de docentes, curadores y admins.</p>
          </Link>
        )}
      </div>

      {/* ── Consumo de Gemini: hace visible el ahorro de tokens ── */}
      {uso && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="section-title">
            <h3>Consumo de Gemini</h3>
            <span className={`badge ${uso.keyConfigurada ? 'badge-ok' : 'badge-error'}`}>
              {uso.keyConfigurada ? uso.modelo : 'sin API key en el servidor'}
            </span>
          </div>
          <div className="uso-metricas">
            <div><strong>{uso.consumo.llamadas}</strong><small>llamadas</small></div>
            <div><strong>{uso.consumo.tokensEntrada.toLocaleString('es-BO')}</strong><small>tokens entrada</small></div>
            <div><strong>{uso.consumo.tokensSalida.toLocaleString('es-BO')}</strong><small>tokens salida</small></div>
            <div><strong>{uso.consumo.aciertosCache}</strong><small>desde caché</small></div>
          </div>
        </div>
      )}
    </div>
  )
}

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  api, guardarSesion, borrarSesion, leerToken, leerUsuario, EVENTO_SESION_CADUCADA,
} from '../lib/api.js'

const Ctx = createContext(null)

export const ROL_NOMBRE = {
  admin:      'Administrador',
  curador:    'Curaduría de contenido',
  docente:    'Docente',
  estudiante: 'Estudiante',
}

// Dónde aterriza cada rol al entrar
export const INICIO_POR_ROL = {
  admin:   '/dashboard',
  curador: '/curaduria',
  docente: '/dashboard',
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => leerUsuario())
  const [cargando, setCargando] = useState(Boolean(leerToken()))

  // Revalida el token guardado contra el servidor al montar
  useEffect(() => {
    if (!leerToken()) { setCargando(false); return }
    api.auth.yo()
      .then(({ usuario }) => { setUsuario(usuario); guardarSesion(leerToken(), usuario) })
      .catch(() => { borrarSesion(); setUsuario(null) })
      .finally(() => setCargando(false))
  }, [])

  // Si el token caduca a mitad de sesión, se limpia todo
  useEffect(() => {
    const alCaducar = () => setUsuario(null)
    window.addEventListener(EVENTO_SESION_CADUCADA, alCaducar)
    return () => window.removeEventListener(EVENTO_SESION_CADUCADA, alCaducar)
  }, [])

  // Paso 1: credenciales + captcha. Si el servidor pide el código del
  // correo, devuelve { requiereCodigo, desafio, enviadoA, minutos } y la
  // sesión recién se abre en verificarCodigo(); si no, { usuario }.
  const entrar = useCallback(async (email, password, captcha) => {
    const r = await api.auth.login(email, password, captcha)
    if (r.requiereCodigo) return r
    guardarSesion(r.token, r.usuario)
    setUsuario(r.usuario)
    return { usuario: r.usuario }
  }, [])

  // Paso 2: el código de 6 dígitos que llegó al correo.
  const verificarCodigo = useCallback(async (desafio, codigo) => {
    const { token, usuario } = await api.auth.verificarCodigoLogin(desafio, codigo)
    guardarSesion(token, usuario)
    setUsuario(usuario)
    return usuario
  }, [])

  // Para flujos que ya traen token+usuario resueltos (activar cuenta,
  // por ejemplo) sin pasar por /login con email+password.
  const entrarConToken = useCallback((token, usuario) => {
    guardarSesion(token, usuario)
    setUsuario(usuario)
  }, [])

  const salir = useCallback(() => { borrarSesion(); setUsuario(null) }, [])

  const puede = useCallback((...roles) => Boolean(usuario && roles.includes(usuario.rol)), [usuario])

  // Refresca el usuario en memoria y almacenamiento tras editar el perfil.
  const actualizarUsuario = useCallback((parche) => {
    setUsuario((prev) => {
      const siguiente = { ...prev, ...parche }
      guardarSesion(leerToken(), siguiente)
      return siguiente
    })
  }, [])

  return (
    <Ctx.Provider value={{ usuario, cargando, entrar, verificarCodigo, entrarConToken, salir, puede, actualizarUsuario }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  return ctx
}

/** Envuelve rutas privadas. `roles` limita quién entra. */
export function RutaProtegida({ roles, children }) {
  const { usuario, cargando } = useAuth()
  const ubicacion = useLocation()

  if (cargando) {
    return <div className="auth-cargando">Verificando sesión…</div>
  }
  if (!usuario) {
    return <Navigate to="/entrar" state={{ desde: ubicacion.pathname }} replace />
  }
  if (roles && !roles.includes(usuario.rol)) {
    return (
      <div className="auth-denegado">
        <h2>Sin permiso</h2>
        <p>
          Tu rol es <strong>{ROL_NOMBRE[usuario.rol]}</strong> y esta sección
          es para {roles.map((r) => ROL_NOMBRE[r]).join(' o ')}.
        </p>
        <a href={INICIO_POR_ROL[usuario.rol] ?? '/'}>Volver a mi inicio</a>
      </div>
    )
  }
  return children
}

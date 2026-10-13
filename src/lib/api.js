// ============================================================
// api.js — Único punto de contacto con el backend
// ============================================================
// Ningún componente hace fetch por su cuenta. Así el token, los
// errores y la URL base viven en un solo sitio.
// ============================================================

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const CLAVE_TOKEN = 'el.token'
const CLAVE_USUARIO = 'el.usuario'

export const guardarSesion = (token, usuario) => {
  localStorage.setItem(CLAVE_TOKEN, token)
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
}
export const leerToken = () => localStorage.getItem(CLAVE_TOKEN)
export const leerUsuario = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? 'null') } catch { return null }
}
export const borrarSesion = () => {
  localStorage.removeItem(CLAVE_TOKEN)
  localStorage.removeItem(CLAVE_USUARIO)
}

/** Se dispara cuando el token caduca, para que la app mande al login. */
export const EVENTO_SESION_CADUCADA = 'sesion-caducada'

async function pedir(ruta, { metodo = 'GET', cuerpo, token = leerToken() } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new Error('No se pudo contactar al servidor. ¿Está corriendo en el puerto 4000?')
  }

  if (res.status === 401 && token) {
    borrarSesion()
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_CADUCADA))
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error ?? `Error ${res.status}`)
    err.status = res.status
    err.detalle = data?.detalle
    err.datos = data   // cuerpo completo (ej. { sinIA, ia, requierenIA } si la IA no está disponible)
    throw err
  }
  return data
}

const get  = (r, t) => pedir(r, { token: t })
const post = (r, cuerpo, t) => pedir(r, { metodo: 'POST', cuerpo, token: t })
const patch= (r, cuerpo) => pedir(r, { metodo: 'PATCH', cuerpo })
const del  = (r) => pedir(r, { metodo: 'DELETE' })

/** Descarga un archivo (CSV, etc.) del backend y dispara el guardado
 *  en el navegador. A diferencia de `pedir()`, la respuesta no es JSON. */
async function descargar(ruta) {
  const token = leerToken()
  let res
  try {
    res = await fetch(`${BASE}${ruta}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new Error('No se pudo contactar al servidor.')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? `Error ${res.status}`)
  }
  const nombreArchivo = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'descarga.csv'
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombreArchivo
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export const api = {
  salud: () => get('/api/salud'),

  auth: {
    // Login en 2 pasos: credenciales + captcha → (código por correo) → verificar
    login:     (email, password, captcha) => post('/api/auth/login', { email, password, captcha }),
    verificarCodigoLogin: (desafio, codigo) => post('/api/auth/login/verificar', { desafio, codigo }),
    reenviarCodigoLogin:  (desafio) => post('/api/auth/login/reenviar', { desafio }),
    // codigoMatricula: solo cuando la sala está vinculada a una clase
    // (estudiante ya registrado por admin/curador). `nombre` sigue
    // sirviendo para salas sueltas sin clase.
    invitado:  (codigo, nombre, codigoMatricula) => post('/api/auth/invitado', { codigo, nombre, codigoMatricula }),
    yo:        () => get('/api/auth/yo'),
    cambiarPassword: (actual, nueva) => post('/api/auth/cambiar-password', { actual, nueva }),
    actualizarPerfil: (datos) => patch('/api/auth/perfil', datos),
    avisoPrivacidad:         () => get('/api/auth/aviso-privacidad'),
    aceptarAvisoPrivacidad:  () => post('/api/auth/aviso-privacidad/aceptar', {}),

    // Verificación de cuenta (momento 1: primer login)
    verificarCuenta:      (token, password, captcha) => post('/api/auth/verificar-cuenta', { token, password, captcha }),
    reenviarVerificacion: (email) => post('/api/auth/reenviar-verificacion', { email }),

    // Restablecer contraseña (momento 2)
    olvidePassword: (email) => post('/api/auth/olvide-password', { email }),
    resetPassword:  (token, password) => post('/api/auth/reset-password', { token, password }),

    // Cambio de email con confirmación (momento 3)
    confirmarCambioEmail:  (token) => post('/api/auth/confirmar-cambio-email', { token }),
    reenviarCambioEmail:   () => post('/api/auth/perfil/reenviar-cambio-email', {}),
    cancelarCambioEmail:   () => post('/api/auth/perfil/cancelar-cambio-email', {}),
  },

  biblioteca: {
    libros:    () => get('/api/library/libros'),
    lecciones: (bookId) => get(`/api/library/libros/${bookId}/lecciones`),
    hojaLibro: (bookId) => get(`/api/library/libros/${bookId}/hoja`),
    vocabulario: (ids) => get(`/api/library/vocabulario?lecciones=${ids.join(',')}`),
    agregarVocabulario: (v) => post('/api/library/vocabulario', v),
    resumen:   () => get('/api/library/resumen'),
  },

  actividades: {
    catalogo:   () => get('/api/activities/catalogo'),
    escenarios: () => get('/api/activities/escenarios'),
    vistaPreviaRuta: (cuerpo) => post('/api/activities/vista-previa-ruta', cuerpo),
    generar:    (cuerpo) => post('/api/activities/generar', cuerpo),
    generarRuta:(cuerpo) => post('/api/activities/generar-ruta', cuerpo),
    estimar:    (cuerpo) => post('/api/activities/estimar', cuerpo),
    estadoIA:   () => get('/api/activities/estado-ia'),
    comprobarIA:() => post('/api/activities/estado-ia/comprobar', {}),
    hoja:       (id, variante = 1) => get(`/api/activities/${id}/hoja?variante=${variante}`),
    listar:     () => get('/api/activities'),
    uso:        () => get('/api/activities/meta/uso'),
    limpiarCache: () => del('/api/activities/meta/cache'),
  },

  salas: {
    crear:  (cuerpo) => post('/api/rooms', cuerpo),
    listar: () => get('/api/rooms'),
    cerrar: (codigo) => post(`/api/rooms/${codigo}/cerrar`, {}),
    info:   (codigo) => get(`/api/rooms/${codigo}`),
  },

  juego: {
    iniciar:  (codigo, token) => post('/api/game/iniciar', { codigo }, token),
    avanzar:  (cuerpo, token) => post('/api/game/avanzar', cuerpo, token),
    entregarSimple: (cuerpo, token) => post('/api/game/entregar-simple', cuerpo, token),
    retroalimentacion: (partidaId, token) => post('/api/game/retroalimentacion', { partidaId }, token),
    partida:  (id, token) => get(`/api/game/partida/${id}`, token),
  },

  curaduria: {
    cola:    (estado = 'pendiente', tipo) =>
               get(`/api/review/cola?estado=${estado}${tipo ? `&tipo=${tipo}` : ''}`),
    item:    (id) => get(`/api/review/${id}`),
    decidir: (id, cuerpo) => post(`/api/review/${id}/decidir`, cuerpo),
    nota:    (id, texto) => post(`/api/review/${id}/nota`, { texto }),
  },

  resultados: {
    listar:       () => get('/api/results'),
    estadisticas: () => get('/api/results/estadisticas'),
    detalle:      (id) => get(`/api/results/${id}`),
  },

  admin: {
    usuarios:      () => get('/api/admin/usuarios'),
    crearUsuario:  (u) => post('/api/admin/usuarios', u),
    editarUsuario: (id, u) => patch(`/api/admin/usuarios/${id}`, u),
    reenviarInvitacion: (id) => post(`/api/admin/usuarios/${id}/reenviar-invitacion`, {}),
    darDeBaja:     (id) => post(`/api/admin/usuarios/${id}/baja`, {}),
    panorama:      () => get('/api/admin/panorama'),
    auditoria:     () => get('/api/admin/auditoria'),
  },

  // Clases (cohortes por semestre): solo admin/curador crean y
  // gestionan el roster; el docente solo consulta `mias`.
  clases: {
    listar:              () => get('/api/clases'),
    mias:                () => get('/api/clases/mias'),
    docentes:            () => get('/api/clases/docentes'),
    crear:               (c) => post('/api/clases', c),
    editar:               (id, c) => patch(`/api/clases/${id}`, c),
    roster:              (id) => get(`/api/clases/${id}/estudiantes`),
    // `filas`: [{ nombre, codigoExterno? }]. `previsualizar` es un
    // dry-run (no escribe nada) para el paso de revisión antes de
    // confirmar; `agregarEstudiantes` vuelve a validar en el servidor.
    previsualizarEstudiantes: (id, filas) => post(`/api/clases/${id}/estudiantes/previsualizar`, { filas }),
    agregarEstudiantes:  (id, filas) => post(`/api/clases/${id}/estudiantes`, { filas }),
    darDeBajaEstudiante: (id) => post(`/api/clases/estudiantes/${id}/baja`, {}),
    finalizar:           (id) => post(`/api/clases/${id}/finalizar`, {}),
    // Deshace "Finalizar" (solo dentro de la ventana de retención).
    reactivar:           (id) => post(`/api/clases/${id}/reactivar`, {}),
    exportar:            (id) => descargar(`/api/clases/${id}/exportar`),
    purgarEstudiante:    (id) => post(`/api/clases/estudiantes/${id}/purgar`, {}),

    // Panel del docente: clases → actividades (salas ya lanzadas,
    // agrupadas por día) → resultados de una de ellas.
    actividades:          (id) => get(`/api/clases/${id}/actividades`),
    progreso:             (id) => get(`/api/clases/${id}/progreso`),
    resultadosActividad:  (id, salaId) => get(`/api/clases/${id}/actividades/${salaId}/resultados`),
    exportarActividadCSV: (id, salaId) => descargar(`/api/clases/${id}/actividades/${salaId}/exportar.csv`),
    exportarActividadPDF: (id, salaId) => descargar(`/api/clases/${id}/actividades/${salaId}/exportar.pdf`),
    // Gestión de cursos: estudiantes × actividades con su nota.
    notas:                (id) => get(`/api/clases/${id}/notas`),
    exportarNotas:        (id) => descargar(`/api/clases/${id}/notas.csv`),
  },
}

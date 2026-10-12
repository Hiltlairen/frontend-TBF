// ============================================================
// MiPerfil.jsx — Cada cuenta edita SUS propios datos
// ============================================================
// Disponible para admin, curador y docente. Permite cambiar
// nombre, email, contraseña y foto de perfil. NO permite darse
// de baja ni cambiar el propio rol: eso es potestad del admin
// sobre terceros.
// ============================================================
import { useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth, ROL_NOMBRE } from '../auth/AuthContext.jsx'
import './Admin.css'

// Reduce la imagen elegida a un cuadrado pequeño (data URL) para
// no guardar fotos pesadas. Nunca sube el archivo crudo.
function comprimirImagen(file, lado = 256) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      img.onload = () => {
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        const c = document.createElement('canvas')
        c.width = c.height = lado
        const ctx = c.getContext('2d')
        ctx.drawImage(img, sx, sy, min, min, 0, 0, lado, lado)
        resolve(c.toDataURL('image/jpeg', 0.82))
      }
      img.src = lector.result
    }
    lector.readAsDataURL(file)
  })
}

export default function MiPerfil() {
  const { usuario, actualizarUsuario } = useAuth()
  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [avatar, setAvatar] = useState(usuario?.avatar ?? null)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const fileRef = useRef(null)

  async function elegirFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try { setAvatar(await comprimirImagen(file)) }
    catch (err) { setError(err.message) }
  }

  async function guardar(e) {
    e.preventDefault()
    setError(null); setAviso(null); setGuardando(true)
    const datos = { nombre, email, avatar }
    if (passwordNueva) { datos.passwordActual = passwordActual; datos.passwordNueva = passwordNueva }
    try {
      const { usuario: act, cambioEmailPendiente } = await api.auth.actualizarPerfil(datos)
      actualizarUsuario(act)
      // El email visible en el formulario es el que YA está activo —
      // el nuevo queda pendiente hasta que se confirme desde ese correo.
      setEmail(act.email)
      setPasswordActual(''); setPasswordNueva('')
      setAviso(cambioEmailPendiente
        ? `Perfil actualizado. Te mandamos un correo a ${act.emailPendiente} para confirmar el cambio — tu cuenta sigue usando ${act.email} hasta que lo confirmes.`
        : 'Perfil actualizado.')
    } catch (err) { setError(err.message) }
    finally { setGuardando(false) }
  }

  async function reenviarCambioEmail() {
    setError(null); setAviso(null)
    try { await api.auth.reenviarCambioEmail(); setAviso('Enlace de confirmación reenviado.') }
    catch (err) { setError(err.message) }
  }

  async function cancelarCambioEmail() {
    setError(null); setAviso(null)
    try {
      await api.auth.cancelarCambioEmail()
      actualizarUsuario({ emailPendiente: null })
      setAviso('Cambio de correo cancelado.')
    } catch (err) { setError(err.message) }
  }

  const iniciales = nombre?.[0] ?? usuario?.nombre?.[0] ?? '?'

  return (
    <div className="adm-page perfil-page">
      <h2>Mi perfil</h2>
      <p className="muted">
        Tu rol es <strong>{ROL_NOMBRE[usuario?.rol]}</strong>. Puedes cambiar tu nombre,
        correo, contraseña y foto. Para darte de baja, contacta a un administrador.
      </p>

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}
      {aviso && <p className="badge badge-ok" style={{ display: 'block' }}>{aviso}</p>}

      {usuario?.emailPendiente && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>
            Cambio de correo pendiente a <strong>{usuario.emailPendiente}</strong>. Confírmalo desde
            el enlace que te mandamos a esa dirección.
          </p>
          <div className="adm-barra" style={{ marginTop: '.6rem' }}>
            <button type="button" className="adm-btn" onClick={reenviarCambioEmail}>Reenviar enlace</button>
            <button type="button" className="adm-baja" onClick={cancelarCambioEmail}>Cancelar cambio</button>
          </div>
        </div>
      )}

      <form className="card perfil-card" onSubmit={guardar}>
        <div className="perfil-foto-fila">
          {avatar
            ? <img className="perfil-foto" src={avatar} alt="Tu foto de perfil" />
            : <span className="perfil-foto perfil-foto-ini">{iniciales}</span>}
          <div className="perfil-foto-acc">
            <button type="button" className="adm-btn" onClick={() => fileRef.current?.click()}>
              Cambiar foto
            </button>
            {avatar && (
              <button type="button" className="perfil-quitar" onClick={() => setAvatar(null)}>
                Quitar
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={elegirFoto} />
            <small className="muted">JPG o PNG. Se recorta en cuadrado.</small>
          </div>
        </div>

        <div className="field">
          <label>Nombre</label>
          <input value={nombre} required onChange={(e) => setNombre(e.target.value)} />
        </div>

        <div className="field">
          <label>Email</label>
          <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
        </div>

        <fieldset className="perfil-pass">
          <legend>Cambiar contraseña (opcional)</legend>
          <div className="field">
            <label>Contraseña actual</label>
            <input type="password" value={passwordActual} autoComplete="current-password"
              onChange={(e) => setPasswordActual(e.target.value)}
              placeholder="Solo si vas a cambiarla" />
          </div>
          <div className="field">
            <label>Contraseña nueva (mín. 8)</label>
            <input type="password" value={passwordNueva} autoComplete="new-password" minLength={8}
              onChange={(e) => setPasswordNueva(e.target.value)}
              placeholder="Déjala vacía para no cambiarla" />
          </div>
        </fieldset>

        <button className="adm-btn adm-btn-ok" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}

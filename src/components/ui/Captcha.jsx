// ============================================================
// Captcha.jsx — "No soy un robot" (Cloudflare Turnstile)
// ============================================================
// Muestra el widget y entrega el token por `onToken`. El servidor lo
// valida (server/src/services/captcha.js): sin eso no sirve de nada.
// Sin VITE_TURNSTILE_SITE_KEY no se muestra nada (desarrollo).
// Los tokens son de UN uso: tras un intento fallido hay que pedir otro,
// para eso está `reiniciar` (cambiar su valor reinicia el widget).
// ============================================================
import { useEffect, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''
export const captchaActivo = Boolean(SITE_KEY)

let cargaScript = null
function cargarTurnstile() {
  cargaScript ??= new Promise((resolver, rechazar) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = resolver
    s.onerror = () => { cargaScript = null; rechazar(new Error('No se pudo cargar el captcha.')) }
    document.head.appendChild(s)
  })
  return cargaScript
}

export default function Captcha({ onToken, reiniciar = 0, idioma = 'es' }) {
  const caja = useRef(null)
  const widget = useRef(null)
  const alToken = useRef(onToken)
  alToken.current = onToken

  useEffect(() => {
    if (!captchaActivo) return
    let vigente = true
    cargarTurnstile()
      .then(() => {
        if (!vigente || !caja.current || !window.turnstile) return
        widget.current = window.turnstile.render(caja.current, {
          sitekey: SITE_KEY,
          language: idioma,
          theme: 'auto',
          callback: (t) => alToken.current(t),
          'expired-callback': () => alToken.current(''),
          'error-callback': () => alToken.current(''),
        })
      })
      .catch(() => alToken.current(''))
    return () => {
      vigente = false
      if (widget.current != null) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [idioma])

  useEffect(() => {
    if (!reiniciar || widget.current == null) return
    window.turnstile?.reset(widget.current)
    alToken.current('')
  }, [reiniciar])

  if (!captchaActivo) return null
  return <div className="captcha" ref={caja} />
}

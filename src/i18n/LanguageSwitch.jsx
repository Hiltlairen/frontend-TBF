// ============================================================
// LanguageSwitch.jsx — Botoncito ES/EN para las pantallas públicas
// ============================================================
import { useIdioma } from './LanguageContext.jsx'
import './LanguageSwitch.css'

const OPCIONES = [
  { valor: 'es', etiqueta: 'ES' },
  { valor: 'en', etiqueta: 'EN' },
]

export default function LanguageSwitch({ className = '' }) {
  const { idioma, cambiarIdioma } = useIdioma()
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label="Idioma / Language">
      {OPCIONES.map((o) => (
        <button
          key={o.valor}
          type="button"
          className={idioma === o.valor ? 'activo' : ''}
          aria-pressed={idioma === o.valor}
          onClick={() => cambiarIdioma(o.valor)}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

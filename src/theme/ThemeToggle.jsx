// ============================================================
// ThemeToggle.jsx — El botón global de tema claro/oscuro
// ============================================================
// Un solo botón: muestra el tema al que va a cambiar, no el actual
// (así el icono y el texto siempre anticipan el resultado del clic).
// aria-pressed indica si el tema oscuro está activo.
// Se usa en el topbar del panel y en las pantallas de entrada.
// ============================================================
import { useTema } from './ThemeContext.jsx'
import { useIdioma } from '../i18n/LanguageContext.jsx'
import './ThemeToggle.css'

export default function ThemeToggle({ className = '', soloIcono = false }) {
  const { esOscuro, alternarTema } = useTema()
  const { t } = useIdioma()

  const etiqueta = esOscuro ? t('theme.to_light') : t('theme.to_dark')
  const texto = esOscuro ? t('theme.light') : t('theme.dark')

  return (
    <button
      type="button"
      className={`theme-toggle ${soloIcono ? 'theme-toggle-icono' : ''} ${className}`}
      onClick={alternarTema}
      aria-pressed={esOscuro}
      aria-label={etiqueta}
      title={etiqueta}
    >
      {/* aria-hidden: el texto de al lado ya describe la acción, un lector
          de pantalla no necesita que le lea el emoji dos veces. */}
      <span className="theme-toggle-icono-caja" aria-hidden="true">{esOscuro ? '☀️' : '🌙'}</span>
      {!soloIcono && <span className="theme-toggle-txt">{texto}</span>}
    </button>
  )
}

// ============================================================
// LanguageContext.jsx — Selector de idioma para la interfaz (punto 7)
// ============================================================
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { traducir, IDIOMAS_DISPONIBLES } from './translations.js'

const CLAVE_IDIOMA = 'el.idioma'
const IDIOMA_POR_DEFECTO = 'es'

function idiomaGuardado() {
  try {
    const v = localStorage.getItem(CLAVE_IDIOMA)
    return IDIOMAS_DISPONIBLES.includes(v) ? v : IDIOMA_POR_DEFECTO
  } catch {
    // Si localStorage no está disponible (modo privado, etc.) seguimos
    // funcionando con el idioma por defecto, solo que sin recordarlo.
    return IDIOMA_POR_DEFECTO
  }
}

const IdiomaContext = createContext(null)

export function IdiomaProvider({ children }) {
  const [idioma, setIdioma] = useState(idiomaGuardado)

  const cambiarIdioma = useCallback((nuevo) => {
    if (!IDIOMAS_DISPONIBLES.includes(nuevo)) return
    setIdioma(nuevo)
    try { localStorage.setItem(CLAVE_IDIOMA, nuevo) } catch { /* modo privado: no persiste, no pasa nada */ }
  }, [])

  const valor = useMemo(() => ({
    idioma,
    cambiarIdioma,
    t: (clave, vars) => traducir(idioma, clave, vars),
  }), [idioma, cambiarIdioma])

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>
}

/** Hook de traducción: const { t, idioma, cambiarIdioma } = useIdioma() */
export function useIdioma() {
  const ctx = useContext(IdiomaContext)
  if (!ctx) throw new Error('useIdioma() se usó fuera de <IdiomaProvider>')
  return ctx
}

// ============================================================
// ThemeContext.jsx — Tema claro / oscuro de toda la aplicación
// ============================================================
// El tema se aplica como atributo en <html> (data-tema="claro|oscuro"),
// no como clase en un contenedor: así el CSS puede reaccionar con
// [data-tema="oscuro"] y también quedan tematizados los controles
// nativos del navegador (scrollbars, inputs, autofill) vía color-scheme.
//
// Mismo patrón que LanguageContext.jsx: Provider + hook + persistencia
// en localStorage con try/catch (modo privado no debe romper la app).
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const TEMAS_DISPONIBLES = ['claro', 'oscuro']
export const CLAVE_TEMA = 'el.tema'
const TEMA_POR_DEFECTO = 'claro'

/** Lo que pide el sistema operativo del usuario. */
function temaDelSistema() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : TEMA_POR_DEFECTO
  } catch {
    return TEMA_POR_DEFECTO
  }
}

function temaGuardado() {
  try {
    const v = localStorage.getItem(CLAVE_TEMA)
    // Si el usuario ya eligió alguna vez, su elección manda sobre el
    // sistema; si no eligió nunca, arrancamos con lo que pida el SO.
    return TEMAS_DISPONIBLES.includes(v) ? v : temaDelSistema()
  } catch {
    return temaDelSistema()
  }
}

/** Escribe el tema en el <html>. Lo repite index.html antes del primer
 *  pintado para que no se vea un parpadeo blanco al cargar. */
function aplicarTema(tema) {
  const raiz = document.documentElement
  raiz.setAttribute('data-tema', tema)
  raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light'
}

const TemaContext = createContext(null)

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(temaGuardado)

  useEffect(() => { aplicarTema(tema) }, [tema])

  const cambiarTema = useCallback((nuevo) => {
    if (!TEMAS_DISPONIBLES.includes(nuevo)) return
    setTema(nuevo)
    try { localStorage.setItem(CLAVE_TEMA, nuevo) } catch { /* modo privado: no persiste, no pasa nada */ }
  }, [])

  const alternarTema = useCallback(() => {
    setTema((actual) => {
      const nuevo = actual === 'oscuro' ? TEMA_POR_DEFECTO : 'oscuro'
      try { localStorage.setItem(CLAVE_TEMA, nuevo) } catch { /* modo privado */ }
      return nuevo
    })
  }, [])

  const valor = useMemo(() => ({
    tema,
    esOscuro: tema === 'oscuro',
    cambiarTema,
    alternarTema,
  }), [tema, cambiarTema, alternarTema])

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}

/** Hook del tema: const { tema, esOscuro, alternarTema, cambiarTema } = useTema() */
export function useTema() {
  const ctx = useContext(TemaContext)
  if (!ctx) throw new Error('useTema() se usó fuera de <TemaProvider>')
  return ctx
}

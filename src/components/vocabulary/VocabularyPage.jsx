// ============================================================
// VocabularyPage.jsx — Vista de vocabulario tipo hoja de cálculo
// ============================================================
// Estructura (como una hoja de Excel):
//   · Arriba  → pestañas con los LIBROS. Se elige uno.
//   · Izquierda → columna vertical con las LECCIONES del libro,
//                 cada una con su conteo de palabras.
//   · Derecha → ocupa la mayor parte: el VOCABULARIO de la
//               lección seleccionada, en tabla.
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api.js'
import AddVocabularyModal from './AddVocabularyModal.jsx'
import './Vocabulary.css'

export default function VocabularyPage() {
  const [books, setBooks] = useState([])
  const [bookId, setBookId] = useState(null)
  const [hoja, setHoja] = useState([])        // [{ id, numero, titulo, total, vocabulario:[] }]
  const [lessonId, setLessonId] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState('')

  // 1) Cargar libros y abrir el primero por defecto
  useEffect(() => {
    api.biblioteca.libros()
      .then((r) => {
        setBooks(r.libros)
        if (r.libros[0]) setBookId(r.libros[0].id)
      })
      .catch((e) => setError(e.message))
  }, [])

  // 2) Cargar la hoja completa del libro elegido
  const cargarHoja = useCallback(() => {
    if (!bookId) return
    setCargando(true); setError(null)
    api.biblioteca.hojaLibro(bookId)
      .then((r) => {
        setHoja(r.lecciones)
        // Mantener la lección elegida si sigue existiendo; si no, la primera
        setLessonId((prev) =>
          r.lecciones.some((l) => l.id === prev) ? prev : (r.lecciones[0]?.id ?? null)
        )
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [bookId])

  useEffect(cargarHoja, [cargarHoja])

  const leccion = hoja.find((l) => l.id === lessonId) ?? null
  const lessonsParaModal = hoja.map((l) => ({ id: l.id, numero: l.numero, titulo: l.titulo }))

  const vocabFiltrado = (leccion?.vocabulario ?? []).filter((v) => {
    if (!filtro.trim()) return true
    const q = filtro.toLowerCase()
    return (
      v.ingles?.toLowerCase().includes(q) ||
      v.espanol?.toLowerCase().includes(q) ||
      v.categoria?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="voc-page">
      <div className="section-title">
        <h2>Vocabulario</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={!leccion}>
          + Agregar palabra
        </button>
      </div>

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}
      {aviso && <p className="badge badge-ok" style={{ display: 'block' }}>{aviso}</p>}

      {/* ── Pestañas de LIBROS (arriba) ── */}
      <div className="voc-libros" role="tablist">
        {books.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={b.id === bookId}
            className={`voc-libro-tab ${b.id === bookId ? 'activo' : ''}`}
            onClick={() => setBookId(b.id)}
          >
            {b.nombre}
          </button>
        ))}
      </div>

      {/* ── Hoja: lecciones (izq) + vocabulario (der) ── */}
      <div className="voc-hoja">
        <aside className="voc-lecciones" role="tablist" aria-label="Lecciones">
          {cargando && hoja.length === 0 && <p className="voc-cargando">Cargando…</p>}
          {hoja.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={l.id === lessonId}
              className={`voc-leccion ${l.id === lessonId ? 'activa' : ''}`}
              onClick={() => { setLessonId(l.id); setFiltro('') }}
            >
              <span className="voc-leccion-num">L{l.numero}</span>
              <span className="voc-leccion-txt">
                <strong>{l.titulo}</strong>
                <small>{l.total} palabra{l.total === 1 ? '' : 's'}</small>
              </span>
            </button>
          ))}
        </aside>

        <section className="voc-detalle">
          {!leccion && !cargando && (
            <div className="voc-vacio">Selecciona una lección para ver su vocabulario.</div>
          )}

          {leccion && (
            <>
              <header className="voc-detalle-cab">
                <div>
                  <h3>Lección {leccion.numero} — {leccion.titulo}</h3>
                  {leccion.temas && <p className="voc-temas">{leccion.temas}</p>}
                </div>
                <input
                  className="voc-buscar"
                  placeholder="Filtrar palabra o categoría…"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </header>

              {vocabFiltrado.length === 0 ? (
                <div className="voc-vacio">
                  {leccion.total === 0
                    ? 'Esta lección aún no tiene vocabulario. Usa “+ Agregar palabra”.'
                    : 'Ninguna palabra coincide con el filtro.'}
                </div>
              ) : (
                <div className="voc-tabla-scroll">
                  <table className="voc-tabla">
                    <thead>
                      <tr>
                        <th className="voc-col-n">#</th>
                        <th>Categoría</th>
                        <th>Inglés</th>
                        <th>Español</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vocabFiltrado.map((v, i) => (
                        <tr key={v.id}>
                          <td className="voc-col-n">{i + 1}</td>
                          <td><span className="voc-cat">{v.categoria}</span></td>
                          <td className="voc-en">{v.ingles}</td>
                          <td>{v.espanol}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showAdd && (
        <AddVocabularyModal
          lessons={lessonsParaModal}
          defaultLessonId={lessonId}
          onClose={() => setShowAdd(false)}
          onSaved={(enCuraduria) => {
            setShowAdd(false)
            setAviso(enCuraduria
              ? 'Palabra enviada a curaduría; aparecerá al aprobarse.'
              : 'Palabra agregada.')
            cargarHoja()
          }}
        />
      )}
    </div>
  )
}

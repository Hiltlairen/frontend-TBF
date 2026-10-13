// ============================================================
// VocabularyPage.jsx — Vocabulario en menús desplegables
// ============================================================
// Tres niveles que se abren uno dentro del otro:
//   LIBRO  →  sus LECCIONES  →  las PALABRAS de la lección (tabla).
// Cada nivel se despliega al tocarlo y se puede tener más de uno
// abierto a la vez. El vocabulario de un libro se pide la primera vez
// que se abre (GET /api/library/libros/:id/hoja) y queda en memoria.
// ============================================================
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import AddVocabularyModal from './AddVocabularyModal.jsx'
import './Vocabulary.css'

export default function VocabularyPage() {
  const [books, setBooks] = useState([])
  const [hojas, setHojas] = useState({})            // { bookId: [{ id, numero, titulo, temas, total, vocabulario }] }
  const [cargandoLibro, setCargandoLibro] = useState(null)
  const [librosAbiertos, setLibrosAbiertos] = useState(() => new Set())
  const [leccionesAbiertas, setLeccionesAbiertas] = useState(() => new Set())
  const [filtros, setFiltros] = useState({})        // { lessonId: texto }
  const [agregarEn, setAgregarEn] = useState(null)  // { bookId, lessonId } del modal abierto
  const [aviso, setAviso] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.biblioteca.libros()
      .then((r) => setBooks(r.libros))
      .catch((e) => setError(e.message))
  }, [])

  async function cargarHoja(bookId) {
    setCargandoLibro(bookId); setError(null)
    try {
      const r = await api.biblioteca.hojaLibro(bookId)
      setHojas((prev) => ({ ...prev, [bookId]: r.lecciones }))
    } catch (e) { setError(e.message) }
    finally { setCargandoLibro(null) }
  }

  function alternarLibro(bookId) {
    setLibrosAbiertos((prev) => {
      const s = new Set(prev)
      if (s.has(bookId)) s.delete(bookId)
      else { s.add(bookId); if (!hojas[bookId]) cargarHoja(bookId) }
      return s
    })
  }

  function alternarLeccion(lessonId) {
    setLeccionesAbiertas((prev) => {
      const s = new Set(prev)
      if (s.has(lessonId)) s.delete(lessonId); else s.add(lessonId)
      return s
    })
  }

  const filtrar = (vocab, texto) => {
    const q = (texto ?? '').trim().toLowerCase()
    if (!q) return vocab
    return vocab.filter((v) =>
      v.ingles?.toLowerCase().includes(q) || v.espanol?.toLowerCase().includes(q) || v.categoria?.toLowerCase().includes(q))
  }

  return (
    <div className="voc-page">
      <div className="section-title">
        <h2>Vocabulario</h2>
      </div>
      <p className="muted voc-intro">Abre un libro para ver sus lecciones, y una lección para ver sus palabras.</p>

      {error && <p className="badge badge-error" style={{ display: 'block' }}>{error}</p>}
      {aviso && <p className="badge badge-ok" style={{ display: 'block' }}>{aviso}</p>}

      <div className="voc-arbol">
        {books.map((b) => {
          const abierto = librosAbiertos.has(b.id)
          const lecciones = hojas[b.id]
          const totalLibro = lecciones?.reduce((n, l) => n + l.total, 0)
          return (
            <section key={b.id} className={`voc-nodo voc-nodo-libro ${abierto ? 'abierto' : ''}`}>
              <button type="button" className="voc-cabecera" aria-expanded={abierto} onClick={() => alternarLibro(b.id)}>
                <span className="voc-flecha" aria-hidden="true">▸</span>
                <span className="voc-icono" aria-hidden="true">📘</span>
                <span className="voc-cab-txt">
                  <strong>{b.nombre}</strong>
                  <small>
                    Nivel {b.nivel}
                    {lecciones && ` · ${lecciones.length} lecciones · ${totalLibro} palabras`}
                  </small>
                </span>
              </button>

              {abierto && (
                <div className="voc-hijos">
                  {cargandoLibro === b.id && <p className="voc-cargando">Cargando lecciones…</p>}
                  {lecciones?.map((l) => {
                    const lAbierta = leccionesAbiertas.has(l.id)
                    const vocab = filtrar(l.vocabulario, filtros[l.id])
                    return (
                      <section key={l.id} className={`voc-nodo voc-nodo-leccion ${lAbierta ? 'abierto' : ''}`}>
                        <button type="button" className="voc-cabecera" aria-expanded={lAbierta} onClick={() => alternarLeccion(l.id)}>
                          <span className="voc-flecha" aria-hidden="true">▸</span>
                          <span className="voc-leccion-num">L{l.numero}</span>
                          <span className="voc-cab-txt">
                            <strong>{l.titulo}</strong>
                            <small>{l.total} palabra{l.total === 1 ? '' : 's'}</small>
                          </span>
                        </button>

                        {lAbierta && (
                          <div className="voc-hijos voc-palabras">
                            {l.temas && <p className="voc-temas">{l.temas}</p>}
                            <div className="voc-palabras-barra">
                              <input className="voc-buscar" placeholder="Filtrar palabra o categoría…"
                                value={filtros[l.id] ?? ''}
                                onChange={(e) => setFiltros((prev) => ({ ...prev, [l.id]: e.target.value }))} />
                              <button className="btn btn-primary" type="button"
                                onClick={() => { setAviso(null); setAgregarEn({ bookId: b.id, lessonId: l.id }) }}>
                                + Agregar palabra
                              </button>
                            </div>

                            {vocab.length === 0 ? (
                              <div className="voc-vacio">
                                {l.total === 0
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
                                    {vocab.map((v, i) => (
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
                          </div>
                        )}
                      </section>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {agregarEn && (
        <AddVocabularyModal
          lessons={(hojas[agregarEn.bookId] ?? []).map((l) => ({ id: l.id, numero: l.numero, titulo: l.titulo }))}
          defaultLessonId={agregarEn.lessonId}
          onClose={() => setAgregarEn(null)}
          onSaved={(enCuraduria) => {
            const { bookId } = agregarEn
            setAgregarEn(null)
            setAviso(enCuraduria
              ? 'Palabra enviada a curaduría; aparecerá al aprobarse.'
              : 'Palabra agregada.')
            cargarHoja(bookId)
          }}
        />
      )}
    </div>
  )
}

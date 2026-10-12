import { useState } from 'react'
import { api } from '../../lib/api.js'
import { useCerrarConEscape } from '../../lib/a11y.js'

export default function AddVocabularyModal({ lessons, defaultLessonId, onClose, onSaved }) {
  useCerrarConEscape(onClose)
  const [lessonId,   setLessonId]   = useState(defaultLessonId ?? lessons[0]?.id ?? '')
  const [categoria,  setCategoria]  = useState('')
  const [ingles,     setIngles]     = useState('')
  const [espanol,    setEspanol]    = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!lessonId || !categoria || !ingles || !espanol) {
      setError('Completa todos los campos.'); return
    }
    setSaving(true); setError(null)
    try {
      // Si lo sube un docente, la palabra entra a la cola de curaduría
      // antes de aparecer para los estudiantes.
      const r = await api.biblioteca.agregarVocabulario({
        lesson_id: Number(lessonId), categoria, ingles, espanol,
      })
      onSaved(r.enCuraduria)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="agregar-vocab-titulo">
        <div className="section-title"><h3 id="agregar-vocab-titulo">Agregar palabra de vocabulario</h3></div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Lección</label>
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>Lección {l.numero} — {l.titulo}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Categoría</label>
            <input placeholder="Ej. Animales, Ropa, Verbos…" value={categoria}
              onChange={(e) => setCategoria(e.target.value)} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Inglés</label>
              <input value={ingles} onChange={(e) => setIngles(e.target.value)} />
            </div>
            <div className="field">
              <label>Español</label>
              <input value={espanol} onChange={(e) => setEspanol(e.target.value)} />
            </div>
          </div>
          {error && <p className="badge badge-error">{error}</p>}
          <div className="generation-slot-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit"  className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

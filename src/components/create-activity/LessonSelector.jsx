import { puedeSeleccionar, puedeQuitar, toggleLeccion, MAX_LECCIONES } from '../../lib/lessonRules.js'

export default function LessonSelector({ lessons, selectedLessons, onChange, loading }) {
  const numeros = selectedLessons.map((l) => l.numero)

  function handleClick(lesson) {
    const next = toggleLeccion(lesson, selectedLessons)
    onChange(next)
  }

  return (
    <div className="card">
      <div className="section-title">
        <h3>2. Selecciona hasta {MAX_LECCIONES} lecciones (consecutivas)</h3>
        <span className="badge badge-warn">{selectedLessons.length}/{MAX_LECCIONES}</span>
      </div>

      {loading && <p className="muted">Cargando lecciones…</p>}
      {!loading && lessons.length === 0 && <p className="muted">Selecciona primero un libro.</p>}

      {!loading && lessons.length > 0 && (
        <>
          <div className="lesson-grid">
            {lessons.map((lesson) => {
              const isSelected = selectedLessons.some((l) => l.id === lesson.id)
              const canSelect = isSelected
                ? puedeQuitar(lesson.numero, numeros)
                : puedeSeleccionar(lesson.numero, numeros)

              return (
                <button
                  key={lesson.id}
                  type="button"
                  disabled={!canSelect && !isSelected}
                  onClick={() => handleClick(lesson)}
                  className={[
                    'lesson-option',
                    isSelected ? 'lesson-option-active' : '',
                    !canSelect && isSelected ? 'lesson-option-locked' : '',
                  ].join(' ')}
                  title={
                    isSelected && !canSelect
                      ? 'No se puede quitar una lección del medio del bloque seleccionado'
                      : undefined
                  }
                >
                  <span className="lesson-option-num">Lección {lesson.numero}</span>
                  <span className="lesson-option-title">{lesson.titulo}</span>
                </button>
              )
            })}
          </div>
          <p className="muted lesson-hint">
            Debes elegir lecciones consecutivas. Si eliges la Lección 3, puedes sumar la 2 y la 1 (o la 4 y 5),
            pero no puedes saltar bloques.
          </p>
        </>
      )}
    </div>
  )
}

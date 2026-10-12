export default function BookSelector({ books, selectedBookId, onSelect, loading }) {
  return (
    <div className="card">
      <div className="section-title">
        <h3>1. Selecciona el libro</h3>
      </div>

      {loading && <p className="muted">Cargando libros…</p>}

      {!loading && (
        <div className="book-grid">
          {books.map((book) => {
            const active = book.id === selectedBookId
            return (
              <button
                key={book.id}
                type="button"
                className={`book-option ${active ? 'book-option-active' : ''}`}
                onClick={() => onSelect(book.id)}
              >
                <div className="book-option-title">{book.nombre}</div>
                {book.descripcion && <div className="book-option-desc">{book.descripcion}</div>}
              </button>
            )
          })}
          {books.length === 0 && (
            <p className="muted">No hay libros cargados todavía en Supabase.</p>
          )}
        </div>
      )}
    </div>
  )
}

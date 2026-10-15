
import './App.css'

function App() {
  return (
    <main className="page">
      <header className="header">
        <div className="brand">
          <span className="brand-icon">♫</span>
          <span>Under<span className="brand-accent">Music</span></span>
        </div>
        <span className="header-label">Descubre música emergente</span>
      </header>

      <section className="hero">
        <span className="eyebrow">LA ESCENA MUSICAL EMPIEZA AQUÍ</span>
        <h1>
          Descubre el talento
          <br />
          <span>que está cerca de ti.</span>
        </h1>
        <p>
          Explora artistas emergentes, conoce sus canciones y conecta
          con nuevas voces de tu ciudad.
        </p>
        <div className="status">
          <span className="status-dot" />
          Próximamente: perfiles y canciones públicas
        </div>
      </section>

      <footer className="footer">
        UnderMusic · Música emergente, conexiones reales
      </footer>
    </main>
  )
}

export default App

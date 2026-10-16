import { Link } from 'react-router-dom'
import { ArrowRight, Smartphone } from 'lucide-react'
import './Inicio.css'

export default function Inicio() {
  return (
    <main className="um-home-page">
      <header className="um-home-header">
        <Link
          to="/"
          className="um-home-brand"
          aria-label="Inicio de UnderMusic"
        >
          <img
            src="/images/logo-undermusic.png"
            alt="UnderMusic"
          />
        </Link>

        <Link to="/descargar" className="um-home-header-download">
          <Smartphone size={18} />
          <span>Descargar UnderMusic</span>
        </Link>
      </header>

      <section className="um-home-hero">

        <h1>
          Descubre artistas emergentes
          <span> cerca de ti.</span>
        </h1>

        <p>
          Explora nuevos sonidos, conoce el talento independiente
          de tu ciudad y conecta con artistas que merecen ser
          escuchados.
        </p>

        <Link to="/descargar" className="um-home-main-button">
          Prueba UnderMusic para Android
          <ArrowRight size={21} />
        </Link>

        <span className="um-home-availability">
          UnderMusic está en desarrollo · Próximamente disponible para Android
        </span>
      </section>
    </main>
  )
}
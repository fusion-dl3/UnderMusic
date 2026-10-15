
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Headphones,
  MapPin,
  Mic2,
  Music2,
  Radio,
  Users,
  Guitar,
  Sparkles,
  Smartphone,
  Heart,
} from 'lucide-react'

import './Descargar.css'

export default function Descargar() {
  return (
    <main className="um-download-page">
      <header className="um-download-header">
        <Link to="/" className="um-download-back">
          <ArrowLeft size={18} />
          <span>Volver al inicio</span>
        </Link>
      </header>

      <section className="um-download-hero">
        <img
          src="/images/logo-undermusic.png"
          alt="UnderMusic - Descubre, Conecta, Escucha"
          className="um-download-logo"
        />

        <p className="um-download-intro">
          Una nueva forma de descubrir música,
          compartir tu talento y conectar con
          personas que viven la música como tú.
        </p>

        <div className="um-download-android">
          <Smartphone size={22} />
          <span>Próximamente para Android</span>
        </div>

        <p className="um-download-status">
          Estamos trabajando para llevar UnderMusic
          a tus manos.
        </p>
      </section>

      <section className="um-download-section">
        <div className="um-download-section-heading">
          <Music2 size={28} />
          <h2>¿Qué es UnderMusic?</h2>
        </div>

        <p>
          UnderMusic es una plataforma musical creada
          para descubrir, compartir y conectar talento
          emergente.
        </p>

        <p>
          Su objetivo es dar mayor visibilidad a artistas
          que están comenzando su camino en la música,
          facilitando el descubrimiento de nuevos sonidos
          mediante la ubicación geográfica, los géneros
          musicales y los intereses de cada usuario.
        </p>

        <p>
          Más que una aplicación para escuchar música,
          UnderMusic busca convertirse en un espacio
          donde el talento independiente pueda encontrar
          nuevas oportunidades para darse a conocer
          y conectar con otras personas.
        </p>

        <div className="um-download-features">
          <div className="um-download-feature">
            <MapPin size={24} />
            <strong>Descubre cerca de ti</strong>
            <span>
              Encuentra talento emergente según
              tu ubicación.
            </span>
          </div>

          <div className="um-download-feature">
            <Headphones size={24} />
            <strong>Explora nuevos sonidos</strong>
            <span>
              Conoce canciones y artistas de
              diferentes géneros.
            </span>
          </div>

          <div className="um-download-feature">
            <Users size={24} />
            <strong>Conecta con artistas</strong>
            <span>
              Sigue sus proyectos y forma parte
              de una comunidad musical.
            </span>
          </div>
        </div>
      </section>

      <section className="um-download-section">
        <div className="um-download-section-heading">
          <Users size={28} />
          <h2>¿Para quién está dirigida?</h2>
        </div>

        <p>
          UnderMusic está dirigida a cualquier persona
          que disfrute de la música o forme parte de ella.
          No necesitas ser un artista profesional ni tener
          miles de seguidores para pertenecer a esta comunidad.
        </p>

        <div className="um-download-audience">
          <div className="um-download-audience-card">
            <Mic2 size={27} />
            <h3>Artistas y cantantes</h3>
            <p>
              Comparte tu música, da a conocer tu
              proyecto y descubre otros talentos.
            </p>
          </div>

          <div className="um-download-audience-card">
            <Headphones size={27} />
            <h3>Oyentes</h3>
            <p>
              Descubre canciones, explora nuevos
              géneros y apoya a artistas emergentes.
            </p>
          </div>

          <div className="um-download-audience-card">
            <Radio size={27} />
            <h3>Productores y beatmakers</h3>
            <p>
              Descubre voces, proyectos musicales
              y personas con intereses similares.
            </p>
          </div>

          <div className="um-download-audience-card">
            <Guitar size={27} />
            <h3>Músicos e instrumentistas</h3>
            <p>
              Conoce cantantes, compositores y
              otros músicos con quienes conectar.
            </p>
          </div>
        </div>

        <p className="um-download-inclusive">
          <Heart size={19} />
          Si la música es parte de tu vida,
          UnderMusic también es para ti.
        </p>
      </section>

      <section className="um-download-section um-download-origin">
        <div className="um-download-section-heading">
          <Sparkles size={28} />
          <h2>¿Cómo nace UnderMusic?</h2>
        </div>

        <p>
          UnderMusic nace como un proyecto de tesis
          de Ingeniería en Computación e Informática,
          a partir de una inquietud: ¿por qué tantos
          artistas talentosos permanecen desconocidos
          mientras la industria musical concentra
          gran parte de su atención en los nombres
          más populares?
        </p>

        <p>
          En un escenario donde los artistas emergentes
          deben competir por visibilidad frente a
          propuestas consolidadas y plataformas que
          suelen priorizar la popularidad, surge la idea
          de crear una alternativa centrada en el
          talento independiente.
        </p>

        <p>
          Así comienza UnderMusic: un proyecto académico
          que busca transformarse en una plataforma real
          para descubrir música, apoyar a los artistas
          emergentes y acercar a personas que comparten
          la misma pasión.
        </p>

        <blockquote className="um-download-quote">
          Detrás de cada gran artista hubo un momento
          en que casi nadie conocía su música.
        </blockquote>
      </section>

      <footer className="um-download-footer">
        <Music2 size={23} />
        <strong>UnderMusic</strong>
        <span>Descubre · Conecta · Escucha</span>
        <p>Un proyecto que nace para impulsar la música emergente.</p>
      </footer>
    </main>
  )
}

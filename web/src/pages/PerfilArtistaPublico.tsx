
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiUrl } from '../config/api';
import './PerfilArtistaPublico.css'

type Artista = {
  usuarioId: string
  nombreUsuario: string
  fotoPerfil: string | null
  nombreArtistico: string
  biografia: string
  generoPrincipal: string
  generosAdicionales: string[]
  ubicacion: {
    pais: string
    region: string
    comuna: string
  }
  correoContacto: string
  instagram: string
  facebook: string
  twitter: string
}


type Cancion = {
  id: string
  titulo: string
  album: string
  generoPrincipal: string
  generosSecundarios: string[]
  audioId: string
  portadaId: string | null
}


export default function PerfilArtistaPublico() {
  const { usuarioId } = useParams<{ usuarioId: string }>()

  const [artista, setArtista] = useState<Artista | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  
const [canciones, setCanciones] = useState<Cancion[]>([])
const [cargandoCanciones, setCargandoCanciones] = useState(true)
const [errorCanciones, setErrorCanciones] = useState('')


  useEffect(() => {
    if (!usuarioId) {
      setError('Identificador de artista no válido.')
      setCargando(false)
      return
    }

    const controlador = new AbortController()

    async function cargarArtista() {
      setCargando(true)
      setError('')
      setArtista(null)

      try {
        const respuesta = await fetch(
          apiUrl(`/api/perfiles-artista/${usuarioId}`),
          { signal: controlador.signal }
        )

        const datos = await respuesta.json()

        if (!respuesta.ok) {
          throw new Error(
            datos.message || 'No se pudo cargar el artista.'
          )
        }

        setArtista(datos.artista)
      } catch (err) {
        if (controlador.signal.aborted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado.'
        )
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false)
        }
      }
    }

    cargarArtista()

    return () => controlador.abort()
  }, [usuarioId])

  
useEffect(() => {
  if (!usuarioId) {
    setCargandoCanciones(false)
    return
  }

  const controlador = new AbortController()

  async function cargarCanciones() {
    setCargandoCanciones(true)
    setErrorCanciones('')
    setCanciones([])

    try {
      const respuesta = await fetch(
        apiUrl(`/api/canciones/artista/${usuarioId}`),
        { signal: controlador.signal }
      )

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          datos.message || 'No se pudieron cargar las canciones.'
        )
      }

      setCanciones(datos.canciones || [])
    } catch (err) {
      if (controlador.signal.aborted) return

      setErrorCanciones(
        err instanceof Error
          ? err.message
          : 'Error al cargar las canciones.'
      )
    } finally {
      if (!controlador.signal.aborted) {
        setCargandoCanciones(false)
      }
    }
  }

  cargarCanciones()

  return () => controlador.abort()
}, [usuarioId])


  const ubicacion = artista
    ? [
        artista.ubicacion.comuna,
        artista.ubicacion.region,
        artista.ubicacion.pais
      ].filter(Boolean).join(', ')
    : ''

  const generos = artista
    ? [
        artista.generoPrincipal,
        ...artista.generosAdicionales
      ].filter(Boolean)
    : []

  return (
    <main className="perfil-publico">
      <header className="perfil-header">
        <a href="/" className="perfil-logo">
          ♫ Under<span>Music</span>
        </a>
        <span className="perfil-header-texto">
          Descubre música emergente
        </span>
      </header>

      {cargando && (
        <div className="perfil-estado">
          Cargando perfil del artista...
        </div>
      )}

      {!cargando && error && (
        <div className="perfil-estado">
          <h2>No pudimos mostrar este perfil</h2>
          <p>{error}</p>
          <a href="/">Volver al inicio</a>
        </div>
      )}

      {!cargando && artista && (
        <div className="perfil-contenido">
          <section className="perfil-portada">
            <div className="perfil-foto-contenedor">
              {artista.fotoPerfil ? (
                <img
                  className="perfil-foto"
                  src={apiUrl(`/api/usuarios/foto-perfil/${artista.fotoPerfil}`)}
                  alt={`Fotografía de ${artista.nombreArtistico}`}
                />
              ) : (
                <div className="perfil-foto-vacia">♫</div>
              )}
            </div>

            <div className="perfil-identidad">
              <span className="perfil-etiqueta">
                ARTISTA EMERGENTE
              </span>

              <h1>{artista.nombreArtistico}</h1>

              <p className="perfil-usuario">
                @{artista.nombreUsuario}
              </p>

              {ubicacion && (
                <p className="perfil-ubicacion">
                  📍 {ubicacion}
                </p>
              )}

              <div className="perfil-generos">
                {generos.map((genero) => (
                  <span key={genero}>{genero}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="perfil-seccion">
            <h2>Sobre el artista</h2>
            <p className="perfil-biografia">
              {artista.biografia}
            </p>
          </section>

          {(artista.instagram ||
            artista.facebook ||
            artista.twitter ||
            artista.correoContacto) && (
            <section className="perfil-seccion">
              <h2>Conecta con el artista</h2>

              <div className="perfil-redes">
                {artista.instagram && (
                  <a
                    href={artista.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Instagram ↗
                  </a>
                )}

                {artista.facebook && (
                  <a
                    href={artista.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Facebook ↗
                  </a>
                )}

                {artista.twitter && (
                  <a
                    href={artista.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    X / Twitter ↗
                  </a>
                )}

                {artista.correoContacto && (
                  <a href={`mailto:${artista.correoContacto}`}>
                    Correo ✉
                  </a>
                )}
              </div>
            </section>
          )}

          
<section className="perfil-seccion">
  <h2>Canciones del artista</h2>

  {cargandoCanciones ? (
    <p className="perfil-mensaje-canciones">
      Cargando canciones...
    </p>
  ) : errorCanciones ? (
    <p className="perfil-mensaje-canciones">
      {errorCanciones}
    </p>
  ) : canciones.length === 0 ? (
    <p className="perfil-mensaje-canciones">
      Este artista todavía no ha publicado canciones.
    </p>
  ) : (
    <div className="perfil-lista-canciones">
      {canciones.map((cancion) => (
        <article className="perfil-cancion" key={cancion.id}>
          {cancion.portadaId ? (
            <img
              className="perfil-cancion-portada"
              src={apiUrl(`/api/canciones/portadas/${cancion.portadaId}`)}
              alt={`Portada de ${cancion.titulo}`}
              loading="lazy"
            />
          ) : (
            <div className="perfil-cancion-portada-vacia">
              ♫
            </div>
          )}

          <div className="perfil-cancion-informacion">
            <h3>{cancion.titulo}</h3>
            <p>
              {cancion.album || artista.nombreArtistico}
              {' · '}
              {cancion.generoPrincipal}
            </p>
          </div>

          <a
            className="perfil-cancion-boton"
            href={`/cancion/${cancion.id}`}
            aria-label={`Ver canción ${cancion.titulo}`}
          >
            ▶
          </a>
        </article>
      ))}
    </div>
  )}
</section>

        </div>
      )}

      <footer className="perfil-footer">
        UnderMusic · Música emergente, conexiones reales
      </footer>
    </main>
  )
}

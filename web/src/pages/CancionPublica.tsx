
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiUrl } from '../config/api';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Heart,
  Music2,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react'
import './CancionPublica.css'

type Cancion = {
  id: string
  usuarioId: string
  titulo: string
  album: string
  generoPrincipal: string
  generosSecundarios: string[]
  audioId: string | null
  portadaId: string | null
  nombreArtistico: string
}

type AccionRestringida = 'me-gusta' | 'guardar' | null

function formatearTiempo(segundos: number) {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00'

  const minutos = Math.floor(segundos / 60)
  const restantes = Math.floor(segundos % 60)

  return `${minutos}:${String(restantes).padStart(2, '0')}`
}

export default function CancionPublica() {
  const { cancionId } = useParams<{ cancionId: string }>()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [cancion, setCancion] = useState<Cancion | null>(null)
  const [fotoArtista, setFotoArtista] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [reproduciendo, setReproduciendo] = useState(false)
  const [posicion, setPosicion] = useState(0)
  const [duracion, setDuracion] = useState(0)
  const [accionRestringida, setAccionRestringida] =
    useState<AccionRestringida>(null)
  const [mensajeCompartir, setMensajeCompartir] = useState('')

  useEffect(() => {
    if (!cancionId) {
      setError('Identificador de canción no válido.')
      setCargando(false)
      return
    }

    const controlador = new AbortController()

    async function cargarCancion() {
      setCargando(true)
      setError('')
      setCancion(null)
      setReproduciendo(false)
      setPosicion(0)
      setDuracion(0)

      try {
        const respuesta = await fetch(
          apiUrl(`/api/canciones/${cancionId}`),
          { signal: controlador.signal }
        )

        const datos = await respuesta.json()

        if (!respuesta.ok) {
          throw new Error(
            datos.message || 'No se pudo cargar la canción.'
          )
        }

        setCancion(datos.cancion)
setFotoArtista(null)

if (!datos.cancion.portadaId && datos.cancion.usuarioId) {
  try {
    const respuestaArtista = await fetch(
      apiUrl(`/api/perfiles-artista/${datos.cancion.usuarioId}`),
      { signal: controlador.signal }
    )

    if (respuestaArtista.ok) {
      const datosArtista = await respuestaArtista.json()
      setFotoArtista(datosArtista.artista?.fotoPerfil || null)
    }
  } catch (error) {
    if (!controlador.signal.aborted) {
      console.error('No se pudo cargar la foto del artista:', error)
    }
  }
}
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

    void cargarCancion()

    return () => controlador.abort()
  }, [cancionId])

  
async function reiniciarCancion() {
  const audio = audioRef.current

  if (!audio || !cancion?.audioId) return

  try {
    audio.currentTime = 0
    setPosicion(0)

    await audio.play()
  } catch (error) {
    console.error('Error al reiniciar la canción:', error)
  }
}


  async function alternarReproduccion() {
    const audio = audioRef.current
    if (!audio) return

    if (!audio.paused) {
      audio.pause()
      return
    }

    try {
      await audio.play()
    } catch (err) {
      console.error('Error al reproducir audio:', err)
    }
  }

  function cambiarPosicion(valor: number) {
    const audio = audioRef.current

    if (!audio || !Number.isFinite(duracion) || duracion <= 0) {
      return
    }

    const nuevaPosicion = Math.min(
      Math.max(valor, 0),
      duracion
    )

    audio.currentTime = nuevaPosicion
    setPosicion(nuevaPosicion)
  }

  async function compartirCancion() {
    if (!cancion) return

    const url = window.location.href
    const titulo = `${cancion.titulo} — ${cancion.nombreArtistico}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: titulo,
          text: 'Escucha esta canción en UnderMusic',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setMensajeCompartir('Enlace copiado')
        window.setTimeout(() => setMensajeCompartir(''), 2500)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }

      setMensajeCompartir('No se pudo compartir el enlace')
      window.setTimeout(() => setMensajeCompartir(''), 2500)
    }
  }

  const progreso =
    duracion > 0
      ? Math.min(100, Math.max(0, (posicion / duracion) * 100))
      : 0

  return (
    <main className="um-player-page">
      <header className="um-player-header">
        <Link
          to={cancion ? `/artista/${cancion.usuarioId}` : '/'}
          className="um-player-header-button"
          aria-label="Volver"
        >
          <ArrowLeft size={25} />
        </Link>

        <div className={`um-player-header-center${reproduciendo ? ' is-playing' : ''}`}>
          <div className="um-player-listening">
            <span>ESCUCHANDO</span>
            <span className="um-player-wave" aria-hidden="true">
              <i /><i /><i />
            </span>
          </div>
          <div className="um-player-now-playing">
  {cancion ? (
    <>
      <strong>{cancion.titulo}</strong>
      <span className="um-player-separador"> de </span>
      <strong>{cancion.nombreArtistico}</strong>
    </>
  ) : (
    <strong>UnderMusic</strong>
  )}
</div>

  <Link
    to="/"
    className="um-player-logo-link"
    aria-label="Ir al inicio de UnderMusic"
  >
    <img
      src="/images/logo-undermusic.png"
      alt="UnderMusic"
      className="um-player-logo"
    />
  </Link>
</div>

        <button
          className="um-player-header-button um-player-share"
          onClick={() => void compartirCancion()}
          disabled={!cancion}
          aria-label="Compartir canción"
          type="button"
        >
          <Share2 size={23} />
        </button>
      </header>

      {cargando && (
        <div className="um-player-state">Cargando canción...</div>
      )}

      {!cargando && error && (
        <div className="um-player-state">
          <h2>No pudimos mostrar esta canción</h2>
          <p>{error}</p>
          <Link to="/">Volver al inicio</Link>
        </div>
      )}

      {!cargando && cancion && (
        <section className="um-player-content">
          <div className="um-player-cover-glow">
            <div className="um-player-cover-frame">
              {cancion.portadaId ? (
  <img
    className="um-player-cover"
    src={apiUrl(`/api/canciones/portadas/${cancion.portadaId}`)}
    alt={`Portada de ${cancion.titulo}`}
  />
) : fotoArtista ? (
  <img
    className="um-player-cover"
    src={apiUrl(`/api/usuarios/foto-perfil/${fotoArtista}`)}
    alt={`Fotografía de ${cancion.nombreArtistico}`}
  />
) : (
  <div className="um-player-cover-fallback">
    <Music2 size={82} />
  </div>
)}
            </div>
          </div>

          <div className="um-player-song-row">
            <div className="um-player-song-info">
              <h1>{cancion.titulo}</h1>
              <Link to={`/artista/${cancion.usuarioId}`}>
                {cancion.nombreArtistico}
              </Link>
            </div>

            <div className="um-player-song-actions">
              <button
                type="button"
                className="um-player-action um-player-save"
                aria-label="Guardar canción"
                onClick={() => setAccionRestringida('guardar')}
              >
                <Bookmark size={23} />
              </button>

              <button
                type="button"
                className="um-player-action um-player-like"
                aria-label="Dar Me gusta"
                onClick={() => setAccionRestringida('me-gusta')}
              >
                <Heart size={24} />
              </button>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={
              cancion.audioId
                ? apiUrl(`/api/canciones/audio/${cancion.audioId}`)
                : undefined
            }
            preload="metadata"
            onLoadedMetadata={(event) => {
              const audio = event.currentTarget
              setDuracion(
                Number.isFinite(audio.duration) ? audio.duration : 0
              )
            }}
            onDurationChange={(event) => {
              const valor = event.currentTarget.duration
              setDuracion(Number.isFinite(valor) ? valor : 0)
            }}
            onTimeUpdate={(event) => {
              setPosicion(event.currentTarget.currentTime)
            }}
            onPlay={() => setReproduciendo(true)}
            onPause={() => setReproduciendo(false)}
            onEnded={() => {
              setReproduciendo(false)
              setPosicion(0)
            }}
          />

          <div className="um-player-progress-section">
            <input
              type="range"
              className="um-player-progress"
              min="0"
              max={duracion > 0 ? duracion : 1}
              step="0.1"
              value={Math.min(posicion, duracion > 0 ? duracion : 1)}
              onChange={(event) => {
                cambiarPosicion(Number(event.target.value))
              }}
              style={{
                background: `linear-gradient(to right,
                  #C95BFF 0%,
                  #C95BFF ${progreso}%,
                  rgba(255,255,255,0.16) ${progreso}%,
                  rgba(255,255,255,0.16) 100%)`,
              }}
              disabled={!cancion.audioId || duracion <= 0}
              aria-label="Progreso de reproducción"
            />

            <div className="um-player-times">
              <span>{formatearTiempo(posicion)}</span>
              <span>{formatearTiempo(duracion)}</span>
            </div>
          </div>

          <div className="um-player-controls">
            
<button
  type="button"
  className="um-player-skip"
  onClick={() => void reiniciarCancion()}
  disabled={!cancion.audioId}
  aria-label="Reiniciar canción"
  title="Reproducir desde el inicio"
>
  <SkipBack size={32} fill="currentColor" />
</button>


            <button
              type="button"
              className="um-player-play-outer"
              onClick={() => void alternarReproduccion()}
              disabled={!cancion.audioId}
              aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
            >
              <span className="um-player-play-inner">
                {reproduciendo ? (
                  <Pause size={39} fill="currentColor" />
                ) : (
                  <Play size={39} fill="currentColor" />
                )}
              </span>
            </button>

            <button
              type="button"
              className="um-player-skip"
              disabled
              aria-label="Siguiente canción disponible en la aplicación UnderMusic"
              title="Escucha más canciones en la aplicación UnderMusic"
            >
              <SkipForward size={32} fill="currentColor" />
            </button>
          </div>

          <p className="um-player-hint">
            Descubre más música emergente en UnderMusic.
          </p>
        </section>
      )}

      {mensajeCompartir && (
        <div className="um-player-toast" role="status">
          <Check size={17} />
          {mensajeCompartir}
        </div>
      )}

      {accionRestringida && (
        <div
          className="um-player-modal-backdrop"
          onClick={() => setAccionRestringida(null)}
        >
          <div
            className="um-player-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="um-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="um-player-modal-close"
              onClick={() => setAccionRestringida(null)}
              aria-label="Cerrar ventana"
            >
              <X size={22} />
            </button>

            <div className="um-player-modal-icon">
              {accionRestringida === 'me-gusta' ? (
                <Heart size={32} />
              ) : (
                <Bookmark size={32} />
              )}
            </div>

            <h2 id="um-modal-title">
              ¡Lleva la música contigo!
            </h2>

            <p>
              Para {accionRestringida === 'me-gusta'
                ? 'dar Me gusta a esta canción'
                : 'guardar esta canción en tu biblioteca'},
              necesitas utilizar la aplicación UnderMusic.
            </p>

            <Link
              to="/descargar"
              className="um-player-download-button"
            >
              Descargar UnderMusic
            </Link>

            <span className="um-player-modal-note">
              Próximamente disponible para Android
            </span>
          </div>
        </div>
      )}
    </main>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Bookmark, Check, Copy, Disc3, ExternalLink, Heart, Headphones, CirclePlay,
  Mail, MapPin, MessageCircleMore, Music2, Play, ListMusic, Share2, UserRound,
  UserRoundPlus, UsersRound, X,
} from 'lucide-react'
import { apiUrl } from '../config/api'
import './PerfilArtistaPublico.css'
const WEB_PUBLICA = 'https://under-music.vercel.app'

type Artista = {
  usuarioId: string
  nombreUsuario: string
  fotoPerfil: string | null
  nombreArtistico: string
  biografia: string
  generoPrincipal: string
  generosAdicionales: string[]
  ubicacion: { pais: string; region: string; comuna: string }
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
  audioId: string | null
  portadaId: string | null
}

type EstadisticasArtista = {
  oyentesUnicos: number
  reproduccionesTotales: number
  cantidadSeguidores: number
}

type AccionRestringida = 'seguir' | 'guardar' | 'me-gusta' | 'cola' | null

type Contacto = {
  nombre: string
  detalle: string
  url: string
  icono: 'correo' | 'instagram' | 'facebook' | 'x'
}

function urlRedSocial(valor: string | undefined, dominios: string[]): string | null {
  if (!valor?.trim()) return null
  try {
    const url = new URL(valor.trim())
    const host = url.hostname.toLowerCase()
    if (
      url.protocol !== 'https:' || url.username || url.password ||
      url.pathname === '/' ||
      !dominios.some((dominio) => host === dominio || host === `www.${dominio}`)
    ) return null
    return url.toString()
  } catch {
    return null
  }
}

export default function PerfilArtistaPublico() {
  const { usuarioId } = useParams<{ usuarioId: string }>()
  const [artista, setArtista] = useState<Artista | null>(null)
  const [estadisticas, setEstadisticas] = useState<EstadisticasArtista | null>(null)
  const [cargandoEstadisticas, setCargandoEstadisticas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [canciones, setCanciones] = useState<Cancion[]>([])
  const [cargandoCanciones, setCargandoCanciones] = useState(true)
  const [errorCanciones, setErrorCanciones] = useState('')
  const [contactoVisible, setContactoVisible] = useState(false)
  const [accionRestringida, setAccionRestringida] = useState<AccionRestringida>(null)
  const [avisoCompartido, setAvisoCompartido] = useState('')

  const [menuCompartir, setMenuCompartir] = useState<{
  id: string
  url: string
  titulo: string
  mensaje: string
} | null>(null)

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
        const respuesta = await fetch(apiUrl(`/api/perfiles-artista/${usuarioId}`), { signal: controlador.signal })
        const datos = await respuesta.json()
        if (!respuesta.ok) throw new Error(datos.message || 'No se pudo cargar el artista.')
        setArtista(datos.artista)
      } catch (err) {
        if (controlador.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.')
      } finally {
        if (!controlador.signal.aborted) setCargando(false)
      }
    }
    void cargarArtista()
    return () => controlador.abort()
  }, [usuarioId])

  useEffect(() => {
    if (!usuarioId) {
      setEstadisticas(null)
      return
    }
    const controlador = new AbortController()
    async function cargarEstadisticas() {
      setEstadisticas(null)
      setCargandoEstadisticas(true)
      try {
        const respuesta = await fetch(
          apiUrl(`/api/perfiles-artista/${usuarioId}/estadisticas`),
          { signal: controlador.signal }
        )
        if (!respuesta.ok) throw new Error('No se pudieron cargar las estadísticas.')
        const datos: EstadisticasArtista = await respuesta.json()
        if (!controlador.signal.aborted) setEstadisticas(datos)
      } catch (error) {
        if (!controlador.signal.aborted) console.error('Error al cargar estadísticas:', error)
      } finally {
        if (!controlador.signal.aborted) setCargandoEstadisticas(false)
      }
    }
    void cargarEstadisticas()
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
        const respuesta = await fetch(apiUrl(`/api/canciones/artista/${usuarioId}`), { signal: controlador.signal })
        const datos = await respuesta.json()
        if (!respuesta.ok) throw new Error(datos.message || 'No se pudieron cargar las canciones.')
        setCanciones(datos.canciones || [])
      } catch (err) {
        if (controlador.signal.aborted) return
        setErrorCanciones(err instanceof Error ? err.message : 'Error al cargar las canciones.')
      } finally {
        if (!controlador.signal.aborted) setCargandoCanciones(false)
      }
    }
    void cargarCanciones()
    return () => controlador.abort()
  }, [usuarioId])

  useEffect(() => {
    if (!contactoVisible && !accionRestringida) return
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setContactoVisible(false)
        setAccionRestringida(null)
      }
    }
    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [contactoVisible, accionRestringida])

  async function compartir(url: string, titulo: string, mensaje: string) {
  try {
    if (navigator.share) {
      await navigator.share({
        title: titulo,
        text: mensaje,
        url,
      })
    } else {
      await navigator.clipboard.writeText(`${mensaje}\n\n🔗 ${url}`)
      setAvisoCompartido('Mensaje y enlace copiados al portapapeles')
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return

    setAvisoCompartido(
      'No se pudo compartir el contenido. Puedes copiar el enlace desde la barra de direcciones.'
    )
  }
}

function alternarMenuCompartir(
  id: string,
  url: string,
  titulo: string,
  mensaje: string
) {
  setMenuCompartir((actual) =>
    actual?.id === id
      ? null
      : { id, url, titulo, mensaje }
  )
}

async function copiarMensajeYEnlace() {
  if (!menuCompartir) return

  try {
    await navigator.clipboard.writeText(
      `${menuCompartir.mensaje}\n\n🔗 ${menuCompartir.url}`
    )

    setAvisoCompartido('Mensaje y enlace copiados al portapapeles')
    setMenuCompartir(null)
  } catch {
    setAvisoCompartido('No se pudo copiar el mensaje')
    setMenuCompartir(null)
  }
}

function renderizarMenuCompartir(id: string) {
  if (!menuCompartir || menuCompartir.id !== id) return null

  return (
    <div className="perfil-menu-compartir">
      <button
        type="button"
        onClick={() => {
          const { url, titulo, mensaje } = menuCompartir
          setMenuCompartir(null)
          void compartir(url, titulo, mensaje)
        }}
      >
        <Share2 size={18} />
        Compartir vínculo
      </button>

      <button
        type="button"
        onClick={() => void copiarMensajeYEnlace()}
      >
        <Copy size={18} />
        Copiar mensaje y enlace
      </button>
    </div>
  )
}

  const contactos: Contacto[] = []
  const correo = artista?.correoContacto?.trim() || ''
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    contactos.push({ nombre: 'Correo electrónico', detalle: correo, url: `mailto:${correo}`, icono: 'correo' })
  }
  const redes = [
    { nombre: 'Instagram', valor: artista?.instagram, dominios: ['instagram.com'], icono: 'instagram' },
    { nombre: 'Facebook', valor: artista?.facebook, dominios: ['facebook.com', 'fb.com'], icono: 'facebook' },
    { nombre: 'X', valor: artista?.twitter, dominios: ['x.com', 'twitter.com'], icono: 'x' },
  ] as const
  for (const red of redes) {
    const url = urlRedSocial(red.valor, [...red.dominios])
    if (url) contactos.push({ nombre: red.nombre, detalle: red.valor || '', url, icono: red.icono })
  }

  const nombreArtista = artista?.nombreArtistico || artista?.nombreUsuario || 'este artista'
  const ubicacion = artista
    ? [artista.ubicacion?.comuna, artista.ubicacion?.region].filter(Boolean).join(', ')
    : ''
  const mensajeRestringido = accionRestringida === 'seguir'
    ? `Para seguir a ${nombreArtista}, necesitas utilizar la aplicación UnderMusic para Android.`
    : accionRestringida === 'guardar'
      ? 'Para guardar canciones en tu biblioteca, necesitas utilizar la aplicación UnderMusic para Android.'
      : accionRestringida === 'cola'
        ? 'Para añadir canciones a la cola de reproducción, necesitas utilizar la aplicación UnderMusic para Android cuando esta función esté disponible.'
        : 'Para dar Me gusta a las canciones, necesitas utilizar la aplicación UnderMusic para Android.'

  return (
    <main className="perfil-publico">
      <header className="perfil-header">
        <Link to="/" className="perfil-logo" aria-label="Ir al inicio de UnderMusic">
          <img src="/images/logo-undermusic.png" alt="UnderMusic" className="perfil-logo-imagen" />
        </Link>
        <Link to="/descargar" className="perfil-header-descarga">Descargar UnderMusic</Link>
      </header>

      {cargando && <div className="perfil-estado">Cargando perfil del artista...</div>}
      {!cargando && error && (
        <div className="perfil-estado">
          <h2>No pudimos mostrar este perfil</h2>
          <p>{error}</p>
          <Link to="/">Volver al inicio</Link>
        </div>
      )}

      {!cargando && artista && (
        <div className="perfil-contenido">
          <div className="perfil-titulo-pagina">
            <Link to="/" aria-label="Volver al inicio" className="perfil-volver"><ArrowLeft size={23} /></Link>
            <span>Perfil del artista</span>
            <span className="perfil-titulo-espaciador" />
          </div>

          <section className="perfil-portada">
            <div className="perfil-foto-contenedor">
              {artista.fotoPerfil ? (
                <img className="perfil-foto" src={apiUrl(`/api/usuarios/foto-perfil/${artista.fotoPerfil}`)} alt={`Fotografía de ${nombreArtista}`} />
              ) : (
                <div className="perfil-foto-vacia"><UserRound size={70} /></div>
              )}
            </div>
            <h1>{nombreArtista}</h1>
            <p className="perfil-usuario">@{artista.nombreUsuario}</p>
            <div className="perfil-rol-pais">
              <span className="perfil-etiqueta">ARTISTA</span>
              {artista.ubicacion?.pais && <span>{artista.ubicacion.pais}</span>}
            </div>
            {ubicacion && (
              <div className="perfil-estadisticas">
                <span className="perfil-ubicacion"><MapPin size={20} /> {ubicacion}</span>
              </div>
            )}
            <div className="perfil-metricas" aria-label="Estadísticas musicales del artista">
              <div className="perfil-metrica">
                <Headphones size={24} className="perfil-metrica-cian" aria-hidden="true" />
                <strong>{estadisticas?.oyentesUnicos.toLocaleString('es-CL') ?? '—'}</strong>
                <span>Oyentes únicos</span>
              </div>
              <div className="perfil-metrica">
                <CirclePlay size={24} className="perfil-metrica-rosa" aria-hidden="true" />
                <strong>{estadisticas?.reproduccionesTotales.toLocaleString('es-CL') ?? '—'}</strong>
                <span>Reproducciones</span>
              </div>
              <div className="perfil-metrica">
                <UsersRound size={24} className="perfil-metrica-violeta" aria-hidden="true" />
                <strong>{estadisticas?.cantidadSeguidores.toLocaleString('es-CL') ?? '—'}</strong>
                <span>Seguidores</span>
              </div>
            </div>
            {cargandoEstadisticas && !estadisticas && (
              <p className="perfil-metricas-estado" role="status">Cargando estadísticas...</p>
            )}
            <div className="perfil-acciones">
              <button type="button" className="perfil-seguir" onClick={() => setAccionRestringida('seguir')}>
                <UserRoundPlus size={19} /> Seguir
              </button>
              <button type="button" className="perfil-contactar" onClick={() => setContactoVisible(true)}>
                <MessageCircleMore size={20} /> Contactar
              </button>
              <button
  type="button"
  className="perfil-compartir"
  aria-label="Compartir perfil"
  aria-expanded={menuCompartir?.id === 'perfil'}
  onClick={() =>
    alternarMenuCompartir(
      'perfil',
      `${WEB_PUBLICA}/artista/${usuarioId}`,
      `Perfil de ${nombreArtista}`,
      `🎤 ¡Conoce a ${nombreArtista} (@${artista.nombreUsuario}) en UnderMusic!\n\nDescubre música emergente y apoya a artistas locales.`
    )
  }
>
    <Share2 size={22} />
</button>
{renderizarMenuCompartir('perfil')}
            </div>
          </section>

          <div className="perfil-secciones">
            <section className="perfil-seccion">
              <h2><UserRound className="perfil-icono-rosa" size={27} /> Sobre el artista</h2>
              <p className="perfil-biografia">{artista.biografia || 'Este artista aún no ha agregado una biografía.'}</p>
            </section>

            <section className="perfil-seccion">
              <h2><Music2 className="perfil-icono-cian" size={27} /> Géneros artísticos</h2>
              {artista.generoPrincipal && (
                <>
                  <p className="perfil-genero-label">Género principal</p>
                  <div className="perfil-generos"><span className="perfil-genero-principal">{artista.generoPrincipal}</span></div>
                </>
              )}
              {(artista.generosAdicionales || []).length > 0 && (
                <>
                  <p className="perfil-genero-label perfil-genero-adicional-label">Géneros adicionales</p>
                  <div className="perfil-generos">
                    {artista.generosAdicionales.map((genero) => <span key={genero}>{genero}</span>)}
                  </div>
                </>
              )}
            </section>

            <div className="perfil-divisor" />

            <section className="perfil-seccion perfil-seccion-canciones">
              <h2><Disc3 className="perfil-icono-rosa" size={27} /> Canciones</h2>
              {cargandoCanciones ? (
                <p className="perfil-mensaje-canciones">Cargando canciones...</p>
              ) : errorCanciones ? (
                <p className="perfil-mensaje-canciones">{errorCanciones}</p>
              ) : canciones.length === 0 ? (
                <p className="perfil-mensaje-canciones">Este artista aún no ha publicado canciones.</p>
              ) : (
                <div className="perfil-lista-canciones">
                  {canciones.map((cancion) => (
                    <article className="perfil-cancion" key={cancion.id}>
                      {cancion.portadaId ? (
                        <img className="perfil-cancion-portada" src={apiUrl(`/api/canciones/portadas/${cancion.portadaId}`)} alt={`Portada de ${cancion.titulo}`} loading="lazy" />
                      ) : artista.fotoPerfil ? (
                        <img className="perfil-cancion-portada" src={apiUrl(`/api/usuarios/foto-perfil/${artista.fotoPerfil}`)} alt={`Fotografía de ${nombreArtista}`} loading="lazy" />
                      ) : (
                        <div className="perfil-cancion-portada-vacia"><Music2 size={28} /></div>
                      )}
                      <div className="perfil-cancion-informacion">
                        <h3>{cancion.titulo}</h3>
                        <p className="perfil-cancion-genero">{cancion.generoPrincipal}</p>
                        {cancion.album && <p className="perfil-cancion-album">{cancion.album}</p>}
                      </div>
                                            <div className="perfil-cancion-acciones">
                        <button
  type="button"
  className="perfil-cancion-accion perfil-cancion-compartir"
  aria-label={`Compartir ${cancion.titulo}`}
  aria-expanded={menuCompartir?.id === `cancion-${cancion.id}`}
  onClick={() =>
    alternarMenuCompartir(
      `cancion-${cancion.id}`,
      `${WEB_PUBLICA}/cancion/${cancion.id}`,
      cancion.titulo,
      `🎵 ¡Escucha "${cancion.titulo}" de ${nombreArtista} en UnderMusic!\n\nDescubre música emergente, conoce nuevos artistas y apoya el talento independiente.`
    )
  }
>
  <Share2 size={20} />
</button>

{renderizarMenuCompartir(`cancion-${cancion.id}`)}

                        <button type="button" className="perfil-cancion-accion perfil-cancion-cola" aria-label={`Añadir ${cancion.titulo} a la cola de reproducción`} onClick={() => setAccionRestringida('cola')}><ListMusic size={21} /></button>
                        <button type="button" className="perfil-cancion-accion perfil-cancion-guardar" aria-label={`Guardar ${cancion.titulo}`} onClick={() => setAccionRestringida('guardar')}><Bookmark size={21} /></button>
                        <button type="button" className="perfil-cancion-accion perfil-cancion-megusta" aria-label={`Dar Me gusta a ${cancion.titulo}`} onClick={() => setAccionRestringida('me-gusta')}><Heart size={22} /></button>
                        {cancion.audioId ? (
                          <Link className="perfil-cancion-accion perfil-cancion-boton" to={`/cancion/${cancion.id}`} aria-label={`Reproducir ${cancion.titulo}`}><Play size={20} fill="currentColor" /></Link>
                        ) : (
                          <span className="perfil-cancion-accion perfil-cancion-boton perfil-cancion-inactivo" aria-label="Audio no disponible"><Play size={20} /></span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      <footer className="perfil-footer">
  <Link to="/" aria-label="Ir al inicio de UnderMusic">
    <img
      src="/images/logo-undermusic.png"
      alt="UnderMusic"
      className="perfil-footer-logo"
    />
  </Link>

  <p className="perfil-footer-mensaje">
    Un proyecto hecho para impulsar artistas emergentes.
  </p>
</footer>

      {contactoVisible && artista && (
        <div className="perfil-modal-capa" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setContactoVisible(false) }}>
          <section className="perfil-contacto-hoja" role="dialog" aria-modal="true" aria-labelledby="perfil-contacto-titulo">
            <div className="perfil-modal-cabecera">
              <div><h2 id="perfil-contacto-titulo">Contactar</h2><p>{nombreArtista}</p></div>
              <button type="button" aria-label="Cerrar contactos" onClick={() => setContactoVisible(false)}><X size={25} /></button>
            </div>
            {contactos.length === 0 ? (
              <p className="perfil-contacto-vacio">Este artista aún no ha agregado métodos de contacto.</p>
            ) : contactos.map((contacto) => (
              <a className="perfil-contacto-opcion" key={contacto.nombre} href={contacto.url} target={contacto.icono === 'correo' ? undefined : '_blank'} rel={contacto.icono === 'correo' ? undefined : 'noopener noreferrer'}>
                {contacto.icono === 'correo' ? <Mail size={25} /> : contacto.icono === 'instagram' ? <ExternalLink size={20} /> : contacto.icono === 'facebook' ? <UsersRound size={25} /> : <span className="perfil-contacto-x">𝕏</span>}
                <span><strong>{contacto.nombre}</strong><small>{contacto.detalle}</small></span>
                <ExternalLink size={19} />
              </a>
            ))}
          </section>
        </div>
      )}

      {accionRestringida && (
        <div className="perfil-modal-capa perfil-modal-centrada" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setAccionRestringida(null) }}>
          <section className="perfil-descarga-modal" role="dialog" aria-modal="true" aria-labelledby="perfil-descarga-titulo">
            <button type="button" className="perfil-descarga-cerrar" aria-label="Cerrar" onClick={() => setAccionRestringida(null)}><X size={22} /></button>
            <div className="perfil-descarga-icono"><Music2 size={32} /></div>
            <h2 id="perfil-descarga-titulo">¡Lleva la música contigo!</h2>
            <p>{mensajeRestringido}</p>
            <Link to="/descargar" className="perfil-descarga-enlace">Descargar UnderMusic</Link>
            <small>Próximamente disponible para Android</small>
          </section>
        </div>
      )}

      {avisoCompartido && (
        <div className="perfil-aviso" role="status">
          <span>{avisoCompartido}</span>
          <button type="button" onClick={() => setAvisoCompartido('')} aria-label="Cerrar aviso"><Check size={19} /></button>
        </div>
      )}
    </main>
  )
}

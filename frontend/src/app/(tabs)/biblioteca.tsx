import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { CancionReproductor, usePlayer } from '@/context/PlayerContext';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

const API_URL = 'http://192.168.1.5:3000';

type FiltroBiblioteca = 'todos' | 'artistas' | 'gustas' | 'guardadas';

type ArtistaSeguido = {
  usuarioId: string;
  nombreUsuario: string;
  nombreArtistico: string;
  fotoPerfil: string | null;
  generoPrincipal: string;
  ubicacion: {
    pais: string;
    region: string;
    comuna: string;
  };
  fechaSeguimiento: string;
};

type CancionFavorita = {
  id: string;
  usuarioId: string;
  titulo: string;
  album: string;
  generoPrincipal: string;
  audioId: string | null;
  portadaId: string | null;
  fechaMeGusta?: string;
  fechaGuardado?: string;
  nombreArtista?: string;
  fotoArtista?: string | null;
};

const filtros: { id: Exclude<FiltroBiblioteca, 'todos'>; titulo: string }[] = [
  { id: 'artistas', titulo: 'Artistas seguidos' },
  { id: 'gustas', titulo: 'Me gusta' },
  { id: 'guardadas', titulo: 'Guardadas' },
];

export default function BibliotecaScreen() {
  const { width: anchoPantalla } = useWindowDimensions();
  const [filtroActivo, setFiltroActivo] = useState<FiltroBiblioteca>('todos');
  const [artistas, setArtistas] = useState<ArtistaSeguido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [cancionesFavoritas, setCancionesFavoritas] = useState<CancionFavorita[]>([]);
  const [cargandoGustas, setCargandoGustas] = useState(true);
  const [errorGustas, setErrorGustas] = useState('');
  const [quitandoMeGusta, setQuitandoMeGusta] = useState<string | null>(null);
  const [cancionesGuardadas, setCancionesGuardadas] = useState<CancionFavorita[]>([]);
  const [cargandoGuardadas, setCargandoGuardadas] = useState(true);
  const [errorGuardadas, setErrorGuardadas] = useState('');
  const [quitandoGuardada, setQuitandoGuardada] = useState<string | null>(null);
  const [imagenesConError, setImagenesConError] = useState<string[]>([]);
  const { cancionActual, reproduciendo, reproducirCancion, alternarReproduccion } = usePlayer();

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      const cargarArtistas = async () => {
        setCargando(true);
        setError('');

        try {
          const token = await SecureStore.getItemAsync('token');
          if (!token) {
            throw new Error('Inicia sesión para ver tus artistas seguidos.');
          }

          const respuesta = await fetch(`${API_URL}/api/seguimientos/me/artistas`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const datos = await respuesta.json();
          if (!respuesta.ok) {
            throw new Error(datos.message || 'No fue posible cargar tus artistas seguidos.');
          }
          if (!Array.isArray(datos.artistas)) {
            throw new Error('La respuesta de artistas seguidos no es válida.');
          }

          if (activo) setArtistas(datos.artistas);
        } catch (err) {
          if (activo) {
            setError(err instanceof Error ? err.message : 'No fue posible conectar con UnderMusic.');
          }
        } finally {
          if (activo) setCargando(false);
        }
      };

      const cargarMeGustas = async () => {
        setCargandoGustas(true);
        setErrorGustas('');
        try {
          const token = await SecureStore.getItemAsync('token');
          if (!token) throw new Error('Inicia sesión para ver tus canciones favoritas.');
          const respuesta = await fetch(`${API_URL}/api/me-gustas/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const datos = await respuesta.json();
          if (!respuesta.ok) throw new Error(datos.message || 'No fue posible cargar tus Me gusta.');
          if (!Array.isArray(datos.canciones)) throw new Error('La respuesta de Me gusta no es válida.');

          const canciones: CancionFavorita[] = datos.canciones;
          // El endpoint de Me gusta entrega usuarioId, pero no el nombre del artista.
          // Consultamos una vez por artista y conservamos la lista aunque falle algún perfil.
          const idsArtistas = [...new Set(canciones.map(c => String(c.usuarioId)))];
          const perfiles = await Promise.all(idsArtistas.map(async id => {
            try {
              const r = await fetch(`${API_URL}/api/perfiles-artista/${id}`);
              if (!r.ok) return { id, nombre: 'Artista', foto: null };
              const d = await r.json();
              return {
                id,
                nombre: d.artista?.nombreArtistico || d.artista?.nombreUsuario || 'Artista',
                foto: d.artista?.fotoPerfil || null,
              };
            } catch {
              return { id, nombre: 'Artista', foto: null };
            }
          }));
          const porId = new Map(perfiles.map(p => [p.id, p]));
          if (activo) setCancionesFavoritas(canciones.map(c => ({
            ...c,
            nombreArtista: porId.get(String(c.usuarioId))?.nombre || 'Artista',
            fotoArtista: porId.get(String(c.usuarioId))?.foto || null,
          })));
        } catch (err) {
          if (activo) setErrorGustas(err instanceof Error ? err.message : 'Error de conexión.');
        } finally {
          if (activo) setCargandoGustas(false);
        }
      };

      const cargarGuardadas = async () => {
        setCargandoGuardadas(true);
        setErrorGuardadas('');
        try {
          const token = await SecureStore.getItemAsync('token');
          if (!token) throw new Error('Inicia sesión para ver tus canciones guardadas.');

          const respuesta = await fetch(`${API_URL}/api/guardadas/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const datos = await respuesta.json();
          if (!respuesta.ok) throw new Error(datos.message || 'No fue posible cargar tus canciones guardadas.');
          if (!Array.isArray(datos.canciones)) throw new Error('La respuesta de Guardadas no es válida.');

          const canciones: CancionFavorita[] = datos.canciones;
          const idsArtistas = [...new Set(canciones.map(c => String(c.usuarioId)))];
          const perfiles = await Promise.all(idsArtistas.map(async id => {
            try {
              const r = await fetch(`${API_URL}/api/perfiles-artista/${id}`);
              if (!r.ok) return { id, nombre: 'Artista', foto: null };
              const d = await r.json();
              return {
                id,
                nombre: d.artista?.nombreArtistico || d.artista?.nombreUsuario || 'Artista',
                foto: d.artista?.fotoPerfil || null,
              };
            } catch {
              return { id, nombre: 'Artista', foto: null };
            }
          }));
          const porId = new Map(perfiles.map(p => [p.id, p]));
          if (activo) setCancionesGuardadas(canciones.map(c => ({
            ...c,
            nombreArtista: porId.get(String(c.usuarioId))?.nombre || 'Artista',
            fotoArtista: porId.get(String(c.usuarioId))?.foto || null,
          })));
        } catch (err) {
          if (activo) setErrorGuardadas(err instanceof Error ? err.message : 'Error de conexión.');
        } finally {
          if (activo) setCargandoGuardadas(false);
        }
      };

      void cargarGuardadas();
      void cargarMeGustas();
      void cargarArtistas();
      return () => { activo = false; };
    }, [intento])
  );

  const mostrarArtistas = filtroActivo === 'todos' || filtroActivo === 'artistas';
  const mostrarGustas = filtroActivo === 'todos' || filtroActivo === 'gustas';
  const mostrarGuardadas = filtroActivo === 'todos' || filtroActivo === 'guardadas';

  const cambiarFiltro = (filtro: Exclude<FiltroBiblioteca, 'todos'>) => {
    setFiltroActivo(actual => actual === filtro ? 'todos' : filtro);
  };

  const renderizarArtistas = () => {
    if (cargando) {
      return (
        <View style={styles.estadoContenedor}>
          <ActivityIndicator color="#D75BFF" size="large" />
          <Text style={styles.estadoDescripcion}>Cargando tus artistas...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.estadoContenedor}>
          <Ionicons name="alert-circle-outline" size={35} color="#FF7BB9" />
          <Text style={styles.estadoDescripcion}>{error}</Text>
          <Pressable onPress={() => setIntento(actual => actual + 1)} style={styles.reintentarBoton}>
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    if (artistas.length === 0) {
      return (
        <View style={[styles.estadoContenedor, styles.estadoArtistas]}>
          <Ionicons name="people-outline" size={36} color="#DB78FF" />
          <Text style={styles.estadoTitulo}>Todavía no sigues artistas</Text>
          <Text style={styles.estadoDescripcion}>Cuando sigas a un artista, aparecerá aquí.</Text>
        </View>
      );
    }

    return (
      <View style={styles.listaArtistas}>
        {artistas.map(artista => {
          const ubicacion = [artista.ubicacion?.comuna, artista.ubicacion?.region]
            .filter(Boolean).join(', ');
          return (
            <Pressable
              key={String(artista.usuarioId)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir perfil de ${artista.nombreArtistico || artista.nombreUsuario}`}
              onPress={() => router.push({
                pathname: '/artista/[usuarioId]',
                params: { usuarioId: String(artista.usuarioId) },
              })}
              style={({ pressed }) => [styles.tarjetaArtista, pressed && styles.presionado]}
            >
              <View style={styles.fotoContenedor}>
                {artista.fotoPerfil ? (
                  <Image
                    source={{ uri: `${API_URL}/api/usuarios/foto-perfil/${artista.fotoPerfil}` }}
                    style={styles.fotoArtista}
                  />
                ) : (
                  <Ionicons name="person" size={29} color="#E4B7FF" />
                )}
              </View>
              <View style={styles.datosArtista}>
                <Text style={styles.nombreArtista} numberOfLines={1}>
                  {artista.nombreArtistico || artista.nombreUsuario}
                </Text>
                <Text style={styles.detalleArtista} numberOfLines={1}>
                  @{artista.nombreUsuario}{artista.generoPrincipal ? ` · ${artista.generoPrincipal}` : ''}
                </Text>
                {!!ubicacion && (
                  <View style={styles.ubicacionFila}>
                    <Ionicons name="location-outline" size={13} color="#64DFFF" />
                    <Text style={styles.ubicacionTexto} numberOfLines={1}>{ubicacion}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={22} color="#DB78FF" />
            </Pressable>
          );
        })}
      </View>
    );
  };

  const reproducirFavorita = (cancion: CancionFavorita, lista: CancionFavorita[] = cancionesFavoritas) => {
    if (!cancion.audioId) return;
    if (cancionActual?.id === cancion.id) {
      alternarReproduccion();
      return;
    }
    const cola: CancionReproductor[] = lista
      .filter(c => !!c.audioId)
      .map(c => ({
        id: c.id,
        audioId: c.audioId as string,
        titulo: c.titulo,
        nombreArtista: c.nombreArtista || 'Artista',
        usuarioId: c.usuarioId,
        portadaId: c.portadaId,
        fotoArtista: c.fotoArtista || null,
      }));
    const seleccionada = cola.find(c => c.id === cancion.id);
    if (!seleccionada) return;
    reproducirCancion(seleccionada, cola);
    router.push('/reproductor');
  };

  const quitarMeGusta = async (cancion: CancionFavorita) => {
    if (quitandoMeGusta) return;
    setQuitandoMeGusta(cancion.id);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) throw new Error('Inicia sesión para modificar tus Me gusta.');
      const respuesta = await fetch(`${API_URL}/api/me-gustas/${cancion.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo quitar el Me gusta.');
      setCancionesFavoritas(actual => actual.filter(item => item.id !== cancion.id));
    } catch (err) {
      Alert.alert('Me gusta', err instanceof Error ? err.message : 'No fue posible conectar con UnderMusic.');
    } finally {
      setQuitandoMeGusta(null);
    }
  };

  const renderizarMeGustas = () => {
    if (cargandoGustas) return (
      <View style={[styles.estadoContenedor, styles.estadoGustas]}>
        <ActivityIndicator size="large" color="#FF73BB" />
        <Text style={styles.estadoDescripcion}>Cargando tus canciones favoritas...</Text>
      </View>
    );
    if (errorGustas) return (
      <View style={[styles.estadoContenedor, styles.estadoGustas]}>
        <Ionicons name="alert-circle-outline" size={35} color="#FF73BB" />
        <Text style={styles.estadoDescripcion}>{errorGustas}</Text>
        <Pressable onPress={() => setIntento(actual => actual + 1)} style={styles.reintentarBoton}>
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
    if (cancionesFavoritas.length === 0) return (
      <View style={[styles.estadoContenedor, styles.estadoGustas]}>
        <Ionicons name="heart-outline" size={36} color="#FF73BB" />
        <Text style={styles.estadoTitulo}>Todavía no tienes canciones favoritas</Text>
        <Text style={styles.estadoDescripcion}>Toca el corazón de una canción para verla aquí.</Text>
      </View>
    );
    return (
      <View style={styles.listaArtistas}>
        {cancionesFavoritas.map(cancion => (
          <Pressable
            key={cancion.id}
            accessibilityRole="button"
            accessibilityLabel={`Abrir reproductor de ${cancion.titulo} si está seleccionada`}
            onPress={() => {
              if (cancionActual?.id === cancion.id) router.push('/reproductor');
            }}
            style={({ pressed }) => [styles.tarjetaFavorita, pressed && styles.presionado]}
          >
            {cancion.portadaId && !imagenesConError.includes(cancion.id) ? (
              <Image
                source={{ uri: `${API_URL}/api/canciones/portadas/${cancion.portadaId}` }}
                style={styles.portadaFavorita}
                onError={() => setImagenesConError(actual => actual.includes(cancion.id) ? actual : [...actual, cancion.id])}
              />
            ) : cancion.fotoArtista ? (
              <Image
                source={{ uri: `${API_URL}/api/usuarios/foto-perfil/${cancion.fotoArtista}` }}
                style={styles.portadaFavorita}
              />
            ) : (
              <View style={[styles.portadaFavorita, styles.portadaVacia]}>
                <Ionicons name="musical-note" size={26} color="#FF9ACD" />
              </View>
            )}
            <View style={styles.datosArtista}>
              <Text style={styles.nombreArtista} numberOfLines={1}>{cancion.titulo}</Text>
              <Text style={styles.detalleFavorita} numberOfLines={1}>{cancion.nombreArtista || 'Artista'}</Text>
              <Text style={styles.detalleArtista} numberOfLines={1}>{cancion.generoPrincipal}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar Me gusta de ${cancion.titulo}`}
              disabled={quitandoMeGusta !== null}
              onPress={() => void quitarMeGusta(cancion)}
              style={({ pressed }) => [styles.botonMeGusta, pressed && styles.presionado]}
            >
              {quitandoMeGusta === cancion.id ? (
                <ActivityIndicator size="small" color="#FF73BB" />
              ) : (
                <Ionicons name="heart" size={23} color="#FF73BB" />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reproducir o pausar ${cancion.titulo}`}
              disabled={!cancion.audioId}
              onPress={() => reproducirFavorita(cancion)}
              style={({ pressed }) => [styles.botonReproducir, pressed && styles.presionado, !cancion.audioId && styles.botonDesactivado]}
            >
              <Ionicons
                name={cancionActual?.id === cancion.id && reproduciendo ? 'pause' : 'play'}
                size={19}
                color="#FFFFFF"
              />
            </Pressable>
          </Pressable>
        ))}
      </View>
    );
  };

  const quitarGuardada = async (cancion: CancionFavorita) => {
    if (quitandoGuardada) return;
    setQuitandoGuardada(cancion.id);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) throw new Error('Inicia sesión para modificar tus canciones guardadas.');
      const respuesta = await fetch(`${API_URL}/api/guardadas/${cancion.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo quitar la canción de Guardadas.');
      setCancionesGuardadas(actual => actual.filter(item => item.id !== cancion.id));
    } catch (err) {
      Alert.alert('Guardadas', err instanceof Error ? err.message : 'No fue posible conectar con UnderMusic.');
    } finally {
      setQuitandoGuardada(null);
    }
  };

  const renderizarGuardadas = () => {
    if (cargandoGuardadas) return (
      <View style={[styles.estadoContenedor, styles.estadoGuardadas]}>
        <ActivityIndicator size="large" color="#65E3FF" />
        <Text style={styles.estadoDescripcion}>Cargando tus canciones guardadas...</Text>
      </View>
    );
    if (errorGuardadas) return (
      <View style={[styles.estadoContenedor, styles.estadoGuardadas]}>
        <Ionicons name="alert-circle-outline" size={35} color="#65E3FF" />
        <Text style={styles.estadoDescripcion}>{errorGuardadas}</Text>
        <Pressable onPress={() => setIntento(actual => actual + 1)} style={styles.reintentarBoton}>
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
    if (cancionesGuardadas.length === 0) return (
      <View style={[styles.estadoContenedor, styles.estadoGuardadas]}>
        <Ionicons name="bookmark-outline" size={36} color="#65E3FF" />
        <Text style={styles.estadoTitulo}>Todavía no tienes canciones guardadas</Text>
        <Text style={styles.estadoDescripcion}>Toca el marcador de una canción para verla aquí.</Text>
      </View>
    );
    return (
      <View style={styles.listaArtistas}>
        {cancionesGuardadas.map(cancion => (
          <Pressable
            key={cancion.id}
            accessibilityRole="button"
            accessibilityLabel={`Abrir reproductor de ${cancion.titulo} si está seleccionada`}
            onPress={() => {
              if (cancionActual?.id === cancion.id) router.push('/reproductor');
            }}
            style={({ pressed }) => [styles.tarjetaGuardada, pressed && styles.presionado]}
          >
            {cancion.portadaId && !imagenesConError.includes(cancion.id) ? (
              <Image
                source={{ uri: `${API_URL}/api/canciones/portadas/${cancion.portadaId}` }}
                style={styles.portadaFavorita}
                onError={() => setImagenesConError(actual => actual.includes(cancion.id) ? actual : [...actual, cancion.id])}
              />
            ) : cancion.fotoArtista ? (
              <Image
                source={{ uri: `${API_URL}/api/usuarios/foto-perfil/${cancion.fotoArtista}` }}
                style={styles.portadaFavorita}
              />
            ) : (
              <View style={[styles.portadaFavorita, styles.portadaVaciaGuardada]}>
                <Ionicons name="musical-note" size={26} color="#65E3FF" />
              </View>
            )}
            <View style={styles.datosArtista}>
              <Text style={styles.nombreArtista} numberOfLines={1}>{cancion.titulo}</Text>
              <Text style={styles.detalleGuardada} numberOfLines={1}>{cancion.nombreArtista || 'Artista'}</Text>
              <Text style={styles.detalleArtista} numberOfLines={1}>{cancion.generoPrincipal}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar de Guardadas ${cancion.titulo}`}
              disabled={quitandoGuardada !== null}
              onPress={() => void quitarGuardada(cancion)}
              style={({ pressed }) => [styles.botonMeGusta, pressed && styles.presionado]}
            >
              {quitandoGuardada === cancion.id ? (
                <ActivityIndicator size="small" color="#65E3FF" />
              ) : (
                <Ionicons name="bookmark" size={23} color="#65E3FF" />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reproducir o pausar ${cancion.titulo}`}
              disabled={!cancion.audioId}
              onPress={() => reproducirFavorita(cancion, cancionesGuardadas)}
              style={({ pressed }) => [styles.botonReproducirGuardada, pressed && styles.presionado, !cancion.audioId && styles.botonDesactivado]}
            >
              <Ionicons
                name={cancionActual?.id === cancion.id && reproduciendo ? 'pause' : 'play'}
                size={19}
                color="#FFFFFF"
              />
            </Pressable>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/fondo-app.png')}
      style={styles.contenedor}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.encabezado, { width: anchoPantalla - 56, alignSelf: 'center' }]}>
          <Text style={styles.titulo}>Mi biblioteca</Text>
          <View style={styles.iconoEncabezado}>
            <Ionicons name="library-outline" size={34} color="#E15CFF" />
          </View>
        </View>

        <View style={styles.filtrosFila}>
          {filtros.map(filtro => (
            <Pressable
              key={filtro.id}
              accessibilityRole="button"
              accessibilityState={{ selected: filtroActivo === filtro.id }}
              onPress={() => cambiarFiltro(filtro.id)}
              style={({ pressed }) => [
                styles.filtro,
                filtroActivo === filtro.id && styles.filtroActivo,
                pressed && styles.presionado,
              ]}
            >
              <Text style={[styles.filtroTexto, filtroActivo === filtro.id && styles.filtroTextoActivo]}>
                {filtro.titulo}
              </Text>
            </Pressable>
          ))}
        </View>

        {mostrarArtistas && (
          <View style={styles.seccion}>
            <View style={styles.seccionEncabezado}>
              <Text style={styles.seccionTitulo}>Artistas seguidos</Text>
              <Ionicons name="people-outline" size={23} color="#DB78FF" />
            </View>
            {renderizarArtistas()}
          </View>
        )}

        {mostrarGustas && (
          <View style={styles.seccion}>
            <View style={styles.seccionEncabezado}>
              <Text style={styles.seccionTitulo}>Me gusta</Text>
              <Ionicons name="heart-outline" size={23} color="#FF73BB" />
            </View>
            {renderizarMeGustas()}
          </View>
        )}

        {mostrarGuardadas && (
          <View style={styles.seccion}>
            <View style={styles.seccionEncabezado}>
              <Text style={styles.seccionTitulo}>Canciones guardadas</Text>
              <Ionicons name="bookmark-outline" size={23} color="#65E3FF" />
            </View>
            {renderizarGuardadas()}
          </View>
        )}

        {!cargando && !error && artistas.length === 0 && filtroActivo === 'todos' && (
          <View style={styles.descubrirCaja}>
            <Ionicons name="sparkles-outline" size={25} color="#E4A3FF" />
            <Text style={styles.descubrirTitulo}>Descubre artistas emergentes</Text>
            <Text style={styles.descubrirDescripcion}>
              Explora UnderMusic y encuentra artistas para comenzar tu colección.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/busqueda')}
              style={({ pressed }) => [styles.descubrirBoton, pressed && styles.presionado]}
            >
              <Text style={styles.descubrirBotonTexto}>Explorar artistas</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#020106' },
  scroll: { flex: 1 },
  safeArea: { flex: 1 },
  contenido: { width: '100%', maxWidth: 700, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 30, paddingBottom: 55 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, marginBottom: 23 },
  iconoEncabezado: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: '#FFFFFF', fontSize: 29, fontWeight: '800' },
  filtrosFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 30 },
  filtro: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 25, backgroundColor: '#21112F', borderWidth: 1, borderColor: '#573070' },
  filtroActivo: { backgroundColor: '#61248C', borderColor: '#E16DFF' },
  filtroTexto: { color: '#D6C3E0', fontSize: 13, fontWeight: '700' },
  filtroTextoActivo: { color: '#FFFFFF' },
  presionado: { opacity: 0.72 },
  seccion: { marginBottom: 32 },
  seccionEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  seccionTitulo: { color: '#FFFFFF', fontSize: 21, fontWeight: '800', flexShrink: 1 },
  listaArtistas: { gap: 11 },
  tarjetaGuardada: { minHeight: 84, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(8, 44, 59, 0.80)', borderWidth: 1, borderColor: 'rgba(101, 227, 255, 0.48)', flexDirection: 'row', alignItems: 'center', gap: 11 },
  detalleGuardada: { color: '#8BEAFF', fontSize: 13, marginTop: 4, fontWeight: '600' },
  portadaVaciaGuardada: { backgroundColor: '#164253', alignItems: 'center', justifyContent: 'center' },
  botonReproducirGuardada: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12677D', borderWidth: 1, borderColor: '#65E3FF' },
  tarjetaFavorita: { minHeight: 84, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(49, 13, 37, 0.86)', borderWidth: 1, borderColor: 'rgba(255, 115, 187, 0.48)', flexDirection: 'row', alignItems: 'center', gap: 11 },
  portadaFavorita: { width: 59, height: 59, borderRadius: 13 },
  botonMeGusta: { width: 34, height: 42, alignItems: 'center', justifyContent: 'center' },
  portadaVacia: { backgroundColor: '#51223E', alignItems: 'center', justifyContent: 'center' },
  detalleFavorita: { color: '#FFB5DA', fontSize: 13, marginTop: 4, fontWeight: '600' },
  botonReproducir: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A83379', borderWidth: 1, borderColor: '#FF85C3' },
  botonDesactivado: { opacity: 0.4 },
  tarjetaArtista: { minHeight: 84, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(23, 12, 43, 0.92)', borderWidth: 1, borderColor: 'rgba(143, 68, 205, 0.55)', flexDirection: 'row', alignItems: 'center', gap: 12 },
  fotoContenedor: { width: 59, height: 59, borderRadius: 15, backgroundColor: '#4B2370', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fotoArtista: { width: '100%', height: '100%' },
  datosArtista: { flex: 1, minWidth: 0 },
  nombreArtista: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  detalleArtista: { color: '#C9B3D9', fontSize: 12, marginTop: 4 },
  ubicacionFila: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  ubicacionTexto: { color: '#B6A9C4', fontSize: 12, flexShrink: 1 },
  estadoContenedor: { minHeight: 150, borderRadius: 19, backgroundColor: 'rgba(24, 13, 44, 0.78)', borderWidth: 1, borderColor: 'rgba(112, 58, 155, 0.55)', paddingHorizontal: 20, paddingVertical: 25, alignItems: 'center', justifyContent: 'center', gap: 9 },
  estadoArtistas: { backgroundColor: 'rgba(24, 13, 44, 0.78)', borderColor: 'rgba(112, 58, 155, 0.55)' },
  estadoGustas: { backgroundColor: 'rgba(65, 16, 45, 0.78)', borderColor: 'rgba(255, 115, 187, 0.58)' },
  estadoGuardadas: { backgroundColor: 'rgba(8, 44, 59, 0.78)', borderColor: 'rgba(101, 227, 255, 0.58)' },
  estadoTitulo: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  estadoDescripcion: { color: '#BDAEC9', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  reintentarBoton: { backgroundColor: '#6F2BA1', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, marginTop: 7 },
  reintentarTexto: { color: '#FFFFFF', fontWeight: '800' },
  descubrirCaja: { borderRadius: 20, padding: 22, alignItems: 'center', gap: 10, backgroundColor: '#241237', borderWidth: 1, borderColor: '#A34ED1', marginBottom: 12 },
  descubrirTitulo: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  descubrirDescripcion: { color: '#C9B6D7', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  descubrirBoton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8D35C8', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 12, marginTop: 7 },
  descubrirBotonTexto: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CancionReproductor,
  usePlayer,
} from '@/context/PlayerContext';
import {
  ActivityIndicator,
  Animated,
  Easing,
  useWindowDimensions,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Usuario = {
  id: string;
  nombreUsuario: string;
  correoCuenta: string;
  rol: 'oyente' | 'artista';
  fotoPerfil: string | null;
  ubicacion: {
    pais: string;
    region: string;
    comuna: string;
  };
  generosFavoritos: string[];
  priorizarComuna: boolean;
};

type PerfilArtista = {
  id: string;
  usuarioId: string;
  nombreArtistico: string;
  biografia: string;
  generoPrincipal: string;
  generosAdicionales: string[];
  correoContacto: string;
  instagram: string;
  facebook: string;
  twitter: string;
  perfilCompleto: boolean;
};

type Cancion = {
  id: string;
  titulo: string;
  album: string;
  generoPrincipal: string;
  generosSecundarios: string[];
  audioId: string | null;
  portadaId: string | null;
  fechaPublicacion: string;
  fechaActualizacion: string;
  reproducciones?: number;
  meGustas?: number;
  guardados?: number;
};

type EstadisticasArtista = {
  oyentesUnicos: number;
  reproduccionesTotales: number;
  cantidadSeguidores: number;
};

export default function PerfilScreen() {
  const { width: anchoPantalla } = useWindowDimensions();
  // Un solo reflejo blanco que avanza por el contorno (4 tramos).
  // Animamos traslaciones reales, no una línea simétrica que parece inmóvil.
  const avanceBorde = useRef(new Animated.Value(0)).current;
  const [cicloDestello, setCicloDestello] = useState(0);
  useFocusEffect(useCallback(() => {
    avanceBorde.stopAnimation();
    avanceBorde.setValue(0);
    setCicloDestello(actual => actual + 1);
    const animacion = Animated.loop(
      Animated.timing(avanceBorde, {
        toValue: 4,
        duration: 8500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animacion.start();
    return () => { animacion.stop(); avanceBorde.stopAnimation(); };
  }, [avanceBorde]));
  const posicionDestello = (lado: number) => {
    const recorrido = 138;
    const rangosOpacidad = lado === 0
      ? [0, 0.02, 0.98, 1, 4]
      : [0, lado, lado + 0.02, lado + 0.98, lado + 1, 4].filter((v, i, a) => i === 0 || v !== a[i - 1]);
    const valoresOpacidad = lado === 0
  ? [0, 1, 1, 0, 0, 0]
  : [0, 0, 1, 1, 0, 0];

const valoresOpacidadAjustados = rangosOpacidad.map(
  (_, indice) => valoresOpacidad[
    Math.min(indice, valoresOpacidad.length - 1)
  ]
);

return {
  opacity: avanceBorde.interpolate({
    inputRange: rangosOpacidad,
    outputRange: valoresOpacidadAjustados,
    extrapolate: 'clamp',
  }),
      transform: [
        { translateX: avanceBorde.interpolate({
          inputRange: [0, 1, 2, 3, 4],
          outputRange: lado === 0 ? [0, recorrido, recorrido, recorrido, recorrido]
            : lado === 2 ? [0, 0, 0, -recorrido, -recorrido] : [0, 0, 0, 0, 0],
        }) },
        { translateY: avanceBorde.interpolate({
          inputRange: [0, 1, 2, 3, 4],
          outputRange: lado === 1 ? [0, 0, recorrido, recorrido, recorrido]
            : lado === 3 ? [0, 0, 0, 0, -recorrido] : [0, 0, 0, 0, 0],
        }) },
      ],
    };
  };

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const {
  cancionActual,
  reproduciendo,
  reproducirCancion,
  alternarReproduccion,
} = usePlayer();

  const [perfilArtista, setPerfilArtista] =
    useState<PerfilArtista | null>(null);
  const [canciones, setCanciones] =
    useState<Cancion[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasArtista | null>(null);
  const [meGustas, setMeGustas] = useState<string[]>([]);
  const [guardadas, setGuardadas] = useState<string[]>([]);
  const [procesandoMeGusta, setProcesandoMeGusta] = useState<string | null>(null);
  const [procesandoGuardada, setProcesandoGuardada] = useState<string | null>(null);
  const bloqueoMeGusta = useRef(false);
  const bloqueoGuardada = useRef(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [cancionMenu, setCancionMenu] = useState<Cancion | null>(null);
  const confirmarEliminarCancion = (cancion: Cancion) => {
    Alert.alert('Eliminar canción', `¿Eliminar definitivamente «${cancion.titulo}»? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          const token = await SecureStore.getItemAsync('token');
          if (!token) { Alert.alert('Sesión', 'Debes iniciar sesión.'); return; }
          const respuesta = await fetch(`http://192.168.1.5:3000/api/canciones/${cancion.id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
          });
          const datos = await respuesta.json();
          if (!respuesta.ok) throw new Error(datos.message || 'No fue posible eliminar la canción.');
          setCanciones(actuales => actuales.filter(item => item.id !== cancion.id));
          await cargarPerfil();
        } catch (error) {
          Alert.alert('Error', error instanceof Error ? error.message : 'No fue posible eliminar la canción.');
        }
      } },
    ]);
  };

  const mostrarOpcionesCancion = (cancion: Cancion) => {
    setCancionMenu(cancion);
  };

  useFocusEffect(
    useCallback(() => {
      cargarPerfil();
    }, [])
  );

  const cargarPerfil = async () => {
    try {
      setCargando(true);
      setError('');
      setEstadisticas(null);

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        setError('No encontramos una sesión activa.');
        return;
      }

      const respuestaUsuario = await fetch(
        'http://192.168.1.5:3000/api/usuarios/me',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const datosUsuario = await respuestaUsuario.json();

      if (!respuestaUsuario.ok) {
        setError(
          datosUsuario.message ||
            'No fue posible cargar tu perfil.'
        );
        return;
      }

      const usuarioCargado: Usuario = datosUsuario.usuario;

      setUsuario(usuarioCargado);

      if (usuarioCargado.rol === 'artista') {
        const respuestaPerfilArtista = await fetch(
          'http://192.168.1.5:3000/api/perfiles-artista/me',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const datosPerfilArtista =
          await respuestaPerfilArtista.json();

        if (!respuestaPerfilArtista.ok) {
          setError(
            datosPerfilArtista.message ||
              'No fue posible cargar tu perfil artístico.'
          );
          return;
        }

        setPerfilArtista(
          datosPerfilArtista.perfilArtista || null
        );

        // Las estadísticas no deben bloquear el resto del perfil si falla la consulta.
        try {
          const respuestaEstadisticas = await fetch(
            `http://192.168.1.5:3000/api/perfiles-artista/${usuarioCargado.id}/estadisticas`
          );
          if (respuestaEstadisticas.ok) {
            const datos: EstadisticasArtista = await respuestaEstadisticas.json();
            if (
              Number.isFinite(datos.oyentesUnicos) &&
              Number.isFinite(datos.reproduccionesTotales) &&
              Number.isFinite(datos.cantidadSeguidores)
            ) {
              setEstadisticas(datos);
            }
          } else {
            console.warn('No fue posible cargar las estadísticas del artista.');
          }
        } catch (errorEstadisticas) {
          console.warn('Error al consultar estadísticas:', errorEstadisticas);
        }

        const respuestaCanciones = await fetch(
          'http://192.168.1.5:3000/api/canciones/me',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const datosCanciones =
          await respuestaCanciones.json();

        if (!respuestaCanciones.ok) {
          setError(
            datosCanciones.message ||
              'No fue posible cargar tus canciones.'
          );

          return;
        }

        setCanciones(
          datosCanciones.canciones || []
        );
        await cargarInteracciones(token);
      } else {
        setPerfilArtista(null);
        setEstadisticas(null);
        setCanciones([]);
      }
    } catch (error) {
      console.error('Error al cargar el perfil:', error);

      setError('No fue posible conectar con UnderMusic.');
    } finally {
      setCargando(false);
    }
  };

  const cargarInteracciones = async (token: string) => {
    await Promise.all([
      { ruta: 'me-gustas', actualizar: setMeGustas },
      { ruta: 'guardadas', actualizar: setGuardadas },
    ].map(async ({ ruta, actualizar }) => {
      try {
        const respuesta = await fetch(`http://192.168.1.5:3000/api/${ruta}/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!respuesta.ok) throw new Error('No se pudo cargar ' + ruta);
        const datos = await respuesta.json();
        actualizar((datos.canciones || []).map((item: { id: string }) => item.id));
      } catch (error) { console.warn('Error al cargar interacciones:', error); }
    }));
  };

  const alternarInteraccion = async (cancionId: string, tipo: 'me-gustas' | 'guardadas') => {
    const esLike = tipo === 'me-gustas';
    const bloqueo = esLike ? bloqueoMeGusta : bloqueoGuardada;
    if (bloqueo.current) return;
    bloqueo.current = true;
    const setProcesando = esLike ? setProcesandoMeGusta : setProcesandoGuardada;
    const actuales = esLike ? meGustas : guardadas;
    const actualizar = esLike ? setMeGustas : setGuardadas;
    setProcesando(cancionId);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) { Alert.alert('Sesión', 'Inicia sesión para continuar.'); return; }
      const respuesta = await fetch(`http://192.168.1.5:3000/api/${tipo}/${cancionId}`, {
        method: actuales.includes(cancionId) ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo actualizar la canción.');
      const activo = esLike ? datos.meGusta === true : datos.guardada === true;
      actualizar((anterior) => activo ? [...new Set([...anterior, cancionId])] : anterior.filter((id) => id !== cancionId));
    } catch (error) {
      Alert.alert(esLike ? 'Me gusta' : 'Guardadas', error instanceof Error ? error.message : 'Error de conexión.');
    } finally { bloqueo.current = false; setProcesando(null); }
  };

  const compartirCancion = async (cancion: Cancion) => {
    if (!usuario || !perfilArtista) return;
    const nombreArtista = perfilArtista.nombreArtistico || usuario.nombreUsuario;
    const enlace = `https://under-music.vercel.app/cancion/${cancion.id}`;
    const mensaje = `🎵 ¡Escucha "${cancion.titulo}" de ${nombreArtista} en UnderMusic!\n\nDescubre música emergente, conoce nuevos artistas y apoya el talento independiente.\n\n🔗 ${enlace}`;
    try { await Share.share({ message: mensaje, title: cancion.titulo }); }
    catch (error) { console.error('Error al compartir canción:', error); Alert.alert('Compartir canción', 'No fue posible abrir las opciones para compartir.'); }
  };

  const compartirMiPerfil = async () => {
    if (usuario?.rol !== 'artista' || !perfilArtista) return;
    const nombre = perfilArtista.nombreArtistico || usuario.nombreUsuario;
    const enlace = `https://under-music.vercel.app/artista/${usuario.id}`;
const mensaje = `🎤 Conoce mi perfil artístico: ${nombre} (@${usuario.nombreUsuario}) en UnderMusic.\nDescubre música emergente y apoya a artistas locales.\n\n${enlace}`;
    try {
      await Share.share({ message: mensaje, title: `Perfil de ${nombre}` });
    } catch (error) {
      console.error('Error al compartir mi perfil:', error);
      Alert.alert('Compartir perfil', 'No fue posible abrir las opciones para compartir.');
    }
  };

  if (cargando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#B64DFF" />

        <Text style={styles.loadingText}>
          Cargando tu perfil...
        </Text>
      </View>
    );
  }

  if (error || !usuario) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color="#FF5FA2"
        />

        <Text style={styles.errorText}>
          {error || 'No fue posible cargar tu perfil.'}
        </Text>
      </View>
    );
  }

  const esArtista = usuario.rol === 'artista';

  return (
    <ImageBackground
      source={require('../../../assets/images/fondo-app.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Mi perfil</Text>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  router.push('/editar-perfil');
                }}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons
                  name="pencil-outline"
                  size={27}
                  color="#FFFFFF"
                />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={28}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarGlowContainer}>
            <View style={styles.avatarBorder}>
                              <View style={styles.avatar}>
                {usuario.fotoPerfil ? (
                  <Image
                    source={{
                      uri: `http://192.168.1.5:3000/api/usuarios/foto-perfil/${usuario.fotoPerfil}`,
                    }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons
                    name="person"
                    size={72}
                    color="#D8A6FF"
                  />
                )}
              </View>
                <Animated.View key={`destello-${cicloDestello}-0`} pointerEvents="none" style={[styles.avatarGlintHorizontal, { top: 0, left: 0 }, posicionDestello(0)]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', '#FFFFFF', 'rgba(255,255,255,0.35)', 'transparent']} style={StyleSheet.absoluteFill} start={{x:0,y:0.5}} end={{x:1,y:0.5}} />
                </Animated.View>
                <Animated.View key={`destello-${cicloDestello}-1`} pointerEvents="none" style={[styles.avatarGlintVertical, { top: 0, right: 0 }, posicionDestello(1)]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', '#FFFFFF', 'rgba(255,255,255,0.35)', 'transparent']} style={StyleSheet.absoluteFill} start={{x:0.5,y:0}} end={{x:0.5,y:1}} />
                </Animated.View>
                <Animated.View key={`destello-${cicloDestello}-2`} pointerEvents="none" style={[styles.avatarGlintHorizontal, { bottom: 0, right: 0 }, posicionDestello(2)]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', '#FFFFFF', 'rgba(255,255,255,0.35)', 'transparent']} style={StyleSheet.absoluteFill} start={{x:0,y:0.5}} end={{x:1,y:0.5}} />
                </Animated.View>
                <Animated.View key={`destello-${cicloDestello}-3`} pointerEvents="none" style={[styles.avatarGlintVertical, { bottom: 0, left: 0 }, posicionDestello(3)]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', '#FFFFFF', 'rgba(255,255,255,0.35)', 'transparent']} style={StyleSheet.absoluteFill} start={{x:0.5,y:0}} end={{x:0.5,y:1}} />
                </Animated.View>
            </View>
            </View>

            {esArtista &&
            perfilArtista?.nombreArtistico ? (
              <>
                <Text style={styles.artistName}>
                  {perfilArtista.nombreArtistico}
                </Text>

                <Text style={styles.artistUsername}>
                  @{usuario.nombreUsuario}
                </Text>
              </>
            ) : (
              <Text style={styles.username}>
                @{usuario.nombreUsuario}
              </Text>
            )}

            <View style={styles.roleAndCountryRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {esArtista ? 'ARTISTA' : 'OYENTE'}
                </Text>
              </View>
              {esArtista && usuario.ubicacion?.pais ? (
                <Text style={styles.countryText}>{usuario.ubicacion.pais}</Text>
              ) : null}
            </View>

            <View style={styles.profileStatsRow}>
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <Ionicons
  name="location-outline"
  size={24}
  color="#54E6FF"
  style={{ transform: [{ translateY: -6 }] }}
/>
                </View>
                <Text style={styles.locationText}>
                  {usuario.ubicacion.comuna}, {usuario.ubicacion.region}
                </Text>
              </View>

            </View>
          </View>

          {esArtista && perfilArtista ? (
            <View style={styles.statisticsSection}>
              <View style={styles.statisticsHeader}>
                <View style={styles.statsAnimatedIcon}>
                  {[0, 1, 2, 3].map((indice) => (
                    <AnimatedStatsBar key={indice} indice={indice} />
                  ))}
                </View>
                <Text style={styles.statisticsTitle}>Tus estadísticas musicales</Text>
              </View>
              <View style={styles.statisticsRow}>
                {([
                  { clave: 'oyentesUnicos', etiqueta: 'Oyentes únicos', icono: 'headset-outline', color: '#54E6FF' },
                  { clave: 'reproduccionesTotales', etiqueta: 'Reproducciones', icono: 'play-circle-outline', color: '#FF68B7' },
                  { clave: 'cantidadSeguidores', etiqueta: 'Seguidores', icono: 'people-outline', color: '#D69AFF' },
                ] as const).map((item) => (
                  <View key={item.clave} style={styles.statCard}>
                    <Ionicons name={item.icono} size={23} color={item.color} />
                    <Text style={styles.statValue}>
                      {estadisticas ? estadisticas[item.clave].toLocaleString('es-CL') : '—'}
                    </Text>
                    <Text style={styles.statLabel}>{item.etiqueta}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {esArtista && perfilArtista ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver mi perfil público"
              onPress={() => router.push({ pathname: '/artista/[usuarioId]', params: { usuarioId: usuario.id, vistaPrevia: '1' } })}
              style={({ pressed }) => [styles.previewProfileButton, pressed && styles.buttonPressed]}
            >
              <Ionicons name="eye-outline" size={22} color="#EAC6FF" />
              <Text style={styles.previewProfileButtonText}>Ver mi perfil público</Text>
              <Ionicons name="chevron-forward" size={20} color="#D59AFF" />
            </Pressable>
          ) : null}

          {esArtista && perfilArtista ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compartir mi perfil artístico"
              onPress={compartirMiPerfil}
              style={({ pressed }) => [styles.shareMyProfileButton, pressed && styles.buttonPressed]}
            >
              <Ionicons name="share-social-outline" size={22} color="#EAC6FF" />
              <Text style={styles.shareMyProfileButtonText}>Compartir mi perfil</Text>
              <Ionicons name="chevron-forward" size={20} color="#D59AFF" />
            </Pressable>
          ) : null}

          {esArtista ? (
            <>
              <View style={styles.artistContent}>
                {perfilArtista ? (
                  <>
                    <View style={styles.artistSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons
                          name="person-outline"
                          size={26}
                          color="#E05BFF"
                        />

                        <Text style={styles.sectionTitle}>
                          Sobre el artista
                        </Text>
                      </View>

                      {perfilArtista.biografia ? (
                        <Text style={styles.biography}>
                          {perfilArtista.biografia}
                        </Text>
                      ) : (
                        <Text style={styles.emptySimpleText}>
                          Aún no has agregado una biografía.
                        </Text>
                      )}
                    </View>

                    <View style={styles.artistSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons
                          name="musical-notes-outline"
                          size={26}
                          color="#59DFFF"
                        />

                        <Text style={styles.sectionTitle}>
                          Géneros artísticos
                        </Text>
                      </View>

                      {perfilArtista.generoPrincipal ? (
                        <>
                          <Text style={styles.genreLabel}>
                            Género principal
                          </Text>

                          <View style={styles.artistGenresContainer}>
                            <View
                              style={[
                                styles.artistGenreChip,
                                styles.mainGenreChip,
                              ]}
                            >
                              <Text
                                style={styles.artistGenreText}
                              >
                                {perfilArtista.generoPrincipal}
                              </Text>
                            </View>
                          </View>

                          {perfilArtista.generosAdicionales
                            .length > 0 ? (
                            <>
                              <Text
                                style={[
                                  styles.genreLabel,
                                  styles.additionalGenreLabel,
                                ]}
                              >
                                Géneros adicionales
                              </Text>

                              <View
                                style={
                                  styles.artistGenresContainer
                                }
                              >
                                {perfilArtista.generosAdicionales.map(
                                  (genero) => (
                                    <View
                                      key={genero}
                                      style={
                                        styles.artistGenreChip
                                      }
                                    >
                                      <Text
                                        style={
                                          styles.artistGenreText
                                        }
                                      >
                                        {genero}
                                      </Text>
                                    </View>
                                  )
                                )}
                              </View>
                            </>
                          ) : null}
                        </>
                      ) : (
                        <Text style={styles.emptySimpleText}>
                          Aún no has seleccionado tu género
                          artístico principal.
                        </Text>
                      )}
                    </View>
                  </>
                ) : (
                  <View style={styles.incompleteArtistCard}>
                    <View style={styles.incompleteIcon}>
                      <Ionicons
                        name="musical-notes-outline"
                        size={28}
                        color="#E8B0FF"
                      />
                    </View>

                    <View style={styles.incompleteInfo}>
                      <Text style={styles.incompleteTitle}>
                        Completa tu perfil artístico
                      </Text>

                      <Text
                        style={styles.incompleteDescription}
                      >
                        Agrega tu nombre artístico, biografía y
                        género principal para completar tu perfil.
                      </Text>
                    </View>
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    router.push('/editar-perfil-artista');
                  }}
                  style={({ pressed }) => [
                    styles.artistProfileButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={21}
                    color="#E5B4FF"
                  />

                  <Text
                    style={styles.artistProfileButtonText}
                  >
                    Editar perfil artístico
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#C68AFF"
                  />
                </Pressable>

                <View style={styles.divider} />

                <View style={styles.songsSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons
                      name="disc-outline"
                      size={27}
                      color="#FF68B7"
                    />

                    <Text style={styles.sectionTitle}>
                      Canciones
                    </Text>
                  </View>

                  <Pressable
  onPress={() => {
    router.push('/publicar-cancion');
  }}
  style={({ pressed }) => [
    styles.publishSongButton,
    pressed && styles.buttonPressed,
  ]}
>
  <Ionicons
    name="add-circle-outline"
    size={22}
    color="#FFFFFF"
  />

  <Text style={styles.publishSongButtonText}>
    Publicar canción
  </Text>
</Pressable>

                              {canciones.length > 0 ? (
                    <View style={styles.songsList}>
                      {canciones.map((cancion) => (
                        <Pressable
                          key={cancion.id}
                          style={({ pressed }) => [
                            styles.songCard,
                            anchoPantalla < 620 && styles.songCardTwoRows,
                            cancionActual?.id === cancion.id &&
                              pressed &&
                              styles.songCardPressed,
                          ]}
                          onPress={() => {

  if (cancionActual?.id === cancion.id) {
    router.push('/reproductor');
  }
}}
                        >
                          {cancion.portadaId ? (
                            <Image
                              source={{
                                uri: `http://192.168.1.5:3000/api/canciones/portadas/${cancion.portadaId}`,
                              }}
                              style={[styles.songCover, anchoPantalla < 1050 && styles.songCoverCompact]}
                              resizeMode="cover"
                            />
                          ) : usuario.fotoPerfil ? (
                            <Image
                              source={{
                                uri: `http://192.168.1.5:3000/api/usuarios/foto-perfil/${usuario.fotoPerfil}`,
                              }}
                              style={[styles.songCover, anchoPantalla < 1050 && styles.songCoverCompact]}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.songCoverPlaceholder}>
                              <Ionicons
                                name="musical-note"
                                size={28}
                                color="#D89BFF"
                              />
                            </View>
                          )}

                          <View style={[styles.songInfo, anchoPantalla < 620 && styles.songInfoCompact]}>
                            <Text
                              style={styles.songTitle}
                              numberOfLines={1}
                            >
                              {cancion.titulo}
                            </Text>

                            <Text
                              style={styles.songGenre}
                              numberOfLines={1}
                            >
                              {cancion.generoPrincipal}
                            </Text>

                            {cancion.album ? (
                              <Text
                                style={styles.songAlbum}
                                numberOfLines={1}
                              >
                                {cancion.album}
                              </Text>
                            ) : null}
                          </View>

                          <View style={[styles.songActionsRow, anchoPantalla < 620 && styles.songActionsTwoRows]}>
                          <Pressable style={[styles.songShareButton, anchoPantalla < 620 && styles.songActionCompact]} onPress={(event) => { event.stopPropagation(); void compartirCancion(cancion); }} accessibilityRole="button" accessibilityLabel={`Compartir ${cancion.titulo}`}>
                            <Ionicons name="share-social-outline" size={18} color="#DDB9FF" />
                          </Pressable>
                          <Pressable style={[styles.songQueueButton, anchoPantalla < 620 && styles.songActionCompact]} disabled accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={`Añadir ${cancion.titulo} a la cola (próximamente)`}>
                            <Ionicons name="list-outline" size={19} color="#B7A6C7" />
                          </Pressable>
                          <Pressable style={[styles.songSaveButton, anchoPantalla < 620 && styles.songActionCompact]} disabled={procesandoGuardada !== null} onPress={(event) => { event.stopPropagation(); void alternarInteraccion(cancion.id, 'guardadas'); }} accessibilityRole="button" accessibilityLabel={`${guardadas.includes(cancion.id) ? 'Quitar de Guardadas' : 'Guardar'} ${cancion.titulo}`}>
                            {procesandoGuardada === cancion.id ? <ActivityIndicator size="small" color="#54E6FF" /> : <Ionicons name={guardadas.includes(cancion.id) ? 'bookmark' : 'bookmark-outline'} size={19} color={guardadas.includes(cancion.id) ? '#54E6FF' : '#9FD9E5'} />}
                          </Pressable>
                          <Pressable style={[styles.songLikeButton, anchoPantalla < 620 && styles.songActionCompact]} disabled={procesandoMeGusta !== null} onPress={(event) => { event.stopPropagation(); void alternarInteraccion(cancion.id, 'me-gustas'); }} accessibilityRole="button" accessibilityLabel={`${meGustas.includes(cancion.id) ? 'Quitar Me gusta de' : 'Dar Me gusta a'} ${cancion.titulo}`}>
                            {procesandoMeGusta === cancion.id ? <ActivityIndicator size="small" color="#FF68B7" /> : <Ionicons name={meGustas.includes(cancion.id) ? 'heart' : 'heart-outline'} size={20} color={meGustas.includes(cancion.id) ? '#FF68B7' : '#E7A1C8'} />}
                          </Pressable>

                          <Pressable
                            style={[styles.songPlayButton, anchoPantalla < 620 && styles.songActionCompact]}
                            disabled={!cancion.audioId}
                            onPress={(event) => {
                              event.stopPropagation();

                              if (!cancion.audioId) {
                                return;
                              }

                              const esCancionActual =
                                cancionActual?.id === cancion.id;

                              if (esCancionActual) {
                                alternarReproduccion();
                                return;
                              }

                              const colaReproductor: CancionReproductor[] =
                                canciones
                                  .filter((item) => item.audioId !== null)
                                  .map((item) => ({
                                    id: item.id,
                                    audioId: item.audioId as string,
                                    titulo: item.titulo,
                                    nombreArtista:
                                      perfilArtista?.nombreArtistico ||
                                      usuario.nombreUsuario,
                                      usuarioId: usuario.id,
                                    portadaId: item.portadaId,
                                    fotoArtista:
                                      usuario.fotoPerfil || null,
                                  }));

                              const cancionParaReproductor =
                                colaReproductor.find(
                                  (item) => item.id === cancion.id
                                );

                              if (!cancionParaReproductor) {
                                return;
                              }

                              reproducirCancion(
                                cancionParaReproductor,
                                colaReproductor
                              );

                              router.push('/reproductor');
                            }}
                          >
                            <Ionicons
                              name={
                                cancionActual?.id === cancion.id &&
                                reproduciendo
                                  ? 'pause'
                                  : 'play'
                              }
                              size={19}
                              color={
                                cancion.audioId
                                  ? '#FFFFFF'
                                  : '#6E6876'
                              }
                            />
                          </Pressable>
                          <Pressable style={[styles.songOptionsButton, anchoPantalla < 620 && styles.songActionCompact]} onPress={(event) => { event.stopPropagation(); mostrarOpcionesCancion(cancion); }} accessibilityRole="button" accessibilityLabel={`Opciones de ${cancion.titulo}`}>
                            <Ionicons name="ellipsis-vertical" size={22} color="#E4C2FF" />
                          </Pressable>
                          </View>
                          <View style={[styles.songMetricsDivider, anchoPantalla < 620 && styles.songMetricsDividerCompact]} />
                          <View style={[styles.songMetricsColumn, anchoPantalla < 620 && styles.songMetricsColumnCompact]}>
                            <View style={styles.songMetric}><Ionicons name="play" size={12} color="#FF68B7" /><Text style={styles.songMetricText}>{cancion.reproducciones ?? 0}</Text></View>
                            <View style={styles.songMetric}><Ionicons name="heart" size={12} color="#FF68B7" /><Text style={styles.songMetricText}>{cancion.meGustas ?? 0}</Text></View>
                            <View style={styles.songMetric}><Ionicons name="bookmark" size={12} color="#54E6FF" /><Text style={styles.songMetricText}>{cancion.guardados ?? 0}</Text></View>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptySongsCard}>
                      <View style={styles.emptySongsIcon}>
                        <Ionicons
                          name="musical-note-outline"
                          size={32}
                          color="#C487EE"
                        />
                      </View>

                      <Text style={styles.emptySongsTitle}>
                        Aún no has publicado canciones
                      </Text>

                      <Text style={styles.emptySongsDescription}>
                        Publica tu primera canción para que aparezca
                        en tu perfil.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />
            </>
          ) : null}

          <View style={styles.preferencesSection}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="headset-outline"
                size={27}
                color="#E05BFF"
              />

              <Text style={styles.sectionTitle}>
                Preferencias musicales
              </Text>
            </View>

            {usuario.generosFavoritos.length > 0 ? (
              <View style={styles.genresContainer}>
                {usuario.generosFavoritos.map((genero) => (
                  <View key={genero} style={styles.genreChip}>
                    <Text style={styles.genreText}>
                      {genero}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyPreferences}>
                <Text style={styles.emptyTitle}>
                  Aún no has seleccionado tus géneros
                  favoritos
                </Text>

                <Text style={styles.emptyDescription}>
                  Elige los estilos de música que más te
                  gustan para mejorar tus recomendaciones.
                </Text>

                <Pressable
                  onPress={() => {
                    router.push('/editar-perfil');
                  }}
                  style={({ pressed }) => [
                    styles.chooseGenresButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={21}
                    color="#FFFFFF"
                  />

                  <Text style={styles.chooseGenresText}>
                    Elegir mis géneros
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.localPreferenceCard}>
              <View style={styles.localPreferenceIcon}>
                <Ionicons
                  name="location"
                  size={23}
                  color="#61E4FF"
                />
              </View>

              <View style={styles.localPreferenceInfo}>
                <Text style={styles.localPreferenceTitle}>
                  Priorizar artistas de mi comuna
                </Text>

                <Text
                  style={styles.localPreferenceSubtitle}
                >
                  Da mayor prioridad a artistas cercanos a ti.
                </Text>
              </View>

              <View
                style={[
                  styles.preferenceStatus,
                  usuario.priorizarComuna &&
                    styles.preferenceStatusActive,
                ]}
              >
                <Text
                  style={[
                    styles.preferenceStatusText,
                    usuario.priorizarComuna &&
                      styles.preferenceStatusTextActive,
                  ]}
                >
                  {usuario.priorizarComuna ? 'Sí' : 'No'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
        <Modal
          visible={cancionMenu !== null}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setCancionMenu(null)}
        >
          <View style={styles.songMenuOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setCancionMenu(null)} accessibilityLabel="Cerrar opciones" />
            <View style={styles.songMenuPanel}>
              <View style={styles.songMenuAccent} />
              <Text style={styles.songMenuHeading}>Opciones de canción</Text>
              <Text style={styles.songMenuSubtitle} numberOfLines={2}>{cancionMenu?.titulo}</Text>
              <Pressable style={styles.songMenuOption} onPress={() => {
                const cancion = cancionMenu;
                setCancionMenu(null);
                if (cancion) router.push({ pathname: '/editar-cancion', params: { cancionId: cancion.id } } as never);
              }}>
                <Ionicons name="create-outline" size={22} color="#D9A6FF" />
                <Text style={styles.songMenuOptionText}>Editar canción</Text>
                <Ionicons name="chevron-forward" size={19} color="#A88EC3" />
              </Pressable>
              <View style={styles.songMenuSeparator} />
              <Pressable style={styles.songMenuOption} onPress={() => {
                const cancion = cancionMenu;
                setCancionMenu(null);
                if (cancion) confirmarEliminarCancion(cancion);
              }}>
                <Ionicons name="trash-outline" size={22} color="#FF78B3" />
                <Text style={[styles.songMenuOptionText, { color: '#FF9AC7' }]}>Eliminar canción</Text>
                <Ionicons name="chevron-forward" size={19} color="#A88EC3" />
              </Pressable>
              <Pressable style={styles.songMenuCancel} onPress={() => setCancionMenu(null)}>
                <Text style={styles.songMenuCancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

function AnimatedStatsBar({ indice }: { indice: number }) {
  const iniciales = [0.46, 0.78, 0.58, 0.9];
  const escala = useRef(new Animated.Value(iniciales[indice] ?? 0.6)).current;

  useEffect(() => {
    const destinos = [
      [0.78, 0.42, 0.9, 0.56],
      [0.48, 0.92, 0.62, 0.84],
      [0.88, 0.55, 0.75, 0.42],
      [0.54, 0.8, 0.5, 0.94],
    ];
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.delay(indice * 140),
        ...destinos.map((paso) =>
          Animated.timing(escala, {
            toValue: paso[indice],
            duration: 900 + indice * 130,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ),
      ])
    );
    animacion.start();
    return () => animacion.stop();
  }, [escala, indice]);

  // React Native escala desde el centro. Esta traslación mantiene
  // el borde inferior en el mismo punto durante toda la animación.
  const desplazamiento = escala.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  return (
    <View style={{ width: 4, height: 20, overflow: 'hidden' }}>
      <Animated.View
        style={[
          styles.statsBar,
          {
            height: 20,
            transform: [
              { scaleY: escala },
              { translateY: desplazamiento },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#020106',
  },

  safeArea: {
    flex: 1,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020106',
    paddingHorizontal: 30,
  },

  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 50,
  },

  header: {
    minHeight: 64,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 28,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },

  headerActions: {
    position: 'absolute',
    right: -8,
    top: 4,
    flexDirection: 'row',
    gap: 10,
  },

  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 18, 54, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(187, 81, 255, 0.65)',
  },

  buttonPressed: {
    opacity: 0.72,
  },

  profileSection: {
    alignItems: 'center',
  },

  avatarGlowContainer: { width: 174, height: 174, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  avatarGlintHorizontal: { position: 'absolute', width: 32, height: 4, borderRadius: 2, zIndex: 2 },
  avatarGlintVertical: { position: 'absolute', width: 4, height: 32, borderRadius: 2, zIndex: 2 },
  avatarBorder: {
    overflow: 'hidden',
    width: 170,
    height: 170,
    borderRadius: 43,
    padding: 3,
    backgroundColor: '#7C39FF',
  },

  avatar: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: '#171026',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },

  username: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    textAlign: 'center',
  },

  artistName: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    textAlign: 'center',
  },

  artistUsername: {
    color: '#AAA2B2',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
  },

  roleAndCountryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },

  roleBadge: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(105, 35, 167, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(196, 87, 255, 0.45)',
  },

  roleText: {
    color: '#E0A4FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  countryText: {
    color: '#D7D1DE',
    fontSize: 16,
    fontWeight: '600',
  },

  profileStatsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    columnGap: 24,
    rowGap: 14,
    maxWidth: 550,
    alignSelf: 'center',
    paddingHorizontal: 14,
    marginTop: 22,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
    minWidth: 0,
    gap: 5,
  },

  locationIcon: { justifyContent: 'center', alignItems: 'center', transform: [{ translateY: 1 }] },

  locationText: {
    flexShrink: 1,
    color: '#D7D1DE',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'left',
  },

  followersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 0,
    marginRight: 8,
  },

  followersLabel: {
    color: '#E5C6F5',
    fontSize: 15,
    fontWeight: '600',
  },

  statisticsSection: {
    width: '100%',
    maxWidth: 550,
    alignSelf: 'center',
    marginTop: 22,
  },
  statsAnimatedIcon: { height: 20, width: 32, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, marginBottom: 3 },
  statsBar: { width: 4, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: '#D69AFF' },
  statisticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginBottom: 12,
  },
  statisticsTitle: {
    color: '#E9D8F6',
    fontSize: 16,
    fontWeight: '800',
  },
  statisticsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 3,
    borderRadius: 16,
    backgroundColor: 'rgba(25, 12, 48, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(167, 92, 240, 0.52)',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 7,
  },
  statLabel: {
    color: '#CFC0DF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  artistContent: {
    width: '100%',
    marginTop: 30,
  },

  artistSection: {
    width: '100%',
    marginBottom: 28,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    marginLeft: 10,
  },

  biography: {
    color: '#C9C2D0',
    fontSize: 15,
    lineHeight: 23,
  },

  emptySimpleText: {
    color: '#8E8797',
    fontSize: 14,
    lineHeight: 21,
  },

  genreLabel: {
    color: '#A8A0B0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 9,
  },

  additionalGenreLabel: {
    marginTop: 18,
  },

  artistGenresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  artistGenreChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(50, 30, 70, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(152, 83, 205, 0.65)',
  },

  mainGenreChip: {
    backgroundColor: 'rgba(105, 35, 167, 0.72)',
    borderColor: '#C65BFF',
  },

  artistGenreText: {
    color: '#EBCFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  incompleteArtistCard: {
    width: '100%',
    minHeight: 100,
    padding: 18,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 9, 34, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(185, 79, 255, 0.48)',
    marginBottom: 20,
  },

  incompleteIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 48, 186, 0.24)',
  },

  incompleteInfo: {
    flex: 1,
    marginLeft: 14,
  },

  incompleteTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  incompleteDescription: {
    color: '#AAA2B2',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  shareMyProfileButton: {
    width: '100%', maxWidth: 440, alignSelf: 'center',
    marginTop: 12, minHeight: 54, paddingHorizontal: 18,
    borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(79, 32, 124, 0.60)',
    borderWidth: 1, borderColor: '#B77CFF',
  },
  shareMyProfileButtonText: {
    flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '700',
  },
  previewProfileButton: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    marginTop: 24,
    minHeight: 54,
    paddingHorizontal: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(79, 32, 124, 0.76)',
    borderWidth: 1,
    borderColor: '#B77CFF',
  },
  previewProfileButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  artistProfileButton: {
    width: '100%',
    minHeight: 58,
    paddingHorizontal: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 21, 121, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(190, 82, 255, 0.65)',
  },

  artistProfileButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },

  divider: {
    height: 2,
    width: '100%',
    backgroundColor: 'rgba(126, 70, 220, 0.45)',
    marginTop: 31,
    marginBottom: 27,
  },

  publishSongButton: {
  minHeight: 50,
  marginTop: 16,
  marginBottom: 16,
  borderRadius: 15,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  backgroundColor: '#7B3FC6',
},

publishSongButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '700',
},

  songsSection: {
    width: '100%',
  },
  songsList: {
    width: '100%',
    gap: 12,
  },

  songCard: {
    width: '100%',
    minHeight: 82,
    padding: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 7, 28, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(137, 63, 209, 0.52)',
  },

  songCardPressed: {
    opacity: 0.82,
  },

  songCoverPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(112, 48, 161, 0.22)',
  },

  songCover: {
  width: 58,
  height: 58,
  borderRadius: 13,
  backgroundColor: 'rgba(112, 48, 161, 0.22)',
},

  songShareButton: {
    flexShrink: 0,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    backgroundColor: 'rgba(120, 66, 175, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(190, 129, 255, 0.45)',
  },

  songQueueButton: { flexShrink: 0, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 0, backgroundColor: 'rgba(91, 80, 112, 0.13)', borderWidth: 1, borderColor: 'rgba(170, 151, 192, 0.32)', opacity: 0.55 },

  songSaveButton: {
    flexShrink: 0,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    backgroundColor: 'rgba(24, 119, 143, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(84, 230, 255, 0.45)',
  },

  songLikeButton: {
    flexShrink: 0,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    backgroundColor: 'rgba(145, 35, 100, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 104, 183, 0.45)',
  },

  songPlayButton: {
    flexShrink: 0,
    marginLeft: 0,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(137, 63, 209, 0.72)',
    borderWidth: 1,
    borderColor:
      'rgba(214, 151, 255, 0.55)',
  },

  songCardCompact: { paddingHorizontal: 9, paddingRight: 66 },
  songCardTwoRows: { flexWrap: 'wrap', paddingHorizontal: 12, paddingRight: 66, minHeight: 126, alignContent: 'center' },
  songActionsRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, flexGrow: 0, gap: 8 },
  songActionsTwoRows: { width: '100%', justifyContent: 'flex-end', marginTop: 10, paddingLeft: 0, paddingRight: 18, gap: 8 },
  songCoverCompact: { width: 48, height: 48 },
  songInfoCompact: { minWidth: 0, marginLeft: 10, marginRight: 2, flexShrink: 1 },
  songActionCompact: { width: 43, height: 43, minWidth: 43, flexBasis: 43, flexGrow: 0, flexShrink: 0, marginLeft: 0, marginRight: 0, borderRadius: 22 },
  songMetricsDividerCompact: { position: 'absolute', right: 61, top: 36, height: 52, marginLeft: 0, marginRight: 0, transform: [] },
  songMetricsColumnCompact: { position: 'absolute', right: 6, top: 34, width: 43, transform: [] },
  songOptionsButton: { width: 32, minWidth: 32, flexShrink: 0, height: 42, alignItems: 'center', justifyContent: 'center', marginLeft: 0, marginRight: 0 },
  songMetricsDivider: { width: 1, height: 56, backgroundColor: 'rgba(193,134,241,0.48)', marginLeft: 10, marginRight: 10 },
  songMetricsColumn: { width: 43, flexShrink: 0, justifyContent: 'center', gap: 4 },
  songMetric: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  songMetricText: { color: '#D9C9E6', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  songInfo: {
    flex: 1,
    marginLeft: 13,
    marginRight: 5,
    minWidth: 0,
  },

  songTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  songGenre: {
    color: '#D49BFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  songAlbum: {
    color: '#918A9B',
    fontSize: 12,
    marginTop: 3,
  },
  emptySongsCard: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderRadius: 22,
    backgroundColor: 'rgba(12, 7, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(137, 63, 209, 0.52)',
  },

  emptySongsIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(112, 48, 161, 0.20)',
    marginBottom: 13,
  },

  emptySongsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptySongsDescription: {
    color: '#9991A2',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },

  preferencesSection: {
    width: '100%',
  },

  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  genreChip: {
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: 'rgba(76, 21, 121, 0.78)',
    borderWidth: 1,
    borderColor: '#A346FF',
  },

  genreText: {
    color: '#E8C9FF',
    fontSize: 14,
    fontWeight: '700',
  },

  emptyPreferences: {
    width: '100%',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 19,
    backgroundColor: 'rgba(12, 7, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(137, 63, 209, 0.52)',
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  emptyDescription: {
    color: '#AAA3B3',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },

  chooseGenresButton: {
    alignSelf: 'flex-start',
    minHeight: 43,
    marginTop: 17,
    paddingHorizontal: 17,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(116, 47, 206, 0.88)',
    borderWidth: 1,
    borderColor: '#C256FF',
  },

  chooseGenresText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 7,
  },

  localPreferenceCard: {
    width: '100%',
    minHeight: 92,
    marginTop: 22,
    borderRadius: 22,
    paddingHorizontal: 17,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 7, 28, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(61, 195, 255, 0.35)',
  },

  localPreferenceIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28, 139, 181, 0.18)',
  },

  localPreferenceInfo: {
    flex: 1,
    marginHorizontal: 13,
  },

  localPreferenceTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  localPreferenceSubtitle: {
    color: '#9E98A7',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  preferenceStatus: {
    minWidth: 48,
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(86, 80, 96, 0.45)',
  },

  preferenceStatusActive: {
    backgroundColor: 'rgba(146, 49, 217, 0.65)',
  },

  preferenceStatusText: {
    color: '#B9B2C0',
    fontSize: 13,
    fontWeight: '800',
  },

  preferenceStatusTextActive: {
    color: '#F0C7FF',
  },

  loadingText: {
    color: '#BDB5C6',
    fontSize: 14,
    marginTop: 14,
  },

  errorText: {
    color: '#FF8AAF',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
  },
  songMenuOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(3, 1, 15, 0.76)' },
  songMenuPanel: { width: '100%', maxWidth: 420, alignSelf: 'center', overflow: 'hidden', borderRadius: 24, backgroundColor: '#150A2D', borderWidth: 1, borderColor: 'rgba(174, 89, 255, 0.65)', paddingHorizontal: 20, paddingTop: 23, paddingBottom: 16 },
  songMenuAccent: { position: 'absolute', top: 0, left: 30, right: 30, height: 2, backgroundColor: '#AD58F6' },
  songMenuHeading: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  songMenuSubtitle: { color: '#BFA6D9', fontSize: 14, textAlign: 'center', marginTop: 5, marginBottom: 20 },
  songMenuOption: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8 },
  songMenuOptionText: { color: '#F0E5FF', fontSize: 16, fontWeight: '700', flex: 1 },
  songMenuSeparator: { height: 1, backgroundColor: 'rgba(181, 124, 235, 0.2)', marginHorizontal: 6 },
  songMenuCancel: { marginTop: 18, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(120, 52, 188, 0.28)', borderWidth: 1, borderColor: 'rgba(185, 110, 255, 0.36)' },
  songMenuCancelText: { color: '#E8D1FF', fontSize: 15, fontWeight: '700' },

});
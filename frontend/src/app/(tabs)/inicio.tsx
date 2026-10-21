import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { router, useFocusEffect } from 'expo-router';
import { CancionReproductor, usePlayer } from '@/context/PlayerContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://192.168.1.5:3000';

type CancionReciente = {
  id: string;
  usuarioId: string;
  titulo: string;
  album: string;
  generoPrincipal: string;
  audioId: string;
  portadaId: string | null;
  nombreArtistico: string;
  fechaEscucha: string;
  fotoArtista?: string | null;
};

const artistas = [
  {
    id: '1',
    nombre: 'Amzy mc',
    genero: 'Pop',
    ubicacion: 'San Antonio',
    imagen: require('../../../assets/images/amzy-mc.png'),
    colores: ['#46D6D5', '#168BE5'],
  },
  {
    id: '2',
    nombre: 'La Indu$tria',
    genero: 'Reguetón',
    ubicacion: 'San Joaquín',
    imagen: require('../../../assets/images/la-industria.png'),
    colores: ['#536CFF', '#F05EC5'],
  },
  {
    id: '3',
    nombre: 'Morse',
    genero: 'Hip-Hop Rap',
    ubicacion: 'Santiago',
    imagen: require('../../../assets/images/morse.png'),
    colores: ['#9845EC', '#FF8A4D'],
  },
];

const barrasEqualizador = [
  { height: 12, opacity: 0.35 },
  { height: 22, opacity: 0.5 },
  { height: 34, opacity: 0.7 },
  { height: 45, opacity: 0.7 },
  { height: 31, opacity: 0.75 },
  { height: 39, opacity: 0.7 },
  { height: 27, opacity: 0.65 },
  { height: 18, opacity: 0.45 },
  { height: 10, opacity: 0.3 },
];

type EqualizerProps = {
  animaciones: Animated.Value[];
};

function Equalizer({ animaciones }: EqualizerProps) {
  return (
    <View style={styles.equalizer}>
      {barrasEqualizador.map((barra, indice) => {
        const scaleY = animaciones[indice].interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.38],
        });

        const translateY = animaciones[indice].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        });

        return (
          <Animated.View
            key={indice}
            style={[
              styles.equalizerBar,
              {
                height: barra.height,
                opacity: barra.opacity,
                transform: [
                  { scaleY },
                  { translateY },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function InicioScreen() {
  const [actualizando, setActualizando] = useState(false);
  const [cancionesRecientes, setCancionesRecientes] = useState<CancionReciente[]>([]);
  const [cargandoRecientes, setCargandoRecientes] = useState(true);
  const [errorRecientes, setErrorRecientes] = useState('');
  const [imagenesConError, setImagenesConError] = useState<string[]>([]);
  const {
    cancionActual,
    reproduciendo,
    reproducirCancion,
    alternarReproduccion,
  } = usePlayer();

  const cargarRecientes = useCallback(async () => {
    try {
      setErrorRecientes('');
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        throw new Error('Inicia sesión para consultar tus canciones recientes.');
      }

      const respuesta = await fetch(`${API_URL}/api/reproducciones/recientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.message || 'No fue posible cargar las canciones recientes.');
      }
      if (!Array.isArray(datos.canciones)) {
        throw new Error('La respuesta del historial no es válida.');
      }

      // Recuperar la foto de perfil de cada artista una sola vez.
      // Si una canción no tiene portada, se usará esta fotografía.
      const canciones: CancionReciente[] = datos.canciones.slice(0, 5);
      const idsArtistas = [...new Set(canciones.map((item) => item.usuarioId))];
      const fotos = await Promise.all(
        idsArtistas.map(async (usuarioId) => {
          try {
            const respuestaPerfil = await fetch(
              `${API_URL}/api/perfiles-artista/${usuarioId}`
            );
            if (!respuestaPerfil.ok) return { usuarioId, foto: null };
            const datosPerfil = await respuestaPerfil.json();
            return {
              usuarioId,
              foto: (datosPerfil.artista?.fotoPerfil as string | null) || null,
            };
          } catch {
            return { usuarioId, foto: null };
          }
        })
      );
      const fotosPorArtista = new Map(
        fotos.map((item) => [item.usuarioId, item.foto])
      );
      setCancionesRecientes(
        canciones.map((item) => ({
          ...item,
          fotoArtista: fotosPorArtista.get(item.usuarioId) || null,
        }))
      );
    } catch (error) {
      setErrorRecientes(
        error instanceof Error ? error.message : 'No fue posible cargar el historial.'
      );
    } finally {
      setCargandoRecientes(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCargandoRecientes(true);
      void cargarRecientes();
    }, [cargarRecientes])
  );

  const actualizarInicio = async () => {
    setActualizando(true);
    try {
      await cargarRecientes();
    } finally {
      setActualizando(false);
    }
  };

  const reproducirReciente = (cancion: CancionReciente) => {
    if (cancionActual?.id === cancion.id) {
      alternarReproduccion();
      return;
    }

    const cola: CancionReproductor[] = cancionesRecientes.map((item) => ({
      id: item.id,
      usuarioId: item.usuarioId,
      audioId: item.audioId,
      titulo: item.titulo,
      nombreArtista: item.nombreArtistico || 'Artista',
      portadaId: item.portadaId,
      fotoArtista: item.fotoArtista || null,
    }));

    const seleccionada = cola.find((item) => item.id === cancion.id);
    if (!seleccionada) return;

    reproducirCancion(seleccionada, cola);
    router.push('/reproductor');
  };

  const animacionesEqualizadores = useRef(
    artistas.map(() =>
      barrasEqualizador.map(() => new Animated.Value(0))
    )
  ).current;

  useEffect(() => {
    const animarBarra = (
      animaciones: Animated.Value[],
      indice: number
    ) =>
      Animated.sequence([
        Animated.timing(animaciones[indice], {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animaciones[indice], {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]);

    const crearOla = (
      animaciones: Animated.Value[],
      invertir: boolean
    ) => {
      const indices = barrasEqualizador.map(
        (_, indice) => indice
      );

      if (invertir) {
        indices.reverse();
      }

      return Animated.stagger(
        75,
        indices.map((indice) =>
          animarBarra(animaciones, indice)
        )
      );
    };

    const animarEqualizador = (
      animaciones: Animated.Value[]
    ) =>
      Animated.sequence([
        crearOla(animaciones, false),
        Animated.delay(900),
        crearOla(animaciones, true),
      ]);

    const cicloCompleto = Animated.loop(
      Animated.sequence([
        animarEqualizador(animacionesEqualizadores[0]),
        Animated.delay(1000),

        animarEqualizador(animacionesEqualizadores[1]),
        Animated.delay(1000),

        animarEqualizador(animacionesEqualizadores[2]),
        Animated.delay(1000),
      ])
    );

    cicloCompleto.start();

    return () => {
      cicloCompleto.stop();

      animacionesEqualizadores.forEach((animaciones) => {
        animaciones.forEach((animacion) => {
          animacion.stopAnimation();
        });
      });
    };
  }, [animacionesEqualizadores]);

  return (
    <ImageBackground
      source={require('../../../assets/images/fondo-app.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={() => void actualizarInicio()}
              tintColor="#D75BFF"
              colors={['#D75BFF']}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.homeHeaderTitle}>Inicio</Text>
            <Image
              source={require('../../../assets/images/undermusic-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Pressable style={styles.notificationButton}>
              <Ionicons
                name="notifications-outline"
                size={34}
                color="#F25CFF"
              />

              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  3
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.recientesSeccion}>
            <View style={styles.recientesEncabezado}>
              <View style={styles.recientesTituloFila}>
                <Ionicons name="time-outline" size={23} color="#D77CFF" />
                <Text style={styles.recientesTitulo}>Escuchadas recientemente</Text>
              </View>
              <Text style={styles.recientesSubtitulo}>
                Tus últimas canciones escuchadas
              </Text>
            </View>

            {cargandoRecientes ? (
              <View style={styles.recientesEstado}>
                <ActivityIndicator size="large" color="#D77CFF" />
                <Text style={styles.recientesEstadoTexto}>Cargando tus canciones...</Text>
              </View>
            ) : errorRecientes ? (
              <View style={styles.recientesEstado}>
                <Ionicons name="alert-circle-outline" size={29} color="#FF8DBD" />
                <Text style={styles.recientesEstadoTexto}>{errorRecientes}</Text>
                <Pressable
                  style={styles.recientesReintentar}
                  onPress={() => {
                    setCargandoRecientes(true);
                    void cargarRecientes();
                  }}
                >
                  <Text style={styles.recientesReintentarTexto}>Reintentar</Text>
                </Pressable>
              </View>
            ) : cancionesRecientes.length === 0 ? (
              <View style={styles.recientesEstado}>
                <Ionicons name="musical-notes-outline" size={31} color="#D77CFF" />
                <Text style={styles.recientesEstadoTexto}>
                  Escucha una canción durante 30 segundos para verla aquí.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recientesCarrusel}
                nestedScrollEnabled
              >
                {cancionesRecientes.map((cancion) => {
                  const esActual = cancionActual?.id === cancion.id;
                  const estaSonando = esActual && reproduciendo;
                  return (
                    <View key={cancion.id} style={styles.recienteTarjeta}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Reproducir ${cancion.titulo}`}
                        onPress={() => reproducirReciente(cancion)}
                        style={({ pressed }) => [
                          styles.recientePortadaContenedor,
                          pressed && styles.recientePresionada,
                        ]}
                      >
                        {cancion.portadaId && !imagenesConError.includes(cancion.id) ? (
                          <Image
                            source={{
                              uri: `${API_URL}/api/canciones/portadas/${cancion.portadaId}`,
                            }}
                            style={styles.recientePortada}
                            resizeMode="cover"
                            onError={() =>
                              setImagenesConError((actual) =>
                                actual.includes(cancion.id) ? actual : [...actual, cancion.id]
                              )
                            }
                          />
                        ) : cancion.fotoArtista ? (
                          <Image
                            source={{
                              uri: `${API_URL}/api/usuarios/foto-perfil/${cancion.fotoArtista}`,
                            }}
                            style={styles.recientePortada}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.recientePortadaVacia}>
                            <Ionicons name="musical-notes" size={46} color="#DFA8FF" />
                          </View>
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(5, 3, 17, 0.75)']}
                          style={styles.recientePortadaDegradado}
                          pointerEvents="none"
                        />
                        <View style={styles.recienteBotonPlay}>
                          <Ionicons
                            name={estaSonando ? 'pause' : 'play'}
                            size={23}
                            color="#FFFFFF"
                          />
                        </View>
                      </Pressable>
                      <Text style={styles.recienteNombre} numberOfLines={1}>
                        {cancion.titulo}
                      </Text>
                      <Text style={styles.recienteArtista} numberOfLines={1}>
                        {cancion.nombreArtistico || 'Artista'}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              Artistas destacados
            </Text>

            <Text style={styles.subtitle}>
              Una vista previa del diseño de artistas destacados
            </Text>
          </View>

          <View style={styles.artistList}>
            {artistas.map((artista, indice) => (
              <LinearGradient
                key={artista.id}
                colors={
                  artista.colores as [string, string]
                }
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.cardBorder}
              >
                <View style={styles.card}>
                  <LinearGradient
                    colors={
                      artista.colores as [string, string]
                    }
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.cardBackground}
                  >
                    <Image
                      source={artista.imagen}
                      style={styles.artistImage}
                      resizeMode="cover"
                    />

                    <View style={styles.artistInfo}>
                      <Text
                        style={styles.artistName}
                        numberOfLines={1}
                      >
                        {artista.nombre}
                      </Text>

                      <Text style={styles.artistGenre}>
                        {artista.genero}
                      </Text>

                      <Text style={styles.artistLocation}>
                        {artista.ubicacion}
                      </Text>
                    </View>

                    <Equalizer
                      animaciones={
                        animacionesEqualizadores[indice]
                      }
                    />

                    <Pressable
                      style={({ pressed }) => [
                        styles.profileButton,
                        pressed &&
                          styles.profileButtonPressed,
                      ]}
                    >
                      <Text style={styles.profileButtonText}>
                        Ver perfil
                      </Text>
                    </Pressable>
                  </LinearGradient>
                </View>
              </LinearGradient>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  recientesSeccion: {
    marginTop: 2,
    marginBottom: 38,
  },
  recientesEncabezado: {
    marginBottom: 16,
  },
  recientesTituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  recientesTitulo: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
  },
  recientesSubtitulo: {
    color: '#CBBAD8',
    fontSize: 13,
    marginTop: 6,
  },
  recientesCarrusel: {
    gap: 15,
    paddingRight: 18,
    paddingBottom: 4,
  },
  recienteTarjeta: {
    width: 174,
  },
  recientePortadaContenedor: {
    width: 174,
    height: 174,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#241438',
    borderWidth: 1,
    borderColor: 'rgba(194, 103, 255, 0.5)',
  },
  recientePortada: {
    width: '100%',
    height: '100%',
  },
  recientePortadaVacia: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34174C',
  },
  recientePortadaDegradado: {
    ...StyleSheet.absoluteFill,
  },
  recienteBotonPlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(112, 37, 167, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  recienteNombre: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  recienteArtista: {
    color: '#C9AED8',
    fontSize: 13,
    marginTop: 3,
  },
  recientePresionada: {
    opacity: 0.78,
  },
  recientesEstado: {
    minHeight: 155,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(165, 83, 214, 0.45)',
    backgroundColor: 'rgba(28, 13, 46, 0.78)',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  recientesEstadoTexto: {
    color: '#D5C3E0',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  recientesReintentar: {
    backgroundColor: '#7B36A9',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  recientesReintentarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  background: {
    flex: 1,
    backgroundColor: '#020106',
  },

  safeArea: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 30,
  },

  header: {
    minHeight: 185,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  logo: {
    width: 380,
    height: 175,
  },

  homeHeaderTitle: {
    position: 'absolute',
    top: 22,
    left: 0,
    height: 50,
    textAlignVertical: 'center',
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    zIndex: 1,
  },

  notificationButton: {
    position: 'absolute',
    top: 22,
    right: 0,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F01962',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  titleContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: '#D5D0DE',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },

  artistList: {
    width: '100%',
    gap: 24,
  },

  cardBorder: {
    width: '100%',
    borderRadius: 27,
    padding: 4,
  },

  card: {
    width: '100%',
    borderRadius: 23,
    overflow: 'hidden',
  },

  cardBackground: {
    minHeight: 145,
    borderRadius: 23,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },

  artistImage: {
    width: 83,
    height: 83,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },

  artistInfo: {
    flex: 1,
    marginLeft: 16,
    paddingTop: 2,
    paddingRight: 10,
  },

  artistName: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },

  artistGenre: {
    color: '#6558E8',
    fontSize: 19,
    marginTop: 1,
  },

  artistLocation: {
    color: '#FFFFFF',
    fontSize: 17,
    marginTop: 1,
  },

  equalizer: {
    position: 'absolute',
    right: 24,
    top: 25,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  equalizerBar: {
    width: 4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  profileButton: {
    position: 'absolute',
    right: 15,
    bottom: 13,
    minWidth: 145,
    height: 39,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 15, 102, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileButtonPressed: {
    opacity: 0.8,
  },

  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
  },
});
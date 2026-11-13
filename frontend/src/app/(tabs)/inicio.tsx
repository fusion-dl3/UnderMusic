import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CancionReproductor, usePlayer } from '@/context/PlayerContext';
import { useNotificaciones } from '@/context/NotificacionesContext';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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

const API_URL = 'http://192.168.1.13:3000';

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

type CancionLanzamiento = Omit<CancionReciente, 'fechaEscucha'> & {
  fechaPublicacion: string;
};

type ArtistaDestacado = {
  usuarioId: string;
  nombreUsuario: string;
  nombreArtistico: string;
  fotoPerfil: string | null;
  generoPrincipal: string;
  generosAdicionales: string[];
  ubicacion: { pais?: string; region?: string; comuna?: string } | null;
  oyentesTotales: number;
  reproduccionesTotales: number;
};

type ArtistaCercano = Pick<ArtistaDestacado,
  | 'usuarioId' | 'nombreUsuario' | 'nombreArtistico' | 'fotoPerfil'
  | 'generoPrincipal' | 'generosAdicionales' | 'ubicacion'
>;

type ArtistaRecomendado = {
  usuarioId: string;
  nombreUsuario: string;
  nombreArtistico: string;
  fotoPerfil: string | null;
  generoPrincipal: string;
  generosAdicionales: string[];
  ubicacion: { pais?: string; region?: string; comuna?: string } | null;
  reproduccionesActuales: number;
  reproduccionesAnteriores: number;
  crecimientoAbsoluto: number;
  crecimientoPorcentual: number | null;
  actividadNueva: boolean;
};

// Cada sección conserva un degradado propio en todas sus tarjetas.
const colorDestacados: [string, string] = ['#9845EC', '#FF8A4D'];
const colorRecomendados: [string, string] = ['#536CFF', '#F05EC5'];
const colorCercanos: [string, string] = ['#8570E8', '#20B9D6'];
const MAX_ARTISTAS_POR_SECCION = 3;

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
          outputRange: [0.8, 1.65],
        });

        const translateY = animaciones[indice].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -5],
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

// Un brillo discreto gira detrás del contenido, visible solo en el borde de 2 px.
// Se anima con el controlador nativo y se detiene al salir de Inicio.
function BordeLuzAnimado({
  colores,
  activo,
  children,
}: {
  colores: [string, string];
  activo: boolean;
  children: ReactNode;
}) {
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!activo) {
      giro.stopAnimation();
      giro.setValue(0);
      return;
    }
    const ciclo = Animated.loop(
      Animated.timing(giro, {
        toValue: 1,
        duration: 8500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [activo, giro]);

  const rotacion = giro.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={[`${colores[0]}B8`, `${colores[1]}B8`]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.cardBorder, styles.bordeAnimadoContenedor]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.bordeLuzGiratoria, { transform: [{ rotate: rotacion }] }]}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.02)',
            'rgba(255,255,255,0.38)',
            'rgba(255,255,255,0.02)',
            'rgba(255,255,255,0)',
          ]}
          locations={[0, 0.36, 0.5, 0.64, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </LinearGradient>
  );
}

export default function InicioScreen() {
  // Permite abrir Lanzamientos recientes directamente desde Biblioteca.
  const { seccion, solicitud } = useLocalSearchParams<{ seccion?: string; solicitud?: string }>();
  const scrollPrincipalRef = useRef<ScrollView>(null);
  // Impide apilar pantallas del reproductor ante pulsaciones rápidas.
  const navegacionReproductorEnCursoRef = useRef(false);
  const posicionLanzamientosRef = useRef<number | null>(null);
  const solicitudPendienteRef = useRef<string | null>(null);
  const ultimaSolicitudAtendidaRef = useRef<string | null>(null);

  const desplazarALanzamientos = useCallback(() => {
    if (!solicitudPendienteRef.current || posicionLanzamientosRef.current === null) return;
    scrollPrincipalRef.current?.scrollTo({
      y: Math.max(0, posicionLanzamientosRef.current - 12),
      animated: true,
    });
    ultimaSolicitudAtendidaRef.current = solicitudPendienteRef.current;
    solicitudPendienteRef.current = null;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (seccion === 'lanzamientos' && solicitud && solicitud !== ultimaSolicitudAtendidaRef.current) {
        solicitudPendienteRef.current = solicitud;
        desplazarALanzamientos();
      }
    }, [seccion, solicitud, desplazarALanzamientos])
  );

  useFocusEffect(
    useCallback(() => {
      navegacionReproductorEnCursoRef.current = false;
    }, [])
  );

  const abrirReproductorUnaVez = useCallback(() => {
    if (navegacionReproductorEnCursoRef.current) return false;
    navegacionReproductorEnCursoRef.current = true;
    router.push('/reproductor');
    return true;
  }, []);

  const {
    noLeidas: notificacionesNoLeidas,
    actualizarContador,
  } = useNotificaciones();

  useFocusEffect(
    useCallback(() => {
      void actualizarContador();
    }, [actualizarContador])
  );

  const [actualizando, setActualizando] = useState(false);
  const [cancionesRecientes, setCancionesRecientes] = useState<CancionReciente[]>([]);
  const [cargandoRecientes, setCargandoRecientes] = useState(true);
  const [lanzamientos, setLanzamientos] = useState<CancionLanzamiento[]>([]);
  const [cargandoLanzamientos, setCargandoLanzamientos] = useState(true);
  const [errorLanzamientos, setErrorLanzamientos] = useState('');
  const [imagenesLanzamientosConError, setImagenesLanzamientosConError] = useState<string[]>([]);
  const [errorRecientes, setErrorRecientes] = useState('');
  const [imagenesConError, setImagenesConError] = useState<string[]>([]);
  const [artistasDestacados, setArtistasDestacados] = useState<ArtistaDestacado[]>([]);
  const [cargandoDestacados, setCargandoDestacados] = useState(true);
  const [errorDestacados, setErrorDestacados] = useState('');
  const [fotosDestacadosConError, setFotosDestacadosConError] = useState<string[]>([]);
  const [artistasRecomendados, setArtistasRecomendados] = useState<ArtistaRecomendado[]>([]);
  const [cargandoRecomendados, setCargandoRecomendados] = useState(true);
  const [errorRecomendados, setErrorRecomendados] = useState('');
  const [fotosRecomendadosConError, setFotosRecomendadosConError] = useState<string[]>([]);
  const [artistasCercanos, setArtistasCercanos] = useState<ArtistaCercano[]>([]);
  const [cargandoCercanos, setCargandoCercanos] = useState(true);
  const [errorCercanos, setErrorCercanos] = useState('');
  const [fotosCercanosConError, setFotosCercanosConError] = useState<string[]>([]);
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

  const cargarLanzamientos = useCallback(async () => {
    try {
      setErrorLanzamientos('');
      const token = await SecureStore.getItemAsync('token');
      if (!token) throw new Error('Inicia sesión para ver lanzamientos recientes.');
      const respuesta = await fetch(`${API_URL}/api/canciones/lanzamientos-recientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.message || 'No fue posible cargar los lanzamientos.');
      }
      if (!Array.isArray(datos.canciones)) {
        throw new Error('La respuesta de lanzamientos no es válida.');
      }
      setLanzamientos(datos.canciones.slice(0, 5));
    } catch (error) {
      setErrorLanzamientos(
        error instanceof Error ? error.message : 'No fue posible cargar los lanzamientos.'
      );
    } finally {
      setCargandoLanzamientos(false);
    }
  }, []);

  const cargarDestacados = useCallback(async () => {
    try {
      setErrorDestacados('');
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        throw new Error('Inicia sesión para ver artistas destacados.');
      }

      const respuesta = await fetch(`${API_URL}/api/perfiles-artista/destacados`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.message || 'No fue posible cargar los artistas destacados.');
      }
      if (!Array.isArray(datos.artistas)) {
        throw new Error('La respuesta de artistas destacados no es válida.');
      }
      setArtistasDestacados(datos.artistas.slice(0, 3));
    } catch (error) {
      setErrorDestacados(
        error instanceof Error ? error.message : 'No fue posible cargar los artistas destacados.'
      );
    } finally {
      setCargandoDestacados(false);
    }
  }, []);

  const cargarRecomendados = useCallback(async () => {
    try {
      setErrorRecomendados('');

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        throw new Error('Inicia sesión para ver artistas recomendados.');
      }

      const respuesta = await fetch(
        `${API_URL}/api/perfiles-artista/recomendados`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.message || 'No fue posible cargar los artistas recomendados.'
        );
      }

      if (!Array.isArray(datos.artistas)) {
        throw new Error('La respuesta de artistas recomendados no es válida.');
      }

      setArtistasRecomendados(datos.artistas.slice(0, MAX_ARTISTAS_POR_SECCION));
    } catch (error) {
      setErrorRecomendados(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar los artistas recomendados.'
      );
    } finally {
      setCargandoRecomendados(false);
    }
  }, []);

  const cargarCercanos = useCallback(async () => {
    try {
      setErrorCercanos('');
      const token = await SecureStore.getItemAsync('token');
      if (!token) throw new Error('Inicia sesión para descubrir artistas cercanos.');
      const respuesta = await fetch(`${API_URL}/api/perfiles-artista/cercanos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.message || 'No fue posible cargar los artistas cercanos.');
      }
      if (!Array.isArray(datos.artistas)) {
        throw new Error('La respuesta de artistas cercanos no es válida.');
      }
      setArtistasCercanos(datos.artistas.slice(0, MAX_ARTISTAS_POR_SECCION));
    } catch (error) {
      setErrorCercanos(error instanceof Error ? error.message : 'No fue posible cargar los artistas cercanos.');
    } finally {
      setCargandoCercanos(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCargandoRecientes(true);
      setCargandoLanzamientos(true);
      setCargandoDestacados(true);
      setCargandoRecomendados(true);
      setCargandoCercanos(true);

      void cargarRecientes();
      void cargarLanzamientos();
      void cargarDestacados();
      void cargarRecomendados();
      void cargarCercanos();
    }, [cargarRecientes, cargarLanzamientos, cargarDestacados, cargarRecomendados, cargarCercanos])
  );

  const actualizarInicio = async () => {
    setActualizando(true);

    try {
      await Promise.all([
        cargarRecientes(),
        cargarLanzamientos(),
        cargarDestacados(),
        cargarRecomendados(),
        cargarCercanos(),
      ]);
    } finally {
      setActualizando(false);
    }
  };

  const iniciarReciente = (cancion: CancionReciente) => {
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
    if (seleccionada) reproducirCancion(seleccionada, cola);
  };

  const abrirReciente = (cancion: CancionReciente) => {
    if (navegacionReproductorEnCursoRef.current) return;
    if (cancionActual?.id !== cancion.id) iniciarReciente(cancion);
    abrirReproductorUnaVez();
  };

  const pulsarPlayReciente = (cancion: CancionReciente) => {
    if (cancionActual?.id === cancion.id) {
      alternarReproduccion();
    } else {
      iniciarReciente(cancion);
    }
  };


  const iniciarLanzamiento = (cancion: CancionLanzamiento) => {
    const cola: CancionReproductor[] = lanzamientos.map((item) => ({
      id: item.id,
      usuarioId: item.usuarioId,
      audioId: item.audioId,
      titulo: item.titulo,
      nombreArtista: item.nombreArtistico || 'Artista',
      portadaId: item.portadaId,
      fotoArtista: item.fotoArtista || null,
    }));
    const seleccionada = cola.find((item) => item.id === cancion.id);
    if (seleccionada) reproducirCancion(seleccionada, cola);
  };

  const abrirLanzamiento = (cancion: CancionLanzamiento) => {
    if (navegacionReproductorEnCursoRef.current) return;
    if (cancionActual?.id !== cancion.id) iniciarLanzamiento(cancion);
    abrirReproductorUnaVez();
  };

  const pulsarPlayLanzamiento = (cancion: CancionLanzamiento) => {
    if (cancionActual?.id === cancion.id) alternarReproduccion();
    else iniciarLanzamiento(cancion);
  };

  // Generación nueva de animaciones cada vez que Inicio recupera el foco.
  const [generacionEqualizador, setGeneracionEqualizador] = useState(0);
  const [inicioEnFoco, setInicioEnFoco] = useState(false);

  const animacionesEqualizadores = useMemo(
    () =>
      Array.from({ length: MAX_ARTISTAS_POR_SECCION * 3 }, () =>
        barrasEqualizador.map(() => new Animated.Value(0))
      ),
    [generacionEqualizador]
  );

  useFocusEffect(
    useCallback(() => {
      setGeneracionEqualizador((anterior) => anterior + 1);
      setInicioEnFoco(true);

      return () => {
        setInicioEnFoco(false);
      };
    }, [])
  );

  useEffect(() => {
    if (!inicioEnFoco) return;

    const crearOla = (
      barras: Animated.Value[],
      invertir: boolean
    ) => {
      const indices = barrasEqualizador.map((_, indice) => indice);

      if (invertir) {
        indices.reverse();
      }

      return Animated.stagger(
        90,
        indices.map((indice) =>
          Animated.sequence([
            Animated.timing(barras[indice], {
              toValue: 1,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(barras[indice], {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ])
        )
      );
    };

    // Cada sección reproduce su propia secuencia, sin esperar a la otra.
    const iniciarCicloSeccion = (inicio: number, cantidad: number) => {
      const disponibles = animacionesEqualizadores.slice(inicio, inicio + cantidad);
      if (disponibles.length === 0) return null;

      const secuencia = disponibles.flatMap((barras) => [
        Animated.sequence([
          crearOla(barras, false),
          Animated.delay(900),
          crearOla(barras, true),
        ]),
        Animated.delay(1000),
      ]);

      const ciclo = Animated.loop(Animated.sequence(secuencia));
      ciclo.start();
      return { ciclo, disponibles };
    };

    const ciclos = [
      iniciarCicloSeccion(0, artistasDestacados.length),
      iniciarCicloSeccion(MAX_ARTISTAS_POR_SECCION, artistasRecomendados.length),
      iniciarCicloSeccion(MAX_ARTISTAS_POR_SECCION * 2, artistasCercanos.length),
    ];

    return () => {
      ciclos.forEach((grupo) => {
        if (!grupo) return;
        grupo.ciclo.stop();
        grupo.disponibles.forEach((barras) => {
          barras.forEach((barra) => barra.stopAnimation());
        });
      });
    };
  }, [
    inicioEnFoco,
    animacionesEqualizadores,
    artistasDestacados.length,
    artistasRecomendados.length,
    artistasCercanos.length,
  ]);

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
          ref={scrollPrincipalRef}
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

            <Pressable
              style={styles.notificationButton}
              accessibilityRole="button"
              accessibilityLabel={`Notificaciones, ${notificacionesNoLeidas} sin leer`}
              onPress={() => router.push('/notificaciones')}
            >
              <Ionicons name="notifications-outline" size={34} color="#F25CFF" />
              {notificacionesNoLeidas > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificacionesNoLeidas > 99 ? '99+' : notificacionesNoLeidas}
                  </Text>
                </View>
              )}
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
                    <Pressable
                      key={cancion.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir reproductor de ${cancion.titulo}`}
                      onPress={() => abrirReciente(cancion)}
                      style={styles.recienteTarjeta}
                    >
                      <View style={styles.recientePortadaContenedor}>
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
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${estaSonando ? 'Pausar' : 'Reproducir'} ${cancion.titulo}`}
                          onPress={() => pulsarPlayReciente(cancion)}
                          style={styles.recienteBotonPlay}
                        >
                          <Ionicons
                            name={estaSonando ? 'pause' : 'play'}
                            size={23}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      </View>
                      <Text style={styles.recienteNombre} numberOfLines={1}>
                        {cancion.titulo}
                      </Text>
                      <Text style={styles.recienteArtista} numberOfLines={1}>
                        {cancion.nombreArtistico || 'Artista'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.titleContainer}>
            <View style={styles.recientesTituloFila}>
              <Ionicons name="sparkles-outline" size={23} color="#D77CFF" />
              <Text style={styles.title}>Artistas destacados</Text>
            </View>

            <Text style={styles.subtitle}>
              Los artistas que más conectan con tus gustos musicales
            </Text>
          </View>

          <View style={styles.artistList}>
            {cargandoDestacados ? (
              <View style={styles.destacadosEstado}>
                <ActivityIndicator size="large" color="#D77CFF" />
                <Text style={styles.destacadosEstadoTexto}>Cargando artistas destacados...</Text>
              </View>
            ) : errorDestacados ? (
              <View style={styles.destacadosEstado}>
                <Ionicons name="alert-circle-outline" size={29} color="#FF8DBD" />
                <Text style={styles.destacadosEstadoTexto}>{errorDestacados}</Text>
                <Pressable
                  style={styles.recientesReintentar}
                  onPress={() => {
                    setCargandoDestacados(true);
                    void cargarDestacados();
                  }}
                >
                  <Text style={styles.recientesReintentarTexto}>Reintentar</Text>
                </Pressable>
              </View>
            ) : artistasDestacados.length === 0 ? (
              <View style={styles.destacadosEstado}>
                <Ionicons name="people-outline" size={31} color="#D77CFF" />
                <Text style={styles.destacadosEstadoTexto}>
                  Aún no hay artistas destacados disponibles.
                </Text>
              </View>
            ) : (
              artistasDestacados.map((artista, indice) => {
                const colores = colorDestacados;
                const mostrarFoto = Boolean(
                  artista.fotoPerfil &&
                  !fotosDestacadosConError.includes(artista.usuarioId)
                );
                return (
                  <BordeLuzAnimado key={artista.usuarioId} colores={colores} activo={inicioEnFoco}>
                    <View style={styles.card}>
                      <LinearGradient
                        colors={[
                          `${colores[0]}55`,
                          `${colores[1]}50`,
                        ] as [string, string]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.cardBackground}
                      >
                        {mostrarFoto ? (
                          <Image
                            source={{
                              uri: `${API_URL}/api/usuarios/foto-perfil/${artista.fotoPerfil}`,
                            }}
                            style={styles.artistImage}
                            resizeMode="cover"
                            onError={() =>
                              setFotosDestacadosConError((actual) =>
                                actual.includes(artista.usuarioId)
                                  ? actual
                                  : [...actual, artista.usuarioId]
                              )
                            }
                          />
                        ) : (
                          <View style={[styles.artistImage, styles.artistImagePlaceholder]}>
                            <Ionicons name="person" size={40} color="#FFFFFF" />
                          </View>
                        )}

                        <View style={styles.artistInfo}>
                          <Text style={styles.artistName} numberOfLines={1}>
                            {artista.nombreArtistico || artista.nombreUsuario}
                          </Text>
                          <Text style={styles.artistGenre} numberOfLines={1}>
                            {artista.generoPrincipal || 'Artista musical'}
                          </Text>
                          <Text style={styles.artistLocation} numberOfLines={1}>
                            {artista.ubicacion?.comuna || 'Ubicación no disponible'}
                          </Text>
                        </View>

                        <Equalizer animaciones={animacionesEqualizadores[indice]} />

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Ver perfil de ${artista.nombreArtistico || artista.nombreUsuario}`}
                          onPress={() =>
                            router.push({
                              pathname: '/artista/[usuarioId]',
                              params: { usuarioId: artista.usuarioId },
                            })
                          }
                          style={({ pressed }) => [
                            styles.profileButton,
                            pressed && styles.profileButtonPressed,
                          ]}
                        >
                          <Text style={styles.profileButtonText}>Ver perfil</Text>
                        </Pressable>
                      </LinearGradient>
                    </View>
                  </BordeLuzAnimado>
                );
              })
            )}
          </View>
          <View style={[styles.titleContainer, styles.seccionPosterior]}>
            <View style={styles.recientesTituloFila}>
              <Ionicons name="trending-up-outline" size={23} color="#D77CFF" />
              <Text style={styles.title}>Artistas recomendados</Text>
            </View>
            <Text style={styles.subtitle}>
              Descubre artistas que están ganando impulso
            </Text>
          </View>

          <View style={styles.artistList}>
            {cargandoRecomendados ? (
              <View style={styles.destacadosEstado}>
                <ActivityIndicator size="large" color="#D77CFF" />
                <Text style={styles.destacadosEstadoTexto}>Cargando artistas recomendados...</Text>
              </View>
            ) : errorRecomendados ? (
              <View style={styles.destacadosEstado}>
                <Ionicons name="alert-circle-outline" size={29} color="#FF8DBD" />
                <Text style={styles.destacadosEstadoTexto}>{errorRecomendados}</Text>
                <Pressable
                  style={styles.recientesReintentar}
                  onPress={() => {
                    setCargandoRecomendados(true);
                    void cargarRecomendados();
                  }}
                >
                  <Text style={styles.recientesReintentarTexto}>Reintentar</Text>
                </Pressable>
              </View>
            ) : artistasRecomendados.length === 0 ? (
              <View style={styles.destacadosEstado}>
                <Ionicons name="people-outline" size={31} color="#D77CFF" />
                <Text style={styles.destacadosEstadoTexto}>
                  Aún no hay artistas recomendados disponibles.
                </Text>
              </View>
            ) : (
              artistasRecomendados.map((artista, indice) => {
                const colores = colorRecomendados;
                const mostrarFoto = Boolean(
                  artista.fotoPerfil &&
                  !fotosRecomendadosConError.includes(artista.usuarioId)
                );
                return (
                  <BordeLuzAnimado key={artista.usuarioId} colores={colores} activo={inicioEnFoco}>
                    <View style={styles.card}>
                      <LinearGradient
                        colors={[
                          `${colores[0]}55`,
                          `${colores[1]}50`,
                        ] as [string, string]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.cardBackground}
                      >
                        {mostrarFoto ? (
                          <Image
                            source={{
                              uri: `${API_URL}/api/usuarios/foto-perfil/${artista.fotoPerfil}`,
                            }}
                            style={styles.artistImage}
                            resizeMode="cover"
                            onError={() =>
                              setFotosRecomendadosConError((actual) =>
                                actual.includes(artista.usuarioId)
                                  ? actual
                                  : [...actual, artista.usuarioId]
                              )
                            }
                          />
                        ) : (
                          <View style={[styles.artistImage, styles.artistImagePlaceholder]}>
                            <Ionicons name="person" size={40} color="#FFFFFF" />
                          </View>
                        )}

                        <View style={styles.artistInfo}>
                          <Text style={styles.artistName} numberOfLines={1}>
                            {artista.nombreArtistico || artista.nombreUsuario}
                          </Text>
                          <Text style={styles.artistGenre} numberOfLines={1}>
                            {artista.generoPrincipal || 'Artista musical'}
                          </Text>
                          <Text style={styles.artistLocation} numberOfLines={1}>
                            {artista.ubicacion?.comuna || 'Ubicación no disponible'}
                          </Text>
                        </View>

                        <Equalizer animaciones={animacionesEqualizadores[MAX_ARTISTAS_POR_SECCION + indice]} />

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Ver perfil de ${artista.nombreArtistico || artista.nombreUsuario}`}
                          onPress={() =>
                            router.push({
                              pathname: '/artista/[usuarioId]',
                              params: { usuarioId: artista.usuarioId },
                            })
                          }
                          style={({ pressed }) => [
                            styles.profileButton,
                            pressed && styles.profileButtonPressed,
                          ]}
                        >
                          <Text style={styles.profileButtonText}>Ver perfil</Text>
                        </Pressable>
                      </LinearGradient>
                    </View>
                  </BordeLuzAnimado>
                );
              })
            )}
          </View>

          <View
            style={[styles.recientesSeccion, { marginTop: 38 }]}
            onLayout={(evento) => {
              posicionLanzamientosRef.current = evento.nativeEvent.layout.y;
              desplazarALanzamientos();
            }}
          >
            <View style={styles.recientesEncabezado}>
              <View style={styles.recientesTituloFila}>
                <Ionicons name="radio-outline" size={23} color="#D77CFF" />
                <Text style={styles.recientesTitulo}>Lanzamientos recientes</Text>
              </View>
              <Text style={styles.recientesSubtitulo}>
                Nuevas canciones para descubrir
              </Text>
            </View>

            {cargandoLanzamientos ? (
              <View style={styles.recientesEstado}>
                <ActivityIndicator size="large" color="#D77CFF" />
                <Text style={styles.recientesEstadoTexto}>Cargando lanzamientos...</Text>
              </View>
            ) : errorLanzamientos ? (
              <View style={styles.recientesEstado}>
                <Ionicons name="alert-circle-outline" size={29} color="#FF8DBD" />
                <Text style={styles.recientesEstadoTexto}>{errorLanzamientos}</Text>
                <Pressable
                  style={styles.recientesReintentar}
                  onPress={() => {
                    setCargandoLanzamientos(true);
                    void cargarLanzamientos();
                  }}
                >
                  <Text style={styles.recientesReintentarTexto}>Reintentar</Text>
                </Pressable>
              </View>
            ) : lanzamientos.length === 0 ? (
              <View style={styles.recientesEstado}>
                <Ionicons name="musical-notes-outline" size={31} color="#D77CFF" />
                <Text style={styles.recientesEstadoTexto}>
                  Todavía no hay lanzamientos disponibles.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recientesCarrusel}
                nestedScrollEnabled
              >
                {lanzamientos.map((cancion) => {
                  const esActual = cancionActual?.id === cancion.id;
                  const estaSonando = esActual && reproduciendo;
                  return (
                    <Pressable
                      key={cancion.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir reproductor de ${cancion.titulo}`}
                      onPress={() => abrirLanzamiento(cancion)}
                      style={styles.recienteTarjeta}
                    >
                      <View style={styles.recientePortadaContenedor}>
                        {cancion.portadaId && !imagenesLanzamientosConError.includes(cancion.id) ? (
                          <Image
                            source={{
                              uri: `${API_URL}/api/canciones/portadas/${cancion.portadaId}`,
                            }}
                            style={styles.recientePortada}
                            resizeMode="cover"
                            onError={() =>
                              setImagenesLanzamientosConError((actual) =>
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
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${estaSonando ? 'Pausar' : 'Reproducir'} ${cancion.titulo}`}
                          onPress={() => pulsarPlayLanzamiento(cancion)}
                          style={styles.recienteBotonPlay}
                        >
                          <Ionicons
                            name={estaSonando ? 'pause' : 'play'}
                            size={23}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      </View>
                      <Text style={styles.recienteNombre} numberOfLines={1}>
                        {cancion.titulo}
                      </Text>
                      <Text style={styles.recienteArtista} numberOfLines={1}>
                        {cancion.nombreArtistico || 'Artista'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={[styles.titleContainer, styles.seccionPosterior, { marginTop: 12 }]}>
            <View style={styles.recientesTituloFila}>
              <Ionicons name="location-outline" size={23} color="#D77CFF" />
              <Text style={styles.title}>Cerca de ti</Text>
            </View>
            <Text style={styles.subtitle}>Descubre artistas de tu zona</Text>
          </View>

          <View style={styles.artistList}>
            {cargandoCercanos ? (
              <View style={styles.destacadosEstado}>
                <ActivityIndicator size="large" color="#D77CFF" />
                <Text style={styles.destacadosEstadoTexto}>Buscando artistas de tu zona...</Text>
              </View>
            ) : errorCercanos ? (
              <View style={styles.destacadosEstado}>
                <Ionicons name="alert-circle-outline" size={29} color="#FF8DBD" />
                <Text style={styles.destacadosEstadoTexto}>{errorCercanos}</Text>
                <Pressable
                  style={styles.recientesReintentar}
                  onPress={() => {
                    setCargandoCercanos(true);
                    void cargarCercanos();
                  }}
                >
                  <Text style={styles.recientesReintentarTexto}>Reintentar</Text>
                </Pressable>
              </View>
            ) : artistasCercanos.length === 0 ? (
              <View style={styles.destacadosEstado}>
                <Ionicons name="location-outline" size={31} color="#D77CFF" />
                <Text style={styles.destacadosEstadoTexto}>
                  Aún no hay artistas disponibles en tu zona.
                </Text>
              </View>
            ) : (
              artistasCercanos.map((artista, indice) => {
                const colores = colorCercanos;
                const mostrarFoto = Boolean(
                  artista.fotoPerfil && !fotosCercanosConError.includes(artista.usuarioId)
                );
                return (
                  <BordeLuzAnimado key={artista.usuarioId} colores={colores} activo={inicioEnFoco}>
                    <View style={styles.card}>
                      <LinearGradient
                        colors={[`${colores[0]}55`, `${colores[1]}50`] as [string, string]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.cardBackground}
                      >
                        {mostrarFoto ? (
                          <Image
                            source={{ uri: `${API_URL}/api/usuarios/foto-perfil/${artista.fotoPerfil}` }}
                            style={styles.artistImage}
                            resizeMode="cover"
                            onError={() => setFotosCercanosConError((actual) =>
                              actual.includes(artista.usuarioId) ? actual : [...actual, artista.usuarioId]
                            )}
                          />
                        ) : (
                          <View style={[styles.artistImage, styles.artistImagePlaceholder]}>
                            <Ionicons name="person" size={40} color="#FFFFFF" />
                          </View>
                        )}
                        <View style={styles.artistInfo}>
                          <Text style={styles.artistName} numberOfLines={1}>
                            {artista.nombreArtistico || artista.nombreUsuario}
                          </Text>
                          <Text style={styles.artistGenre} numberOfLines={1}>
                            {artista.generoPrincipal || 'Artista musical'}
                          </Text>
                          <Text style={styles.artistLocation} numberOfLines={1}>
                            {artista.ubicacion?.comuna || 'Ubicación no disponible'}
                          </Text>
                        </View>
                        <Equalizer animaciones={animacionesEqualizadores[MAX_ARTISTAS_POR_SECCION * 2 + indice]} />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Ver perfil de ${artista.nombreArtistico || artista.nombreUsuario}`}
                          onPress={() => router.push({
                            pathname: '/artista/[usuarioId]',
                            params: { usuarioId: artista.usuarioId },
                          })}
                          style={({ pressed }) => [
                            styles.profileButton,
                            pressed && styles.profileButtonPressed,
                          ]}
                        >
                          <Text style={styles.profileButtonText}>Ver perfil</Text>
                        </Pressable>
                      </LinearGradient>
                    </View>
                  </BordeLuzAnimado>
                );
              })
            )}
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

  seccionPosterior: {
    marginTop: 38,
  },

  titleContainer: {
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 16,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
  },

  subtitle: {
    color: '#CBBAD8',
    fontSize: 13,
    marginTop: 6,
  },

  artistList: {
    width: '100%',
    gap: 24,
  },

  bordeAnimadoContenedor: {
    overflow: 'hidden',
  },
  bordeLuzGiratoria: {
    position: 'absolute',
    width: '200%',
    height: '320%',
    left: '-50%',
    top: '-110%',
  },
  cardBorder: {
    width: '100%',
    borderRadius: 25,
    padding: 2,
  },

  card: {
    width: '100%',
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: '#19152F',
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

  destacadosEstado: {
    minHeight: 145,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(165, 83, 214, 0.45)',
    backgroundColor: 'rgba(28, 13, 46, 0.78)',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  destacadosEstadoTexto: {
    color: '#D5C3E0',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  artistImagePlaceholder: {
    backgroundColor: 'rgba(34, 12, 61, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistImage: {
    width: 83,
    height: 83,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(194, 103, 255, 0.60)',
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
  color: '#D5A0FF',
  fontSize: 19,
  fontWeight: '600',
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
  backgroundColor: 'rgba(74, 15, 102, 0.35)',
  borderWidth: 1,
  borderColor: 'rgba(204, 124, 255, 0.80)',
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
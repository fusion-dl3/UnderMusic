import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MiniPlayer } from '@/components/MiniPlayer';
import * as SecureStore from 'expo-secure-store';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  CancionReproductor,
  usePlayer,
} from '@/context/PlayerContext';

import {
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  Image,
  ImageBackground,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'http://192.168.1.5:3000';

type ArtistaPublico = {
  usuarioId: string;
  nombreUsuario: string;
  fotoPerfil: string | null;
  ubicacion: {
    pais: string;
    region: string;
    comuna: string;
  };
  nombreArtistico: string;
  biografia: string;
  generoPrincipal: string;
  generosAdicionales: string[];
  correoContacto: string;
  instagram: string;
  facebook: string;
  twitter: string;
  cancionesDestacadas?: string[];
};

type EstadisticasArtista = {
  oyentesUnicos: number;
  reproduccionesTotales: number;
  cantidadSeguidores: number;
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

export default function PerfilArtistaPublicoScreen() {
  const insets = useSafeAreaInsets();
  const { width: anchoPantalla } = useWindowDimensions();
  // Un solo reflejo blanco que avanza por el contorno (4 tramos).
  // Animamos traslaciones reales, no una línea simétrica que parece inmóvil.
  const avanceBorde = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    avanceBorde.setValue(0);
    const animacion = Animated.loop(
      Animated.timing(avanceBorde, {
        toValue: 4,
        duration: 8500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animacion.start();
    return () => animacion.stop();
  }, [avanceBorde]);
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
  const [avisoSeguimiento, setAvisoSeguimiento] = useState<{ mensaje: string; siguiendo: boolean } | null>(null);
  const temporizadorAviso = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizadorAviso.current) clearTimeout(temporizadorAviso.current);
    };
  }, []);

  const mostrarAvisoSeguimiento = (nuevoEstado: boolean) => {
    // Una sola notificación visible: el último evento reemplaza al anterior.
    if (temporizadorCola.current) clearTimeout(temporizadorCola.current);
    temporizadorCola.current = null;
    setAvisoCola(null);
    if (temporizadorAviso.current) clearTimeout(temporizadorAviso.current);
    setAvisoSeguimiento({
      mensaje: `${nuevoEstado ? 'Comenzaste a seguir a' : 'Dejaste de seguir a'} ${artista?.nombreArtistico || 'este artista'}`,
      siguiendo: nuevoEstado,
    });
    temporizadorAviso.current = setTimeout(() => {
      setAvisoSeguimiento(null);
      temporizadorAviso.current = null;
    }, 5000);
  };
  const { usuarioId, vistaPrevia } = useLocalSearchParams<{
    usuarioId: string;
    vistaPrevia?: string;
  }>();
  const esVistaPrevia = vistaPrevia === '1';

  const {
    cancionActual,
    reproduciendo,
    reproducirCancion,
    agregarACola,
    colaManual,
    quitarDeCola,
    alternarReproduccion,
    abrirVentanaCola,
  } = usePlayer();

  const [avisoCola, setAvisoCola] = useState<{ titulo: string; indice: number; id: string } | null>(null);
  const temporizadorCola = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (temporizadorCola.current) clearTimeout(temporizadorCola.current);
  }, []);

  const cerrarAvisoCola = () => {
    if (temporizadorCola.current) clearTimeout(temporizadorCola.current);
    temporizadorCola.current = null;
    setAvisoCola(null);
  };

  const agregarCancionACola = (cancion: Cancion) => {
    if (esVistaPrevia || !artista || !cancion.audioId) return;
    const agregada = agregarACola({
      id: cancion.id,
      audioId: cancion.audioId,
      titulo: cancion.titulo,
      nombreArtista: artista.nombreArtistico || artista.nombreUsuario,
      usuarioId: artista.usuarioId,
      portadaId: cancion.portadaId,
      fotoArtista: artista.fotoPerfil || null,
    });
    if (!agregada) {
      // Sin canción activa, esta canción inicia la reproducción y su lista automática.
      // No se muestra el aviso de «Añadida a la cola» porque ya está sonando.
      if (!cancionActual) {
        const listaInicial = construirColaCircular(cancion);
        const seleccionada = listaInicial[0];
        if (seleccionada) {
          cerrarAvisoCola();
          reproducirCancion(seleccionada, listaInicial, true);
          abrirReproductor();
        }
      }
      return;
    }
    if (temporizadorAviso.current) clearTimeout(temporizadorAviso.current);
    temporizadorAviso.current = null;
    setAvisoSeguimiento(null);
    if (temporizadorCola.current) clearTimeout(temporizadorCola.current);
    setAvisoCola({ titulo: cancion.titulo, id: cancion.id, indice: colaManual.length });
    temporizadorCola.current = setTimeout(() => {
      setAvisoCola(null);
      temporizadorCola.current = null;
    }, 5000);
  };

  const deshacerUltimaAdicion = () => {
    if (!avisoCola) return;
    // Solo quitar la entrada concreta si sigue en la misma posición.
    if (colaManual[avisoCola.indice]?.id === avisoCola.id) {
      quitarDeCola(avisoCola.indice);
    }
    cerrarAvisoCola();
  };

  const abrirColaDesdeAviso = () => {
    cerrarAvisoCola();
    abrirVentanaCola();
  };

  const [artista, setArtista] =
    useState<ArtistaPublico | null>(null);

  const [canciones, setCanciones] =
    useState<Cancion[]>([]);
  const [mostrarTodasCanciones, setMostrarTodasCanciones] = useState(false);
  const [ordenCanciones, setOrdenCanciones] = useState<'escuchadas' | 'recientes'>('escuchadas');

  const [meGustas, setMeGustas] = useState<string[]>([]);
  const [procesandoMeGusta, setProcesandoMeGusta] = useState<string | null>(null);
  const bloqueoMeGusta = useRef<string | null>(null);

  const [guardadas, setGuardadas] = useState<string[]>([]);
  const [procesandoGuardada, setProcesandoGuardada] = useState<string | null>(null);
  const bloqueoGuardada = useRef<string | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState('');

  const [estadisticas, setEstadisticas] = useState<EstadisticasArtista | null>(null);
  const [cargandoEstadisticas, setCargandoEstadisticas] = useState(false);
  const [siguiendo, setSiguiendo] = useState(false);
  const [cantidadSeguidores, setCantidadSeguidores] = useState<number | null>(null);
  const [cargandoSeguimiento, setCargandoSeguimiento] = useState(true);
  const [procesandoSeguimiento, setProcesandoSeguimiento] = useState(false);
  const [errorSeguimiento, setErrorSeguimiento] = useState('');
  const [contactoVisible, setContactoVisible] = useState(false);
  const [avisoAutoSeguimientoVisible, setAvisoAutoSeguimientoVisible] = useState(false);

    const [abriendoReproductor, setAbriendoReproductor] =
  useState(false);
  const navegacionReproductorBloqueada = useRef(false);

  const abrirReproductor = () => {
    if (navegacionReproductorBloqueada.current) return;
    navegacionReproductorBloqueada.current = true;
    setAbriendoReproductor(true);
    router.push('/reproductor');
  };

  useFocusEffect(
  useCallback(() => {
    navegacionReproductorBloqueada.current = false;
    setAbriendoReproductor(false);
  }, [])
);

  useEffect(() => {
    if (!usuarioId) {
      setError(
        'No se encontró el identificador del artista.'
      );
      setCargando(false);
      return;
    }

    cargarPerfilPublico();
    if (!esVistaPrevia) cargarEstadoSeguimiento();
  }, [usuarioId]);

  const cargarMisMeGustas = async () => {
    if (esVistaPrevia) return;
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;
      const respuesta = await fetch(`${API_URL}/api/me-gustas/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!respuesta.ok) throw new Error('No se pudieron cargar los Me gusta.');
      const datos = await respuesta.json();
      setMeGustas((datos.canciones || []).map((item: { id: string }) => item.id));
    } catch (error) {
      console.error('Error al cargar Me gusta:', error);
    }
  };

  const alternarMeGusta = async (cancionId: string) => {
    if (esVistaPrevia || bloqueoMeGusta.current) return;
    bloqueoMeGusta.current = cancionId;
    setProcesandoMeGusta(cancionId);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert('Sesión', 'Inicia sesión para dar Me gusta.');
        return;
      }
      const tieneMeGusta = meGustas.includes(cancionId);
      const respuesta = await fetch(`${API_URL}/api/me-gustas/${cancionId}`, {
        method: tieneMeGusta ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo actualizar Me gusta.');
      setCanciones((anteriores) => anteriores.map((item) => item.id === cancionId ? {
        ...item,
        meGustas: Math.max(0, (item.meGustas ?? 0) + (datos.meGusta === true ? 1 : -1)),
      } : item));
      setMeGustas((anteriores) =>
        datos.meGusta === true
          ? [...new Set([...anteriores, cancionId])]
          : anteriores.filter((id) => id !== cancionId)
      );
    } catch (error) {
      Alert.alert('Me gusta', error instanceof Error ? error.message : 'Error de conexión.');
    } finally {
      bloqueoMeGusta.current = null;
      setProcesandoMeGusta(null);
    }
  };

  const cargarMisGuardadas = async () => {
    if (esVistaPrevia) return;
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;
      const respuesta = await fetch(`${API_URL}/api/guardadas/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!respuesta.ok) throw new Error('No se pudieron cargar las canciones guardadas.');
      const datos = await respuesta.json();
      setGuardadas((datos.canciones || []).map((item: { id: string }) => item.id));
    } catch (error) {
      console.error('Error al cargar Guardadas:', error);
    }
  };

  const alternarGuardada = async (cancionId: string) => {
    if (esVistaPrevia || bloqueoGuardada.current) return;
    bloqueoGuardada.current = cancionId;
    setProcesandoGuardada(cancionId);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert('Sesión', 'Inicia sesión para guardar canciones.');
        return;
      }
      const estaGuardada = guardadas.includes(cancionId);
      const respuesta = await fetch(`${API_URL}/api/guardadas/${cancionId}`, {
        method: estaGuardada ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo actualizar Guardadas.');
      setCanciones((anteriores) => anteriores.map((item) => item.id === cancionId ? {
        ...item,
        guardados: Math.max(0, (item.guardados ?? 0) + (datos.guardada === true ? 1 : -1)),
      } : item));
      setGuardadas((anteriores) =>
        datos.guardada === true
          ? [...new Set([...anteriores, cancionId])]
          : anteriores.filter((id) => id !== cancionId)
      );
    } catch (error) {
      Alert.alert('Guardadas', error instanceof Error ? error.message : 'Error de conexión.');
    } finally {
      bloqueoGuardada.current = null;
      setProcesandoGuardada(null);
    }
  };

  // Actualizar los estados al regresar desde el reproductor o Biblioteca.
  // El perfil permanece montado durante la navegación, por lo que no basta
  // con consultarlos una sola vez al abrirlo.
  useFocusEffect(
    useCallback(() => {
      if (!usuarioId || esVistaPrevia) return;
      void cargarMisMeGustas();
      void cargarMisGuardadas();
      void refrescarCancionesCatalogo();
    }, [usuarioId, esVistaPrevia])
  );

  const cargarEstadisticas = async () => {
    if (!usuarioId) return;
    try {
      setCargandoEstadisticas(true);
      const respuesta = await fetch(
        `${API_URL}/api/perfiles-artista/${usuarioId}/estadisticas`
      );
      if (!respuesta.ok) throw new Error('No se pudieron cargar las estadísticas.');
      const datos: EstadisticasArtista = await respuesta.json();
      setEstadisticas(datos);
    } catch (error) {
      console.error('Error al cargar estadísticas del artista:', error);
      setEstadisticas(null);
    } finally {
      setCargandoEstadisticas(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (usuarioId) void cargarEstadisticas();
    }, [usuarioId])
  );

  const cargarEstadoSeguimiento = async () => {
    try {
      setCargandoSeguimiento(true);
      setErrorSeguimiento('');
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        setErrorSeguimiento('Inicia sesión para seguir artistas.');
        return;
      }
      const respuesta = await fetch(
        `${API_URL}/api/seguimientos/artistas/${usuarioId}/estado`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.message || 'No se pudo consultar el seguimiento.');
      }
      setSiguiendo(datos.siguiendo === true);
      setCantidadSeguidores(datos.cantidadSeguidores);
    } catch (err) {
      setErrorSeguimiento(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setCargandoSeguimiento(false);
    }
  };

  const alternarSeguimiento = async () => {
    if (esVistaPrevia || !usuarioId || cargandoSeguimiento || procesandoSeguimiento || errorSeguimiento) return;
    setProcesandoSeguimiento(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert('Sesión', 'Inicia sesión para seguir artistas.');
        return;
      }
      const respuesta = await fetch(
        `${API_URL}/api/seguimientos/artistas/${usuarioId}`,
        {
          method: siguiendo ? 'DELETE' : 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.message || 'No se pudo actualizar el seguimiento.');
      }
      setSiguiendo(datos.siguiendo === true);
      mostrarAvisoSeguimiento(datos.siguiendo === true);
      if (typeof datos.cantidadSeguidores === 'number') {
        setCantidadSeguidores(datos.cantidadSeguidores);
      } else {
        await cargarEstadoSeguimiento();
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error de conexión.';
      if (/no puedes seguirte a ti mismo|no puede seguirse a s[ií] mismo|no puedes seguir tu propia cuenta/i.test(mensaje)) {
        setAvisoAutoSeguimientoVisible(true);
      } else {
        Alert.alert('Seguimiento', mensaje);
      }
    } finally {
      setProcesandoSeguimiento(false);
    }
  };

  // Actualiza el ranking cuando el usuario regresa al perfil, sin recargar la pantalla.
  const refrescarCancionesCatalogo = async () => {
    if (!usuarioId) return;
    try {
      const respuesta = await fetch(`${API_URL}/api/canciones/artista/${usuarioId}`);
      if (!respuesta.ok) return;
      const datos = await respuesta.json();
      if (Array.isArray(datos.canciones)) setCanciones(datos.canciones);
    } catch (error) {
      console.warn('No fue posible actualizar el catálogo:', error);
    }
  };

  const cargarPerfilPublico = async () => {
    try {
      setCargando(true);
      setError('');

      const respuestaPerfil = await fetch(
        `${API_URL}/api/perfiles-artista/${usuarioId}`
      );

      const datosPerfil =
        await respuestaPerfil.json();

      if (!respuestaPerfil.ok) {
        setError(
          datosPerfil.message ||
            'No fue posible cargar el perfil del artista.'
        );
        return;
      }

      const artistaCargado: ArtistaPublico =
        datosPerfil.artista;

      setArtista(artistaCargado);

      const respuestaCanciones = await fetch(
        `${API_URL}/api/canciones/artista/${usuarioId}`
      );

      const datosCanciones =
        await respuestaCanciones.json();

      if (!respuestaCanciones.ok) {
        setError(
          datosCanciones.message ||
            'No fue posible cargar las canciones del artista.'
        );
        return;
      }

      setCanciones(
        datosCanciones.canciones || []
      );
    } catch (error) {
      console.error(
        'Error al cargar perfil público:',
        error
      );

      setError(
        'No fue posible conectar con UnderMusic.'
      );
    } finally {
      setCargando(false);
    }
  };

  // Las fijadas manualmente tienen prioridad; completar sin duplicados con las más escuchadas.
  const idsFijados = (artista?.cancionesDestacadas ?? []).slice(0, 3);
  const cancionesFijadas = idsFijados
    .map((id) => canciones.find((cancion) => cancion.id === id))
    .filter((cancion): cancion is Cancion => Boolean(cancion));
  const idsUsados = new Set(cancionesFijadas.map((cancion) => cancion.id));
  const cancionesPopulares = [
    ...cancionesFijadas,
    ...canciones.filter((cancion) => !idsUsados.has(cancion.id))
      .sort((a, b) => (b.reproducciones ?? 0) - (a.reproducciones ?? 0) ||
        new Date(b.fechaPublicacion).getTime() - new Date(a.fechaPublicacion).getTime()),
  ].slice(0, 3);
  const idsTop3 = new Set(cancionesPopulares.map((cancion) => cancion.id));
  const restantesPorReproducciones = canciones
    .filter((cancion) => !idsTop3.has(cancion.id))
    .sort((a, b) => (b.reproducciones ?? 0) - (a.reproducciones ?? 0) ||
      new Date(b.fechaPublicacion).getTime() - new Date(a.fechaPublicacion).getTime());
  const cancionesPorPopularidad = [...canciones].sort((a, b) =>
    (b.reproducciones ?? 0) - (a.reproducciones ?? 0) ||
    new Date(b.fechaPublicacion).getTime() - new Date(a.fechaPublicacion).getTime());
  const cancionesPorFecha = [...canciones].sort((a, b) =>
    new Date(b.fechaPublicacion).getTime() - new Date(a.fechaPublicacion).getTime());
  const cancionesVisibles = mostrarTodasCanciones
    ? (ordenCanciones === 'recientes' ? cancionesPorFecha : cancionesPorPopularidad)
    : cancionesPopulares;

  // No se muestra el correo privado de registro: solo correoContacto.
  const contactoOpciones: {
    clave: string;
    titulo: string;
    detalle: string;
    url: string;
    icono: keyof typeof Ionicons.glyphMap;
  }[] = [];

  const correo = artista?.correoContacto?.trim() || '';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    contactoOpciones.push({
      clave: 'correo', titulo: 'Correo electrónico', detalle: correo,
      url: `mailto:${correo}`, icono: 'mail-outline',
    });
  }

  const redes = [
    { clave: 'instagram', titulo: 'Instagram', valor: artista?.instagram, dominios: ['instagram.com'], icono: 'logo-instagram' },
    { clave: 'facebook', titulo: 'Facebook', valor: artista?.facebook, dominios: ['facebook.com', 'fb.com'], icono: 'logo-facebook' },
    { clave: 'twitter', titulo: 'X', valor: artista?.twitter, dominios: ['x.com', 'twitter.com'], icono: 'logo-twitter' },
  ] as const;
  redes.forEach((red) => {
    const valor = red.valor?.trim();
    if (!valor) return;
    try {
      const url = new URL(valor);
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || !red.dominios.some((d) => host === d || host === `www.${d}`) || url.username || url.password || url.pathname === '/') return;
      contactoOpciones.push({
        clave: red.clave, titulo: red.titulo, detalle: valor,
        url: valor, icono: red.icono,
      });
    } catch { /* Enlaces inválidos no se muestran. */ }
  });

  const abrirContacto = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No se pudo abrir', 'No encontramos una aplicación compatible para abrir este contacto.');
    }
  };

  const compartirPerfil = async () => {
    if (!artista || !usuarioId) return;
    const nombre = artista.nombreArtistico || artista.nombreUsuario;
const enlace = `https://under-music.vercel.app/artista/${usuarioId}`;
const mensaje = `🎤 ¡Conoce a ${nombre} (@${artista.nombreUsuario}) en UnderMusic!\n\nDescubre música emergente y apoya a artistas locales.\n\n🔗 ${enlace}`;
    try {
      await Share.share({ message: mensaje, title: `Perfil de ${nombre}` });
    } catch (error) {
      console.error('Error al compartir perfil:', error);
      Alert.alert('Compartir perfil', 'No fue posible abrir las opciones para compartir.');
    }
  };

  const compartirCancion = async (cancion: Cancion) => {
    if (esVistaPrevia || !artista) return;

    const nombreArtista = artista.nombreArtistico || artista.nombreUsuario;
const enlace = `https://under-music.vercel.app/cancion/${cancion.id}`;
const mensaje = `🎵 ¡Escucha "${cancion.titulo}" de ${nombreArtista} en UnderMusic!\n\nDescubre música emergente, conoce nuevos artistas y apoya el talento independiente.\n\n🔗 ${enlace}`;

    try {
      await Share.share({ message: mensaje, title: cancion.titulo });
    } catch (error) {
      Alert.alert(
        'Compartir canción',
        'No fue posible abrir las opciones para compartir.'
      );
      console.error('Error al compartir canción:', error);
    }
  };

  const construirColaCircular = (seleccionada: Cancion): CancionReproductor[] => {
    if (!artista) return [];
    const orden = mostrarTodasCanciones && ordenCanciones === 'recientes'
      ? cancionesPorFecha
      : cancionesPorPopularidad;
    const disponibles = orden.filter((item): item is Cancion & {audioId: string} => Boolean(item.audioId));
    const inicio = disponibles.findIndex(item => item.id === seleccionada.id);
    if (inicio < 0) return [];
    const recorrido = [...disponibles.slice(inicio), ...disponibles.slice(0, inicio)];
    return recorrido.map(item => ({
      id: item.id, audioId: item.audioId, titulo: item.titulo,
      nombreArtista: artista.nombreArtistico || artista.nombreUsuario,
      usuarioId: artista.usuarioId, portadaId: item.portadaId,
      fotoArtista: artista.fotoPerfil || null,
    }));
  };

  const reproducir = (cancion: Cancion) => {
    if (esVistaPrevia || !cancion.audioId || !artista) return;
    if (cancionActual?.id === cancion.id) {
      alternarReproduccion();
      return;
    }
    const colaReproductor = construirColaCircular(cancion);
    if (colaReproductor.length === 0) return;
    reproducirCancion(colaReproductor[0], colaReproductor, true);
    abrirReproductor();
  };

  if (cargando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color="#B64DFF"
        />

        <Text style={styles.loadingText}>
          Cargando artista...
        </Text>
      </View>
    );
  }

  if (error || !artista) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color="#FF5FA2"
        />

        <Text style={styles.errorText}>
          {error ||
            'No fue posible cargar el perfil del artista.'}
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.errorBackButton,
            pressed &&
              styles.buttonPressed,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#FFFFFF"
          />

          <Text
            style={styles.errorBackText}
          >
            Volver
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require(
        '../../../assets/images/fondo-app.png'
      )}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView
  style={styles.safeArea}
  edges={[]}
>
  {!esVistaPrevia && !abriendoReproductor ? (
    <MiniPlayer />
  ) : null}

  <ScrollView
    contentContainerStyle={
      styles.scrollContent
    }
    showsVerticalScrollIndicator={
      false
    }
  >
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.backButton,
          pressed &&
            styles.buttonPressed,
        ]}
      >
        <Ionicons
          name="arrow-back"
          size={27}
          color="#FFFFFF"
        />
      </Pressable>

      <Text style={styles.headerTitle}>
        {esVistaPrevia ? 'Vista previa de tu perfil' : 'Perfil del artista'}
      </Text>

      <View style={styles.headerSpacer} />
    </View>

          <View
            style={styles.profileSection}
          >
            <View style={styles.avatarGlowContainer}>
              <View style={styles.avatarBorder}>
                <Animated.View pointerEvents="none" style={[styles.avatarGlintHorizontal, { top: 0, left: 0 }, posicionDestello(0)]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', '#FFFFFF', 'rgba(255,255,255,0.35)', 'transparent']} style={StyleSheet.absoluteFill} start={{x:0,y:0.5}} end={{x:1,y:0.5}} />
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.avatarGlintVertical, { top: 0, right: 0 }, posicionDestello(1)]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', '#FFFFFF', 'rgba(255,255,255,0.35)', 'transparent']} style={StyleSheet.absoluteFill} start={{x:0.5,y:0}} end={{x:0.5,y:1}} />
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.avatarGlintHorizontal, { bottom: 0, right: 0 }, posicionDestello(2)]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', '#FFFFFF', 'rgba(255,255,255,0.35)', 'transparent']} style={StyleSheet.absoluteFill} start={{x:0,y:0.5}} end={{x:1,y:0.5}} />
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.avatarGlintVertical, { bottom: 0, left: 0 }, posicionDestello(3)]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', '#FFFFFF', 'rgba(255,255,255,0.35)', 'transparent']} style={StyleSheet.absoluteFill} start={{x:0.5,y:0}} end={{x:0.5,y:1}} />
                </Animated.View>
                <View style={styles.avatar}>
                  {artista.fotoPerfil ? (
                    <Image
                      source={{ uri: `${API_URL}/api/usuarios/foto-perfil/${artista.fotoPerfil}` }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={72} color="#D8A6FF" />
                  )}
                </View>
              </View>
            </View>

            <Text
              style={styles.artistName}
            >
              {artista.nombreArtistico}
            </Text>

            <Text
              style={
                styles.artistUsername
              }
            >
              @{artista.nombreUsuario}
            </Text>

            <View style={styles.roleCountryRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>ARTISTA</Text>
              </View>
              {!!artista.ubicacion?.pais && (
                <Text style={styles.countryText}>{artista.ubicacion.pais}</Text>
              )}
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
                  {artista.ubicacion.comuna}, {artista.ubicacion.region}
                </Text>
              </View>

            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Ionicons name="headset-outline" size={23} color="#54E6FF" />
                <Text style={styles.metricValue}>
                  {estadisticas ? estadisticas.oyentesUnicos.toLocaleString('es-CL') : '—'}
                </Text>
                <Text style={styles.metricLabel}>Oyentes únicos</Text>
              </View>
              <View style={styles.metricCard}>
                <Ionicons name="play-circle-outline" size={23} color="#FF68B7" />
                <Text style={styles.metricValue}>
                  {estadisticas ? estadisticas.reproduccionesTotales.toLocaleString('es-CL') : '—'}
                </Text>
                <Text style={styles.metricLabel}>Reproducciones</Text>
              </View>
              <View style={styles.metricCard}>
                <Ionicons name="people-outline" size={23} color="#E05BFF" />
                <Text style={styles.metricValue}>
                  {(cantidadSeguidores ?? estadisticas?.cantidadSeguidores)?.toLocaleString('es-CL') ?? '—'}
                </Text>
                <Text style={styles.metricLabel}>Seguidores</Text>
              </View>
            </View>
            {cargandoEstadisticas && !estadisticas ? (
              <Text style={styles.metricsHint}>Cargando estadísticas...</Text>
            ) : null}

            {esVistaPrevia ? (
              <View style={styles.previewNotice}>
                <Ionicons name="eye-outline" size={18} color="#EAC6FF" />
                <Text style={styles.previewNoticeText}>
                  Así ven tu perfil los oyentes. Seguir y reproducir están desactivados en esta vista.
                </Text>
              </View>
            ) : null}
            <View style={styles.profileActionsRow}>
              {esVistaPrevia ? (
                <View style={[styles.followButton, styles.followButtonActive, styles.previewDisabled]}>
                  <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.followButtonText}>Seguir</Text>
                </View>
              ) : errorSeguimiento ? (
                <Pressable onPress={cargarEstadoSeguimiento} style={styles.followButton}>
                  <Text style={styles.followButtonText}>Reintentar</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={alternarSeguimiento}
                  disabled={cargandoSeguimiento || procesandoSeguimiento}
                  style={({ pressed }) => [
                    styles.followButton,
                    siguiendo && styles.followButtonActive,
                    (pressed || cargandoSeguimiento || procesandoSeguimiento) && styles.buttonPressed,
                  ]}
                >
                  {cargandoSeguimiento || procesandoSeguimiento ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name={siguiendo ? 'checkmark' : 'person-add-outline'} size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.followButtonText}>
                    {cargandoSeguimiento ? 'Consultando...' : procesandoSeguimiento ? 'Actualizando...' : siguiendo ? 'Siguiendo' : 'Seguir'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setContactoVisible(true)}
                style={({ pressed }) => [styles.contactButton, pressed && styles.buttonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Contactar al artista"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Contactar</Text>
              </Pressable>
              <Pressable
                onPress={compartirPerfil}
                style={({ pressed }) => [styles.profileShareButton, pressed && styles.buttonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Compartir perfil del artista"
              >
                <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View
            style={styles.artistContent}
          >
            <View
              style={styles.artistSection}
            >
              <View
                style={styles.sectionHeader}
              >
                <Ionicons
                  name="person-outline"
                  size={26}
                  color="#E05BFF"
                />

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Sobre el artista
                </Text>
              </View>

              <Text
                style={styles.biography}
              >
                {artista.biografia}
              </Text>
            </View>

            <View
              style={styles.artistSection}
            >
              <View
                style={styles.sectionHeader}
              >
                <Ionicons
                  name="musical-notes-outline"
                  size={26}
                  color="#59DFFF"
                />

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Géneros artísticos
                </Text>
              </View>

              <Text
                style={styles.genreLabel}
              >
                Género principal
              </Text>

              <View
                style={
                  styles.artistGenresContainer
                }
              >
                <View
                  style={[
                    styles.artistGenreChip,
                    styles.mainGenreChip,
                  ]}
                >
                  <Text
                    style={
                      styles.artistGenreText
                    }
                  >
                    {
                      artista.generoPrincipal
                    }
                  </Text>
                </View>
              </View>

              {artista
                .generosAdicionales
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
                    {artista.generosAdicionales.map(
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
            </View>

            <View style={styles.divider} />

            <View
              style={styles.songsSection}
            >
              <View
                style={styles.sectionHeader}
              >
                <Ionicons
                  name="disc-outline"
                  size={27}
                  color="#FF68B7"
                />

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Canciones
                </Text>
              </View>

              {mostrarTodasCanciones && canciones.length > 3 ? (
                <View style={styles.songSortRow}>
                  <Pressable onPress={() => setOrdenCanciones('escuchadas')}
                    style={[styles.songSortButton, ordenCanciones === 'escuchadas' && styles.songSortActive]}>
                    <Ionicons name="trending-up-outline" size={16} color="#EED5FF" />
                    <Text style={styles.songSortText}>Más escuchadas</Text>
                  </Pressable>
                  <Pressable onPress={() => setOrdenCanciones('recientes')}
                    style={[styles.songSortButton, ordenCanciones === 'recientes' && styles.songSortActive]}>
                    <Ionicons name="time-outline" size={16} color="#EED5FF" />
                    <Text style={styles.songSortText}>Más recientes</Text>
                  </Pressable>
                </View>
              ) : null}
              {canciones.length > 0 ? (
                <View
                  style={styles.songsList}
                >
                  {cancionesVisibles.map(
                    (cancion) => (
                      <View key={cancion.id} style={styles.songCardOuter}>
                      <Pressable
  key={cancion.id}
  style={({ pressed }) => [
    styles.songCard,
    anchoPantalla < 700 && styles.songCardCompact,
    cancionActual?.id === cancion.id &&
      pressed &&
      styles.songCardPressed,
  ]}
  onPress={() => {
    if (!esVistaPrevia && cancionActual?.id === cancion.id) {
      abrirReproductor();
    }
  }}
>
                        {cancion.portadaId ? (
                          <Image
                            source={{
                              uri:
                                `${API_URL}/api/canciones/` +
                                `portadas/${cancion.portadaId}`,
                            }}
                            style={
                              styles.songCover
                            }
                            resizeMode="cover"
                          />
                        ) : artista.fotoPerfil ? (
                          <Image
                            source={{
                              uri:
                                `${API_URL}/api/usuarios/` +
                                `foto-perfil/${artista.fotoPerfil}`,
                            }}
                            style={
                              styles.songCover
                            }
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={
                              styles.songCoverPlaceholder
                            }
                          >
                            <Ionicons
                              name="musical-note"
                              size={28}
                              color="#D89BFF"
                            />
                          </View>
                        )}

                        <View
                          style={
                            styles.songInfo
                          }
                        >
                          <Text
                            style={
                              styles.songTitle
                            }
                            numberOfLines={1}
                          >
                            {
                              cancion.titulo
                            }
                          </Text>

                          <Text
                            style={
                              styles.songGenre
                            }
                            numberOfLines={1}
                          >
                            {
                              cancion.generoPrincipal
                            }
                          </Text>

                          {cancion.album ? (
                            <Text
                              style={
                                styles.songAlbum
                              }
                              numberOfLines={1}
                            >
                              {
                                cancion.album
                              }
                            </Text>
                          ) : null}
                        </View>

                        <View style={[styles.songActionsRow, anchoPantalla < 700 && styles.songActionsCompact]}>
                         <Pressable
                           style={[styles.songShareButton, anchoPantalla < 700 && styles.songActionCompact]}
                           disabled={esVistaPrevia}
                           onPress={() => compartirCancion(cancion)}
                           accessibilityRole="button"
                           accessibilityLabel={`Compartir ${cancion.titulo}`}
                         >
                           <Ionicons
                             name="share-social-outline"
                             size={21}
                             color="#DDB9FF"
                           />
                         </Pressable>

                        <Pressable
                           style={[styles.songQueueButton, anchoPantalla < 700 && styles.songActionCompact]}
                           disabled={esVistaPrevia || !cancion.audioId}
                           onPress={() => agregarCancionACola(cancion)}
                           accessibilityRole="button"
                           accessibilityLabel={`Añadir ${cancion.titulo} a la cola de reproducción`}
                         >
                           <Ionicons name="list-outline" size={22} color="#FFC477" />
                         </Pressable>

                         <Pressable
                          style={[styles.songSaveButton, anchoPantalla < 700 && styles.songActionCompact]}
                          disabled={esVistaPrevia || procesandoGuardada !== null}
                          onPress={() => alternarGuardada(cancion.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${guardadas.includes(cancion.id) ? 'Quitar de Guardadas' : 'Guardar'} ${cancion.titulo}`}
                        >
                          {procesandoGuardada === cancion.id ? (
                            <ActivityIndicator size="small" color="#54E6FF" />
                          ) : (
                            <Ionicons
                              name={guardadas.includes(cancion.id) ? 'bookmark' : 'bookmark-outline'}
                              size={22}
                              color={guardadas.includes(cancion.id) ? '#54E6FF' : '#9FD9E5'}
                            />
                          )}
                        </Pressable>

                        <Pressable
                          style={[styles.songLikeButton, anchoPantalla < 700 && styles.songActionCompact]}
                          disabled={esVistaPrevia || procesandoMeGusta !== null}
                          onPress={() => alternarMeGusta(cancion.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${meGustas.includes(cancion.id) ? 'Quitar Me gusta de' : 'Dar Me gusta a'} ${cancion.titulo}`}
                        >
                          {procesandoMeGusta === cancion.id ? (
                            <ActivityIndicator size="small" color="#FF68B7" />
                          ) : (
                            <Ionicons
                              name={meGustas.includes(cancion.id) ? 'heart' : 'heart-outline'}
                              size={23}
                              color={meGustas.includes(cancion.id) ? '#FF68B7' : '#E7A1C8'}
                            />
                          )}
                        </Pressable>

                        <Pressable
                          style={
                            styles.songPlayButton
                          }
                          disabled={
                            esVistaPrevia || !cancion.audioId
                          }
                          onPress={() =>
                            reproducir(
                              cancion
                            )
                          }
                        >
                          <Ionicons
                            name={
                              cancionActual
                                ?.id ===
                                cancion.id &&
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
                        </View>
                        <View style={[styles.songMetricsDivider, anchoPantalla < 700 && styles.songMetricsDividerCompact]} />
                        <View style={[styles.songMetricsColumn, anchoPantalla < 700 && styles.songMetricsColumnCompact]}>
                          <View style={styles.songMetricItem}><Ionicons name="play-outline" size={13} color="#FF68B7" /><Text style={styles.songMetricText}>{(cancion.reproducciones ?? 0).toLocaleString('es-CL')}</Text></View>
                          <View style={styles.songMetricItem}><Ionicons name="heart-outline" size={13} color="#FF68B7" /><Text style={styles.songMetricText}>{(cancion.meGustas ?? 0).toLocaleString('es-CL')}</Text></View>
                          <View style={styles.songMetricItem}><Ionicons name="bookmark-outline" size={13} color="#54E6FF" /><Text style={styles.songMetricText}>{(cancion.guardados ?? 0).toLocaleString('es-CL')}</Text></View>
                        </View>
                      </Pressable>
                      </View>
                    )
                  )}
                </View>
              ) : (
                <View
                  style={
                    styles.emptySongsCard
                  }
                >
                  <View
                    style={
                      styles.emptySongsIcon
                    }
                  >
                    <Ionicons
                      name="musical-note-outline"
                      size={32}
                      color="#C487EE"
                    />
                  </View>

                  <Text
                    style={
                      styles.emptySongsTitle
                    }
                  >
                    Este artista aún no ha
                    publicado canciones
                  </Text>

                  <Text
                    style={
                      styles.emptySongsDescription
                    }
                  >
                    Sus canciones aparecerán
                    aquí cuando publique música
                    en UnderMusic.
                  </Text>
                </View>
              )}
              {canciones.length > 3 ? (
                <Pressable
                  onPress={() => { setMostrarTodasCanciones((actual) => !actual); setOrdenCanciones('escuchadas'); }}
                  style={({ pressed }) => [styles.showAllSongsButton, pressed && styles.buttonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={mostrarTodasCanciones ? 'Mostrar canciones más populares' : 'Ver todas las canciones'}
                >
                  <Text style={styles.showAllSongsText}>
                    {mostrarTodasCanciones ? 'Mostrar menos' : `Ver todas las canciones (${canciones.length})`}
                  </Text>
                  <Ionicons name={mostrarTodasCanciones ? 'chevron-up' : 'chevron-down'} size={20} color="#E5BBFF" />
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
       <Modal
         visible={contactoVisible}
         transparent
         animationType="slide"
         onRequestClose={() => setContactoVisible(false)}
       >
         <View style={styles.contactModalRoot}>
           <Pressable
             style={styles.contactBackdrop}
             onPress={() => setContactoVisible(false)}
             accessibilityLabel="Cerrar contactos"
           />
           <View style={[styles.contactSheet, { paddingBottom: Math.max(insets.bottom, 22) }]}>
             <View style={styles.contactSheetHeader}>
               <View style={{ flex: 1 }}>
                 <Text style={styles.contactSheetTitle}>Contactar</Text>
                 <Text style={styles.contactSheetSubtitle}>
                   {artista.nombreArtistico || artista.nombreUsuario}
                 </Text>
               </View>
               <Pressable onPress={() => setContactoVisible(false)} accessibilityLabel="Cerrar">
                 <Ionicons name="close-circle-outline" size={30} color="#E9B5FF" />
               </Pressable>
             </View>
             {contactoOpciones.length === 0 ? (
               <Text style={styles.contactEmpty}>
                 Este artista aún no ha agregado métodos de contacto.
               </Text>
             ) : (
               contactoOpciones.map((opcion) => (
                 <Pressable
                   key={opcion.clave}
                   onPress={() => abrirContacto(opcion.url)}
                   style={({ pressed }) => [styles.contactOption, pressed && styles.buttonPressed]}
                   accessibilityRole="button"
                 >
                   <Ionicons name={opcion.icono} size={25} color="#FF65BE" />
                   <View style={{ flex: 1 }}>
                     <Text style={styles.contactOptionTitle}>{opcion.titulo}</Text>
                     <Text style={styles.contactOptionDetail} numberOfLines={2}>
                       {opcion.detalle}
                     </Text>
                   </View>
                   <Ionicons name="open-outline" size={20} color="#D6A5F3" />
                 </Pressable>
               ))
             )}
          </View>
         </View>
       </Modal>
       <Modal
         visible={avisoAutoSeguimientoVisible}
         transparent
         animationType="fade"
         statusBarTranslucent
         onRequestClose={() => setAvisoAutoSeguimientoVisible(false)}
       >
         <View style={styles.selfFollowModalRoot}>
           <Pressable
             style={styles.selfFollowBackdrop}
             onPress={() => setAvisoAutoSeguimientoVisible(false)}
             accessibilityLabel="Cerrar aviso"
           />
           <View style={styles.selfFollowCard}>
             <View style={styles.selfFollowIconCircle}>
               <Ionicons name="person-remove-outline" size={32} color="#FF79BC" />
             </View>
             <Text style={styles.selfFollowTitle}>No puedes seguirte a ti mismo</Text>
             <Text style={styles.selfFollowDescription}>
               Puedes explorar tu perfil y escuchar tus canciones, pero no seguir tu propia cuenta.
             </Text>
             <Pressable
               onPress={() => setAvisoAutoSeguimientoVisible(false)}
               style={({ pressed }) => [styles.selfFollowAcceptButton, pressed && styles.buttonPressed]}
               accessibilityRole="button"
             >
               <Text style={styles.selfFollowAcceptText}>Entendido</Text>
             </Pressable>
           </View>
         </View>
       </Modal>
       {avisoCola && !esVistaPrevia ? (
         <View pointerEvents="box-none" style={[styles.toastLayer, { top: insets.top + (cancionActual && !abriendoReproductor ? 60 : 12) }]}>
           <View style={styles.toastColaCard}>
             <Pressable style={styles.toastColaMain} onPress={abrirColaDesdeAviso} accessibilityRole="button" accessibilityLabel="Abrir cola de reproducción">
               <View style={styles.toastColaIcon}><Ionicons name="list" size={24} color="#FFC477" /></View>
               <View style={{ flex: 1 }}>
                 <Text style={styles.toastColaTitle}>Añadida a la cola</Text>
                 <Text style={styles.toastColaText} numberOfLines={2}>«{avisoCola.titulo}» se añadió a la cola de reproducción.</Text>
                 <Text style={styles.toastColaHint}>Toca para ver la cola</Text>
               </View>
               <Ionicons name="chevron-forward" size={18} color="#FFC477" />
             </Pressable>
             <Pressable onPress={deshacerUltimaAdicion} style={styles.toastColaUndo} accessibilityRole="button" accessibilityLabel={`Deshacer añadir ${avisoCola.titulo} a la cola`}>
               <Ionicons name="arrow-undo-outline" size={16} color="#FFC477" />
               <Text style={styles.toastColaUndoText}>Deshacer</Text>
             </Pressable>
           </View>
         </View>
       ) : null}
       {avisoSeguimiento ? (
        <View pointerEvents="box-none" style={[styles.toastLayer, { top: insets.top + (cancionActual && !abriendoReproductor ? 60 : 12) }]}>
          <View style={styles.toastCard}>
            <View style={styles.toastIcon}>
              <Ionicons
                name={avisoSeguimiento.siguiendo ? 'person-add' : 'person-remove'}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.toastText}>{avisoSeguimiento.mensaje}</Text>
            <Pressable
              onPress={() => {
                if (temporizadorAviso.current) clearTimeout(temporizadorAviso.current);
                temporizadorAviso.current = null;
                setAvisoSeguimiento(null);
              }}
              hitSlop={10}
              accessibilityLabel="Cerrar notificación"
            >
              <Ionicons name="close" size={22} color="#F7C0DF" />
            </Pressable>
          </View>
        </View>
      ) : null}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  selfFollowModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  selfFollowBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  selfFollowCard: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 25,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    borderRadius: 26,
    backgroundColor: '#160B28',
    borderWidth: 1.5,
    borderColor: '#BA4EE4',
  },
  selfFollowIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(161, 49, 135, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  selfFollowTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  selfFollowDescription: {
    color: '#C9BED5',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 25,
  },
  selfFollowAcceptButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#812CC1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C875F5',
  },
  selfFollowAcceptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
   profileShareButton: {
     width: 48, height: 48, borderRadius: 24,
     alignItems: 'center', justifyContent: 'center',
     backgroundColor: 'rgba(120, 66, 175, 0.45)',
     borderWidth: 1, borderColor: 'rgba(190, 129, 255, 0.75)',
   },
  contactButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#AD237E',
    borderWidth: 1,
    borderColor: '#FF73C7',
  },
  contactButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  contactModalRoot: { flex: 1, justifyContent: 'flex-end' },
  previewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(183, 124, 255, 0.6)',
    backgroundColor: 'rgba(62, 25, 98, 0.65)',
  },
  previewNoticeText: {
    flex: 1,
    color: '#E9D8F6',
    fontSize: 12,
    lineHeight: 18,
  },
  previewDisabled: { opacity: 0.55 },
  contactBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.72)' },
  contactSheet: {
    backgroundColor: '#150B25',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#C542A0',
    paddingHorizontal: 22,
    paddingTop: 24,
    maxHeight: '85%',
  },
  contactSheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  contactSheetTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '800' },
  contactSheetSubtitle: { color: '#C6A6D5', fontSize: 14, marginTop: 4 },
  contactEmpty: { color: '#D8C9DF', fontSize: 15, lineHeight: 23, textAlign: 'center', paddingVertical: 28 },
  contactOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 15, marginBottom: 11,
    borderRadius: 17, backgroundColor: 'rgba(83, 24, 85, 0.46)',
    borderWidth: 1, borderColor: 'rgba(239, 89, 180, 0.45)',
  },
  contactOptionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  contactOptionDetail: { color: '#CDB9D4', fontSize: 12, marginTop: 4 },
  toastColaCard: {
    width: '100%', maxWidth: 600, borderRadius: 20,
    backgroundColor: '#211527', borderWidth: 1.5,
    borderColor: 'rgba(232,166,75,0.65)', overflow: 'hidden',
    elevation: 12,
  },
  toastColaMain: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  toastColaIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(183,109,28,0.18)', alignItems: 'center', justifyContent: 'center' },
  toastColaTitle: { color: '#FFC477', fontSize: 13, fontWeight: '800' },
  toastColaText: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, marginTop: 2 },
  toastColaHint: { color: '#BDAFCB', fontSize: 11, marginTop: 3 },
  toastColaUndo: { borderTopWidth: 1, borderTopColor: 'rgba(232,166,75,0.2)', paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5 },
  toastColaUndoText: { color: '#FFC477', fontSize: 12, fontWeight: '700' },
  toastLayer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 20,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 600,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    backgroundColor: '#380A29',
    borderWidth: 2,
    borderColor: '#FF299B',
    shadowColor: '#FF168B',
    shadowOpacity: 0.65,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  toastIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FF168B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
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
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 28,
},

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(31, 18, 54, 0.82)',
    borderWidth: 1,
    borderColor:
      'rgba(187, 81, 255, 0.65)',
  },

  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginHorizontal: 10,
  },

  headerSpacer: {
    width: 48,
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
    width: 170,
    height: 170,
    borderRadius: 43,
    padding: 3,
    backgroundColor: '#7C39FF',
    overflow: 'hidden',
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

  roleBadge: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor:
      'rgba(105, 35, 167, 0.48)',
    borderWidth: 1,
    borderColor:
      'rgba(196, 87, 255, 0.45)',
  },

  roleText: {
    color: '#E0A4FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  roleCountryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
  },
  countryText: {
    color: '#C7BFCE',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  profileStatsRow: {
    width: '100%',
    maxWidth: 540,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 22,
    rowGap: 10,
    marginTop: 22,
    paddingHorizontal: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
    minWidth: 0,
    gap: 5,
  },
  locationIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: 1 }],
  },
  locationText: {
    flexShrink: 1,
    color: '#D7D1DE',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'left',
  },
  followersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  followCount: {
    color: '#D7CBE5',
    fontSize: 15,
    fontWeight: '700',
  },
  metricsRow: {
    width: '100%',
    maxWidth: 540,
    flexDirection: 'row',
    gap: 9,
    marginTop: 23,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(172, 94, 240, 0.50)',
    backgroundColor: 'rgba(32, 15, 56, 0.80)',
    gap: 6,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#CFC2DC',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricsHint: {
    color: '#BEB1CD',
    fontSize: 12,
    marginTop: 8,
  },
  profileActionsRow: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 18,
  },
  followButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#8538D4',
    borderWidth: 1,
    borderColor: '#CB8DFF',
  },

  followButtonActive: {
    backgroundColor: 'rgba(59, 31, 82, 0.90)',
  },

  followButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
    backgroundColor:
      'rgba(50, 30, 70, 0.78)',
    borderWidth: 1,
    borderColor:
      'rgba(152, 83, 205, 0.65)',
  },

  mainGenreChip: {
    backgroundColor:
      'rgba(105, 35, 167, 0.72)',
    borderColor: '#C65BFF',
  },

  artistGenreText: {
    color: '#EBCFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  divider: {
    height: 2,
    width: '100%',
    backgroundColor:
      'rgba(126, 70, 220, 0.45)',
    marginTop: 3,
    marginBottom: 27,
  },

  songsSection: {
    width: '100%',
  },

  songsList: {
    width: '100%',
    gap: 12,
  },

  songCardOuter: { width: '100%' },
  songCardCompact: { flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, paddingRight: 71 },
  songActionsCompact: { width: '100%', justifyContent: 'flex-start', gap: 8, marginRight: -84 },
  songActionCompact: { marginLeft: 0, marginRight: 0 },
  songMetricsDividerCompact: { position: 'absolute', right: 56, top: 17, height: 52, marginLeft: 0, marginRight: 0 },
  songMetricsColumnCompact: { position: 'absolute', right: 4, top: 15, width: 47 },
  songSortRow: { flexDirection: 'row', gap: 9, marginBottom: 14, flexWrap: 'wrap' },
  songSortButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167,106,215,0.48)', backgroundColor: 'rgba(54,23,84,0.65)' },
  songSortActive: { borderColor: '#D69AFF', backgroundColor: 'rgba(120,48,174,0.8)' },
  songSortText: { color: '#F1DEFF', fontSize: 12, fontWeight: '700' },
  songActionsRow: { flexDirection: 'row', alignItems: 'center', transform: [{ translateX: 6 }] },
  songMetricsDivider: { width: 1, height: 56, backgroundColor: 'rgba(193,134,241,0.48)', marginLeft: 11, marginRight: 10, transform: [{ translateX: 6 }] },
  songMetricsColumn: { width: 43, justifyContent: 'center', gap: 4, transform: [{ translateX: 6 }] },
  songMetricItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  songMetricText: { color: '#D9C9E6', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  showAllSongsButton: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 13,
    paddingHorizontal: 21, marginTop: 19, borderRadius: 22,
    backgroundColor: 'rgba(98, 35, 153, 0.48)',
    borderWidth: 1, borderColor: 'rgba(190, 129, 255, 0.65)',
  },
  showAllSongsText: { color: '#F0D9FF', fontSize: 14, fontWeight: '800' },
  songCard: {
    width: '100%',
    minHeight: 82,
    padding: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(12, 7, 28, 0.78)',
    borderWidth: 1,
    borderColor:
      'rgba(137, 63, 209, 0.52)',
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
    backgroundColor:
      'rgba(112, 48, 161, 0.22)',
  },

  songCover: {
    width: 58,
    height: 58,
    borderRadius: 13,
    backgroundColor:
      'rgba(112, 48, 161, 0.22)',
  },

  songInfo: {
    flex: 1,
    minWidth: 65,
    marginLeft: 13,
    marginRight: 8,
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

  songLikeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    backgroundColor: 'rgba(145, 35, 100, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 104, 183, 0.45)',
  },

  songQueueButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 11, backgroundColor: 'rgba(183, 109, 28, 0.18)', borderWidth: 1, borderColor: 'rgba(232, 166, 75, 0.65)' },
  songSaveButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    backgroundColor: 'rgba(24, 119, 143, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(84, 230, 255, 0.45)',
  },

  songShareButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    backgroundColor: 'rgba(120, 66, 175, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(190, 129, 255, 0.45)',
  },

  songPlayButton: {
    marginLeft: 25,
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

  emptySongsCard: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderRadius: 22,
    backgroundColor:
      'rgba(12, 7, 28, 0.72)',
    borderWidth: 1,
    borderColor:
      'rgba(137, 63, 209, 0.52)',
  },

  emptySongsIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(112, 48, 161, 0.20)',
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

  errorBackButton: {
    minHeight: 46,
    marginTop: 22,
    paddingHorizontal: 20,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor:
      'rgba(116, 47, 206, 0.88)',
    borderWidth: 1,
    borderColor: '#C256FF',
  },

  errorBackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
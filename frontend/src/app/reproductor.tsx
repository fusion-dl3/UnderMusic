import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
  Image,
  Animated,
  AccessibilityInfo,
  Easing,
  ImageBackground,
  Modal,
  PanResponder,
  ScrollView,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlayer } from '@/context/PlayerContext';

const API_URL = 'http://192.168.1.5:3000';

function formatearTiempo(segundos: number) {
  if (
    !Number.isFinite(segundos) ||
    segundos < 0
  ) {
    return '0:00';
  }

  const minutos = Math.floor(
    segundos / 60
  );

  const segundosRestantes = Math.floor(
    segundos % 60
  );

  return `${minutos}:${segundosRestantes
    .toString()
    .padStart(2, '0')}`;
}

function BarrasEscuchando({
  reproduciendo,
}: {
  reproduciendo: boolean;
}) {
  const barras = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const [reducirMovimiento, setReducirMovimiento] = useState(true);

  useEffect(() => {
    let activo = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (activo) setReducirMovimiento(valor);
      })
      .catch(() => {
        if (activo) setReducirMovimiento(true);
      });

    const suscripcion =
      AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setReducirMovimiento
      );

    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, []);

  useEffect(() => {
    const animaciones = barras.map((barra, indice) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(indice * 260),
          Animated.timing(barra, {
            toValue: 2.6,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(barra, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay((2 - indice) * 260),
        ])
      )
    );

    if (reproduciendo && !reducirMovimiento) {
      animaciones.forEach((animacion) => animacion.start());
    } else {
      barras.forEach((barra) => barra.setValue(1));
    }

    return () => {
      animaciones.forEach((animacion) => animacion.stop());
    };
  }, [reproduciendo, reducirMovimiento, barras]);

  return (
    <View
      style={styles.barrasEscuchando}
      accessible={false}
      importantForAccessibility="no"
    >
      {barras.map((barra, indice) => (
  <Animated.View
    key={indice}
    style={[
      styles.barraEscuchando,
      {
        transform: [{ scaleY: barra }],
      },
    ]}
  >
    <LinearGradient
      colors={['#55DFFF', '#D15AFF']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.degradadoBarra}
    />
  </Animated.View>
))}
    </View>
  );
}

function TextoEscuchando({
  titulo,
  artista,
  reproduciendo,
}: {
  titulo: string;
  artista: string;
  reproduciendo: boolean;
}) {
  const escala = useRef(new Animated.Value(1)).current;
  const [reducirMovimiento, setReducirMovimiento] = useState(true);

  useEffect(() => {
    let activo = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (activo) setReducirMovimiento(valor);
      })
      .catch(() => {
        if (activo) setReducirMovimiento(true);
      });

    const suscripcion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducirMovimiento
    );

    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, []);

  useEffect(() => {
    escala.setValue(1);

    if (!reproduciendo || reducirMovimiento) {
      return;
    }

    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(escala, {
          toValue: 1.03,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(escala, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animacion.start();

    return () => {
      animacion.stop();
      escala.setValue(1);
    };
  }, [reproduciendo, reducirMovimiento, escala]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: escala }],
        maxWidth: '100%',
      }}
    >
      <Text
        style={styles.headerArtist}
        numberOfLines={2}
      >
        <Text style={{ fontWeight: '800' }}>
          {titulo}
        </Text>
        <Text style={{ fontWeight: '400', letterSpacing: 0 }}>
          {' de '}
        </Text>
        <Text style={{ fontWeight: '800' }}>
          {artista}
        </Text>
      </Text>
    </Animated.View>
  );
}

// Destello blanco suave que recorre el borde de la portada principal.
// Conserva el tamaño y el fondo violeta originales de la portada.
function BordePortadaAnimado({
  children,
  reproduciendo,
}: {
  children: ReactNode;
  reproduciendo: boolean;
}) {
  const giro = useRef(new Animated.Value(0)).current;
  const avance = useRef(0);

  useEffect(() => {
    if (!reproduciendo) {
      // Conserva el ángulo exacto al pausar; no vuelve al principio.
      giro.stopAnimation((valor) => {
        avance.current = valor;
      });
      return;
    }

    let activo = true;
    let animacion: Animated.CompositeAnimation | null = null;

    const continuar = (desde: number) => {
      if (!activo) return;
      // Completa la vuelta desde el punto donde quedó en pausa.
      animacion = Animated.timing(giro, {
        toValue: 1,
        duration: Math.max(1, Math.round((1 - desde) * 8500)),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animacion.start(({ finished }) => {
        if (!activo || !finished) return;
        // 360° y 0° son visualmente idénticos: reinicio imperceptible.
        giro.setValue(0);
        avance.current = 0;
        continuar(0);
      });
    };

    giro.stopAnimation((valor) => {
      if (!activo) return;
      avance.current = valor;
      continuar(valor);
    });

    return () => {
      activo = false;
      animacion?.stop();
    };
  }, [giro, reproduciendo]);

  const rotacion = giro.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.coverGlow}>
      <Animated.View
        pointerEvents="none"
        style={[styles.coverBorderLight, { transform: [{ rotate: rotacion }] }]}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.02)',
            'rgba(255,255,255,0.78)',
            'rgba(255,255,255,0.02)',
            'rgba(255,255,255,0)',
          ]}
          locations={[0, 0.455, 0.5, 0.545, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </View>
  );
}

export default function ReproductorScreen() {
  const { abrirCola } = useLocalSearchParams<{ abrirCola?: string }>();
  const progressBarRef =
  useRef<View>(null);

const progressBarX =
  useRef(0);

const progressBarWidth =
  useRef(0);
  const [
  progresoArrastre,
  setProgresoArrastre,
] = useState<number | null>(null);
  const {
  cancionActual,
  colaManual,
  colaPendienteAutomatica,
  abrirVentanaCola,
  quitarDeCola,
  moverEnCola,
  vaciarColaManual,
  tieneSiguiente,
  tieneAnterior,
  reproduciendo,
  posicion,
  duracion,
  progreso,
  alternarReproduccion,
  buscarPosicion,
  reproducirAnterior,
  reproducirSiguiente,
  } = usePlayer();

  useEffect(() => {
    if (abrirCola === '1') abrirVentanaCola();
  }, [abrirCola]);
  const cancionId = cancionActual?.id ?? null;
  const [meGusta, setMeGusta] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const [cargandoAcciones, setCargandoAcciones] = useState(true);
  const [procesandoMeGusta, setProcesandoMeGusta] = useState(false);
  const [procesandoGuardada, setProcesandoGuardada] = useState(false);
  const bloqueoMeGusta = useRef(false);
  const bloqueoGuardada = useRef(false);

  // Al entrar al reproductor o cambiar de canción, consultamos el estado real.
  // La cancelación evita mostrar los datos de una canción anterior.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setMeGusta(false);
      setGuardada(false);
      setCargandoAcciones(!!cancionId);

      if (cancionId) {
        const cargarEstados = async () => {
          try {
            const token = await SecureStore.getItemAsync('token');
            if (!token) return;
            const headers = { Authorization: `Bearer ${token}` };
            const [respuestaMeGusta, respuestaGuardada] = await Promise.all([
              fetch(`${API_URL}/api/me-gustas/${cancionId}/estado`, { headers }),
              fetch(`${API_URL}/api/guardadas/${cancionId}/estado`, { headers }),
            ]);
            if (!respuestaMeGusta.ok || !respuestaGuardada.ok) {
              throw new Error('No fue posible consultar Me gusta y Guardadas.');
            }
            const [datosMeGusta, datosGuardada] = await Promise.all([
              respuestaMeGusta.json(),
              respuestaGuardada.json(),
            ]);
            if (activo) {
              setMeGusta(datosMeGusta.meGusta === true);
              setGuardada(datosGuardada.guardada === true);
            }
          } catch (error) {
            console.error('Error al consultar acciones del reproductor:', error);
          } finally {
            if (activo) setCargandoAcciones(false);
          }
        };
        void cargarEstados();
      }
      return () => { activo = false; };
    }, [cancionId])
  );

  const alternarMeGusta = async () => {
    if (!cancionId || bloqueoMeGusta.current || cargandoAcciones) return;
    bloqueoMeGusta.current = true;
    setProcesandoMeGusta(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert('Sesión', 'Inicia sesión para dar Me gusta.');
        return;
      }
      const respuesta = await fetch(`${API_URL}/api/me-gustas/${cancionId}`, {
        method: meGusta ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo actualizar Me gusta.');
      if (cancionId === cancionActual?.id) setMeGusta(datos.meGusta === true);
    } catch (error) {
      Alert.alert('Me gusta', error instanceof Error ? error.message : 'Error de conexión.');
    } finally {
      bloqueoMeGusta.current = false;
      setProcesandoMeGusta(false);
    }
  };

  const alternarGuardada = async () => {
    if (!cancionId || bloqueoGuardada.current || cargandoAcciones) return;
    bloqueoGuardada.current = true;
    setProcesandoGuardada(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert('Sesión', 'Inicia sesión para guardar canciones.');
        return;
      }
      const respuesta = await fetch(`${API_URL}/api/guardadas/${cancionId}`, {
        method: guardada ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo actualizar Guardadas.');
      if (cancionId === cancionActual?.id) setGuardada(datos.guardada === true);
    } catch (error) {
      Alert.alert('Guardadas', error instanceof Error ? error.message : 'Error de conexión.');
    } finally {
      bloqueoGuardada.current = false;
      setProcesandoGuardada(false);
    }
  };

  const compartirCancion = async () => {
    if (!cancionActual) return;
    const enlace = `https://under-music.vercel.app/cancion/${cancionActual.id}`;
const mensaje = `🎵 ¡Escucha "${cancionActual.titulo}" de ${cancionActual.nombreArtista} en UnderMusic!\n\nDescubre música emergente, conoce nuevos artistas y apoya el talento independiente.\n\n🔗 ${enlace}`;
    try {
      await Share.share({ message: mensaje, title: cancionActual.titulo });
    } catch (error) {
      console.error('Error al compartir canción:', error);
      Alert.alert('Compartir canción', 'No fue posible abrir las opciones para compartir.');
    }
  };

  if (!cancionActual) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Pressable
          style={styles.emptyBackButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-down"
            size={30}
            color="#FFFFFF"
          />
        </Pressable>

        <View style={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="musical-notes"
              size={52}
              color="#D783FF"
            />
          </View>

          <Text style={styles.emptyTitle}>
            No hay una canción reproduciéndose
          </Text>

          <Text style={styles.emptyDescription}>
            Elige una canción para comenzar a escucharla.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const uriImagen = cancionActual.portadaId
    ? `${API_URL}/api/canciones/portadas/${cancionActual.portadaId}`
    : cancionActual.fotoArtista
      ? `${API_URL}/api/usuarios/foto-perfil/${cancionActual.fotoArtista}`
      : null;
  const puedeUsarAnterior = posicion >= 5 || tieneAnterior;

const obtenerProgresoDesdePageX = (
  pageX: number
) => {
  const width =
    progressBarWidth.current;

  if (width <= 0) {
    return null;
  }

  const posicionDentroBarra =
    pageX - progressBarX.current;

  return Math.min(
    Math.max(
      posicionDentroBarra / width,
      0
    ),
    1
  );
};

const iniciarArrastre = (
  event: GestureResponderEvent
) => {
  progressBarRef.current?.measure(
    (
      _x,
      _y,
      width,
      _height,
      pageX
    ) => {
      if (width <= 0) {
        return;
      }

      progressBarX.current = pageX;
      progressBarWidth.current = width;

      const nuevoProgreso =
        obtenerProgresoDesdePageX(
          event.nativeEvent.pageX
        );

      if (nuevoProgreso !== null) {
        setProgresoArrastre(
          nuevoProgreso
        );
      }
    }
  );
};

const moverArrastre = (
  event: GestureResponderEvent
) => {
  const nuevoProgreso =
    obtenerProgresoDesdePageX(
      event.nativeEvent.pageX
    );

  if (nuevoProgreso !== null) {
    setProgresoArrastre(
      nuevoProgreso
    );
  }
};

const terminarArrastre = (
  event: GestureResponderEvent
) => {
  const nuevoProgreso =
    obtenerProgresoDesdePageX(
      event.nativeEvent.pageX
    );

  if (
    nuevoProgreso !== null &&
    duracion > 0
  ) {
    buscarPosicion(
      nuevoProgreso * duracion
    );
  }

  setProgresoArrastre(null);
};

const progresoVisible =
  progresoArrastre ?? progreso;
  return (
    <ImageBackground
      source={require('../../assets/images/fondo-app.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView
          style={styles.safeArea}
          edges={['top', 'bottom']}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="chevron-down"
                size={30}
                color="#FFFFFF"
              />
            </Pressable>

            <View style={styles.headerCenter}>
  <View style={styles.headerListening}>
  <Text style={styles.headerLabel}>
    ESCUCHANDO
  </Text>

  <BarrasEscuchando reproduciendo={reproduciendo} />
</View>

  <TextoEscuchando
  titulo={cancionActual.titulo}
  artista={cancionActual.nombreArtista}
  reproduciendo={reproduciendo}
/>
</View>

            <Pressable
              style={styles.headerShareButton}
              onPress={compartirCancion}
              accessibilityRole="button"
              accessibilityLabel={`Compartir ${cancionActual.titulo}`}
            >
              <Ionicons name="share-social-outline" size={24} color="#DDB9FF" />
            </Pressable>
          </View>

          <View style={styles.content}>
            <BordePortadaAnimado reproduciendo={reproduciendo}>
              <View style={styles.coverContainer}>
                {uriImagen ? (
                  <Image
                    source={{ uri: uriImagen }}
                    style={styles.cover}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.coverFallback}>
                    <Ionicons
                      name="musical-notes"
                      size={82}
                      color="#D89BFF"
                    />
                  </View>
                )}
              </View>
            </BordePortadaAnimado>

            <View style={styles.songInfoRow}>
              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={2}>
                  {cancionActual.titulo}
                </Text>
                <Pressable
  disabled={!cancionActual.usuarioId}
  onPress={() => {
    if (!cancionActual.usuarioId) return;

    router.dismissTo({
  pathname: '/artista/[usuarioId]',
  params: {
    usuarioId: cancionActual.usuarioId,
  },
});
  }}
  accessibilityRole="button"
  accessibilityLabel={`Ver perfil de ${cancionActual.nombreArtista}`}
>
  <Text style={styles.artistName} numberOfLines={1}>
    {cancionActual.nombreArtista}
  </Text>
</Pressable>
              </View>
              <View style={styles.songActions}>
                <Pressable
                  style={styles.queueActionButton}
                  onPress={abrirVentanaCola}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir cola de reproducción, ${colaManual.length + colaPendienteAutomatica.length} canciones pendientes`}
                >
                  <Ionicons name="list" size={24} color="#FFC477" />
                  {colaManual.length > 0 && (
                    <View style={styles.queueCountBadge}>
                      <Text style={styles.queueCountText}>{colaManual.length > 99 ? '99+' : colaManual.length}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  style={styles.saveButton}
                  onPress={alternarGuardada}
                  disabled={cargandoAcciones || procesandoGuardada}
                  accessibilityRole="button"
                  accessibilityLabel={guardada ? 'Quitar de Guardadas' : 'Guardar canción'}
                >
                  {cargandoAcciones || procesandoGuardada ? (
                    <ActivityIndicator size="small" color="#54E6FF" />
                  ) : (
                    <Ionicons
                      name={guardada ? 'bookmark' : 'bookmark-outline'}
                      size={24}
                      color={guardada ? '#54E6FF' : '#9FD9E5'}
                    />
                  )}
                </Pressable>
                <Pressable
                  style={styles.likeButton}
                  onPress={alternarMeGusta}
                  disabled={cargandoAcciones || procesandoMeGusta}
                  accessibilityRole="button"
                  accessibilityLabel={meGusta ? 'Quitar Me gusta' : 'Dar Me gusta'}
                >
                  {cargandoAcciones || procesandoMeGusta ? (
                    <ActivityIndicator size="small" color="#FF68B7" />
                  ) : (
                    <Ionicons
                      name={meGusta ? 'heart' : 'heart-outline'}
                      size={25}
                      color={meGusta ? '#FF68B7' : '#E7A1C8'}
                    />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View
  ref={progressBarRef}
  style={styles.progressTouchArea}
  onStartShouldSetResponder={() => true}
  onMoveShouldSetResponder={() => true}
  onResponderGrant={iniciarArrastre}
  onResponderMove={moverArrastre}
  onResponderRelease={terminarArrastre}
  onResponderTerminationRequest={() => false}
  onResponderTerminate={() => {
    setProgresoArrastre(null);
  }}
>
  <View style={styles.progressTrack}>
    <View
      style={[
        styles.progressFill,
        {
          width:
            `${progresoVisible * 100}%`,
        },
      ]}
    />

    <View
      pointerEvents="none"
      style={[
        styles.progressThumb,
        {
          left:
            `${progresoVisible * 100}%`,
        },
      ]}
    />
  </View>
</View>

              <View style={styles.timeRow}>
                <Text style={styles.timeText}>
                  {formatearTiempo(posicion)}
                </Text>

                <Text style={styles.timeText}>
                  {formatearTiempo(duracion)}
                </Text>
              </View>
            </View>

            <View style={styles.controls}>
  <Pressable
    disabled={!puedeUsarAnterior}
    onPress={reproducirAnterior}
    style={({ pressed }) => [
      styles.secondaryControlButton,
      !puedeUsarAnterior &&
        styles.controlButtonDisabled,
      pressed &&
        puedeUsarAnterior &&
        styles.secondaryControlPressed,
    ]}
  >
    <Ionicons
      name="play-skip-back"
      size={32}
      color={
        puedeUsarAnterior
          ? '#FFFFFF'
          : '#5F5966'
      }
    />
  </Pressable>

  <Pressable
    style={({ pressed }) => [
      styles.playButtonOuter,
      pressed &&
        styles.playButtonPressed,
    ]}
    onPress={alternarReproduccion}
  >
    <View style={styles.playButtonInner}>
      <Ionicons
        name={
          reproduciendo
            ? 'pause'
            : 'play'
        }
        size={42}
        color="#FFFFFF"
      />
    </View>
  </Pressable>

  <Pressable
    disabled={!tieneSiguiente}
    onPress={reproducirSiguiente}
    style={({ pressed }) => [
      styles.secondaryControlButton,
      !tieneSiguiente &&
        styles.controlButtonDisabled,
      pressed &&
        tieneSiguiente &&
        styles.secondaryControlPressed,
    ]}
  >
    <Ionicons
      name="play-skip-forward"
      size={32}
      color={
        tieneSiguiente
          ? '#FFFFFF'
          : '#5F5966'
      }
    />
  </Pressable>
</View>

            <Text style={styles.playerHint}>
              La música seguirá reproduciéndose al volver.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  queueActionButton: {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(183,109,28,0.18)', borderWidth: 1, borderColor: 'rgba(232,166,75,0.65)'},
  queueCountBadge: {position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFC477'},
  queueCountText: {color: '#251308', fontSize: 10, fontWeight: '800'},
  queueOverlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)'},
  queuePanel: {height: '72%', backgroundColor: '#160D28', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, borderWidth: 1, borderColor: '#7043A4'},
  queueDragZone: {height: 46, marginTop: -12, marginBottom: 3, alignItems: 'center', justifyContent: 'center'},
  queueDragPill: {width: 48, height: 5, borderRadius: 4, backgroundColor: '#A78DBA'},
  queueHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, paddingTop: 14},
  queueDragHandle: {position: 'absolute', top: -12, alignSelf: 'center', left: '43%', width: '14%', height: 5, borderRadius: 4, backgroundColor: '#8E759F'},
  queueTitle: {color: '#FFFFFF', fontSize: 21, fontWeight: '800'},
  queueSectionLabel: {color: '#BCA8D1', fontSize: 11, fontWeight: '800', letterSpacing: 1},
  queueNow: {color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 22},
  queueSubheader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  queueClear: {color: '#E4A4FF', fontWeight: '700', fontSize: 13},
  queueConfirmOverlay: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 24},
  queueConfirmCard: {width: '100%', maxWidth: 390, backgroundColor: '#1B102D', borderWidth: 1, borderColor: 'rgba(232,166,75,0.55)', borderRadius: 24, padding: 24, alignItems: 'center'},
  queueConfirmIcon: {width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(183,109,28,0.18)', borderWidth: 1, borderColor: 'rgba(232,166,75,0.65)', marginBottom: 16},
  queueConfirmTitle: {color: '#FFFFFF', fontSize: 19, fontWeight: '800', textAlign: 'center'},
  queueConfirmMessage: {color: '#C8BDD4', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, marginBottom: 24},
  queueConfirmActions: {width: '100%', flexDirection: 'row', gap: 10},
  queueConfirmButton: {flex: 1, minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8},
  queueConfirmCancel: {backgroundColor: 'rgba(112,67,164,0.24)', borderWidth: 1, borderColor: 'rgba(180,125,230,0.45)'},
  queueConfirmCancelText: {color: '#E6D7F4', fontWeight: '800', fontSize: 14},
  queueConfirmDelete: {backgroundColor: 'rgba(183,109,28,0.24)', borderWidth: 1, borderColor: 'rgba(232,166,75,0.7)'},
  queueConfirmDeleteText: {color: '#FFC477', fontWeight: '800', fontSize: 14},
  queueList: {flex: 1},
  queueItem: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(180,125,230,0.2)'},
  queueSong: {color: '#FFFFFF', fontWeight: '700', fontSize: 14},
  queueArtist: {color: '#AFA1BF', fontSize: 12, marginTop: 4},
  queueIcon: {padding: 5},
  queueEmpty: {color: '#BCA8D1', fontSize: 14, lineHeight: 21, paddingVertical: 20},
  queueGroupLabel: {color: '#D2B4F1', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 14, marginBottom: 6},
  queueFootnote: {color: '#9386A4', fontSize: 12, lineHeight: 18, marginTop: 20},
  background: {
    flex: 1,
    backgroundColor: '#020106',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 1, 6, 0.36)',
  },

  safeArea: {
    flex: 1,
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 12, 39, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(180, 89, 245, 0.38)',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },

headerListening: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

barrasEscuchando: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
  height: 14,
},

barraEscuchando: {
  width: 3,
  height: 5,
  borderRadius: 3,
},

degradadoBarra: {
  width: '100%',
  height: '100%',
  borderRadius: 3,
},

  headerLabel: {
    color: '#C4BCCB',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },

  headerArtist: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
    maxWidth: '90%',
  },

  headerShareButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120, 66, 175, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(190, 129, 255, 0.45)',
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingTop: 18,
    paddingBottom: 24,
    justifyContent: 'center',
  },

  coverGlow: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 480,
    alignSelf: 'center',
    padding: 3,
    borderRadius: 32,
    backgroundColor: 'rgba(152, 61, 232, 0.72)',
    overflow: 'hidden',
  },

  coverBorderLight: {
    position: 'absolute',
    width: '220%',
    height: '220%',
    left: '-60%',
    top: '-60%',
  },

  coverContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 29,
    backgroundColor: '#120B20',
  },

  cover: {
    width: '100%',
    height: '100%',
  },

  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 31, 111, 0.55)',
  },

  songInfoRow: {
    width: '100%',
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  songInfo: {
    flex: 1,
    minWidth: 0,
  },

  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  saveButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24, 119, 143, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(84, 230, 255, 0.45)',
  },

  likeButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(145, 35, 100, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 104, 183, 0.45)',
  },

  songTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },

  artistName: {
    color: '#B6ADBF',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 7,
  },

  progressSection: {
    width: '100%',
    marginTop: 30,
  },

  progressTouchArea: {
  width: '100%',
  minHeight: 28,
  justifyContent: 'center',
},

  progressTrack: {
  width: '100%',
  height: 5,
  borderRadius: 3,
  backgroundColor:
    'rgba(255, 255, 255, 0.16)',
},

  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#C95BFF',
  },

progressThumb: {
  position: 'absolute',
  top: -5,
  width: 15,
  height: 15,
  marginLeft: -7.5,
  borderRadius: 8,
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#C95BFF',
},

  timeRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  timeText: {
    color: '#9E96A7',
    fontSize: 12,
    fontWeight: '600',
  },

  controls: {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 34,
  marginTop: 25,
},

secondaryControlButton: {
  width: 58,
  height: 58,
  borderRadius: 29,
  alignItems: 'center',
  justifyContent: 'center',
},

secondaryControlPressed: {
  opacity: 0.65,
  transform: [{ scale: 0.94 }],
},

controlButtonDisabled: {
  opacity: 0.38,
},

  playButtonOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198, 75, 255, 0.52)',
    borderWidth: 1,
    borderColor: 'rgba(231, 150, 255, 0.70)',
  },

  playButtonInner: {
    flex: 1,
    width: '100%',
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#783BC2',
  },

  playButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },

  playerHint: {
    color: '#756E7E',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 18,
  },

  emptyContainer: {
    flex: 1,
    backgroundColor: '#020106',
  },

  emptyBackButton: {
    width: 48,
    height: 48,
    marginTop: 10,
    marginLeft: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 12, 39, 0.82)',
  },

  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
  },

  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(104, 40, 156, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(195, 90, 255, 0.38)',
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 24,
  },

  emptyDescription: {
    color: '#9F97A8',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
  },
});
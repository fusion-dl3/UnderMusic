import {
  useRef,
  useState,
} from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  GestureResponderEvent,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlayer } from '@/context/PlayerContext';

const API_URL = 'http://192.168.1.14:3000';

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

export default function ReproductorScreen() {
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
  cola,
  reproduciendo,
  posicion,
  duracion,
  progreso,
  alternarReproduccion,
  buscarPosicion,
  reproducirAnterior,
  reproducirSiguiente,
} = usePlayer();

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
  const indiceActual = cola.findIndex(
  (cancion) =>
    cancion.id === cancionActual.id
);

const tieneAnterior =
  indiceActual > 0;

const tieneSiguiente =
  indiceActual >= 0 &&
  indiceActual < cola.length - 1;

const puedeUsarAnterior =
  posicion >= 5 || tieneAnterior;

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
              <Text style={styles.headerLabel}>
                REPRODUCIENDO
              </Text>

              <Text
                style={styles.headerArtist}
                numberOfLines={1}
              >
                {cancionActual.nombreArtista}
              </Text>
            </View>

            <View style={styles.headerSpace} />
          </View>

          <View style={styles.content}>
            <View style={styles.coverGlow}>
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
            </View>

            <View style={styles.songInfo}>
              <Text
                style={styles.songTitle}
                numberOfLines={2}
              >
                {cancionActual.titulo}
              </Text>

              <Text
                style={styles.artistName}
                numberOfLines={1}
              >
                {cancionActual.nombreArtista}
              </Text>
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

  headerSpace: {
    width: 48,
    height: 48,
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

  songInfo: {
    width: '100%',
    marginTop: 28,
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
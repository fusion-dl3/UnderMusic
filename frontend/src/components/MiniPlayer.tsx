import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { usePlayer } from '@/context/PlayerContext';

const API_URL = 'http://192.168.1.14:3000';

export function MiniPlayer() {
  const {
    cancionActual,
    reproduciendo,
    progreso,
    alternarReproduccion,
    cerrarReproductor,
  } = usePlayer();

  if (!cancionActual) {
    return null;
  }

  const uriImagen = cancionActual.portadaId
    ? `${API_URL}/api/canciones/portadas/${cancionActual.portadaId}`
    : cancionActual.fotoArtista
      ? `${API_URL}/api/usuarios/foto-perfil/${cancionActual.fotoArtista}`
      : null;

  const abrirReproductor = () => {
    router.push('/reproductor');
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.content}
        onPress={abrirReproductor}
      >
        {uriImagen ? (
          <Image
            source={{ uri: uriImagen }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverFallback}>
            <Ionicons
              name="musical-note"
              size={22}
              color="#D89BFF"
            />
          </View>
        )}

        <View style={styles.info}>
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {cancionActual.titulo}
          </Text>

          <Text
            style={styles.artist}
            numberOfLines={1}
          >
            {cancionActual.nombreArtista}
          </Text>
        </View>

        <Pressable
          style={styles.playButton}
          onPress={(event) => {
            event.stopPropagation();
            alternarReproduccion();
          }}
        >
          <Ionicons
            name={
              reproduciendo
                ? 'pause'
                : 'play'
            }
            size={21}
            color="#FFFFFF"
          />
        </Pressable>
        <Pressable
  style={styles.closeButton}
  onPress={(event) => {
    event.stopPropagation();
    cerrarReproductor();
  }}
  hitSlop={8}
>
  <Ionicons
    name="close"
    size={20}
    color="#BDB6C5"
  />
</Pressable>
      </Pressable>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progreso * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#0C071C',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 83, 232, 0.38)',
  },

  content: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cover: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1A102A',
  },

  coverFallback: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(112, 48, 161, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(185, 103, 241, 0.35)',
  },

  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  artist: {
    color: '#A9A2B2',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },

  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(137, 63, 209, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(214, 151, 255, 0.48)',
  },

  closeButton: {
  width: 34,
  height: 40,
  marginLeft: 5,
  alignItems: 'center',
  justifyContent: 'center',
},

  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#C95BFF',
  },
});
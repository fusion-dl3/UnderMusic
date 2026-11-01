import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { usePlayer } from '@/context/PlayerContext';
import { avisarCambioBiblioteca } from '@/context/BibliotecaEventos';

const API_URL = 'http://192.168.1.5:3000';

export function MiniPlayer() {
  const {
    cancionActual,
    reproduciendo,
    progreso,
    alternarReproduccion,
    reproducirAnterior,
    reproducirSiguiente,
    cerrarReproductor,
    tieneAnterior,
    tieneSiguiente,
    abrirVentanaCola,
  } = usePlayer();

  const cancionId = cancionActual?.id ?? null;
  const [meGusta, setMeGusta] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<'me-gustas' | 'guardadas' | null>(null);
  const bloqueo = useRef(false);

  // Recargar al cambiar de canción y al volver desde el reproductor grande.
  useFocusEffect(useCallback(() => {
    let activo = true;
    setMeGusta(false);
    setGuardada(false);
    setCargando(Boolean(cancionId));
    if (cancionId) {
      void (async () => {
        try {
          const token = await SecureStore.getItemAsync('token');
          if (!token) return;
          const headers = { Authorization: `Bearer ${token}` };
          const [like, save] = await Promise.all([
            fetch(`${API_URL}/api/me-gustas/${cancionId}/estado`, { headers }),
            fetch(`${API_URL}/api/guardadas/${cancionId}/estado`, { headers }),
          ]);
          if (!like.ok || !save.ok) throw new Error('No se pudieron consultar las interacciones.');
          const [l, g] = await Promise.all([like.json(), save.json()]);
          if (activo) { setMeGusta(l.meGusta === true); setGuardada(g.guardada === true); }
        } catch (error) { console.warn('MiniPlayer: error al cargar interacciones', error); }
        finally { if (activo) setCargando(false); }
      })();
    }
    return () => { activo = false; };
  }, [cancionId]));

  const alternarInteraccion = async (tipo: 'me-gustas' | 'guardadas') => {
    if (!cancionId || cargando || bloqueo.current) return;
    bloqueo.current = true;
    setProcesando(tipo);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) { Alert.alert('Sesión', 'Inicia sesión para continuar.'); return; }
      const activo = tipo === 'me-gustas' ? meGusta : guardada;
      const respuesta = await fetch(`${API_URL}/api/${tipo}/${cancionId}`, {
        method: activo ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo actualizar la canción.');
      if (tipo === 'me-gustas') setMeGusta(datos.meGusta === true);
      else setGuardada(datos.guardada === true);
      avisarCambioBiblioteca(tipo, cancionId);
    } catch (error) {
      Alert.alert('UnderMusic', error instanceof Error ? error.message : 'Error de conexión.');
    } finally { bloqueo.current = false; setProcesando(null); }
  };

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

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionButton, styles.queueButton]}
          accessibilityRole="button"
          accessibilityLabel="Abrir cola de reproducción"
          onPress={(event) => { event.stopPropagation(); abrirVentanaCola(); }}
        >
          <Ionicons name="list-outline" size={19} color="#FFC477" />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.saveButton]}
          accessibilityRole="button"
          accessibilityLabel={guardada ? 'Quitar de Guardadas' : 'Guardar canción'}
          disabled={cargando || procesando !== null}
          onPress={(event) => { event.stopPropagation(); void alternarInteraccion('guardadas'); }}
        >
          {procesando === 'guardadas' ? <ActivityIndicator size="small" color="#54E6FF" /> :
            <Ionicons name={guardada ? 'bookmark' : 'bookmark-outline'} size={19} color={guardada ? '#54E6FF' : '#9FD9E5'} />}
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.likeButton]}
          accessibilityRole="button"
          accessibilityLabel={meGusta ? 'Quitar Me gusta' : 'Dar Me gusta'}
          disabled={cargando || procesando !== null}
          onPress={(event) => { event.stopPropagation(); void alternarInteraccion('me-gustas'); }}
        >
          {procesando === 'me-gustas' ? <ActivityIndicator size="small" color="#FF68B7" /> :
            <Ionicons name={meGusta ? 'heart' : 'heart-outline'} size={20} color={meGusta ? '#FF68B7' : '#E7A1C8'} />}
        </Pressable>
      </View>

        <View style={{ flex: 1 }} pointerEvents="none" />
        <View style={styles.controls}>
          <Pressable
            style={styles.secondaryButton}
            onPress={(event) => {
              event.stopPropagation();
              reproducirAnterior();
            }}
            hitSlop={4}
            disabled={!tieneAnterior}
          >
            <Ionicons
              name="play-skip-back"
              size={18}
              color="#FFFFFF"
            />
          </Pressable>

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
            style={styles.secondaryButton}
            onPress={(event) => {
              event.stopPropagation();
              reproducirSiguiente();
            }}
            hitSlop={4}
            disabled={!tieneSiguiente}
          >
            <Ionicons
              name="play-skip-forward"
              size={18}
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
        </View>
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
    borderBottomColor:
      'rgba(168, 83, 232, 0.38)',
  },

  content: {
    minHeight: 66,
    paddingHorizontal: 10,
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
    backgroundColor:
      'rgba(112, 48, 161, 0.25)',
    borderWidth: 1,
    borderColor:
      'rgba(185, 103, 241, 0.35)',
  },

  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
    maxWidth: '30%',
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

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  secondaryButton: {
    width: 32,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(137, 63, 209, 0.72)',
    borderWidth: 1,
    borderColor:
      'rgba(214, 151, 255, 0.48)',
  },

  closeButton: {
    width: 30,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginRight: 0,
    flexShrink: 0,
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -62 }, { translateY: -8 }],
    zIndex: 2,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 18,
  },
  queueButton: { backgroundColor: 'rgba(183,109,28,0.18)', borderColor: 'rgba(232,166,75,0.65)' },
  saveButton: { backgroundColor: 'rgba(48,129,150,0.16)', borderColor: 'rgba(100,191,215,0.48)' },
  likeButton: { backgroundColor: 'rgba(165,58,112,0.16)', borderColor: 'rgba(225,124,177,0.48)' },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor:
      'rgba(255, 255, 255, 0.10)',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#C95BFF',
  },
});
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import {
  CancionReproductor,
  usePlayer,
} from '@/context/PlayerContext';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
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
};

export default function PerfilScreen() {
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
  const [cantidadSeguidores, setCantidadSeguidores] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      cargarPerfil();
    }, [])
  );

  const cargarPerfil = async () => {
    try {
      setCargando(true);
      setError('');
      setCantidadSeguidores(null);

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

        // El mismo endpoint que utiliza el perfil público para el contador.
        // Si falla, no interrumpimos la carga del perfil ni de las canciones.
        try {
          const respuestaSeguidores = await fetch(
            `http://192.168.1.5:3000/api/seguimientos/artistas/${usuarioCargado.id}/estado`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (respuestaSeguidores.ok) {
            const datosSeguidores = await respuestaSeguidores.json();
            if (
              typeof datosSeguidores.cantidadSeguidores === 'number' &&
              Number.isFinite(datosSeguidores.cantidadSeguidores)
            ) {
              setCantidadSeguidores(datosSeguidores.cantidadSeguidores);
            }
          } else {
            console.warn('No fue posible cargar el contador de seguidores.');
          }
        } catch (errorSeguidores) {
          console.warn('Error al consultar seguidores:', errorSeguidores);
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
      } else {
        setPerfilArtista(null);
        setCantidadSeguidores(null);
        setCanciones([]);
      }
    } catch (error) {
      console.error('Error al cargar el perfil:', error);

      setError('No fue posible conectar con UnderMusic.');
    } finally {
      setCargando(false);
    }
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

              {esArtista && cantidadSeguidores !== null ? (
                <View style={styles.followersContainer}>
                  <Ionicons name="people-outline" size={23} color="#D66BFF" />
                  <Text style={styles.followersLabel}>
                    {cantidadSeguidores}{' '}
                    {cantidadSeguidores === 1 ? 'seguidor' : 'seguidores'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

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
                              style={styles.songCover}
                              resizeMode="cover"
                            />
                          ) : usuario.fotoPerfil ? (
                            <Image
                              source={{
                                uri: `http://192.168.1.5:3000/api/usuarios/foto-perfil/${usuario.fotoPerfil}`,
                              }}
                              style={styles.songCover}
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

                          <View style={styles.songInfo}>
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

                          <Pressable
                            style={styles.songPlayButton}
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
      </SafeAreaView>
    </ImageBackground>
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

  avatarBorder: {
    width: 170,
    height: 170,
    borderRadius: 43,
    padding: 3,
    backgroundColor: '#7C39FF',
    marginBottom: 18,
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

songPlayButton: {
  width: 42,
  height: 42,
  borderRadius: 21,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(137, 63, 209, 0.72)',
  borderWidth: 1,
  borderColor: 'rgba(214, 151, 255, 0.55)',
},

  songInfo: {
    flex: 1,
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
});
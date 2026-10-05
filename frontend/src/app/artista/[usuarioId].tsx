import { Ionicons } from '@expo/vector-icons';
import { MiniPlayer } from '@/components/MiniPlayer';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

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
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://192.168.1.14:3000';

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

export default function PerfilArtistaPublicoScreen() {
  const { usuarioId } = useLocalSearchParams<{
    usuarioId: string;
  }>();

  const {
    cancionActual,
    reproduciendo,
    reproducirCancion,
    alternarReproduccion,
  } = usePlayer();

  const [artista, setArtista] =
    useState<ArtistaPublico | null>(null);

  const [canciones, setCanciones] =
    useState<Cancion[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState('');

    const [abriendoReproductor, setAbriendoReproductor] =
  useState(false);

  useFocusEffect(
  useCallback(() => {
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
  }, [usuarioId]);

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

  const reproducir = (
    cancion: Cancion
  ) => {
    if (!cancion.audioId || !artista) {
      return;
    }

    const esCancionActual =
      cancionActual?.id === cancion.id;

    if (esCancionActual) {
      alternarReproduccion();
      return;
    }

    const colaReproductor:
      CancionReproductor[] = canciones
        .filter(
          (item) =>
            item.audioId !== null
        )
        .map((item) => ({
          id: item.id,
          audioId: item.audioId as string,
          titulo: item.titulo,
          nombreArtista:
            artista.nombreArtistico ||
            artista.nombreUsuario,
          portadaId: item.portadaId,
          fotoArtista:
            artista.fotoPerfil || null,
        }));

    const cancionParaReproductor =
      colaReproductor.find(
        (item) =>
          item.id === cancion.id
      );

    if (!cancionParaReproductor) {
      return;
    }

   setAbriendoReproductor(true);

reproducirCancion(
  cancionParaReproductor,
  colaReproductor
);

router.push('/reproductor');

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
  {!abriendoReproductor ? (
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
        Perfil del artista
      </Text>

      <View style={styles.headerSpacer} />
    </View>

          <View
            style={styles.profileSection}
          >
            <View
              style={styles.avatarBorder}
            >
              <View style={styles.avatar}>
                {artista.fotoPerfil ? (
                  <Image
                    source={{
                      uri:
                        `${API_URL}/api/usuarios/` +
                        `foto-perfil/${artista.fotoPerfil}`,
                    }}
                    style={
                      styles.avatarImage
                    }
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

            <View
              style={styles.roleBadge}
            >
              <Text
                style={styles.roleText}
              >
                ARTISTA
              </Text>
            </View>

            <View
              style={styles.locationRow}
            >
              <Ionicons
                name="location-outline"
                size={27}
                color="#54E6FF"
              />

              <Text
                style={styles.locationText}
              >
                {artista.ubicacion.comuna},{' '}
                {artista.ubicacion.region}
              </Text>
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

              {canciones.length > 0 ? (
                <View
                  style={styles.songsList}
                >
                  {canciones.map(
                    (cancion) => (
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

                        <Pressable
                          style={
                            styles.songPlayButton
                          }
                          disabled={
                            !cancion.audioId
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
                      </Pressable>
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

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingHorizontal: 15,
  },

  locationText: {
    flexShrink: 1,
    color: '#D7D1DE',
    fontSize: 17,
    marginLeft: 8,
    textAlign: 'center',
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

  songPlayButton: {
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
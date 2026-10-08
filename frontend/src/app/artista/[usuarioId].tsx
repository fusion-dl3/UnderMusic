import { Ionicons } from '@expo/vector-icons';
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
  Alert,
  Image,
  ImageBackground,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const [avisoSeguimiento, setAvisoSeguimiento] = useState<{ mensaje: string; siguiendo: boolean } | null>(null);
  const temporizadorAviso = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizadorAviso.current) clearTimeout(temporizadorAviso.current);
    };
  }, []);

  const mostrarAvisoSeguimiento = (nuevoEstado: boolean) => {
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

  const [siguiendo, setSiguiendo] = useState(false);
  const [cantidadSeguidores, setCantidadSeguidores] = useState<number | null>(null);
  const [cargandoSeguimiento, setCargandoSeguimiento] = useState(true);
  const [procesandoSeguimiento, setProcesandoSeguimiento] = useState(false);
  const [errorSeguimiento, setErrorSeguimiento] = useState('');
  const [contactoVisible, setContactoVisible] = useState(false);
  const [avisoAutoSeguimientoVisible, setAvisoAutoSeguimientoVisible] = useState(false);

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
    cargarEstadoSeguimiento();
  }, [usuarioId]);

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

  const reproducir = (
    cancion: Cancion
  ) => {
    if (esVistaPrevia || !cancion.audioId || !artista) {
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
                <Ionicons name="location-outline" size={22} color="#54E6FF" />
                <Text style={styles.locationText}>
                  {artista.ubicacion.comuna}, {artista.ubicacion.region}
                </Text>
              </View>
              <View style={styles.followersRow}>
                <Ionicons name="people-outline" size={21} color="#E05BFF" />
                <Text style={styles.followCount}>
                  {cantidadSeguidores === null ? '—' : cantidadSeguidores}{' '}
                  {cantidadSeguidores === 1 ? 'seguidor' : 'seguidores'}
                </Text>
              </View>
            </View>

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
    if (!esVistaPrevia && cancionActual?.id === cancion.id) {
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
       {avisoSeguimiento ? (
        <View pointerEvents="box-none" style={[styles.toastLayer, { top: insets.top + 12 }]}>
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
    maxWidth: '100%',
  },
  locationText: {
    flexShrink: 1,
    color: '#D7D1DE',
    fontSize: 15,
    marginLeft: 6,
    textAlign: 'center',
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
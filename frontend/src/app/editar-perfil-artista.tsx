import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GENEROS_MUSICALES,
  GeneroMusical,
} from '../constants/generos';

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

function validarContacto(campo: 'correoContacto' | 'instagram' | 'facebook' | 'twitter', valor: string): string {
  const texto = valor.trim();
  if (!texto) return '';
  if (campo === 'correoContacto') {
    return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(texto) && texto.length <= 254
      ? '' : 'Ingresa un correo electrónico con formato válido.';
  }
  if (texto.length > 500 || !/^https:\/\//i.test(texto)) {
    return 'Pega la URL completa que comienza con https://';
  }
  try {
    const url = new URL(texto);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) {
      return 'Ingresa un enlace HTTPS válido del perfil.';
    }
    const dominio = url.hostname.toLowerCase();
    const segmentos = url.pathname.split('/').filter(Boolean);
    const usuarioValido = (nombre: string) => /^[a-zA-Z0-9._-]{1,100}$/.test(nombre);
    if (campo === 'instagram') {
      if (!['instagram.com', 'www.instagram.com'].includes(dominio) ||
          segmentos.length !== 1 || !/^[a-zA-Z0-9._]{1,30}$/.test(segmentos[0]) ||
          ['p', 'reel', 'reels', 'stories', 'explore', 'direct', 'accounts'].includes(segmentos[0].toLowerCase())) {
        return 'Pega una URL de perfil de Instagram, por ejemplo https://www.instagram.com/usuario/';
      }
    } else if (campo === 'facebook') {
      if (!['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'www.fb.com'].includes(dominio) ||
          !((segmentos.length === 1 && segmentos[0].toLowerCase() === 'profile.php' && /^\d+$/.test(url.searchParams.get('id') || '')) ||
            (segmentos.length === 1 && usuarioValido(segmentos[0]) && !['watch', 'reel', 'reels', 'share', 'groups', 'events', 'marketplace'].includes(segmentos[0].toLowerCase())))) {
        return 'Pega una URL de perfil o página de Facebook.';
      }
    } else if (campo === 'twitter') {
      if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(dominio) ||
          segmentos.length !== 1 || !/^[a-zA-Z0-9_]{1,15}$/.test(segmentos[0]) ||
          ['home', 'explore', 'search', 'settings', 'messages', 'notifications', 'compose'].includes(segmentos[0].toLowerCase())) {
        return 'Pega una URL de perfil de X (Twitter), por ejemplo https://x.com/usuario';
      }
    }
    return '';
  } catch {
    return 'La URL ingresada no es válida.';
  }
}

export default function EditarPerfilArtistaScreen() {
  const [perfilArtistaOriginal, setPerfilArtistaOriginal] =
    useState<PerfilArtista | null>(null);

  const [nombreArtistico, setNombreArtistico] = useState('');
  const [biografia, setBiografia] = useState('');
  const [generoPrincipal, setGeneroPrincipal] = useState('');
  const [generosAdicionales, setGenerosAdicionales] =
    useState<string[]>([]);

  const [correoContacto, setCorreoContacto] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [contactosVisitados, setContactosVisitados] = useState<string[]>([]);
  const [validacionIntentada, setValidacionIntentada] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [errorCarga, setErrorCarga] = useState('');
  const [errorGuardado, setErrorGuardado] = useState('');

  const [
    mostrarGenerosPrincipales,
    setMostrarGenerosPrincipales,
  ] = useState(false);

  const [modalSalirVisible, setModalSalirVisible] =
    useState(false);

  useEffect(() => {
    cargarPerfilArtista();
  }, []);

  const crearPerfilVacio = (): PerfilArtista => ({
    id: '',
    usuarioId: '',
    nombreArtistico: '',
    biografia: '',
    generoPrincipal: '',
    generosAdicionales: [],
    correoContacto: '',
    instagram: '',
    facebook: '',
    twitter: '',
    perfilCompleto: false,
  });

  const aplicarPerfilAlFormulario = (
    perfil: PerfilArtista
  ) => {
    setNombreArtistico(perfil.nombreArtistico || '');
    setBiografia(perfil.biografia || '');
    setGeneroPrincipal(perfil.generoPrincipal || '');
    setGenerosAdicionales(
      perfil.generosAdicionales || []
    );

    setCorreoContacto(perfil.correoContacto || '');
    setInstagram(perfil.instagram || '');
    setFacebook(perfil.facebook || '');
    setTwitter(perfil.twitter || '');
  };

  const cargarPerfilArtista = async () => {
    try {
      setCargando(true);
      setErrorCarga('');

      const token =
        await SecureStore.getItemAsync('token');

      if (!token) {
        setErrorCarga(
          'No encontramos una sesión activa.'
        );
        return;
      }

      const respuesta = await fetch(
        'http://192.168.1.13:3000/api/perfiles-artista/me',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setErrorCarga(
          datos.message ||
            'No fue posible cargar tu perfil artístico.'
        );
        return;
      }

      const perfil: PerfilArtista =
        datos.perfilArtista || crearPerfilVacio();

      setPerfilArtistaOriginal(perfil);
      aplicarPerfilAlFormulario(perfil);
    } catch (error) {
      console.error(
        'Error al cargar perfil artístico:',
        error
      );

      setErrorCarga(
        'No fue posible conectar con UnderMusic.'
      );
    } finally {
      setCargando(false);
    }
  };

  const hayCambios = useMemo(() => {
    if (!perfilArtistaOriginal) {
      return false;
    }

    const generosOriginales =
      perfilArtistaOriginal.generosAdicionales || [];

    const mismosGeneros =
      generosAdicionales.length ===
        generosOriginales.length &&
      generosAdicionales.every((genero) =>
        generosOriginales.includes(genero)
      );

    return (
      nombreArtistico !==
        perfilArtistaOriginal.nombreArtistico ||
      biografia !== perfilArtistaOriginal.biografia ||
      generoPrincipal !==
        perfilArtistaOriginal.generoPrincipal ||
      !mismosGeneros ||
      correoContacto !==
        perfilArtistaOriginal.correoContacto ||
      instagram !== perfilArtistaOriginal.instagram ||
      facebook !== perfilArtistaOriginal.facebook ||
      twitter !== perfilArtistaOriginal.twitter
    );
  }, [
    perfilArtistaOriginal,
    nombreArtistico,
    biografia,
    generoPrincipal,
    generosAdicionales,
    correoContacto,
    instagram,
    facebook,
    twitter,
  ]);

  const [salidaAutorizada, setSalidaAutorizada] = useState(false);
  const [salidaPendiente, setSalidaPendiente] = useState(false);
  const accionPendiente = useRef<any>(null);
  const navegacion = useNavigation();
  // Intercepta la salida sin importar el origen de la acción de navegación.
  // La suscripción se desactiva después de que el usuario confirma el descarte.
  useEffect(() => {
    if (!hayCambios || salidaAutorizada) return;
    const desuscribir = navegacion.addListener('beforeRemove', (evento: any) => {
      if (guardando) {
        evento.preventDefault();
        return;
      }
      evento.preventDefault();
      accionPendiente.current = evento.data.action;
      setModalSalirVisible(true);
    });
    return desuscribir;
  }, [navegacion, hayCambios, salidaAutorizada, guardando]);
  useEffect(() => {
    if (!salidaAutorizada || !salidaPendiente) return;
    setSalidaPendiente(false);
    const accion = accionPendiente.current;
    accionPendiente.current = null;
    if (accion) navegacion.dispatch(accion);
    else router.back();
  }, [salidaAutorizada, salidaPendiente, navegacion]);

  const intentarSalir = () => {
    if (!hayCambios) {
      router.back();
      return;
    }

    setModalSalirVisible(true);
  };

  const seguirEditando = () => {
    setModalSalirVisible(false);
  };

  const descartarCambios = () => {
    // Primero retiramos el bloqueo de navegación; el efecto de salida
    // ejecutará la acción original (Android o flecha superior) después.
    setModalSalirVisible(false);
    setSalidaAutorizada(true);
    setSalidaPendiente(true);
  };

  const generosDisponiblesComoAdicionales =
    useMemo(
      () =>
        GENEROS_MUSICALES.filter(
          (genero) => genero !== generoPrincipal
        ),
      [generoPrincipal]
    );

  const seleccionarGeneroPrincipal = (
    genero: GeneroMusical
  ) => {
    setGeneroPrincipal(genero);

    setGenerosAdicionales((actuales) =>
      actuales.filter(
        (generoAdicional) =>
          generoAdicional !== genero
      )
    );

    setMostrarGenerosPrincipales(false);
    setErrorGuardado('');
  };

  const alternarGeneroAdicional = (
    genero: GeneroMusical
  ) => {
    setErrorGuardado('');

    setGenerosAdicionales((actuales) => {
      if (actuales.includes(genero)) {
        return actuales.filter(
          (generoActual) =>
            generoActual !== genero
        );
      }

      if (actuales.length >= 3) {
        setErrorGuardado(
          'Puedes seleccionar como máximo 3 géneros adicionales.'
        );

        return actuales;
      }

      return [...actuales, genero];
    });
  };

  const erroresContacto = {
    correoContacto: validarContacto('correoContacto', correoContacto),
    instagram: validarContacto('instagram', instagram),
    facebook: validarContacto('facebook', facebook),
    twitter: validarContacto('twitter', twitter),
  };

  const mostrarErrorContacto = (campo: keyof typeof erroresContacto) =>
    (validacionIntentada || contactosVisitados.includes(campo)) && !!erroresContacto[campo];

  const guardarPerfilArtista = async () => {
    if (!hayCambios || guardando) {
      return;
    }

    setValidacionIntentada(true);
    const primerError = Object.values(erroresContacto).find(Boolean);
    if (primerError) {
      setErrorGuardado('Corrige los métodos de contacto marcados antes de guardar.');
      return;
    }

    try {
      setGuardando(true);
      setErrorGuardado('');

      const token =
        await SecureStore.getItemAsync('token');

      if (!token) {
        setErrorGuardado(
          'No encontramos una sesión activa.'
        );
        return;
      }

      const respuesta = await fetch(
        'http://192.168.1.13:3000/api/perfiles-artista/me',
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombreArtistico,
            biografia,
            generoPrincipal,
            generosAdicionales,
            correoContacto,
            instagram,
            facebook,
            twitter,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setErrorGuardado(
          datos.message ||
            'No fue posible guardar el perfil artístico.'
        );
        return;
      }

      const perfilActualizado: PerfilArtista =
        datos.perfilArtista;

      setPerfilArtistaOriginal(perfilActualizado);
      aplicarPerfilAlFormulario(perfilActualizado);

      setSalidaAutorizada(true);
      setSalidaPendiente(true);
    } catch (error) {
      console.error(
        'Error al guardar perfil artístico:',
        error
      );

      setErrorGuardado(
        'No fue posible conectar con UnderMusic.'
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color="#B64DFF"
        />

        <Text style={styles.loadingText}>
          Cargando perfil artístico...
        </Text>
      </View>
    );
  }

  if (errorCarga || !perfilArtistaOriginal) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color="#FF5FA2"
        />

        <Text style={styles.errorText}>
          {errorCarga ||
            'No fue posible cargar tu perfil artístico.'}
        </Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/fondo-app.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <ScrollView
            contentContainerStyle={
              styles.scrollContent
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Pressable
                onPress={intentarSalir}
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

              <View
                style={
                  styles.headerTextContainer
                }
              >
                <Text style={styles.headerTitle}>
                  Editar perfil artístico
                </Text>

                <Text
                  style={styles.headerSubtitle}
                >
                  Personaliza cómo te presentas como
                  artista.
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="person-outline"
                  size={23}
                  color="#D66BFF"
                />

                <Text style={styles.sectionTitle}>
                  Identidad artística
                </Text>
              </View>

              <Text style={styles.fieldLabel}>
                Nombre artístico *
              </Text>

              <TextInput
                value={nombreArtistico}
                onChangeText={(texto) => {
                  setNombreArtistico(texto);
                  setErrorGuardado('');
                }}
                placeholder="Ej: Luna Nocturna"
                placeholderTextColor="#716B79"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>
                Biografía *
              </Text>

              <TextInput
                value={biografia}
                onChangeText={(texto) => {
                  setBiografia(texto);
                  setErrorGuardado('');
                }}
                placeholder="Cuéntale a otros usuarios sobre tu proyecto musical..."
                placeholderTextColor="#716B79"
                style={[
                  styles.input,
                  styles.biographyInput,
                ]}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />

              <Text
                style={styles.characterCounter}
              >
                {biografia.length}/500
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="musical-notes-outline"
                  size={23}
                  color="#55DFFF"
                />

                <Text style={styles.sectionTitle}>
                  Géneros artísticos
                </Text>
              </View>

              <Text style={styles.fieldLabel}>
                Género principal *
              </Text>

              <Pressable
                onPress={() =>
                  setMostrarGenerosPrincipales(
                    (actual) => !actual
                  )
                }
                style={({ pressed }) => [
                  styles.selector,
                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !generoPrincipal &&
                      styles.selectorPlaceholder,
                  ]}
                >
                  {generoPrincipal ||
                    'Selecciona tu género principal'}
                </Text>

                <Ionicons
                  name={
                    mostrarGenerosPrincipales
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={21}
                  color="#C987FF"
                />
              </Pressable>

              {mostrarGenerosPrincipales && (
                <View style={styles.genrePanel}>
                  {GENEROS_MUSICALES.map(
                    (genero) => {
                      const seleccionado =
                        generoPrincipal === genero;

                      return (
                        <Pressable
                          key={genero}
                          onPress={() =>
                            seleccionarGeneroPrincipal(
                              genero
                            )
                          }
                          style={[
                            styles.genreOption,
                            seleccionado &&
                              styles.genreOptionSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.genreOptionText,
                              seleccionado &&
                                styles.genreOptionTextSelected,
                            ]}
                          >
                            {genero}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>
              )}

              <Text
                style={styles.additionalTitle}
              >
                Géneros adicionales
              </Text>

              <Text style={styles.helperText}>
                Puedes seleccionar hasta 3. Son
                opcionales.
              </Text>

              <View
                style={
                  styles.genreChipsContainer
                }
              >
                {generosDisponiblesComoAdicionales.map(
                  (genero) => {
                    const seleccionado =
                      generosAdicionales.includes(
                        genero
                      );

                    return (
                      <Pressable
                        key={genero}
                        onPress={() =>
                          alternarGeneroAdicional(
                            genero
                          )
                        }
                        style={[
                          styles.genreChip,
                          seleccionado &&
                            styles.genreChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.genreChipText,
                            seleccionado &&
                              styles.genreChipTextSelected,
                          ]}
                        >
                          {genero}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>

              <Text style={styles.selectedCount}>
                {generosAdicionales.length}/3
                {' '}seleccionados
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="share-social-outline"
                  size={23}
                  color="#FF67BB"
                />

                <Text style={styles.sectionTitle}>
                  Contacto y redes
                </Text>
              </View>

              <Text
                style={
                  styles.optionalDescription
                }
              >
                Estos datos son opcionales y podrán
                mostrarse públicamente en tu perfil
                artístico. Para las redes sociales, pega
                el enlace completo de tu perfil (https://).
              </Text>

              <Text style={styles.fieldLabel}>
                Correo de contacto
              </Text>

              <TextInput
                value={correoContacto}
                onBlur={() => setContactosVisitados((actuales) => [...new Set([...actuales, 'correoContacto'])])}
                onChangeText={(texto) => {
                  setCorreoContacto(texto);
                  setErrorGuardado('');
                }}
                placeholder="contacto@ejemplo.com"
                placeholderTextColor="#716B79"
                style={[styles.input, mostrarErrorContacto('correoContacto') && styles.inputInvalido]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {mostrarErrorContacto('correoContacto') ? (
                <Text style={styles.contactError}>{erroresContacto.correoContacto}</Text>
              ) : null}

              <Text style={styles.fieldLabel}>
                Instagram
              </Text>

              <TextInput
                value={instagram}
                onBlur={() => setContactosVisitados((actuales) => [...new Set([...actuales, 'instagram'])])}
                onChangeText={(texto) => {
                  setInstagram(texto);
                  setErrorGuardado('');
                }}
                placeholder="https://www.instagram.com/usuario/"
                placeholderTextColor="#716B79"
                style={[styles.input, mostrarErrorContacto('instagram') && styles.inputInvalido]}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
              {mostrarErrorContacto('instagram') ? (
                <Text style={styles.contactError}>{erroresContacto.instagram}</Text>
              ) : null}

              <Text style={styles.fieldLabel}>
                Facebook
              </Text>

              <TextInput
                value={facebook}
                onBlur={() => setContactosVisitados((actuales) => [...new Set([...actuales, 'facebook'])])}
                onChangeText={(texto) => {
                  setFacebook(texto);
                  setErrorGuardado('');
                }}
                placeholder="https://www.facebook.com/usuario/"
                placeholderTextColor="#716B79"
                style={[styles.input, mostrarErrorContacto('facebook') && styles.inputInvalido]}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
              {mostrarErrorContacto('facebook') ? (
                <Text style={styles.contactError}>{erroresContacto.facebook}</Text>
              ) : null}

              <Text style={styles.fieldLabel}>
                Twitter / X
              </Text>

              <TextInput
                value={twitter}
                onBlur={() => setContactosVisitados((actuales) => [...new Set([...actuales, 'twitter'])])}
                onChangeText={(texto) => {
                  setTwitter(texto);
                  setErrorGuardado('');
                }}
                placeholder="https://x.com/usuario"
                placeholderTextColor="#716B79"
                style={[styles.input, mostrarErrorContacto('twitter') && styles.inputInvalido]}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
              {mostrarErrorContacto('twitter') ? (
                <Text style={styles.contactError}>{erroresContacto.twitter}</Text>
              ) : null}
            </View>

            {errorGuardado ? (
              <View style={styles.messageError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#FF79A7"
                />

                <Text
                  style={
                    styles.messageErrorText
                  }
                >
                  {errorGuardado}
                </Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                disabled={guardando}
                onPress={intentarSalir}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed &&
                    !guardando &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={guardarPerfilArtista}
                disabled={
                  !hayCambios || guardando
                }
                style={[
                  styles.saveButton,
                  (!hayCambios || guardando) &&
                    styles.saveButtonDisabled,
                ]}
              >
                {guardando ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Ionicons
                    name="checkmark"
                    size={21}
                    color={
                      hayCambios
                        ? '#FFFFFF'
                        : '#77717E'
                    }
                  />
                )}

                <Text
                  style={[
                    styles.saveButtonText,
                    (!hayCambios ||
                      guardando) &&
                      styles.saveButtonTextDisabled,
                  ]}
                >
                  {guardando
                    ? 'Guardando...'
                    : 'Guardar cambios'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={modalSalirVisible}
          transparent
          animationType="fade"
          onRequestClose={seguirEditando}
        >
          <View style={styles.unsavedOverlay}>
            <View style={styles.unsavedCard}>
              <View
                style={
                  styles.unsavedIconContainer
                }
              >
                <Ionicons
                  name="warning-outline"
                  size={30}
                  color="#FF68B7"
                />
              </View>

              <Text style={styles.unsavedTitle}>
                Cambios sin guardar
              </Text>

              <Text
                style={
                  styles.unsavedDescription
                }
              >
                Tienes cambios sin guardar.
                ¿Quieres descartarlos?
              </Text>

              <View
                style={styles.unsavedActions}
              >
                <Pressable
                  onPress={seguirEditando}
                  style={({ pressed }) => [
                    styles.unsavedContinueButton,
                    pressed &&
                      styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={
                      styles.unsavedContinueText
                    }
                  >
                    Seguir editando
                  </Text>
                </Pressable>

                <Pressable
                  onPress={descartarCambios}
                  style={({ pressed }) => [
                    styles.unsavedDiscardButton,
                    pressed &&
                      styles.buttonPressed,
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.unsavedDiscardText
                    }
                  >
                    Descartar cambios
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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

  keyboardView: {
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
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 70,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 18, 54, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(187, 81, 255, 0.55)',
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: '#A8A0B1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },

  section: {
    width: '100%',
    marginBottom: 22,
    padding: 19,
    borderRadius: 23,
    backgroundColor: 'rgba(10, 6, 25, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(124, 57, 255, 0.38)',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginLeft: 9,
  },

  fieldLabel: {
    color: '#D9D2E1',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 13,
    marginBottom: 8,
  },

  input: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 15,
    backgroundColor: 'rgba(27, 17, 45, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(142, 76, 213, 0.55)',
  },

  biographyInput: {
    minHeight: 130,
  },

  characterCounter: {
    alignSelf: 'flex-end',
    color: '#837B8D',
    fontSize: 12,
    marginTop: 6,
  },

  selector: {
    minHeight: 54,
    paddingHorizontal: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 17, 45, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(142, 76, 213, 0.55)',
  },

  selectorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  selectorPlaceholder: {
    color: '#716B79',
    fontWeight: '400',
  },

  genrePanel: {
    marginTop: 10,
    padding: 10,
    borderRadius: 17,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(19, 11, 36, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(146, 70, 221, 0.48)',
  },

  genreOption: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(54, 37, 75, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(113, 86, 139, 0.55)',
  },

  genreOptionSelected: {
    backgroundColor: 'rgba(133, 51, 213, 0.75)',
    borderColor: '#C05CFF',
  },

  genreOptionText: {
    color: '#C8C1CE',
    fontSize: 13,
    fontWeight: '600',
  },

  genreOptionTextSelected: {
    color: '#FFFFFF',
  },

  additionalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 24,
  },

  helperText: {
    color: '#918A9A',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 14,
  },

  genreChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(47, 32, 66, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(115, 90, 139, 0.48)',
  },

  genreChipSelected: {
    backgroundColor: 'rgba(92, 32, 150, 0.88)',
    borderColor: '#B94FFF',
  },

  genreChipText: {
    color: '#BEB7C6',
    fontSize: 13,
    fontWeight: '600',
  },

  genreChipTextSelected: {
    color: '#F3D7FF',
    fontWeight: '800',
  },

  selectedCount: {
    color: '#9E83B4',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },

  optionalDescription: {
    color: '#9D96A6',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },

  inputInvalido: {
    borderColor: '#FF5CA8',
    borderWidth: 1.5,
  },
  contactError: {
    color: '#FF8DB9',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  messageError: {
    width: '100%',
    padding: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(107, 22, 54, 0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255, 95, 162, 0.48)',
  },

  messageErrorText: {
    flex: 1,
    color: '#FF9BBC',
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 9,
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },

  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 27, 43, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(137, 126, 148, 0.45)',
  },

  cancelButtonText: {
    color: '#D2CBD7',
    fontSize: 15,
    fontWeight: '700',
  },

  saveButton: {
    flex: 1.35,
    minHeight: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8535C9',
    borderWidth: 1,
    borderColor: '#D15CFF',
  },

  saveButtonDisabled: {
    backgroundColor: 'rgba(57, 49, 64, 0.62)',
    borderColor: 'rgba(102, 94, 109, 0.4)',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 6,
  },

  saveButtonTextDisabled: {
    color: '#77717E',
  },

  buttonPressed: {
    opacity: 0.72,
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

  unsavedOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },

  unsavedCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 27,
    paddingBottom: 22,
    alignItems: 'center',
    backgroundColor: '#10091D',
    borderWidth: 1,
    borderColor: 'rgba(196, 76, 255, 0.78)',
    shadowColor: '#B54CFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 14,
  },

  unsavedIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
    backgroundColor: 'rgba(202, 64, 174, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 91, 184, 0.55)',
  },

  unsavedTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },

  unsavedDescription: {
    color: '#B8AFBF',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
    marginBottom: 24,
  },

  unsavedActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 11,
  },

  unsavedContinueButton: {
    flex: 1,
    minHeight: 49,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(39, 29, 51, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(144, 120, 163, 0.55)',
  },

  unsavedContinueText: {
    color: '#D9D0DF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  unsavedDiscardButton: {
    flex: 1.18,
    minHeight: 49,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#A62C79',
    borderWidth: 1,
    borderColor: '#FF68B7',
  },

  unsavedDiscardText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
    textAlign: 'center',
  },
});
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import {
  File,
  UploadType,
} from 'expo-file-system';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GENEROS_MUSICALES } from '../constants/generos';
import {
  COMUNAS_POR_REGION,
  PAISES,
  REGIONES_POR_PAIS,
} from '../constants/ubicaciones';

type Usuario = {
  id: string;
  nombreUsuario: string;
  rol: 'oyente' | 'artista';
  fotoPerfil: string | null;
  ubicacion: {
    pais: string;
    region: string;
    comuna: string;
  };
  generosFavoritos: string[];
  priorizarComuna: boolean;
  mostrarUbicacion: boolean;
};

type TipoSelector = 'pais' | 'region' | 'comuna' | null;

export default function EditarPerfilScreen() {
  const [usuarioOriginal, setUsuarioOriginal] =
    useState<Usuario | null>(null);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [pais, setPais] = useState('');
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');
  const [generosFavoritos, setGenerosFavoritos] = useState<string[]>([]);
  const [priorizarComuna, setPriorizarComuna] = useState(false);
  const [mostrarUbicacion, setMostrarUbicacion] = useState(false);

const [cargando, setCargando] = useState(true);
const [guardando, setGuardando] = useState(false);
const [error, setError] = useState('');
const [errorGuardado, setErrorGuardado] = useState('');
const [fotoPerfilTemporal, setFotoPerfilTemporal] = useState<string | null>(null);
const [modalSalirVisible, setModalSalirVisible] = useState(false);
  const [selectorAbierto, setSelectorAbierto] =
    useState<TipoSelector>(null);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    try {
      setCargando(true);
      setError('');

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        setError('No encontramos una sesión activa.');
        return;
      }

      const respuesta = await fetch(
        'http://192.168.1.5:3000/api/usuarios/me',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.message || 'No fue posible cargar tu perfil.'
        );
        return;
      }

      const usuario: Usuario = datos.usuario;

      setUsuarioOriginal(usuario);
      setNombreUsuario(usuario.nombreUsuario);
      setPais(usuario.ubicacion.pais);
      setRegion(usuario.ubicacion.region);
      setComuna(usuario.ubicacion.comuna);
      setGenerosFavoritos(usuario.generosFavoritos || []);
      setPriorizarComuna(usuario.priorizarComuna);
      setMostrarUbicacion(usuario.mostrarUbicacion ?? false);
    } catch (error) {
      console.error('Error al cargar edición de perfil:', error);
      setError('No fue posible conectar con UnderMusic.');
    } finally {
      setCargando(false);
    }
  };
const seleccionarFotoPerfil = async () => {
  try {
    const permiso =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      setErrorGuardado(
        'Necesitamos permiso para acceder a tus fotos.'
      );
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (resultado.canceled) {
      return;
    }

    const imagenSeleccionada = resultado.assets[0];

    setFotoPerfilTemporal(imagenSeleccionada.uri);
    setErrorGuardado('');
  } catch (error) {
    console.error(
      'Error al seleccionar foto de perfil:',
      error
    );

    setErrorGuardado(
      'No fue posible seleccionar la imagen.'
    );
  }
};

  const regionesDisponibles =
    REGIONES_POR_PAIS[pais] || [];

  const comunasDisponibles =
    COMUNAS_POR_REGION[region] || [];

  const hayCambios = useMemo(() => {
    if (!usuarioOriginal) {
      return false;
    }

    const generosOriginales =
      usuarioOriginal.generosFavoritos || [];

    const mismosGeneros =
      generosFavoritos.length === generosOriginales.length &&
      generosFavoritos.every((genero) =>
        generosOriginales.includes(genero)
      );

    return (
  fotoPerfilTemporal !== null ||
  nombreUsuario !== usuarioOriginal.nombreUsuario ||
  pais !== usuarioOriginal.ubicacion.pais ||
  region !== usuarioOriginal.ubicacion.region ||
  comuna !== usuarioOriginal.ubicacion.comuna ||
  priorizarComuna !== usuarioOriginal.priorizarComuna ||
  mostrarUbicacion !== (usuarioOriginal.mostrarUbicacion ?? false) ||
  !mismosGeneros
);
  }, [
    usuarioOriginal,
    fotoPerfilTemporal,
    nombreUsuario,
    pais,
    region,
    comuna,
    generosFavoritos,
    priorizarComuna,
    mostrarUbicacion,
  ]);

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
  setModalSalirVisible(false);
  router.back();
};


  const guardarCambios = async () => {
  if (!hayCambios || guardando) {
    return;
  }

  try {
    setGuardando(true);
    setErrorGuardado('');

    const token = await SecureStore.getItemAsync('token');

    if (!token) {
      setErrorGuardado('No encontramos una sesión activa.');
      return;
    }

    const respuestaPerfil = await fetch(
      'http://192.168.1.5:3000/api/usuarios/me/perfil',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombreUsuario,
          pais,
          region,
          comuna,
          generosFavoritos,
          priorizarComuna,
          mostrarUbicacion,
        }),
      }
    );

    const datosPerfil = await respuestaPerfil.json();

    if (!respuestaPerfil.ok) {
      setErrorGuardado(
        datosPerfil.message ||
          'No fue posible guardar los cambios.'
      );
      return;
    }

        if (fotoPerfilTemporal) {
      const nombreArchivo =
        fotoPerfilTemporal.split('/').pop() ||
        'foto-perfil.jpg';

      const extension =
        nombreArchivo
          .split('.')
          .pop()
          ?.toLowerCase() || 'jpg';

      let tipoImagen = 'image/jpeg';

      if (extension === 'png') {
        tipoImagen = 'image/png';
      }

      if (extension === 'webp') {
        tipoImagen = 'image/webp';
      }

      const archivoFoto = new File(fotoPerfilTemporal);

      const resultadoFoto = await archivoFoto.upload(
        'http://192.168.1.5:3000/api/usuarios/me/foto-perfil',
        {
          httpMethod: 'PATCH',
          uploadType: UploadType.MULTIPART,
          fieldName: 'foto',
          mimeType: tipoImagen,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let datosFoto: {
        message?: string;
        fotoPerfil?: string;
      } = {};

      try {
        datosFoto = JSON.parse(resultadoFoto.body);
      } catch {
        console.error(
          'Respuesta no JSON al guardar foto:',
          resultadoFoto.body
        );

        setErrorGuardado(
          'El servidor respondió de forma inesperada al guardar la foto.'
        );
        return;
      }

      if (
        resultadoFoto.status < 200 ||
        resultadoFoto.status >= 300
      ) {
        setErrorGuardado(
          datosFoto.message ||
            'Los datos se guardaron, pero no fue posible guardar la foto.'
        );
        return;
      }
    }

    router.back();
  } catch (error) {
    console.error('Error al guardar perfil:', error);

    setErrorGuardado(
      'No fue posible conectar con UnderMusic.'
    );
  } finally {
    setGuardando(false);
  }
};

  const alternarGenero = (genero: string) => {
    setGenerosFavoritos((actuales) => {
      if (actuales.includes(genero)) {
        return actuales.filter((item) => item !== genero);
      }

      return [...actuales, genero];
    });
  };

  const seleccionarPais = (nuevoPais: string) => {
    setPais(nuevoPais);

    const nuevasRegiones =
      REGIONES_POR_PAIS[nuevoPais] || [];

    const nuevaRegion = nuevasRegiones[0] || '';

    setRegion(nuevaRegion);

    const nuevasComunas =
      COMUNAS_POR_REGION[nuevaRegion] || [];

    setComuna(nuevasComunas[0] || '');
    setSelectorAbierto(null);
  };

  const seleccionarRegion = (nuevaRegion: string) => {
    setRegion(nuevaRegion);

    const nuevasComunas =
      COMUNAS_POR_REGION[nuevaRegion] || [];

    setComuna(nuevasComunas[0] || '');
    setSelectorAbierto(null);
  };

  const seleccionarComuna = (nuevaComuna: string) => {
    setComuna(nuevaComuna);
    setSelectorAbierto(null);
  };

  const opcionesSelector = () => {
    if (selectorAbierto === 'pais') {
      return PAISES;
    }

    if (selectorAbierto === 'region') {
      return regionesDisponibles;
    }

    if (selectorAbierto === 'comuna') {
      return comunasDisponibles;
    }

    return [];
  };

  const tituloSelector = () => {
    if (selectorAbierto === 'pais') {
      return 'Selecciona tu país';
    }

    if (selectorAbierto === 'region') {
      return 'Selecciona tu región';
    }

    return 'Selecciona tu comuna';
  };

  if (cargando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#B64DFF" />

        <Text style={styles.loadingText}>
          Cargando edición de perfil...
        </Text>
      </View>
    );
  }

  if (error || !usuarioOriginal) {
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              onPress={intentarSalir}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={30}
                color="#FFFFFF"
              />
            </Pressable>

            <Text style={styles.headerTitle}>
              Editar perfil
            </Text>
          </View>

          <View style={styles.avatarSection}>
            <Pressable
  onPress={seleccionarFotoPerfil}
  style={({ pressed }) => [
    styles.avatarBorder,
    pressed && styles.buttonPressed,
  ]}
>
  <View style={styles.avatar}>
    {fotoPerfilTemporal ? (
  <Image
    source={{ uri: fotoPerfilTemporal }}
    style={styles.avatarImage}
    resizeMode="cover"
  />
) : usuarioOriginal?.fotoPerfil ? (
  <Image
    source={{
      uri: `http://192.168.1.5:3000/api/usuarios/foto-perfil/${usuarioOriginal.fotoPerfil}`,
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

    <View style={styles.avatarEdit}>
      <Ionicons
        name="pencil"
        size={19}
        color="#FFFFFF"
      />
    </View>
  </View>
</Pressable>

            <Text style={styles.photoHint}>
              Cambiar foto de perfil
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Información del perfil
            </Text>

            <Text style={styles.label}>
              Nombre de usuario
            </Text>

            <View style={styles.usernameInputContainer}>
              <Text style={styles.atSymbol}>@</Text>

              <TextInput
                value={nombreUsuario}
                onChangeText={setNombreUsuario}
                style={styles.usernameInput}
                placeholder="nombreusuario"
                placeholderTextColor="#6F6877"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
            </View>

            <Text style={styles.helperText}>
              Tu nombre de usuario es único dentro de UnderMusic.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="location-outline"
                size={25}
                color="#59DFFF"
              />

              <Text style={styles.sectionTitleWithIcon}>
                Ubicación
              </Text>
            </View>

            <Text style={styles.label}>País</Text>

            <Pressable
              onPress={() => setSelectorAbierto('pais')}
              style={styles.selectButton}
            >
              <Text style={styles.selectText}>
                {pais}
              </Text>

              <Ionicons
                name="chevron-down"
                size={21}
                color="#B89DCC"
              />
            </Pressable>

            <Text style={styles.label}>Región</Text>

            <Pressable
              onPress={() => setSelectorAbierto('region')}
              style={styles.selectButton}
            >
              <Text style={styles.selectText}>
                {region}
              </Text>

              <Ionicons
                name="chevron-down"
                size={21}
                color="#B89DCC"
              />
            </Pressable>

            <Text style={styles.label}>Comuna</Text>

            <Pressable
              onPress={() => setSelectorAbierto('comuna')}
              style={styles.selectButton}
            >
              <Text style={styles.selectText}>
                {comuna}
              </Text>

              <Ionicons
                name="chevron-down"
                size={21}
                color="#B89DCC"
              />
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="musical-notes-outline"
                size={25}
                color="#E05BFF"
              />

              <Text style={styles.sectionTitleWithIcon}>
                Preferencias musicales
              </Text>
            </View>

            <Text style={styles.sectionDescription}>
              Selecciona los géneros que te gusta escuchar.
              Puedes elegir todos los que quieras.
            </Text>

            <View style={styles.genresContainer}>
              {GENEROS_MUSICALES.map((genero) => {
                const seleccionado =
                  generosFavoritos.includes(genero);

                return (
                  <Pressable
                    key={genero}
                    onPress={() => alternarGenero(genero)}
                    style={[
                      styles.genreChip,
                      seleccionado &&
                        styles.genreChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.genreText,
                        seleccionado &&
                          styles.genreTextSelected,
                      ]}
                    >
                      {genero}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.localPreferenceCard}>
              <View style={styles.localPreferenceInfo}>
                <Text style={styles.localPreferenceTitle}>
                  Priorizar artistas de mi comuna
                </Text>

                <Text style={styles.localPreferenceSubtitle}>
                  Da mayor prioridad a artistas cercanos a ti.
                </Text>
              </View>

              <View style={styles.preferenceButtons}>
                <Pressable
                  onPress={() => setPriorizarComuna(true)}
                  style={[
                    styles.preferenceButton,
                    priorizarComuna &&
                      styles.preferenceButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.preferenceButtonText,
                      priorizarComuna &&
                        styles.preferenceButtonTextSelected,
                    ]}
                  >
                    Sí
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setPriorizarComuna(false)}
                  style={[
                    styles.preferenceButton,
                    !priorizarComuna &&
                      styles.preferenceButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.preferenceButtonText,
                      !priorizarComuna &&
                        styles.preferenceButtonTextSelected,
                    ]}
                  >
                    No
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
                     {usuarioOriginal.rol === 'oyente' ? (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={25}
                  color="#59DFFF"
                />

                <Text style={styles.sectionTitleWithIcon}>
                  Privacidad
                </Text>
              </View>

              <View style={styles.localPreferenceCard}>
                <View style={styles.localPreferenceInfo}>
                  <Text style={styles.localPreferenceTitle}>
                    Mostrar mi ubicación
                  </Text>

                  <Text style={styles.localPreferenceSubtitle}>
                    Permite que otros usuarios vean tu comuna y región.
                  </Text>
                </View>

                <View style={styles.preferenceButtons}>
                  <Pressable
                    onPress={() => setMostrarUbicacion(true)}
                    style={[
                      styles.preferenceButton,
                      mostrarUbicacion &&
                        styles.preferenceButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.preferenceButtonText,
                        mostrarUbicacion &&
                          styles.preferenceButtonTextSelected,
                      ]}
                    >
                      Sí
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setMostrarUbicacion(false)}
                    style={[
                      styles.preferenceButton,
                      !mostrarUbicacion &&
                        styles.preferenceButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.preferenceButtonText,
                        !mostrarUbicacion &&
                          styles.preferenceButtonTextSelected,
                      ]}
                    >
                      No
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {errorGuardado ? (
  <View style={styles.saveErrorContainer}>
    <Ionicons
      name="alert-circle-outline"
      size={20}
      color="#FF6F9F"
    />

    <Text style={styles.saveErrorText}>
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
      pressed && !guardando && styles.buttonPressed,
    ]}
  >
    <Text style={styles.cancelButtonText}>
      Cancelar
    </Text>
  </Pressable>

  <Pressable
    onPress={guardarCambios}
    disabled={!hayCambios || guardando}
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
        (!hayCambios || guardando) &&
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

        <Modal
          visible={selectorAbierto !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectorAbierto(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setSelectorAbierto(null)}
          >
            <Pressable
              style={styles.modalCard}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.modalTitle}>
                {tituloSelector()}
              </Text>

              <ScrollView
                style={styles.modalOptions}
                showsVerticalScrollIndicator={false}
              >
                {opcionesSelector().map((opcion) => (
                  <Pressable
                    key={opcion}
                    onPress={() => {
                      if (selectorAbierto === 'pais') {
                        seleccionarPais(opcion);
                      } else if (
                        selectorAbierto === 'region'
                      ) {
                        seleccionarRegion(opcion);
                      } else {
                        seleccionarComuna(opcion);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.modalOption,
                      pressed &&
                        styles.modalOptionPressed,
                    ]}
                  >
                    <Text style={styles.modalOptionText}>
                      {opcion}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

{<Modal
  visible={modalSalirVisible}
  transparent
  animationType="fade"
  onRequestClose={seguirEditando}
>
  <View style={styles.unsavedOverlay}>
    <View style={styles.unsavedCard}>
      <View style={styles.unsavedIconContainer}>
        <Ionicons
          name="warning-outline"
          size={30}
          color="#FF68B7"
        />
      </View>

      <Text style={styles.unsavedTitle}>
        Cambios sin guardar
      </Text>

      <Text style={styles.unsavedDescription}>
        Tienes cambios sin guardar. ¿Quieres descartarlos?
      </Text>

      <View style={styles.unsavedActions}>
        <Pressable
          onPress={seguirEditando}
          style={({ pressed }) => [
            styles.unsavedContinueButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.unsavedContinueText}>
            Seguir editando
          </Text>
        </Pressable>

        <Pressable
          onPress={descartarCambios}
          style={({ pressed }) => [
            styles.unsavedDiscardButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.unsavedDiscardText}>
            Descartar cambios
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>}

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
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 45,
  },

  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 18, 54, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(187, 81, 255, 0.65)',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginLeft: 18,
  },

  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },

  avatarBorder: {
    width: 150,
    height: 150,
    borderRadius: 39,
    padding: 3,
    backgroundColor: '#7C39FF',
  },

  avatar: {
    flex: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171026',
    position: 'relative',
  },

  avatarImage: {
  width: '100%',
  height: '100%',
  borderRadius: 36,
},

  avatarEdit: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(151, 51, 225, 0.92)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  photoHint: {
    color: '#C7A0E7',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 11,
  },

  section: {
    width: '100%',
    marginBottom: 30,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 17,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  sectionTitleWithIcon: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginLeft: 9,
  },

  sectionDescription: {
    color: '#AAA3B3',
    fontSize: 13,
    lineHeight: 19,
    marginTop: -7,
    marginBottom: 17,
  },

  label: {
    color: '#C8C1CF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 13,
  },

  usernameInputContainer: {
    minHeight: 54,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(10, 6, 24, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(161, 67, 229, 0.72)',
  },

  atSymbol: {
    color: '#C76BFF',
    fontSize: 17,
    fontWeight: '800',
    marginRight: 3,
  },

  usernameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 13,
  },

  helperText: {
    color: '#817A89',
    fontSize: 12,
    marginTop: 7,
  },

  selectButton: {
    minHeight: 54,
    borderRadius: 17,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 6, 24, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(161, 67, 229, 0.72)',
  },

  selectText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 10,
  },

  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 19,
    backgroundColor: 'rgba(20, 11, 37, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(116, 67, 151, 0.65)',
  },

  genreChipSelected: {
    backgroundColor: 'rgba(119, 38, 184, 0.82)',
    borderColor: '#D05BFF',
  },

  genreText: {
    color: '#AFA7B7',
    fontSize: 13,
    fontWeight: '600',
  },

  genreTextSelected: {
    color: '#FFFFFF',
  },

  localPreferenceCard: {
    width: '100%',
    marginTop: 23,
    borderRadius: 20,
    padding: 17,
    backgroundColor: 'rgba(12, 7, 28, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(61, 195, 255, 0.35)',
  },

  localPreferenceInfo: {
    marginBottom: 14,
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

  preferenceButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  preferenceButton: {
    minWidth: 74,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(55, 48, 64, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(125, 115, 138, 0.45)',
  },

  preferenceButtonSelected: {
    backgroundColor: 'rgba(126, 39, 191, 0.85)',
    borderColor: '#D05BFF',
  },

  preferenceButtonText: {
    color: '#A9A2B0',
    fontSize: 14,
    fontWeight: '800',
  },

  preferenceButtonTextSelected: {
    color: '#FFFFFF',
  },
saveErrorContainer: {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 15,
  paddingVertical: 12,
  marginBottom: 14,
  borderRadius: 15,
  backgroundColor: 'rgba(115, 22, 57, 0.28)',
  borderWidth: 1,
  borderColor: 'rgba(255, 95, 145, 0.48)',
},

saveErrorText: {
  flex: 1,
  color: '#FF9ABA',
  fontSize: 13,
  lineHeight: 18,
  marginLeft: 8,
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

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },

  modalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '72%',
    alignSelf: 'center',
    borderRadius: 25,
    padding: 22,
    backgroundColor: '#10091D',
    borderWidth: 1,
    borderColor: '#9C45DB',
  },

  modalTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 16,
  },

  modalOptions: {
    width: '100%',
  },

  modalOption: {
    minHeight: 49,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 13,
    marginBottom: 7,
    backgroundColor: 'rgba(38, 21, 57, 0.82)',
  },

  modalOptionPressed: {
    opacity: 0.7,
  },

  modalOptionText: {
    color: '#E9E2EE',
    fontSize: 15,
    fontWeight: '600',
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
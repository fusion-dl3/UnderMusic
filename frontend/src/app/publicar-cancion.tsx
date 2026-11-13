import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  File,
  UploadType,
} from 'expo-file-system';
import { router, useNavigation } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Image,
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

type ArchivoMp3 = {
  uri: string;
  name: string;
  size: number;
  mimeType: string | null;
};
type ArchivoPortada = {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
};

const TAMANO_MAXIMO_PORTADA = 5 * 1024 * 1024;

const TAMANO_MAXIMO_MP3 = 20 * 1024 * 1024;

export default function PublicarCancionScreen() {
  const [titulo, setTitulo] = useState('');
  const [album, setAlbum] = useState('');

  const [generoPrincipal, setGeneroPrincipal] =
    useState<GeneroMusical | null>(null);

  const [generosSecundarios, setGenerosSecundarios] =
    useState<GeneroMusical[]>([]);

  const [archivoMp3, setArchivoMp3] =
    useState<ArchivoMp3 | null>(null);

    const [archivoPortada, setArchivoPortada] =
  useState<ArchivoPortada | null>(null);

  const [
    selectorPrincipalVisible,
    setSelectorPrincipalVisible,
  ] = useState(false);

  const [
    selectorSecundariosVisible,
    setSelectorSecundariosVisible,
  ] = useState(false);

  const [publicando, setPublicando] = useState(false);
  const publicacionIniciada = useRef(false);
  const [cancionYaCreada, setCancionYaCreada] = useState(false);
  const [error, setError] = useState('');

  const [modalSalirVisible, setModalSalirVisible] = useState(false);
  const [salidaAutorizada, setSalidaAutorizada] = useState(false);
  const [salidaPendiente, setSalidaPendiente] = useState(false);
  const accionPendiente = useRef<any>(null);
  const navegacion = useNavigation();
  const hayCambios = titulo.length > 0 || album.length > 0 || generoPrincipal !== null ||
    generosSecundarios.length > 0 || archivoMp3 !== null || archivoPortada !== null;
  // Intercepta la salida sin importar el origen de la acción de navegación.
  // La suscripción se desactiva después de que el usuario confirma el descarte.
  useEffect(() => {
    if (!hayCambios || salidaAutorizada) return;
    const desuscribir = navegacion.addListener('beforeRemove', (evento: any) => {
      if (publicando) {
        evento.preventDefault();
        return;
      }
      evento.preventDefault();
      accionPendiente.current = evento.data.action;
      setModalSalirVisible(true);
    });
    return desuscribir;
  }, [navegacion, hayCambios, salidaAutorizada, publicando]);
  useEffect(() => {
    if (!salidaAutorizada || !salidaPendiente) return;
    setSalidaPendiente(false);
    const accion = accionPendiente.current;
    accionPendiente.current = null;
    if (accion) navegacion.dispatch(accion);
    else router.back();
  }, [salidaAutorizada, salidaPendiente, navegacion]);
  const confirmarSalida = () => {
    setModalSalirVisible(false);
    setSalidaAutorizada(true);
    setSalidaPendiente(true);
  };
  const salir = () => { if (!publicando) router.back(); };

  const formularioValido = useMemo(() => {
    return (
      titulo.trim().length > 0 &&
      generoPrincipal !== null &&
      archivoMp3 !== null &&
      !publicando &&
      !cancionYaCreada
    );
  }, [
    titulo,
    generoPrincipal,
    archivoMp3,
    publicando,
    cancionYaCreada,
  ]);

    const seleccionarMp3 = async () => {
    try {
      setError('');

      const resultado =
        await DocumentPicker.getDocumentAsync({
          type: 'audio/mpeg',
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (resultado.canceled) {
        return;
      }

      const archivo = resultado.assets[0];

      const nombreArchivo =
        archivo.name || 'archivo.mp3';

      const nombreEnMinusculas =
        nombreArchivo.toLowerCase();

      if (!nombreEnMinusculas.endsWith('.mp3')) {
        setArchivoMp3(null);

        setError(
          'Solo puedes seleccionar archivos en formato MP3.'
        );

        return;
      }

      const tamanoArchivo =
        archivo.size ?? 0;

      if (tamanoArchivo > TAMANO_MAXIMO_MP3) {
        setArchivoMp3(null);

        setError(
          'El archivo MP3 no puede superar los 20 MB.'
        );

        return;
      }

      setArchivoMp3({
        uri: archivo.uri,
        name: nombreArchivo,
        size: tamanoArchivo,
        mimeType: archivo.mimeType || null,
      });
    } catch (error) {
      console.error(
        'Error al seleccionar MP3:',
        error
      );

      setArchivoMp3(null);

      setError(
        'No fue posible seleccionar el archivo MP3.'
      );
    }
  };

  const seleccionarPortada = async () => {
    try {
      setError('');

      const resultado =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        });

      if (resultado.canceled) {
        return;
      }

      const imagen = resultado.assets[0];

      const mimeType =
        imagen.mimeType || '';

      const tiposPermitidos = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (!tiposPermitidos.includes(mimeType)) {
        setArchivoPortada(null);

        setError(
          'La portada debe estar en formato JPG, PNG o WEBP.'
        );

        return;
      }

      const tamano =
        imagen.fileSize ?? 0;

      if (tamano > TAMANO_MAXIMO_PORTADA) {
        setArchivoPortada(null);

        setError(
          'La portada no puede superar los 5 MB.'
        );

        return;
      }

      const extensionPorMime: Record<
        string,
        string
      > = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };

      const extension =
        extensionPorMime[mimeType];

      setArchivoPortada({
        uri: imagen.uri,
        name:
          imagen.fileName ||
          `portada.${extension}`,
        size: tamano,
        mimeType,
      });
    } catch (error) {
      console.error(
        'Error al seleccionar portada:',
        error
      );

      setArchivoPortada(null);

      setError(
        'No fue posible seleccionar la portada.'
      );
    }
  };

  const seleccionarGeneroPrincipal = (
    genero: GeneroMusical
  ) => {
    setGeneroPrincipal(genero);

    setGenerosSecundarios((actuales) =>
      actuales.filter(
        (generoSecundario) =>
          generoSecundario !== genero
      )
    );

    setSelectorPrincipalVisible(false);
    setError('');
  };

  const alternarGeneroSecundario = (
    genero: GeneroMusical
  ) => {
    if (genero === generoPrincipal) {
      return;
    }

    setGenerosSecundarios((actuales) => {
      if (actuales.includes(genero)) {
        return actuales.filter(
          (generoActual) =>
            generoActual !== genero
        );
      }

      if (actuales.length >= 3) {
        setError(
          'Puedes seleccionar como máximo 3 géneros secundarios.'
        );

        return actuales;
      }

      setError('');

      return [...actuales, genero];
    });
  };

  const formatearTamano = (bytes: number) => {
    if (!bytes) {
      return 'Tamaño no disponible';
    }

    const megabytes =
      bytes / (1024 * 1024);

    return `${megabytes.toFixed(2)} MB`;
  };

    const publicarCancion = async () => {
    if (publicando || publicacionIniciada.current || cancionYaCreada) {
      return;
    }

    if (!titulo.trim()) {
      setError(
        'Debes escribir el título de la canción.'
      );

      return;
    }

    if (!generoPrincipal) {
      setError(
        'Debes seleccionar un género principal.'
      );

      return;
    }

    if (!archivoMp3) {
      setError(
        'Debes seleccionar un archivo MP3.'
      );

      return;
    }

    publicacionIniciada.current = true;
    let guardadaEnServidor = false;
    try {
      setPublicando(true);
      setError('');

      const token =
        await SecureStore.getItemAsync('token');

      if (!token) {
        setError(
          'No encontramos una sesión activa.'
        );

        return;
      }

      /*
       * PASO 1:
       * Publicar los datos de la canción
       * junto con el archivo MP3.
       */
      const archivoAudio =
        new File(archivoMp3.uri);

      const respuesta =
        await archivoAudio.upload(
          'http://192.168.1.13:3000/api/canciones',
          {
            httpMethod: 'POST',
            uploadType: UploadType.MULTIPART,
            fieldName: 'audio',
            mimeType: 'audio/mpeg',
            parameters: {
              titulo: titulo.trim(),
              album: album.trim(),
              generoPrincipal,
              generosSecundarios:
                JSON.stringify(
                  generosSecundarios
                ),
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      let datos: {
        message?: string;
        cancion?: {
          id?: string;
          _id?: string;
        };
      } = {};

      try {
        datos = JSON.parse(
          respuesta.body || '{}'
        );
      } catch {
        datos = {};
      }

      if (
        respuesta.status < 200 ||
        respuesta.status >= 300
      ) {
        setError(
          datos.message ||
            'No fue posible publicar la canción.'
        );

        return;
      }

      guardadaEnServidor = true;
      setCancionYaCreada(true);

      /*
       * Si el usuario no eligió portada,
       * la publicación ya terminó.
       */
      if (!archivoPortada) {
        setSalidaAutorizada(true);
        setSalidaPendiente(true);
        return;
      }

      /*
       * PASO 2:
       * Obtener el ID de la canción que
       * acaba de crear el backend.
       */
      const cancionId =
        datos.cancion?.id ||
        datos.cancion?._id;

      if (!cancionId) {
        setError(
          'La canción fue publicada, pero no fue posible asociar la portada. Revisa tu catálogo antes de intentar otra publicación.'
        );

        return;
      }

      /*
       * PASO 3:
       * Subir la portada a la canción
       * recién creada.
       */
      const portada =
        new File(archivoPortada.uri);

      const respuestaPortada =
        await portada.upload(
          `http://192.168.1.13:3000/api/canciones/${cancionId}/portada`,
          {
            httpMethod: 'PATCH',
            uploadType: UploadType.MULTIPART,
            fieldName: 'portada',
            mimeType:
              archivoPortada.mimeType,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      let datosPortada: {
        message?: string;
        portadaId?: string;
      } = {};

      try {
        datosPortada = JSON.parse(
          respuestaPortada.body || '{}'
        );
      } catch {
        datosPortada = {};
      }

      if (
        respuestaPortada.status < 200 ||
        respuestaPortada.status >= 300
      ) {
        setError(
          datosPortada.message ||
            'La canción fue publicada, pero no fue posible guardar la portada. Revisa tu catálogo antes de intentar otra publicación.'
        );

        return;
      }

      /*
       * MP3 y portada terminaron
       * correctamente.
       */
      setSalidaAutorizada(true);
      setSalidaPendiente(true);
    } catch (error) {
      console.error(
        'Error al publicar canción:',
        error
      );

      setError(
        guardadaEnServidor
          ? 'La canción ya fue publicada, pero ocurrió un problema al subir la portada. No vuelvas a publicarla: revisa tu catálogo.'
          : 'No fue posible conectar con UnderMusic. Comprueba si la canción apareció en tu catálogo antes de reintentar.'
      );
    } finally {
      if (!guardadaEnServidor) publicacionIniciada.current = false;
      setPublicando(false);
    }
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      <LinearGradient colors={['#281045', '#130B25', '#090713']} style={styles.encabezado}>
        <Pressable
          style={styles.botonVolver}
          onPress={salir}
          disabled={publicando}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>

        <Text style={styles.tituloPantalla}>
          Publicar canción
        </Text>

        <View style={styles.espacioEncabezado} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.etiqueta}>
          Título
        </Text>

        <TextInput
          value={titulo}
          onChangeText={(texto) => {
            setTitulo(texto);
            setError('');
          }}
          placeholder="Nombre de la canción"
          placeholderTextColor="#716B7D"
          style={styles.input}
          editable={!publicando}
        />

        <Text style={styles.etiqueta}>
          Álbum
        </Text>

        <Text style={styles.descripcionCampo}>
          Opcional
        </Text>

        <TextInput
          value={album}
          onChangeText={setAlbum}
          placeholder="Nombre del álbum"
          placeholderTextColor="#716B7D"
          style={styles.input}
          editable={!publicando}
        />

        <Text style={styles.etiqueta}>
          Género principal
        </Text>

        <Pressable
          style={styles.selector}
          onPress={() =>
            setSelectorPrincipalVisible(true)
          }
          disabled={publicando}
        >
          <Text
            style={[
              styles.selectorTexto,
              !generoPrincipal &&
                styles.selectorPlaceholder,
            ]}
          >
            {generoPrincipal ||
              'Seleccionar género'}
          </Text>

          <Ionicons
            name="chevron-down"
            size={20}
            color="#B56CFF"
          />
        </Pressable>

        <Text style={styles.etiqueta}>
          Géneros secundarios
        </Text>

        <Text style={styles.descripcionCampo}>
          Opcional · máximo 3
        </Text>

        <Pressable
          style={styles.selector}
          onPress={() =>
            setSelectorSecundariosVisible(true)
          }
          disabled={publicando}
        >
          <Text
            style={[
              styles.selectorTexto,
              generosSecundarios.length === 0 &&
                styles.selectorPlaceholder,
            ]}
          >
            {generosSecundarios.length > 0
              ? `${generosSecundarios.length} seleccionado${
                  generosSecundarios.length === 1
                    ? ''
                    : 's'
                }`
              : 'Seleccionar géneros'}
          </Text>

          <Ionicons
            name="chevron-down"
            size={20}
            color="#B56CFF"
          />
        </Pressable>

        {generosSecundarios.length > 0 && (
          <View style={styles.chips}>
            {generosSecundarios.map(
              (genero) => (
                <View
                  key={genero}
                  style={styles.chip}
                >
                  <Text style={styles.chipTexto}>
                    {genero}
                  </Text>
                </View>
              )
            )}
          </View>
        )}

        <View style={styles.separador} />

        <Text style={styles.seccionTitulo}>ARCHIVOS DEL LANZAMIENTO</Text>
        <Text style={styles.etiqueta}>
          Archivo de audio
        </Text>

        <Text style={styles.descripcion}>
          Archivo MP3 · máximo 20 MB
        </Text>

        <Pressable
          style={styles.selectorArchivo}
          onPress={seleccionarMp3}
          disabled={publicando}
        >
          <Ionicons
            name="musical-notes-outline"
            size={32}
            color="#B56CFF"
          />

          <Text style={styles.textoSelector}>
            {archivoMp3
              ? 'Cambiar archivo MP3'
              : 'Seleccionar archivo MP3'}
          </Text>
        </Pressable>

        {archivoMp3 && (
          <View style={styles.archivoSeleccionado}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color="#B56CFF"
            />

            <View style={styles.datosArchivo}>
              <Text
                style={styles.nombreArchivo}
                numberOfLines={2}
              >
                {archivoMp3.name}
              </Text>

              <Text style={styles.tamanoArchivo}>
                {formatearTamano(
                  archivoMp3.size
                )}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.separador} />

<Text style={styles.etiqueta}>
  Portada
</Text>

<Text style={styles.descripcion}>
  Opcional · JPG, PNG o WEBP · máximo 5 MB
</Text>

<Pressable
  style={styles.selectorArchivo}
  onPress={seleccionarPortada}
  disabled={publicando}
>
  <Ionicons
    name="image-outline"
    size={32}
    color="#B56CFF"
  />

  <Text style={styles.textoSelector}>
    {archivoPortada
      ? 'Cambiar portada'
      : 'Seleccionar portada'}
  </Text>
</Pressable>

{archivoPortada && (
  <View style={styles.archivoSeleccionado}>
    <Image source={{ uri: archivoPortada.uri }} style={styles.portadaPreview} />
    <Ionicons
      name="checkmark-circle"
      size={22}
      color="#B56CFF"
    />

    <View style={styles.datosArchivo}>
      <Text
        style={styles.nombreArchivo}
        numberOfLines={2}
      >
        {archivoPortada.name}
      </Text>

      <Text style={styles.tamanoArchivo}>
        {formatearTamano(
          archivoPortada.size
        )}
      </Text>
    </View>
  </View>
)}

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.botonPublicar,
            !formularioValido &&
              styles.botonPublicarDeshabilitado,
          ]}
          onPress={publicarCancion}
          disabled={!formularioValido}
        >
          <LinearGradient colors={formularioValido ? ['#9D46F5', '#7035C6', '#4E45BE'] : ['#473553', '#342940']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.botonGradiente}>
          {publicando ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text style={styles.botonPublicarTexto}>
                Publicando...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="cloud-upload-outline"
                size={21}
                color="#FFFFFF"
              />

              <Text style={styles.botonPublicarTexto}>
                Publicar canción
              </Text>
            </>
          )}
          </LinearGradient>
        </Pressable>
      </ScrollView>

      <Modal
        visible={selectorPrincipalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectorPrincipalVisible(false)
        }
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>
                Género principal
              </Text>

              <Pressable
                onPress={() =>
                  setSelectorPrincipalVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={26}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>

            <ScrollView>
              {GENEROS_MUSICALES.map(
                (genero) => {
                  const seleccionado =
                    generoPrincipal === genero;

                  return (
                    <Pressable
                      key={genero}
                      style={[
                        styles.opcionGenero,
                        seleccionado &&
                          styles.opcionGeneroSeleccionada,
                      ]}
                      onPress={() =>
                        seleccionarGeneroPrincipal(
                          genero
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.opcionGeneroTexto,
                          seleccionado &&
                            styles.opcionGeneroTextoSeleccionado,
                        ]}
                      >
                        {genero}
                      </Text>

                      {seleccionado && (
                        <Ionicons
                          name="checkmark"
                          size={21}
                          color="#D89BFF"
                        />
                      )}
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectorSecundariosVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectorSecundariosVisible(false)
        }
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <View>
                <Text style={styles.modalTitulo}>
                  Géneros secundarios
                </Text>

                <Text style={styles.modalSubtitulo}>
                  {generosSecundarios.length}/3 seleccionados
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setSelectorSecundariosVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={26}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>

            <ScrollView>
              {GENEROS_MUSICALES.map(
                (genero) => {
                  const esPrincipal =
                    genero === generoPrincipal;

                  const seleccionado =
                    generosSecundarios.includes(
                      genero
                    );

                  return (
                    <Pressable
                      key={genero}
                      disabled={esPrincipal}
                      style={[
                        styles.opcionGenero,
                        seleccionado &&
                          styles.opcionGeneroSeleccionada,
                        esPrincipal &&
                          styles.opcionGeneroDeshabilitada,
                      ]}
                      onPress={() =>
                        alternarGeneroSecundario(
                          genero
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.opcionGeneroTexto,
                          seleccionado &&
                            styles.opcionGeneroTextoSeleccionado,
                          esPrincipal &&
                            styles.opcionGeneroTextoDeshabilitado,
                        ]}
                      >
                        {genero}
                        {esPrincipal
                          ? ' · Principal'
                          : ''}
                      </Text>

                      {seleccionado && (
                        <Ionicons
                          name="checkmark"
                          size={21}
                          color="#D89BFF"
                        />
                      )}
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <Pressable
              style={styles.botonListo}
              onPress={() =>
                setSelectorSecundariosVisible(false)
              }
            >
              <Text style={styles.botonListoTexto}>
                Listo
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={modalSalirVisible} transparent animationType="fade" onRequestClose={() => setModalSalirVisible(false)}>
        <View style={styles.confirmacionFondo}>
          <View style={styles.confirmacionTarjeta}>
            <Ionicons name="warning-outline" size={34} color="#FF93B0" />
            <Text style={styles.confirmacionTitulo}>¿Descartar publicación?</Text>
            <Text style={styles.confirmacionMensaje}>Has ingresado información sin publicar. Si sales, perderás los datos y archivos seleccionados.</Text>
            <View style={styles.confirmacionAcciones}>
              <Pressable style={styles.confirmacionSecundario} onPress={() => setModalSalirVisible(false)}>
                <Text style={styles.confirmacionBotonTexto}>Seguir editando</Text>
              </Pressable>
              <Pressable style={styles.confirmacionPeligro} onPress={confirmarSalida}>
                <Text style={styles.confirmacionBotonTexto}>Descartar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  confirmacionFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', paddingHorizontal: 24 },
  confirmacionTarjeta: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: '#170D2C', borderRadius: 24, borderWidth: 1, borderColor: '#673A91', padding: 24, alignItems: 'center' },
  confirmacionTitulo: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  confirmacionMensaje: { color: '#CDBDDC', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 24 },
  confirmacionAcciones: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmacionSecundario: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: '#37244E', alignItems: 'center', justifyContent: 'center' },
  confirmacionPeligro: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: '#AC3268', alignItems: 'center', justifyContent: 'center' },
  confirmacionBotonTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  seccionTitulo: { color: '#CB8CFF', fontSize: 12, letterSpacing: 1.5, fontWeight: '800', marginTop: 15 },
  portadaPreview: { width: 58, height: 58, borderRadius: 12 },
  botonGradiente: { width: '100%', minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  contenedor: {
    flex: 1,
    backgroundColor: '#090713',
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderBottomWidth: 1, borderBottomColor: 'rgba(186,100,255,0.22)',
  },

  botonVolver: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tituloPantalla: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  espacioEncabezado: {
    width: 42,
  },

  contenido: {
    paddingHorizontal: 22,
    paddingTop: 18,
    maxWidth: 700, width: '100%', alignSelf: 'center',
    paddingBottom: 44,
  },

  etiqueta: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
  },

  descripcionCampo: {
    color: '#B3A4C7',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 9,
  },

  input: {
    minHeight: 52,
    marginTop: 9,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#70419D',
    borderRadius: 14,
    backgroundColor: '#1A102C',
    color: '#FFFFFF',
    fontSize: 15,
  },

  selector: {
    minHeight: 52,
    marginTop: 9,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#70419D',
    borderRadius: 14,
    backgroundColor: '#1A102C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectorTexto: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },

  selectorPlaceholder: {
    color: '#A08BAF',
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#3A2059',
    borderWidth: 1,
    borderColor: '#A15DE0',
  },

  chipTexto: {
    color: '#E1BAFF',
    fontSize: 12,
    fontWeight: '600',
  },

  separador: {
    height: 1,
    backgroundColor: '#241B30',
    marginTop: 28,
    marginBottom: 8,
  },

  descripcion: {
    color: '#9D98AC',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 16,
  },

  selectorArchivo: {
    minHeight: 128,
    borderWidth: 1,
    borderColor: '#AD68E8',
    borderStyle: 'dashed',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1A102C',
  },

  textoSelector: {
    color: '#D7C5E9',
    fontSize: 15,
    fontWeight: '600',
  },

  archivoSeleccionado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#251536',
  },

  datosArchivo: {
    flex: 1,
  },

  nombreArchivo: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  tamanoArchivo: {
    color: '#9D98AC',
    fontSize: 13,
    marginTop: 4,
  },

  error: {
    color: '#FF7C8A',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
  },

  botonPublicar: {
    minHeight: 54,
    marginTop: 26,
    borderRadius: 16,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    overflow: 'hidden', borderWidth: 1, borderColor: '#C178FF',
  },

  botonPublicarDeshabilitado: {
    opacity: 0.4,
  },

  botonPublicarTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  modalContenido: {
    maxHeight: '78%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3D2B4E',
    backgroundColor: '#120D1C',
    padding: 18,
  },

  modalEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  modalTitulo: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },

  modalSubtitulo: {
    color: '#9D98AC',
    fontSize: 13,
    marginTop: 3,
  },

  opcionGenero: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  opcionGeneroSeleccionada: {
    backgroundColor: '#3A2059',
  },

  opcionGeneroDeshabilitada: {
    opacity: 0.35,
  },

  opcionGeneroTexto: {
    color: '#D7D2DE',
    fontSize: 15,
  },

  opcionGeneroTextoSeleccionado: {
    color: '#E5B4FF',
    fontWeight: '700',
  },

  opcionGeneroTextoDeshabilitado: {
    color: '#B3A4C7',
  },

  botonListo: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#6F38AE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  botonListoTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { File, UploadType } from 'expo-file-system';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GENEROS_MUSICALES, GeneroMusical } from '../constants/generos';

const API = 'http://192.168.1.5:3000/api';
const MAX_PORTADA = 5 * 1024 * 1024;

type Cancion = {
  id: string;
  titulo: string;
  album: string;
  generoPrincipal: string;
  generosSecundarios: string[];
  portadaId: string | null;
};
type Portada = { uri: string; mimeType: string; name: string };

export default function EditarCancionScreen() {
  const { cancionId } = useLocalSearchParams<{ cancionId?: string }>();
  const [original, setOriginal] = useState<Cancion | null>(null);
  const [titulo, setTitulo] = useState('');
  const [album, setAlbum] = useState('');
  const [secundarios, setSecundarios] = useState<GeneroMusical[]>([]);
  const [portada, setPortada] = useState<Portada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [error, setError] = useState('');
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [dialogo, setDialogo] = useState<'descartar' | 'limite' | 'exito' | null>(null);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        if (!cancionId) throw new Error('No se recibió el identificador de la canción.');
        const token = await SecureStore.getItemAsync('token');
        if (!token) throw new Error('Debes iniciar sesión.');
        const respuesta = await fetch(`${API}/canciones/me`, { headers: { Authorization: `Bearer ${token}` } });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.message || 'No fue posible cargar tus canciones.');
        const encontrada: Cancion | undefined = (datos.canciones || []).find((item: Cancion) => item.id === cancionId);
        if (!encontrada) throw new Error('La canción no existe o no pertenece a tu cuenta.');
        if (!activo) return;
        setOriginal(encontrada);
        setTitulo(encontrada.titulo);
        setAlbum(encontrada.album || '');
        setSecundarios((encontrada.generosSecundarios || []).filter((g): g is GeneroMusical => GENEROS_MUSICALES.some(v => v === g)));
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'No fue posible cargar la canción.');
      } finally { if (activo) setCargando(false); }
    };
    void cargar();
    return () => { activo = false; };
  }, [cancionId]);

  const cambiosDatos = useMemo(() => original !== null && (
    titulo.trim() !== original.titulo || album.trim() !== (original.album || '') ||
    JSON.stringify([...secundarios].sort()) !== JSON.stringify([...(original.generosSecundarios || [])].sort())
  ), [original, titulo, album, secundarios]);
  const hayCambios = cambiosDatos || portada !== null;

  const [salidaAutorizada, setSalidaAutorizada] = useState(false);
  const [salidaPendiente, setSalidaPendiente] = useState(false);
  const accionPendiente = useRef<any>(null);
  const navegacion = useNavigation();
  // Intercepta la salida sin importar el origen de la acción de navegación.
  // La suscripción se desactiva después de que el usuario confirma el descarte.
  useEffect(() => {
    if (!hayCambios || salidaAutorizada) return;
    const desuscribir = navegacion.addListener('beforeRemove', (evento: any) => {
      if (guardandoRef.current) {
        evento.preventDefault();
        return;
      }
      evento.preventDefault();
      accionPendiente.current = evento.data.action;
      setDialogo('descartar');
    });
    return desuscribir;
  }, [navegacion, hayCambios, salidaAutorizada, guardandoRef]);
  useEffect(() => {
    if (!salidaAutorizada || !salidaPendiente) return;
    setSalidaPendiente(false);
    const accion = accionPendiente.current;
    accionPendiente.current = null;
    if (accion) navegacion.dispatch(accion);
    else router.back();
  }, [salidaAutorizada, salidaPendiente, navegacion]);
  const confirmarSalida = () => {
    setDialogo(null);
    setSalidaAutorizada(true);
    setSalidaPendiente(true);
  };

  const salir = () => {
    if (guardandoRef.current) return;
    if (!hayCambios) { router.back(); return; }
    setDialogo('descartar');
  };


  const elegirPortada = async () => {
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      if (resultado.canceled) return;
      const imagen = resultado.assets[0];
      const mimeType = imagen.mimeType || '';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw new Error('La portada debe ser JPG, PNG o WEBP.');
      if ((imagen.fileSize || 0) > MAX_PORTADA) throw new Error('La portada no puede superar los 5 MB.');
      const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      setPortada({ uri: imagen.uri, mimeType, name: imagen.fileName || `portada.${ext}` });
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible seleccionar la portada.'); }
  };

  const alternarGenero = (genero: GeneroMusical) => {
    if (genero === original?.generoPrincipal) return;
    if (secundarios.includes(genero)) { setSecundarios(actuales => actuales.filter(g => g !== genero)); return; }
    if (secundarios.length >= 3) { setDialogo('limite'); return; }
    setSecundarios(actuales => [...actuales, genero]);
  };

  const guardar = async () => {
    if (guardandoRef.current || !original || !hayCambios) return;
    if (!titulo.trim()) { setError('El título de la canción es obligatorio.'); return; }
    guardandoRef.current = true;
    setGuardando(true);
    setError('');
    let metadatosGuardados = false;
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) throw new Error('Debes iniciar sesión.');
      if (cambiosDatos) {
        const respuesta = await fetch(`${API}/canciones/${original.id}`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo: titulo.trim(), album: album.trim(), generosSecundarios: secundarios }),
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.message || 'No fue posible actualizar los datos.');
        metadatosGuardados = true;
      }
      if (portada) {
        const archivo = new File(portada.uri);
        const respuesta = await archivo.upload(`${API}/canciones/${original.id}/portada`, {
          httpMethod: 'PATCH', uploadType: UploadType.MULTIPART, fieldName: 'portada', mimeType: portada.mimeType,
          headers: { Authorization: `Bearer ${token}` },
        });
        let datos: { message?: string } = {};
        try { datos = JSON.parse(respuesta.body || '{}'); } catch { /* Respuesta no JSON */ }
        if (respuesta.status < 200 || respuesta.status >= 300) throw new Error(datos.message || 'No fue posible actualizar la portada.');
      }
      setDialogo('exito');
    } catch (e) {
      if (metadatosGuardados) {
        setOriginal(actual => actual ? { ...actual, titulo: titulo.trim(), album: album.trim(), generosSecundarios: [...secundarios] } : actual);
      }
      setError(`${metadatosGuardados ? 'Se guardaron los datos, pero falló la portada. ' : ''}${e instanceof Error ? e.message : 'Error de conexión.'}`);
    } finally { guardandoRef.current = false; setGuardando(false); }
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      <LinearGradient colors={['#281045', '#130B25', '#090713']} style={styles.encabezado}>
        <Pressable
          style={styles.botonVolver}
          onPress={salir}
          disabled={guardando}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>

        <Text style={styles.tituloPantalla}>
          Editar canción
        </Text>

        <View style={styles.espacioEncabezado} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        {cargando ? <ActivityIndicator size="large" color="#C46CFF" style={{ marginTop: 40 }} /> : !original ? (
          <Text style={styles.error}>{error || 'No se encontró la canción.'}</Text>
        ) : <>
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
          editable={!guardando}
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
          editable={!guardando}
        />

        <Text style={styles.etiqueta}>
          Género principal
        </Text>

        <View style={[styles.selector, styles.campoBloqueado]}>
          <Text style={styles.selectorTexto}>{original?.generoPrincipal || '—'}</Text>
          <Ionicons name="lock-closed-outline" size={19} color="#C39BDD" />
        </View>
        <Text style={styles.descripcionCampo}>No se puede modificar después de publicar</Text>

        <Text style={styles.etiqueta}>
          Géneros secundarios
        </Text>

        <Text style={styles.descripcionCampo}>
          Opcional · máximo 3
        </Text>

        <Pressable
          style={styles.selector}
          onPress={() =>
            setSelectorVisible(true)
          }
          disabled={guardando}
        >
          <Text
            style={[
              styles.selectorTexto,
              secundarios.length === 0 &&
                styles.selectorPlaceholder,
            ]}
          >
            {secundarios.length > 0
              ? `${secundarios.length} seleccionado${
                  secundarios.length === 1
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

        {secundarios.length > 0 && (
          <View style={styles.chips}>
            {secundarios.map(
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
        <Text style={styles.etiqueta}>Archivo de audio</Text>
        <Text style={styles.descripcion}>MP3 original · no modificable</Text>
        <View style={[styles.selectorArchivo, styles.archivoBloqueado]}>
          <Ionicons name="musical-notes-outline" size={32} color="#B56CFF" />
          <Text style={styles.textoSelector}>Audio de la canción conservado</Text>
          <Ionicons name="lock-closed-outline" size={18} color="#C39BDD" />
        </View>
        <View style={styles.separador} />

        <Text style={styles.etiqueta}>Portada</Text>
        <Text style={styles.descripcion}>Opcional · JPG, PNG o WEBP · máximo 5 MB</Text>
        <Pressable style={styles.selectorArchivo} onPress={elegirPortada} disabled={guardando}>
          {(portada || original?.portadaId) ? (
            <Image source={{ uri: portada?.uri || `${API}/canciones/portadas/${original?.portadaId}` }} style={styles.vistaPortada} />
          ) : <Ionicons name="image-outline" size={32} color="#B56CFF" />}
          <Text style={styles.textoSelector}>{portada ? 'Cambiar portada seleccionada' : 'Cambiar portada'}</Text>
        </Pressable>
        {portada && <View style={styles.archivoSeleccionado}>
          <Ionicons name="checkmark-circle" size={22} color="#B56CFF" />
          <Text style={styles.nombreArchivo}>{portada.name}</Text>
        </View>}
        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable style={[styles.botonPublicar, (!hayCambios || !titulo.trim() || guardando) && styles.botonPublicarDeshabilitado]}
          onPress={guardar} disabled={!hayCambios || !titulo.trim() || guardando}>
          <LinearGradient colors={['#A446EE', '#7937D1', '#3C58C8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.botonDegradado}>
            {guardando ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={21} color="#FFFFFF" />}
            <Text style={styles.botonPublicarTexto}>{guardando ? 'Guardando cambios...' : 'Guardar cambios'}</Text>
          </LinearGradient>
        </Pressable>
        </>}
      </ScrollView>

      <Modal
        visible={dialogo !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (dialogo !== 'exito') setDialogo(null);
        }}
      >
        <View style={styles.confirmacionFondo}>
          <View style={styles.confirmacionTarjeta}>
            <View style={styles.confirmacionIcono}>
              <Ionicons
                name={dialogo === 'exito' ? 'checkmark-circle-outline' : dialogo === 'descartar' ? 'alert-circle-outline' : 'information-circle-outline'}
                size={34}
                color={dialogo === 'descartar' ? '#FF93B0' : '#C58BFF'}
              />
            </View>
            <Text style={styles.confirmacionTitulo}>
              {dialogo === 'exito' ? 'Canción actualizada' : dialogo === 'descartar' ? 'Cambios sin guardar' : 'Géneros secundarios'}
            </Text>
            <Text style={styles.confirmacionMensaje}>
              {dialogo === 'exito'
                ? 'Los cambios se guardaron correctamente.'
                : dialogo === 'descartar'
                  ? '¿Quieres salir y descartar los cambios realizados?'
                  : 'Puedes seleccionar como máximo tres géneros secundarios.'}
            </Text>
            {dialogo === 'descartar' ? (
              <View style={styles.confirmacionAcciones}>
                <Pressable style={styles.confirmacionSecundario} onPress={() => setDialogo(null)}>
                  <Text style={styles.confirmacionSecundarioTexto}>Seguir editando</Text>
                </Pressable>
                <Pressable style={styles.confirmacionPeligro} onPress={confirmarSalida}>
                  <Text style={styles.confirmacionPrincipalTexto}>Descartar</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.confirmacionPrincipal}
                onPress={() => {
                  const irAtras = dialogo === 'exito';
                  setDialogo(null);
                  if (irAtras) { setSalidaAutorizada(true); setSalidaPendiente(true); }
                }}
              >
                <Text style={styles.confirmacionPrincipalTexto}>Aceptar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectorVisible && !!original}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectorVisible(false)
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
                  {secundarios.length}/3 seleccionados
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setSelectorVisible(false)
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
                    genero === original?.generoPrincipal;

                  const seleccionado =
                    secundarios.includes(
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
                        alternarGenero(
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
                setSelectorVisible(false)
              }
            >
              <Text style={styles.botonListoTexto}>
                Listo
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  confirmacionFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', paddingHorizontal: 24 },
  confirmacionTarjeta: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: '#170D2C', borderRadius: 24, borderWidth: 1, borderColor: '#673A91', padding: 24, alignItems: 'center' },
  confirmacionIcono: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#302044', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  confirmacionTitulo: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  confirmacionMensaje: { color: '#CDBDDC', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 24 },
  confirmacionAcciones: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmacionSecundario: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: '#37244E', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  confirmacionSecundarioTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  confirmacionPeligro: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: '#AC3268', alignItems: 'center', justifyContent: 'center' },
  confirmacionPrincipal: { width: '100%', minHeight: 48, borderRadius: 13, backgroundColor: '#793ACB', alignItems: 'center', justifyContent: 'center' },
  confirmacionPrincipalTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  botonDegradado: { width: '100%', minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 16 },
  campoBloqueado: { opacity: 0.75, borderColor: '#524165' },
  archivoBloqueado: { opacity: 0.78, borderStyle: 'solid' },
  vistaPortada: { width: 88, height: 88, borderRadius: 14, marginBottom: 5 },
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
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { usePlayer, type CancionReproductor } from '@/context/PlayerContext';
import { useNotificaciones } from '@/context/NotificacionesContext';
import { MiniPlayer } from '@/components/MiniPlayer';
import {
  ActivityIndicator, FlatList, Image, ImageBackground, Modal, Pressable,
  RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://192.168.1.13:3000';
const LIMITE = 30;

type Notificacion = {
  _id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
  actor?: { usuarioId: string; nombre: string } | null;
  imagen?: { tipo: 'perfil' | 'portada'; id: string } | null;
  accion?: { tipo: string; cancionId?: string; artistaId?: string; usuarioId?: string } | null;
};
type UsuarioPublico = { id: string; nombreUsuario: string; rol: 'oyente' | 'artista'; fotoPerfil: string | null };
type CancionArtista = { id: string; titulo: string; audioId: string | null; portadaId: string | null };
type ArtistaPublico = { usuarioId: string; nombreUsuario: string; nombreArtistico?: string; fotoPerfil?: string | null };

type Listado = { notificaciones: Notificacion[]; noLeidas: number; pagina: number; limite: number };

async function solicitar<T>(ruta: string, metodo = 'GET'): Promise<T> {
  const token = await SecureStore.getItemAsync('token');
  if (!token) throw new Error('Tu sesión no está disponible. Inicia sesión nuevamente.');
  const respuesta = await fetch(`${API_URL}/api/notificaciones${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}` },
  });
  const datos = await respuesta.json();

  if (!respuesta.ok) throw new Error(datos?.message || 'No fue posible completar la operación.');
  return datos as T;
}

function iconoPorTipo(tipo: string): keyof typeof Ionicons.glyphMap {
  if (tipo === 'nuevo_lanzamiento') return 'musical-notes-outline';
  if (tipo === 'nuevo_seguidor') return 'person-add-outline';
  if (tipo.startsWith('hito_')) return 'trophy-outline';
  return 'notifications-outline';
}

function ImagenNotificacion({ notificacion }: { notificacion: Notificacion }) {
  const [fallo, setFallo] = useState(false);
  const imagen = notificacion.imagen;
  const uri = imagen?.id && (imagen.tipo === 'perfil' || imagen.tipo === 'portada')
    ? imagen.tipo === 'perfil'
      ? `${API_URL}/api/usuarios/foto-perfil/${encodeURIComponent(imagen.id)}`
      : `${API_URL}/api/canciones/portadas/${encodeURIComponent(imagen.id)}`
    : null;
  return (
    <View style={styles.imagenNotificacionContenedor}>
      {uri && !fallo ? (
        <Image source={{ uri }} style={styles.imagenNotificacion} onError={() => setFallo(true)} />
      ) : (
        <View style={styles.imagenNotificacionAlternativa}>
          <Ionicons name={imagen?.tipo === 'perfil' || notificacion.tipo === 'nuevo_seguidor' ? 'person-outline' : 'musical-note-outline'} size={23} color="#D8A6F4" />
        </View>
      )}
      <View style={styles.imagenNotificacionInsignia}>
        <Ionicons name={iconoPorTipo(notificacion.tipo)} size={13} color="#FFFFFF" />
      </View>
    </View>
  );
}

function fechaLegible(valor: string) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function NotificacionesScreen() {
  const { reproducirCancion } = usePlayer();
  const { establecerContador, actualizarContador } = useNotificaciones();
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const accionBloqueadaRef = useRef(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [idParaEliminar, setIdParaEliminar] = useState<string | null>(null);
  const [mensajeModal, setMensajeModal] = useState<string | null>(null);
  const activaRef = useRef(true);
  const solicitudRef = useRef(0);
  const cargandoMasRef = useRef(false);

  const cargar = useCallback(async (paginaSolicitada = 1) => {
    const solicitud = solicitudRef.current;
    try {
      if (paginaSolicitada === 1) setError('');
      const datos = await solicitar<Listado>(`?pagina=${paginaSolicitada}&limite=${LIMITE}`);
      if (!activaRef.current || solicitud !== solicitudRef.current) return;
      if (!Array.isArray(datos.notificaciones)) throw new Error('Respuesta de notificaciones inválida.');
      setNotificaciones(previas => paginaSolicitada === 1 ? datos.notificaciones : [
        ...previas, ...datos.notificaciones.filter(n => !previas.some(p => p._id === n._id)),
      ]);
      setNoLeidas(datos.noLeidas);
      establecerContador(datos.noLeidas);
      setPagina(paginaSolicitada);
      setHayMas(datos.notificaciones.length === LIMITE);
    } catch (e) {
      if (activaRef.current && solicitud === solicitudRef.current) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar las notificaciones.');
      }
    } finally {
      if (activaRef.current && solicitud === solicitudRef.current) {
        setCargando(false);
        setActualizando(false);
        setCargandoMas(false);
        cargandoMasRef.current = false;
      }
    }
  }, [establecerContador]);

  useFocusEffect(useCallback(() => {
    activaRef.current = true;
    solicitudRef.current += 1;
    setCargando(true);
    void cargar(1);
    return () => { activaRef.current = false; solicitudRef.current += 1; };
  }, [cargar]));

  const refrescar = () => {
    if (procesando || accionBloqueadaRef.current) return;
    solicitudRef.current += 1;
    setActualizando(true);
    void cargar(1);
  };

  const cargarSiguiente = () => {
    if (!hayMas || cargando || actualizando || cargandoMasRef.current || procesando || accionBloqueadaRef.current || error) return;
    cargandoMasRef.current = true;
    setCargandoMas(true);
    void cargar(pagina + 1);
  };

  const ejecutar = async (operacion: () => Promise<unknown>) => {
    if (procesando || accionBloqueadaRef.current) return;
    setProcesando(true);
    try {
      await operacion();
      solicitudRef.current += 1;
      setCargando(true);
      await cargar(1);
    } catch (e) {
      setMensajeModal(e instanceof Error ? e.message : 'Ocurrió un error.');
    } finally {
      setProcesando(false);
    }
  };

  const abrirAccion = async (notificacion: Notificacion) => {
    const accion = notificacion.accion;
    if (!accion || accionBloqueadaRef.current || procesando) return;
    if (accion.tipo !== 'ver_perfil' && accion.tipo !== 'escuchar_cancion') return;

    accionBloqueadaRef.current = true;
    setAccionEnCurso(notificacion._id);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) throw new Error('Tu sesión no está disponible. Inicia sesión nuevamente.');

      if (accion.tipo === 'ver_perfil') {
        if (!accion.usuarioId) throw new Error('Esta notificación no tiene un perfil asociado.');
        const respuesta = await fetch(`${API_URL}/api/usuarios/publico/${encodeURIComponent(accion.usuarioId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const datos: { usuario?: UsuarioPublico; message?: string } = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.message || 'No fue posible consultar el perfil.');
        const usuario = datos.usuario;
        if (!usuario || !['oyente', 'artista'].includes(usuario.rol)) {
          throw new Error('El perfil solicitado no está disponible.');
        }
        if (!notificacion.leida) {
          try {
  await solicitar(`/${notificacion._id}/leer`, 'PATCH');
  await actualizarContador();
}
          catch (error) { console.warn('No se pudo marcar la notificación como leída:', error); }
        }
        if (usuario.rol === 'artista') {
          router.push({ pathname: '/artista/[usuarioId]', params: { usuarioId: usuario.id } });
        } else {
          router.push({ pathname: '/oyente/[usuarioId]', params: { usuarioId: usuario.id } });
        }
        return;
      }

      if (!accion.artistaId || !accion.cancionId) {
        throw new Error('Esta notificación no tiene una canción asociada.');
      }
      const [respuestaArtista, respuestaCanciones] = await Promise.all([
        fetch(`${API_URL}/api/perfiles-artista/${encodeURIComponent(accion.artistaId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/canciones/artista/${encodeURIComponent(accion.artistaId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const datosArtista: { artista?: ArtistaPublico; message?: string } = await respuestaArtista.json();
      const datosCanciones: { canciones?: CancionArtista[]; message?: string } = await respuestaCanciones.json();
      if (!respuestaArtista.ok) throw new Error(datosArtista.message || 'No se pudo consultar al artista.');
      if (!respuestaCanciones.ok) throw new Error(datosCanciones.message || 'No se pudo consultar la canción.');
      const artista = datosArtista.artista;
      const canciones = datosCanciones.canciones;
      if (!artista || !Array.isArray(canciones)) throw new Error('La información musical no está disponible.');
      const elegida = canciones.find(c => c.id === accion.cancionId);
      if (!elegida || !elegida.audioId) throw new Error('Esta canción ya no está disponible para reproducirse.');
      const disponibles = canciones.filter((c): c is CancionArtista & { audioId: string } => Boolean(c.audioId));
      const indice = disponibles.findIndex(c => c.id === elegida.id);
      const ordenadas = [...disponibles.slice(indice), ...disponibles.slice(0, indice)];
      const cola: CancionReproductor[] = ordenadas.map(c => ({
        id: c.id,
        audioId: c.audioId,
        titulo: c.titulo,
        nombreArtista: artista.nombreArtistico || artista.nombreUsuario,
        usuarioId: artista.usuarioId,
        portadaId: c.portadaId,
        fotoArtista: artista.fotoPerfil || null,
      }));
      if (!notificacion.leida) {
        try {
  await solicitar(`/${notificacion._id}/leer`, 'PATCH');
  await actualizarContador();
}
        catch (error) { console.warn('No se pudo marcar la notificación como leída:', error); }
      }
      reproducirCancion(cola[0], cola, true);
      router.push('/reproductor');
    } catch (error) {
      setMensajeModal(error instanceof Error ? error.message : 'No se pudo abrir esta notificación.');
    } finally {
      accionBloqueadaRef.current = false;
      setAccionEnCurso(null);
    }
  };

  const abrirPerfilActor = async (notificacion: Notificacion) => {
    const actor = notificacion.actor;
    if (!actor?.usuarioId || accionBloqueadaRef.current || procesando) return;
    accionBloqueadaRef.current = true;
    setAccionEnCurso(notificacion._id);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) throw new Error('Tu sesión no está disponible. Inicia sesión nuevamente.');
      const respuesta = await fetch(`${API_URL}/api/usuarios/publico/${encodeURIComponent(actor.usuarioId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos: { usuario?: UsuarioPublico; message?: string } = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No fue posible consultar el perfil.');
      const usuario = datos.usuario;
      if (!usuario || !['oyente', 'artista'].includes(usuario.rol)) throw new Error('El perfil solicitado no está disponible.');
      if (!notificacion.leida) {
        try {
  await solicitar(`/${notificacion._id}/leer`, 'PATCH');
  await actualizarContador();
}
        catch (error) { console.warn('No se pudo marcar la notificación como leída:', error); }
      }
      router.push({
        pathname: usuario.rol === 'artista' ? '/artista/[usuarioId]' : '/oyente/[usuarioId]',
        params: { usuarioId: usuario.id },
      });
    } catch (error) {
      setMensajeModal(error instanceof Error ? error.message : 'No se pudo abrir el perfil.');
    } finally {
      accionBloqueadaRef.current = false;
      setAccionEnCurso(null);
    }
  };

  const marcarLeida = (id: string) => {
    void ejecutar(() => solicitar(`/${id}/leer`, 'PATCH'));
  };
  const eliminar = (id: string) => {
    if (!procesando && !accionBloqueadaRef.current) setIdParaEliminar(id);
  };

  const confirmarEliminacion = () => {
    if (!idParaEliminar || procesando || accionBloqueadaRef.current) return;
    const id = idParaEliminar;
    setIdParaEliminar(null);
    void ejecutar(() => solicitar(`/${id}`, 'DELETE'));
  };

  return (
    <View style={styles.pantalla}>
      <MiniPlayer />
      <ImageBackground source={require('../../assets/images/fondo-app.png')} style={styles.fondo} resizeMode="cover">
      <SafeAreaView style={styles.contenedor} edges={['top', 'bottom']}>
        <View style={styles.encabezado}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.volver}>
            <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.titulo}>Notificaciones</Text>
          <Ionicons name="notifications-outline" size={26} color="#F25CFF" />
        </View>
        <View style={styles.acciones}>
          <Text style={styles.contador}>{noLeidas} sin leer</Text>
          <Pressable
            disabled={procesando || noLeidas === 0}
            onPress={() => void ejecutar(() => solicitar('/leer-todas', 'PATCH'))}
            accessibilityRole="button"
            style={styles.botonTodas}
          >
            <Text style={[styles.textoTodas, (procesando || noLeidas === 0) && styles.desactivado]}>Marcar todas como leídas</Text>
          </Pressable>
        </View>
        {cargando && notificaciones.length === 0 ? (
          <View style={styles.centro}><ActivityIndicator color="#D77CFF" size="large" /></View>
        ) : error && notificaciones.length === 0 ? (
          <View style={styles.centro}>
            <Text style={styles.estado}>{error}</Text>
            <Pressable onPress={refrescar}><Text style={styles.enlace}>Reintentar</Text></Pressable>
          </View>
        ) : (
          <FlatList
            data={notificaciones}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.lista}
            refreshControl={<RefreshControl refreshing={actualizando} onRefresh={refrescar} tintColor="#D77CFF" />}
            onEndReached={cargarSiguiente}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={<View style={styles.centro}><Ionicons name="notifications-off-outline" size={40} color="#CBBAD8" /><Text style={styles.estado}>Todavía no tienes notificaciones.</Text></View>}
            ListFooterComponent={cargandoMas ? <ActivityIndicator color="#D77CFF" /> : error ? <Pressable onPress={cargarSiguiente}><Text style={styles.enlace}>{error} · Reintentar</Text></Pressable> : null}
            renderItem={({ item }) => (
              <View style={[styles.tarjeta, !item.leida && styles.tarjetaNueva]}>
                <View style={styles.fila}>
                  {(item.tipo === 'nuevo_seguidor' || item.tipo === 'nuevo_lanzamiento' ||
                    ['hito_me_gusta', 'hito_guardados', 'hito_reproducciones'].includes(item.tipo))
                    ? <ImagenNotificacion key={`${item._id}:${item.imagen?.id ?? ''}`} notificacion={item} />
                    : <View style={styles.icono}><Ionicons name={iconoPorTipo(item.tipo)} size={23} color="#E7A0FF" /></View>}
                  <View style={styles.contenido}>
                    <View style={styles.filaTitulo}>
                      <Text style={styles.tituloTarjeta}>{item.titulo}</Text>
                      {!item.leida && <View style={styles.punto} />}
                    </View>
                    {item.actor?.nombre && item.mensaje.includes(item.actor.nombre) &&
                      (item.tipo === 'nuevo_lanzamiento' || item.tipo === 'nuevo_seguidor') ? (
                      <Text style={styles.mensaje}>
                        {item.mensaje.slice(0, item.mensaje.indexOf(item.actor.nombre))}
                        <Text
                          style={styles.nombreInteractivo}
                          accessibilityRole="link"
                          onPress={() => void abrirPerfilActor(item)}
                        >{item.actor.nombre}</Text>
                        {item.mensaje.slice(item.mensaje.indexOf(item.actor.nombre) + item.actor.nombre.length)}
                      </Text>
                    ) : <Text style={styles.mensaje}>{item.mensaje}</Text>}
                    <Text style={styles.fecha}>{fechaLegible(item.fechaCreacion)}</Text>
                  </View>
                </View>
                {(item.accion?.tipo === 'ver_perfil' && item.accion.usuarioId ||
                  item.accion?.tipo === 'escuchar_cancion' && item.accion.cancionId && item.accion.artistaId) ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.accion?.tipo === 'ver_perfil' ? 'Ver perfil del seguidor' : 'Escuchar canción'}
                    disabled={procesando || accionEnCurso !== null}
                    onPress={() => void abrirAccion(item)}
                    style={({ pressed }) => [styles.botonAccion, (pressed || accionEnCurso !== null) && styles.desactivado]}
                  >
                    {accionEnCurso === item._id ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                      <Ionicons name={item.accion?.tipo === 'ver_perfil' ? 'person-outline' : 'play-outline'} size={17} color="#FFFFFF" />
                    )}
                    <Text style={styles.textoAccion}>{item.accion?.tipo === 'ver_perfil' ? 'Ver perfil' : 'Escuchar canción'}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                  </Pressable>
                ) : null}
                <View style={styles.opciones}>
                  {!item.leida && <Pressable disabled={procesando} onPress={() => marcarLeida(item._id)} accessibilityRole="button"><Text style={styles.enlace}>Marcar como leída</Text></Pressable>}
                  <Pressable disabled={procesando} onPress={() => eliminar(item._id)} accessibilityRole="button"><Text style={styles.eliminar}>Eliminar</Text></Pressable>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
      <Modal
        visible={idParaEliminar !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!procesando) setIdParaEliminar(null); }}
        statusBarTranslucent
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <View style={styles.modalIcono}>
              <Ionicons name="trash-outline" size={30} color="#FF8DBD" />
            </View>
            <Text style={styles.modalTitulo}>¿Eliminar notificación?</Text>
            <Text style={styles.modalDescripcion}>
              Esta notificación se eliminará de forma permanente. Esta acción no se puede deshacer.
            </Text>
            <View style={styles.modalAcciones}>
              <Pressable
                accessibilityRole="button"
                disabled={procesando}
                onPress={() => setIdParaEliminar(null)}
                style={[styles.modalBoton, styles.modalCancelar]}
              >
                <Text style={styles.modalTextoBoton}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={procesando}
                onPress={confirmarEliminacion}
                style={[styles.modalBoton, styles.modalConfirmar]}
              >
                <Text style={styles.modalTextoBoton}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={mensajeModal !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMensajeModal(null)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <View style={styles.modalIconoAviso}>
              <Ionicons name="alert-circle-outline" size={32} color="#E7A0FF" />
            </View>
            <Text style={styles.modalTitulo}>UnderMusic</Text>
            <Text style={styles.modalDescripcion}>{mensajeModal}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar aviso"
              onPress={() => setMensajeModal(null)}
              style={[styles.modalBoton, styles.modalAceptar]}
            >
              <Text style={styles.modalTextoBoton}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#020106' },
  modalIconoAviso: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(137, 63, 209, 0.18)', justifyContent: 'center', alignItems: 'center' },
  modalAceptar: { backgroundColor: '#7133A7', alignSelf: 'stretch' },
  fondo: { flex: 1, backgroundColor: '#020106' },
  contenedor: { flex: 1 },
  encabezado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 18, gap: 16 },
  volver: { padding: 4 },
  titulo: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', flex: 1 },
  acciones: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 26, marginBottom: 14, gap: 12 },
  contador: { color: '#CBBAD8', fontSize: 13 },
  botonTodas: { paddingVertical: 8 },
  textoTodas: { color: '#E38AFF', fontSize: 12, fontWeight: '700' },
  desactivado: { opacity: 0.45 },
  lista: { paddingHorizontal: 22, paddingBottom: 35, gap: 13, flexGrow: 1 },
  centro: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 15, padding: 20 },
  estado: { color: '#D5C3E0', textAlign: 'center', fontSize: 14 },
  enlace: { color: '#E38AFF', fontWeight: '700', fontSize: 13 },
  tarjeta: { backgroundColor: 'rgba(27, 14, 45, 0.88)', borderWidth: 1, borderColor: 'rgba(164, 88, 214, 0.28)', borderRadius: 19, padding: 16, gap: 14 },
  tarjetaNueva: { backgroundColor: 'rgba(60, 24, 87, 0.93)', borderColor: 'rgba(219, 103, 255, 0.75)' },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icono: { width: 43, height: 43, borderRadius: 13, backgroundColor: 'rgba(147, 66, 194, 0.22)', justifyContent: 'center', alignItems: 'center' },
  imagenNotificacionContenedor: { width: 48, height: 48, position: 'relative' },
  imagenNotificacion: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#241433' },
  imagenNotificacionAlternativa: { width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(147, 66, 194, 0.22)' },
  imagenNotificacionInsignia: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7133A7', borderWidth: 2, borderColor: '#1B0E2D' },
  contenido: { flex: 1, gap: 5 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tituloTarjeta: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', flex: 1 },
  punto: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#F01962' },
  nombreInteractivo: { color: '#D98BFF', fontWeight: '800', textDecorationLine: 'underline' },
  mensaje: { color: '#E4D4ED', fontSize: 14, lineHeight: 20 },
  fecha: { color: '#B9A6C9', fontSize: 11, marginTop: 3 },
  opciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 22 },
  eliminar: { color: '#FF8DBD', fontSize: 13, fontWeight: '700' },
  botonAccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', gap: 8, backgroundColor: '#7133A7', borderWidth: 1, borderColor: '#C783F2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  textoAccion: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.76)', justifyContent: 'center', paddingHorizontal: 25 },
  modalTarjeta: { backgroundColor: '#150E22', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(219, 103, 255, 0.38)', padding: 24, alignItems: 'center', gap: 14 },
  modalIcono: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(240, 25, 98, 0.16)', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  modalTitulo: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  modalDescripcion: { color: '#D5C3E0', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 8 },
  modalAcciones: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBoton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  modalCancelar: { backgroundColor: '#30253F' },
  modalConfirmar: { backgroundColor: '#C52762' },
  modalTextoBoton: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

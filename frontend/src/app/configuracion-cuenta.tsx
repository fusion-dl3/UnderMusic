import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayer } from '@/context/PlayerContext';

const API = 'http://192.168.1.5:3000/api/usuarios';
type Panel = 'correo' | 'password' | null;
type Dialogo = { titulo: string; mensaje: string; accion?: 'logout' } | null;
export default function ConfiguracionCuenta() {
  const { cerrarReproductor } = usePlayer();
  const [panel, setPanel] = useState<Panel>(null);
  const [correoActual, setCorreoActual] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (!token) return;
        const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
        const datos = await res.json();
        if (activo && res.ok) setCorreoActual(datos.usuario?.correoCuenta || '');
      } catch { /* La pantalla puede abrir incluso sin conexión. */ }
    })();
    return () => { activo = false; };
  }, []);

  const limpiar = () => { setPanel(null); setCorreoNuevo(''); setPasswordActual(''); setPasswordNueva(''); setConfirmacion(''); setMostrar(false); };
  const avisar = (titulo: string, mensaje: string) => setDialogo({ titulo, mensaje });
  const guardar = async () => {
    if (procesando || !panel) return;
    if (!passwordActual) { avisar('Contraseña requerida', 'Ingresa tu contraseña actual para confirmar el cambio.'); return; }
    if (panel === 'correo') {
      const correo = correoNuevo.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { avisar('Correo no válido', 'Introduce un correo electrónico con formato válido.'); return; }
      if (correo === correoActual.toLowerCase()) { avisar('Sin cambios', 'El correo nuevo es igual al actual.'); return; }
    } else {
      if (passwordNueva.length < 6) { avisar('Contraseña demasiado corta', 'La nueva contraseña debe tener al menos 6 caracteres.'); return; }
      if (passwordNueva !== confirmacion) { avisar('Las contraseñas no coinciden', 'Comprueba la confirmación de la contraseña nueva.'); return; }
    }
    setProcesando(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
      const esCorreo = panel === 'correo';
      const res = await fetch(`${API}/me/${esCorreo ? 'correo' : 'password'}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(esCorreo
          ? { correoCuenta: correoNuevo.trim().toLowerCase(), passwordActual }
          : { passwordActual, passwordNueva }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.message || 'No fue posible actualizar la cuenta.');
      if (esCorreo) setCorreoActual(correoNuevo.trim().toLowerCase());
      limpiar();
      avisar('Cambios guardados', esCorreo ? 'Tu correo de inicio de sesión se actualizó correctamente.' : 'Tu contraseña se actualizó correctamente.');
    } catch (e) { avisar('No se pudo guardar', e instanceof Error ? e.message : 'Error de conexión.'); }
    finally { setProcesando(false); }
  };
  const cerrarSesion = async () => {
    try {
      cerrarReproductor();
      await SecureStore.deleteItemAsync('token');
      setDialogo(null);
      router.replace('/login');
    } catch { avisar('Error', 'No fue posible cerrar sesión. Inténtalo nuevamente.'); }
  };
  return (
    <ImageBackground source={require('../../assets/images/fondo-app.png')} resizeMode="cover" style={styles.fondo}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenido}>
          <View style={styles.cabecera}>
            <Pressable accessibilityLabel="Volver" onPress={() => panel ? limpiar() : router.back()} style={styles.volver}><Ionicons name="arrow-back" size={24} color="#FFF" /></Pressable>
            <Text style={styles.titulo}>Configuración de cuenta</Text>
          </View>
          <Text style={styles.subtitulo}>Administra tus datos de acceso y tu sesión en UnderMusic.</Text>
          {!panel ? <>
            <Opcion icono="mail-outline" titulo="Cambiar correo electrónico" detalle={correoActual || 'Correo de inicio de sesión'} onPress={() => setPanel('correo')} />
            <Opcion icono="lock-closed-outline" titulo="Cambiar contraseña" detalle="Actualiza tu contraseña de acceso" onPress={() => setPanel('password')} />
            <Opcion icono="log-out-outline" titulo="Cerrar sesión" detalle="Salir para iniciar sesión con otra cuenta" onPress={() => setDialogo({ titulo: '¿Cerrar sesión?', mensaje: 'Volverás a la pantalla de inicio de sesión.', accion: 'logout' })} />
            <View style={styles.separador} />
            <Opcion icono="trash-outline" titulo="Eliminar cuenta" detalle="Eliminar tus datos permanentemente" peligro onPress={() => avisar('Eliminar cuenta', 'Esta función estará disponible cuando terminemos de verificar la eliminación segura de canciones, archivos e interacciones. Por ahora no se eliminará ningún dato.')} />
          </> : <View style={styles.formulario}>
            <Text style={styles.formTitulo}>{panel === 'correo' ? 'Cambiar correo electrónico' : 'Cambiar contraseña'}</Text>
            {panel === 'correo' ? <>
              <Text style={styles.etiqueta}>Correo actual</Text><Text style={styles.valor}>{correoActual || 'Cargando...'}</Text>
              <Text style={styles.etiqueta}>Nuevo correo</Text>
              <TextInput style={styles.campo} value={correoNuevo} onChangeText={setCorreoNuevo} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} placeholder="nuevo@correo.com" placeholderTextColor="#8E829F" />
            </> : <>
              <Text style={styles.etiqueta}>Nueva contraseña</Text>
              <TextInput style={styles.campo} value={passwordNueva} onChangeText={setPasswordNueva} secureTextEntry={!mostrar} placeholder="Mínimo 6 caracteres" placeholderTextColor="#8E829F" />
              <Text style={styles.etiqueta}>Confirmar contraseña nueva</Text>
              <TextInput style={styles.campo} value={confirmacion} onChangeText={setConfirmacion} secureTextEntry={!mostrar} placeholder="Repite la nueva contraseña" placeholderTextColor="#8E829F" />
            </>}
            <Text style={styles.etiqueta}>Contraseña actual</Text>
            <TextInput style={styles.campo} value={passwordActual} onChangeText={setPasswordActual} secureTextEntry={!mostrar} placeholder="Confirma tu identidad" placeholderTextColor="#8E829F" />
            <Pressable onPress={() => setMostrar(!mostrar)} style={styles.mostrar}><Ionicons name={mostrar ? 'eye-off-outline' : 'eye-outline'} color="#C58BFF" size={20}/><Text style={styles.mostrarTexto}>{mostrar ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}</Text></Pressable>
            <Pressable disabled={procesando} onPress={() => void guardar()} style={[styles.guardar, procesando && { opacity: 0.6 }]}>{procesando ? <ActivityIndicator color="#FFF"/> : <Text style={styles.botonTexto}>Guardar cambios</Text>}</Pressable>
            <Pressable onPress={limpiar} style={styles.cancelar}><Text style={styles.botonTexto}>Cancelar</Text></Pressable>
          </View>}
        </ScrollView>
        <Modal visible={!!dialogo} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setDialogo(null)}>
          <View style={styles.overlay}><View style={styles.modal}>
            <Ionicons name={dialogo?.accion === 'logout' ? 'log-out-outline' : 'information-circle-outline'} size={38} color="#C58BFF" />
            <Text style={styles.modalTitulo}>{dialogo?.titulo}</Text><Text style={styles.modalTexto}>{dialogo?.mensaje}</Text>
            {dialogo?.accion === 'logout' ? <View style={styles.acciones}>
              <Pressable onPress={() => setDialogo(null)} style={styles.secundario}><Text style={styles.botonTexto}>Cancelar</Text></Pressable>
              <Pressable onPress={() => void cerrarSesion()} style={styles.primario}><Text style={styles.botonTexto}>Cerrar sesión</Text></Pressable>
            </View> : <Pressable onPress={() => setDialogo(null)} style={styles.primario}><Text style={styles.botonTexto}>Aceptar</Text></Pressable>}
          </View></View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}
function Opcion({ icono, titulo, detalle, peligro, onPress }: { icono: keyof typeof Ionicons.glyphMap; titulo: string; detalle: string; peligro?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.opcion, pressed && { opacity: 0.72 }]}>
    <View style={[styles.icono, peligro && { backgroundColor: '#421D35' }]}><Ionicons name={icono} size={24} color={peligro ? '#FF8BA7' : '#C58BFF'}/></View>
    <View style={{ flex: 1 }}><Text style={[styles.opcionTitulo, peligro && { color: '#FF8BA7' }]}>{titulo}</Text><Text style={styles.opcionDetalle}>{detalle}</Text></View>
    <Ionicons name="chevron-forward" size={20} color={peligro ? '#FF8BA7' : '#AA9CBF'}/>
  </Pressable>;
}
const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#020106' }, safe: { flex: 1 }, contenido: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: 24, paddingBottom: 60 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }, volver: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#28183D' },
  titulo: { flex: 1, color: '#FFF', fontSize: 23, fontWeight: '800' }, subtitulo: { color: '#B8A9C9', fontSize: 14, lineHeight: 21, marginBottom: 28 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 85, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#39274C' },
  icono: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C1A46' }, opcionTitulo: { color: '#FFF', fontWeight: '700', fontSize: 15 }, opcionDetalle: { color: '#AA9CBF', fontSize: 12, marginTop: 5 }, separador: { height: 22 },
  formulario: { padding: 20, borderRadius: 22, borderWidth: 1, borderColor: '#67408C', backgroundColor: '#170D2C' }, formTitulo: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 18 },
  etiqueta: { color: '#D8C6EA', fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 14 }, valor: { color: '#FFF', fontSize: 15, marginBottom: 8 },
  campo: { color: '#FFF', fontSize: 15, backgroundColor: '#25173B', borderRadius: 12, borderWidth: 1, borderColor: '#6C4794', paddingHorizontal: 14, minHeight: 48 },
  mostrar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 18 }, mostrarTexto: { color: '#C58BFF', fontSize: 13 },
  guardar: { minHeight: 50, backgroundColor: '#793ACB', borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, cancelar: { minHeight: 50, backgroundColor: '#37244E', borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, botonTexto: { color: '#FFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 }, modal: { width: '100%', maxWidth: 420, alignSelf: 'center', alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: '#67408C', backgroundColor: '#170D2C', padding: 24 },
  modalTitulo: { color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 14, textAlign: 'center' }, modalTexto: { color: '#CDBDDC', fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 12, marginBottom: 24 },
  acciones: { width: '100%', flexDirection: 'row', gap: 10 }, secundario: { flex: 1, minHeight: 48, backgroundColor: '#37244E', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, primario: { flex: 1, width: '100%', minHeight: 48, backgroundColor: '#793ACB', borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});

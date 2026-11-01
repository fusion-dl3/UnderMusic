import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayer, type CancionReproductor } from '@/context/PlayerContext';

const API_URL = 'http://192.168.1.5:3000';

function PortadaCancion({ cancion }: { cancion: CancionReproductor }) {
  const uri = cancion.portadaId
    ? `${API_URL}/api/canciones/portadas/${cancion.portadaId}`
    : cancion.fotoArtista
      ? `${API_URL}/api/usuarios/foto-perfil/${cancion.fotoArtista}`
      : null;
  const [error, setError] = useState(false);
  useEffect(() => setError(false), [uri]);
  return uri && !error ? (
    <Image source={{ uri }} style={styles.cover} onError={() => setError(true)} />
  ) : (
    <View style={styles.coverFallback}><Ionicons name="musical-notes" size={21} color="#D89BFF" /></View>
  );
}


type TipoCola = 'manual' | 'automatica';
type EstadoArrastre = {tipo: TipoCola; indice: number; destino: number};
// El gesto comienza solo después de mantener presionada la canción o el asa.
// Un toque breve reproduce; nunca borra una entrada.
function FilaArrastrable({ item, indice, cantidad, tipo, altoFila, dragRef, setArrastrando, alSoltar, reproducir, quitar, subir, bajar, resaltada }: {
  item: CancionReproductor; indice: number; cantidad: number; tipo: TipoCola;
  altoFila: {current: number}; dragRef: {current: EstadoArrastre | null};
  setArrastrando: (estado: EstadoArrastre | null) => void;
  alSoltar: (tipo: TipoCola, origen: number, destino: number) => void;
  reproducir: () => void; quitar: () => void; subir: () => void; bajar: () => void;
  resaltada: boolean;
}) {
  const cantidadRef = useRef(cantidad);
  cantidadRef.current = cantidad;
  const activo = useRef(false);
  const moviendo = useRef(false);
  const cancelarRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iniciar = () => {
    if (cancelarRef.current) clearTimeout(cancelarRef.current);
    activo.current = true;
    moviendo.current = false;
    const estado = {tipo, indice, destino: indice};
    dragRef.current = estado;
    setArrastrando(estado);
  };
  const limpiar = () => {
    activo.current = false;
    moviendo.current = false;
    dragRef.current = null;
    setArrastrando(null);
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_e, g) => activo.current && Math.abs(g.dy) > 3,
    onMoveShouldSetPanResponder: (_e, g) => activo.current && Math.abs(g.dy) > 3,
    onPanResponderGrant: () => {moviendo.current = true; if (cancelarRef.current) clearTimeout(cancelarRef.current);},
    onPanResponderMove: (_e, g) => {
      if (!activo.current) return;
      const destino = Math.max(0, Math.min(cantidadRef.current - 1, indice + Math.round(g.dy / Math.max(48, altoFila.current))));
      if (dragRef.current?.destino !== destino) {
        const estado = {tipo, indice, destino};
        dragRef.current = estado;
        setArrastrando(estado);
      }
    },
    onPanResponderRelease: () => {
      const destino = dragRef.current?.destino ?? indice;
      limpiar();
      if (destino !== indice) alSoltar(tipo, indice, destino);
    },
    onPanResponderTerminate: limpiar,
    onPanResponderTerminationRequest: () => false,
  })).current;
  useEffect(() => () => {if (cancelarRef.current) clearTimeout(cancelarRef.current);}, []);
  const terminarPresion = () => {
    // El Pressable puede perder el responder al comenzar el arrastre.
    // No limpiar mientras el PanResponder esté desplazando la fila.
    if (cancelarRef.current) clearTimeout(cancelarRef.current);
    cancelarRef.current = setTimeout(() => {if (!moviendo.current) limpiar();}, 120);
  };
  return (
    <View {...pan.panHandlers} onLayout={e => {if (e.nativeEvent.layout.height > 40) altoFila.current = e.nativeEvent.layout.height;}}
      style={[styles.item, resaltada && styles.itemDragging]}>
      <Pressable style={styles.songPressable} delayLongPress={850} onLongPress={iniciar}
        onPressOut={terminarPresion} onPress={() => {if (!activo.current) reproducir();}}
        accessibilityRole="button" accessibilityLabel={`Reproducir o mantener para mover ${item.titulo}`}>
        <PortadaCancion cancion={item} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text style={styles.song} numberOfLines={1}>{item.titulo}</Text>
          <Text style={styles.artist} numberOfLines={1}>{item.nombreArtista}</Text>
        </View>
      </Pressable>
      <Pressable style={styles.dragHandle} delayLongPress={850} onLongPress={iniciar}
        onPressOut={terminarPresion} accessibilityLabel={`Mantener presionado para arrastrar ${item.titulo}`}>
        <Ionicons name="reorder-three-outline" size={23} color="#D9A6FF" />
      </Pressable>
      <Pressable disabled={indice === 0} onPress={subir} accessibilityLabel={`Subir ${item.titulo}`} style={styles.icon}>
        <Ionicons name="chevron-up" size={23} color={indice === 0 ? '#666' : '#D9A6FF'} />
      </Pressable>
      <Pressable disabled={indice === cantidad - 1} onPress={bajar} accessibilityLabel={`Bajar ${item.titulo}`} style={styles.icon}>
        <Ionicons name="chevron-down" size={23} color={indice === cantidad - 1 ? '#666' : '#D9A6FF'} />
      </Pressable>
      <Pressable onPress={quitar} accessibilityLabel={`Quitar ${item.titulo} de la cola`} style={styles.icon}>
        <Ionicons name="close-circle-outline" size={23} color="#FF8FB9" />
      </Pressable>
    </View>
  );
}

export function ColaReproduccionModal() {
  const {
    cancionActual, colaManual, colaPendienteAutomatica,
    moverEnCola, quitarDeCola, vaciarColaManual,
    moverEnColaAutomatica, quitarDeColaAutomatica, vaciarColaAutomatica,
    colaVisible, cerrarVentanaCola, reproducirDesdeCola,
  } = usePlayer();
  const [confirmacion, setConfirmacion] = useState<'manual' | 'todas' | null>(null);
  const desplazamiento = useRef(new Animated.Value(0)).current;
  const desplazamientoLista = useRef(0);
  const cerrando = useRef(false);

  useEffect(() => {
    if (colaVisible) {
      cerrando.current = false;
      desplazamiento.setValue(0);
      desplazamientoLista.current = 0;
    }
  }, [colaVisible, desplazamiento]);

  const cerrar = () => {
    if (cerrando.current) return;
    cerrando.current = true;
    cerrarVentanaCola();
  };

  const gesto = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, g) => g.dy > 3 && Math.abs(g.dy) > Math.abs(g.dx) * 1.1 && desplazamientoLista.current <= 2,
    onMoveShouldSetPanResponderCapture: (_e, g) => g.dy > 3 && Math.abs(g.dy) > Math.abs(g.dx) * 1.1 && desplazamientoLista.current <= 2,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_e, g) => desplazamiento.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_e, g) => {
      if (g.dy > 75 || g.vy > 1.1) {
        cerrando.current = true;
        Animated.timing(desplazamiento, { toValue: 900, duration: 180, useNativeDriver: true }).start(({finished}) => {
          if (finished) cerrarVentanaCola();
          else cerrando.current = false;
        });
      } else {
        Animated.spring(desplazamiento, {toValue: 0, useNativeDriver: true, bounciness: 0}).start();
      }
    },
    onPanResponderTerminate: () => {
      if (!cerrando.current) Animated.spring(desplazamiento, {toValue: 0, useNativeDriver: true, bounciness: 0}).start();
    },
  })).current;

  const [arrastrando, setArrastrando] = useState<{tipo: 'manual' | 'automatica'; indice: number; destino: number} | null>(null);
  const dragRef = useRef<{tipo: 'manual' | 'automatica'; indice: number; destino: number} | null>(null);
  const altoFila = useRef(72);
  const aplicarArrastre = (tipo: 'manual' | 'automatica', origen: number, destino: number) => {
    if (origen === destino) return;
    if (tipo === 'manual') moverEnCola(origen, destino);
    else moverEnColaAutomatica(origen, destino);
  };
  const total = colaManual.length + colaPendienteAutomatica.length;
  const renderFila = (item: CancionReproductor, indice: number, manual: boolean, cantidad: number) => {
    const tipo: TipoCola = manual ? 'manual' : 'automatica';
    return <FilaArrastrable key={`${tipo}-${item.id}-${indice}`} item={item} indice={indice} cantidad={cantidad}
      tipo={tipo} altoFila={altoFila} dragRef={dragRef} setArrastrando={setArrastrando}
      alSoltar={aplicarArrastre}
      resaltada={arrastrando?.tipo === tipo && (arrastrando.indice === indice || arrastrando.destino === indice)}
      reproducir={() => reproducirDesdeCola(tipo, indice)}
      quitar={() => manual ? quitarDeCola(indice) : quitarDeColaAutomatica(indice)}
      subir={() => manual ? moverEnCola(indice, indice - 1) : moverEnColaAutomatica(indice, indice - 1)}
      bajar={() => manual ? moverEnCola(indice, indice + 1) : moverEnColaAutomatica(indice, indice + 1)} />;
  };

  return <>
    <Modal visible={colaVisible && !!cancionActual} transparent animationType="fade" onRequestClose={cerrar} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} accessibilityLabel="Cerrar cola" />
        <Animated.View style={[styles.panel, {transform: [{translateY: desplazamiento}]}]}>
          <SafeAreaView style={{flex: 1}} edges={['bottom']}>
            <View style={styles.dragZone} {...gesto.panHandlers}><View style={styles.pill} /></View>
            <View style={styles.header} {...gesto.panHandlers}>
              <Text style={styles.title}>Cola de reproducción</Text>
              <Pressable onPress={cerrar} accessibilityLabel="Cerrar cola"><Ionicons name="close" size={26} color="#FFFFFF" /></Pressable>
            </View>
            <Text style={styles.section}>REPRODUCIENDO AHORA</Text>
            {cancionActual && <View style={styles.nowRow}>
              <PortadaCancion cancion={cancionActual} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.now} numberOfLines={1}>{cancionActual.titulo}</Text>
                <Text style={styles.artist} numberOfLines={1}>{cancionActual.nombreArtista}</Text>
              </View>
              <Ionicons name="volume-high" size={20} color="#D9A6FF" />
            </View>}
            <View style={styles.subheader}>
              <Text style={styles.section}>A CONTINUACIÓN ({total})</Text>
              <Pressable disabled={total === 0} onPress={() => setConfirmacion('todas')} accessibilityLabel="Vaciar todas las pendientes">
                <Text style={[styles.clear, total === 0 && {opacity: 0.4}]}>Vaciar pendientes</Text>
              </Pressable>
            </View>
            <ScrollView scrollEnabled={!arrastrando} style={{flex: 1}} contentContainerStyle={{paddingBottom: 22}} scrollEventThrottle={16} onScroll={e => { desplazamientoLista.current = Math.max(0, e.nativeEvent.contentOffset.y); }}>
              {colaManual.length > 0 && <View style={styles.groupRow}>
                <Text style={styles.group}>AÑADIDAS MANUALMENTE ({colaManual.length})</Text>
                <Pressable onPress={() => setConfirmacion('manual')}><Text style={styles.clear}>Vaciar manuales</Text></Pressable>
              </View>}
              {colaManual.map((item, i) => renderFila(item, i, true, colaManual.length))}
              {colaPendienteAutomatica.length > 0 && <Text style={styles.group}>REPRODUCCIÓN AUTOMÁTICA ({colaPendienteAutomatica.length})</Text>}
              {colaPendienteAutomatica.map((item, i) => renderFila(item, i, false, colaPendienteAutomatica.length))}
              {total === 0 && <Text style={styles.empty}>No quedan canciones pendientes.</Text>}
              <Text style={styles.note}>Mantén presionada una canción o su icono de arrastre durante un segundo y desliza para reordenar canciones dentro de cada grupo. También puedes usar las flechas. La canción actual permanece fija y las manuales tienen prioridad.</Text>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
    <Modal visible={confirmacion !== null} transparent animationType="fade" onRequestClose={() => setConfirmacion(null)} statusBarTranslucent>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmCard}>
          <Ionicons name="trash-outline" size={30} color="#FFC477" />
          <Text style={styles.confirmTitle}>¿Vaciar canciones pendientes?</Text>
          <Text style={styles.confirmMessage}>{confirmacion === 'manual' ? 'Se eliminarán únicamente las canciones añadidas manualmente.' : 'Se eliminarán todas las canciones pendientes, tanto manuales como automáticas.'} La canción actual seguirá reproduciéndose.</Text>
          <View style={styles.confirmActions}>
            <Pressable style={styles.confirmButton} onPress={() => setConfirmacion(null)}><Text style={styles.confirmText}>Cancelar</Text></Pressable>
            <Pressable style={[styles.confirmButton, {borderColor: '#FFC477'}]} onPress={() => {
              if (confirmacion === 'manual') vaciarColaManual();
              else {vaciarColaManual(); vaciarColaAutomatica();}
              setConfirmacion(null);
            }}><Text style={[styles.confirmText, {color: '#FFC477'}]}>Vaciar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)'},
  panel: {height: '72%', backgroundColor: '#160D28', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, borderWidth: 1, borderColor: '#7043A4'},
  dragZone: {height: 46, marginTop: -12, marginBottom: 3, alignItems: 'center', justifyContent: 'center'},
  pill: {width: 48, height: 5, borderRadius: 4, backgroundColor: '#A78DBA'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, paddingTop: 14},
  title: {color: '#FFF', fontSize: 21, fontWeight: '800'},
  section: {color: '#BCA8D1', fontSize: 11, fontWeight: '800', letterSpacing: 1},
  now: {color: '#FFF', fontSize: 16, fontWeight: '700'},
  nowRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, marginBottom: 22},
  subheader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  clear: {color: '#E4A4FF', fontWeight: '700', fontSize: 12},
  groupRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10},
  group: {color: '#D7B0F7', fontWeight: '800', fontSize: 11, marginTop: 12, marginBottom: 5},
  itemDragging: {backgroundColor: 'rgba(180,100,255,0.18)', borderRadius: 12},
  dragHandle: {padding: 5, justifyContent: 'center'},
  item: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(180,125,230,0.2)'},
  songPressable: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3},
  cover: {width: 46, height: 46, borderRadius: 8, backgroundColor: '#281A3D'},
  coverFallback: {width: 46, height: 46, borderRadius: 8, backgroundColor: '#281A3D', alignItems: 'center', justifyContent: 'center'},
  song: {color: '#FFF', fontWeight: '700', fontSize: 14},
  artist: {color: '#AFA1BF', fontSize: 12, marginTop: 4},
  icon: {padding: 5},
  empty: {color: '#BCA8D1', fontSize: 14, paddingVertical: 20},
  note: {color: '#9386A4', fontSize: 12, lineHeight: 18, marginTop: 20},
  confirmOverlay: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 24},
  confirmCard: {width: '100%', maxWidth: 390, backgroundColor: '#1B102D', borderWidth: 1, borderColor: 'rgba(232,166,75,0.55)', borderRadius: 24, padding: 24, alignItems: 'center'},
  confirmTitle: {color: '#FFF', fontSize: 19, fontWeight: '800', textAlign: 'center', marginTop: 14},
  confirmMessage: {color: '#C8BDD4', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, marginBottom: 24},
  confirmActions: {width: '100%', flexDirection: 'row', gap: 10},
  confirmButton: {flex: 1, minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(180,125,230,0.45)'},
  confirmText: {color: '#E6D7F4', fontWeight: '800', fontSize: 14},
});

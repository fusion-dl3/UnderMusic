
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useFocusEffect, useRouter, useSegments } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { MiniPlayer } from '@/components/MiniPlayer';
import { useNotificaciones } from '@/context/NotificacionesContext';


function IndicadorActivo() {
  return (
    <LinearGradient
      colors={['#E735FF', '#7868FF', '#38D7FF']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.activeIndicator}
    />
  );
}

export default function TabsLayout() {
  const { noLeidas, actualizarContador } = useNotificaciones();
  const [mostrarConfirmacionSalida, setMostrarConfirmacionSalida] = useState(false);

const router = useRouter();
const segments = useSegments();

const pestañaActual = segments[1];


useFocusEffect(
  useCallback(() => {
    if (Platform.OS !== 'android') return;

    const suscripcion = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (pestañaActual !== 'inicio') {
          router.replace('/inicio');
          return true;
        }

        setMostrarConfirmacionSalida(true);

        return true;
      }
    );

    return () => suscripcion.remove();
  }, [pestañaActual, router])
);



  useFocusEffect(
    useCallback(() => {
      void actualizarContador();
    }, [actualizarContador])
  );

  return (
    <View style={styles.container}>
      <MiniPlayer />

      <View style={styles.tabsContainer}>
        <Tabs
          screenOptions={{
            headerShown: false,

            tabBarStyle: {
              backgroundColor: '#070318',
              borderTopWidth: 0,
              height: 88,
              paddingTop: 8,
              paddingBottom: 8,
              elevation: 0,
            },

            tabBarActiveTintColor: '#FFFFFF',
            tabBarInactiveTintColor: '#9C97A8',

            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },

            tabBarItemStyle: {
              paddingTop: 2,
            },
          }}
        >
          <Tabs.Screen
            name="inicio"
            options={{
              title: 'Inicio',
              tabBarLabel: ({ focused, color }) => (
                <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 28 }}>
                  <Text style={{ color, fontSize: 12, fontWeight: '600' }}>Inicio</Text>
                  {focused ? <IndicadorActivo /> : null}
                </View>
              ),
              tabBarIcon: ({ color, focused }) => (
  <View style={styles.iconContainer}>
    <Ionicons
      name={focused ? 'home' : 'home-outline'}
      color={color}
      size={focused ? 30 : 25}
    />

    {noLeidas > 0 && (
      <View style={styles.notificationBadge}>
        <Text style={styles.notificationBadgeText}>
          {noLeidas > 99 ? '99+' : noLeidas}
        </Text>
      </View>
    )}
  </View>
),
            }}
          />

          <Tabs.Screen
            name="busqueda"
            options={{
              title: 'Búsqueda',
              tabBarLabel: ({ focused, color }) => (
                <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 28 }}>
                  <Text style={{ color, fontSize: 12, fontWeight: '600' }}>Búsqueda</Text>
                  {focused ? <IndicadorActivo /> : null}
                </View>
              ),
              tabBarIcon: ({ color, focused }) => (
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={
                      focused
                        ? 'search'
                        : 'search-outline'
                    }
                    color={color}
                    size={focused ? 30 : 25}
                  />
                </View>
              ),
            }}
          />

          <Tabs.Screen
            name="biblioteca"
            options={{
              title: 'Biblioteca',
              tabBarLabel: ({ focused, color }) => (
                <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 28 }}>
                  <Text style={{ color, fontSize: 12, fontWeight: '600' }}>Biblioteca</Text>
                  {focused ? <IndicadorActivo /> : null}
                </View>
              ),
              tabBarIcon: ({ color, focused }) => (
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={
                      focused
                        ? 'musical-notes'
                        : 'musical-notes-outline'
                    }
                    color={color}
                    size={focused ? 30 : 25}
                  />
                </View>
              ),
            }}
          />

          <Tabs.Screen
            name="perfil"
            options={{
              title: 'Perfil',
              tabBarLabel: ({ focused, color }) => (
                <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 28 }}>
                  <Text style={{ color, fontSize: 12, fontWeight: '600' }}>Perfil</Text>
                  {focused ? <IndicadorActivo /> : null}
                </View>
              ),
              tabBarIcon: ({ color, focused }) => (
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={
                      focused
                        ? 'person'
                        : 'person-outline'
                    }
                    color={color}
                    size={focused ? 30 : 25}
                  />
                </View>
              ),
            }}
          />
        </Tabs>
      </View>

      <Modal
        visible={mostrarConfirmacionSalida}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMostrarConfirmacionSalida(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <View style={styles.modalIconoContenedor}>
              <Ionicons name="log-out-outline" size={32} color="#D77CFF" />
            </View>
            <Text style={styles.modalTitulo}>¿Salir de UnderMusic?</Text>
            <Text style={styles.modalDescripcion}>
              ¿Seguro que quieres salir de la aplicación?
            </Text>
            <View style={styles.modalBotones}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMostrarConfirmacionSalida(false)}
                style={({ pressed }) => [styles.modalCancelar, pressed && styles.modalPresionado]}
              >
                <Text style={styles.modalTextoBoton}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMostrarConfirmacionSalida(false);
                  BackHandler.exitApp();
                }}
                style={({ pressed }) => [styles.modalSalir, pressed && styles.modalPresionado]}
              >
                <LinearGradient
                  colors={['#9845EC', '#D55BF4']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.modalGradiente}
                >
                  <Text style={styles.modalTextoBoton}>Salir</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  modalTarjeta: {
    backgroundColor: '#10091F',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(194, 103, 255, 0.5)',
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  modalIconoContenedor: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#29143E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitulo: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescripcion: {
    color: '#CBBAD8',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 26,
  },
  modalBotones: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelar: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#79459A',
    backgroundColor: '#241333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSalir: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradiente: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTextoBoton: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalPresionado: {
    opacity: 0.8,
  },
  container: {
    flex: 1,
    backgroundColor: '#020106',
  },

  tabsContainer: {
    flex: 1,
  },

  iconContainer: {
    width: 58,
    height: 39,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },

  activeIndicator: {
    marginTop: 5,
    width: 52,
    height: 3,
    borderRadius: 3,
  },

  notificationBadge: {
  position: 'absolute',
  top: -5,
  right: 0,
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: '#F01962',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 4,
  borderWidth: 2,
  borderColor: '#070318',
  zIndex: 1,
},
notificationBadgeText: {
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: '800',
},
});
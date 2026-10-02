import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MiniPlayer } from '@/components/MiniPlayer';

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
              tabBarIcon: ({ color, focused }) => (
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={
                      focused
                        ? 'home'
                        : 'home-outline'
                    }
                    color={color}
                    size={focused ? 30 : 25}
                  />

                  {focused ? (
                    <IndicadorActivo />
                  ) : null}
                </View>
              ),
            }}
          />

          <Tabs.Screen
            name="busqueda"
            options={{
              title: 'Búsqueda',
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

                  {focused ? (
                    <IndicadorActivo />
                  ) : null}
                </View>
              ),
            }}
          />

          <Tabs.Screen
            name="biblioteca"
            options={{
              title: 'Biblioteca',
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

                  {focused ? (
                    <IndicadorActivo />
                  ) : null}
                </View>
              ),
            }}
          />

          <Tabs.Screen
            name="perfil"
            options={{
              title: 'Perfil',
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

                  {focused ? (
                    <IndicadorActivo />
                  ) : null}
                </View>
              ),
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    position: 'absolute',
    bottom: 0,
    width: 52,
    height: 3,
    borderRadius: 3,
  },
});
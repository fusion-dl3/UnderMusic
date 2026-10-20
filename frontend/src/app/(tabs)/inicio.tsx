import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const artistas = [
  {
    id: '1',
    nombre: 'Amzy mc',
    genero: 'Pop',
    ubicacion: 'San Antonio',
    imagen: require('../../../assets/images/amzy-mc.png'),
    colores: ['#46D6D5', '#168BE5'],
  },
  {
    id: '2',
    nombre: 'La Indu$tria',
    genero: 'Reguetón',
    ubicacion: 'San Joaquín',
    imagen: require('../../../assets/images/la-industria.png'),
    colores: ['#536CFF', '#F05EC5'],
  },
  {
    id: '3',
    nombre: 'Morse',
    genero: 'Hip-Hop Rap',
    ubicacion: 'Santiago',
    imagen: require('../../../assets/images/morse.png'),
    colores: ['#9845EC', '#FF8A4D'],
  },
];

const barrasEqualizador = [
  { height: 12, opacity: 0.35 },
  { height: 22, opacity: 0.5 },
  { height: 34, opacity: 0.7 },
  { height: 45, opacity: 0.7 },
  { height: 31, opacity: 0.75 },
  { height: 39, opacity: 0.7 },
  { height: 27, opacity: 0.65 },
  { height: 18, opacity: 0.45 },
  { height: 10, opacity: 0.3 },
];

type EqualizerProps = {
  animaciones: Animated.Value[];
};

function Equalizer({ animaciones }: EqualizerProps) {
  return (
    <View style={styles.equalizer}>
      {barrasEqualizador.map((barra, indice) => {
        const scaleY = animaciones[indice].interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.38],
        });

        const translateY = animaciones[indice].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        });

        return (
          <Animated.View
            key={indice}
            style={[
              styles.equalizerBar,
              {
                height: barra.height,
                opacity: barra.opacity,
                transform: [
                  { scaleY },
                  { translateY },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function InicioScreen() {
  const animacionesEqualizadores = useRef(
    artistas.map(() =>
      barrasEqualizador.map(() => new Animated.Value(0))
    )
  ).current;

  useEffect(() => {
    const animarBarra = (
      animaciones: Animated.Value[],
      indice: number
    ) =>
      Animated.sequence([
        Animated.timing(animaciones[indice], {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animaciones[indice], {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]);

    const crearOla = (
      animaciones: Animated.Value[],
      invertir: boolean
    ) => {
      const indices = barrasEqualizador.map(
        (_, indice) => indice
      );

      if (invertir) {
        indices.reverse();
      }

      return Animated.stagger(
        75,
        indices.map((indice) =>
          animarBarra(animaciones, indice)
        )
      );
    };

    const animarEqualizador = (
      animaciones: Animated.Value[]
    ) =>
      Animated.sequence([
        crearOla(animaciones, false),
        Animated.delay(900),
        crearOla(animaciones, true),
      ]);

    const cicloCompleto = Animated.loop(
      Animated.sequence([
        animarEqualizador(animacionesEqualizadores[0]),
        Animated.delay(1000),

        animarEqualizador(animacionesEqualizadores[1]),
        Animated.delay(1000),

        animarEqualizador(animacionesEqualizadores[2]),
        Animated.delay(1000),
      ])
    );

    cicloCompleto.start();

    return () => {
      cicloCompleto.stop();

      animacionesEqualizadores.forEach((animaciones) => {
        animaciones.forEach((animacion) => {
          animacion.stopAnimation();
        });
      });
    };
  }, [animacionesEqualizadores]);

  return (
    <ImageBackground
      source={require('../../../assets/images/fondo-app.png')}
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
        >
          <View style={styles.header}>
            <Text style={styles.homeHeaderTitle}>Inicio</Text>
            <Image
              source={require('../../../assets/images/undermusic-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Pressable style={styles.notificationButton}>
              <Ionicons
                name="notifications-outline"
                size={34}
                color="#F25CFF"
              />

              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  3
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              Artistas recomendados
            </Text>

            <Text style={styles.subtitle}>
              Seleccionados según tu gusto y ubicación
            </Text>
          </View>

          <View style={styles.artistList}>
            {artistas.map((artista, indice) => (
              <LinearGradient
                key={artista.id}
                colors={
                  artista.colores as [string, string]
                }
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.cardBorder}
              >
                <View style={styles.card}>
                  <LinearGradient
                    colors={
                      artista.colores as [string, string]
                    }
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.cardBackground}
                  >
                    <Image
                      source={artista.imagen}
                      style={styles.artistImage}
                      resizeMode="cover"
                    />

                    <View style={styles.artistInfo}>
                      <Text
                        style={styles.artistName}
                        numberOfLines={1}
                      >
                        {artista.nombre}
                      </Text>

                      <Text style={styles.artistGenre}>
                        {artista.genero}
                      </Text>

                      <Text style={styles.artistLocation}>
                        {artista.ubicacion}
                      </Text>
                    </View>

                    <Equalizer
                      animaciones={
                        animacionesEqualizadores[indice]
                      }
                    />

                    <Pressable
                      style={({ pressed }) => [
                        styles.profileButton,
                        pressed &&
                          styles.profileButtonPressed,
                      ]}
                    >
                      <Text style={styles.profileButtonText}>
                        Ver perfil
                      </Text>
                    </Pressable>
                  </LinearGradient>
                </View>
              </LinearGradient>
            ))}
          </View>
        </ScrollView>
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

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 30,
  },

  header: {
    minHeight: 185,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  logo: {
    width: 380,
    height: 175,
  },

  homeHeaderTitle: {
    position: 'absolute',
    top: 22,
    left: 0,
    height: 50,
    textAlignVertical: 'center',
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    zIndex: 1,
  },

  notificationButton: {
    position: 'absolute',
    top: 22,
    right: 0,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F01962',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  titleContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: '#D5D0DE',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },

  artistList: {
    width: '100%',
    gap: 24,
  },

  cardBorder: {
    width: '100%',
    borderRadius: 27,
    padding: 4,
  },

  card: {
    width: '100%',
    borderRadius: 23,
    overflow: 'hidden',
  },

  cardBackground: {
    minHeight: 145,
    borderRadius: 23,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },

  artistImage: {
    width: 83,
    height: 83,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },

  artistInfo: {
    flex: 1,
    marginLeft: 16,
    paddingTop: 2,
    paddingRight: 10,
  },

  artistName: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },

  artistGenre: {
    color: '#6558E8',
    fontSize: 19,
    marginTop: 1,
  },

  artistLocation: {
    color: '#FFFFFF',
    fontSize: 17,
    marginTop: 1,
  },

  equalizer: {
    position: 'absolute',
    right: 24,
    top: 25,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  equalizerBar: {
    width: 4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  profileButton: {
    position: 'absolute',
    right: 15,
    bottom: 13,
    minWidth: 145,
    height: 39,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 15, 102, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileButtonPressed: {
    opacity: 0.8,
  },

  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
  },
});
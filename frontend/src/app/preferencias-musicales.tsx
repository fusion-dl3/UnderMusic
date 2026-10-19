import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
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

import {
  GENEROS_MUSICALES,
  GeneroMusical,
} from '../constants/generos';

export default function PreferenciasMusicalesScreen() {
  const buttonScale = useRef(new Animated.Value(1)).current;

  const [generosSeleccionados, setGenerosSeleccionados] = useState<
    GeneroMusical[]
  >([]);

  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.985,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [buttonScale]);

  const alternarGenero = (genero: GeneroMusical) => {
  setGenerosSeleccionados((actuales) => {
    if (actuales.includes(genero)) {
      return actuales.filter((item) => item !== genero);
    }

    setMensajeError('');

    return [...actuales, genero];
  });
};

  const guardarPreferencias = async (
    generos: GeneroMusical[]
  ) => {
    if (guardando) {
      return;
    }

    setMensajeError('');
    setGuardando(true);

    try {
      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        setMensajeError(
          'No encontramos una sesión válida. Inicia sesión nuevamente.'
        );
        return;
      }

      const respuesta = await fetch(
        'http://192.168.1.5:3000/api/usuarios/me/preferencias-musicales',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            generosFavoritos: generos,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setMensajeError(
          datos.message ||
            'No fue posible guardar tus preferencias musicales.'
        );
        return;
      }

      console.log(
        'Preferencias musicales guardadas correctamente'
      );

      router.replace('/inicio');
    } catch (error) {
      console.error(
        'Error al guardar preferencias musicales:',
        error
      );

      setMensajeError(
        'No fue posible conectar con UnderMusic. Inténtalo nuevamente.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const continuar = () => {
  if (generosSeleccionados.length === 0) {
    setMensajeError(
      'Aún no has seleccionado ningún género. Selecciona al menos uno para continuar o presiona "Omitir por ahora".'
    );
    return;
  }

  guardarPreferencias(generosSeleccionados);
};

  const omitir = () => {
    guardarPreferencias([]);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/fondo-app.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={require('../../assets/images/undermusic-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.iconCircle}>
              <Ionicons
                name="musical-notes"
                size={32}
                color="#E58CFF"
              />
            </View>

            <Text style={styles.title}>
              ¿Qué música te gusta?
            </Text>

            <Text style={styles.subtitle}>
              Selecciona los géneros que disfrutas escuchar para ayudarte a
              descubrir artistas y música que conecten contigo.
            </Text>

            <View style={styles.suggestionContainer}>
              <Ionicons
                name="sparkles-outline"
                size={18}
                color="#7DC8FF"
              />

              <Text style={styles.suggestionText}>
                Te recomendamos elegir al menos 3 géneros.
              </Text>
            </View>

            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>
                {generosSeleccionados.length}{' '}
                {generosSeleccionados.length === 1
                  ? 'género seleccionado'
                  : 'géneros seleccionados'}
              </Text>
            </View>

            <View style={styles.genresContainer}>
              {GENEROS_MUSICALES.map((genero) => {
                const seleccionado =
                  generosSeleccionados.includes(genero);

                return (
                  <Pressable
                    key={genero}
                    onPress={() => alternarGenero(genero)}
                    style={({ pressed }) => [
                      styles.genreButton,
                      seleccionado &&
                        styles.genreButtonSelected,
                      pressed && styles.genreButtonPressed,
                    ]}
                  >
                    {seleccionado ? (
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color="#FFFFFF"
                      />
                    ) : null}

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

            <Text style={styles.helperText}>
              Puedes elegir todos los géneros que quieras y cambiar tus
              preferencias más adelante.
            </Text>

            {mensajeError ? (
              <Text style={styles.errorText}>
                {mensajeError}
              </Text>
            ) : null}

            <Animated.View
              style={[
                styles.continueAnimatedContainer,
                {
                  transform: [{ scale: buttonScale }],
                },
              ]}
            >
              <Pressable
                onPress={continuar}
                disabled={guardando}
                style={({ pressed }) => [
                  styles.continuePressable,
                  pressed && styles.buttonPressed,
                ]}
              >
                <LinearGradient
                  colors={['#168CFF', '#7047FF', '#E02BFF']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.continueButton}
                >
                  <Text style={styles.continueText}>
                    {guardando ? 'Guardando...' : 'Continuar'}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={21}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Pressable
              onPress={omitir}
              disabled={guardando}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.skipButtonPressed,
              ]}
            >
              <Text style={styles.skipText}>
                Omitir por ahora
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020106',
  },

  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 1, 8, 0.48)',
  },

  safeArea: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 0,
    paddingBottom: 42,
  },

  logo: {
    width: '100%',
    height: 175,
    alignSelf: 'center',
  },

  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: '#A747FF',
    backgroundColor: 'rgba(86, 25, 121, 0.38)',
    shadowColor: '#C34BFF',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 6,
    marginTop: 2,
    marginBottom: 20,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: '#C6C0CE',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 480,
    alignSelf: 'center',
    marginTop: 10,
  },

  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 7,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(71, 161, 255, 0.38)',
    backgroundColor: 'rgba(22, 92, 155, 0.18)',
  },

  suggestionText: {
    color: '#AFCFE8',
    fontSize: 13,
    fontWeight: '600',
  },

  counterContainer: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 17,
  },

  counterText: {
    color: '#A9A1B2',
    fontSize: 13,
    fontWeight: '700',
  },

  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },

  genreButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.3,
    borderColor: 'rgba(128, 88, 155, 0.70)',
    borderRadius: 22,
    backgroundColor: 'rgba(8, 5, 18, 0.90)',
  },

  genreButtonSelected: {
    borderColor: '#C54EFF',
    backgroundColor: 'rgba(116, 40, 166, 0.82)',
    shadowColor: '#C54EFF',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 4,
  },

  genreButtonPressed: {
    opacity: 0.75,
  },

  genreText: {
    color: '#BDB5C6',
    fontSize: 14,
    fontWeight: '700',
  },

  genreTextSelected: {
    color: '#FFFFFF',
  },

  helperText: {
    color: '#918A9A',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 450,
    alignSelf: 'center',
    marginTop: 23,
    marginBottom: 26,
  },

  errorText: {
    color: '#FF6B9E',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },

  continueAnimatedContainer: {
    width: '100%',
  },

  continuePressable: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },

  continueButton: {
    width: '100%',
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 22,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.82,
  },

  skipButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  skipButtonPressed: {
    opacity: 0.65,
  },

  skipText: {
    color: '#8F8A98',
    fontSize: 14,
    fontWeight: '700',
  },
});
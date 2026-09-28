import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const buttonScale = useRef(new Animated.Value(1)).current;

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

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/inicio-fondo.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.darkOverlay} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/undermusic-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.spacer} />

          <View style={styles.actionsContainer}>
            <Animated.View
              style={[
                styles.buttonWrapper,
                {
                  transform: [{ scale: buttonScale }],
                },
              ]}
            >
              <Pressable
                onPress={() => router.push('/login')}
                style={({ pressed }) => [
                  styles.pressable,
                  pressed && styles.buttonPressed,
                ]}
              >
                <LinearGradient
                  colors={['#168CFF', '#7047FF', '#E02BFF']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.loginButton}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.iconSlot}>
                      <Image
                        source={require('../../assets/images/icono-login.png')}
                        style={styles.loginIcon}
                        resizeMode="contain"
                      />
                    </View>

                    <Text style={styles.buttonText}>
                      Iniciar sesión
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View
              style={[
                styles.buttonWrapper,
                {
                  transform: [{ scale: buttonScale }],
                },
              ]}
            >
              <Pressable
                onPress={() => router.push('/registro')}
                style={({ pressed }) => [
                  styles.registerButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.iconSlot}>
                    <Image
                      source={require('../../assets/images/icono-registro.png')}
                      style={styles.registerIcon}
                      resizeMode="contain"
                    />
                  </View>

                  <Text style={[styles.buttonText, styles.registerText]}>
                    Registrarse
                  </Text>
                </View>
              </Pressable>
            </Animated.View>

            <View style={styles.messageContainer}>
              <Image
                source={require('../../assets/images/icono-musica.png')}
                style={styles.musicIcon}
                resizeMode="contain"
              />

              <Text style={styles.messageText}>
                La música está esperando.{'\n'}
                <Text style={styles.messageHighlight}>
                  Descubre a los próximos artistas.
                </Text>
              </Text>
            </View>
          </View>
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

  darkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },

  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 28,
  },

  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: '100%',
    height: 245,
  },

  spacer: {
    flex: 1,
  },

  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },

  buttonWrapper: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
  },

  pressable: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },

  loginButton: {
    minHeight: 62,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  registerButton: {
    width: '100%',
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#477BFF',
    backgroundColor: 'rgba(4, 3, 12, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  buttonContent: {
  width: 230,
  flexDirection: 'row',
  alignItems: 'center',
  marginLeft: 18,
},

  iconSlot: {
  width: 44,
  height: 30,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 8,
},

  loginIcon: {
    width: 27,
    height: 27,
  },

  registerIcon: {
    width: 30,
    height: 30,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  registerText: {
  marginLeft: 10,
},

  buttonPressed: {
    opacity: 0.82,
  },

  messageContainer: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },

  musicIcon: {
    width: 35,
    height: 35,
  },

  messageText: {
    color: '#D9D8E3',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  messageHighlight: {
    color: '#A966FF',
    fontWeight: '600',
  },
});
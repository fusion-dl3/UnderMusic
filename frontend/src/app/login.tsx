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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [correoCuenta, setCorreoCuenta] = useState('');
  const [password, setPassword] = useState('');
  const [iniciandoSesion, setIniciandoSesion] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const buttonScale = useRef(new Animated.Value(1)).current;

  const iniciarSesion = async () => {
    setMensajeError('');
    setMensajeExito('');

    if (!correoCuenta.trim() || !password) {
      setMensajeError('Ingresa tu correo electrónico y contraseña.');
      return;
    }

    try {
      setIniciandoSesion(true);

      const respuesta = await fetch(
        'http://192.168.1.14:3000/api/usuarios/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            correoCuenta: correoCuenta.trim(),
            password,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setMensajeError(
          datos.message || 'No fue posible iniciar sesión.'
        );
        return;
      }

      if (!datos.token) {
        setMensajeError(
          'El servidor no entregó una sesión válida.'
        );
        return;
      }

      await SecureStore.setItemAsync('token', datos.token);

      console.log('Inicio de sesión correcto');
      console.log('Sesión guardada correctamente');

      setMensajeExito('Inicio de sesión correcto.');
      router.replace('/inicio');
    } catch (error) {
      console.error('Error al iniciar sesión:', error);

      setMensajeError(
        'No fue posible conectar con UnderMusic. Inténtalo nuevamente.'
      );
    } finally {
      setIniciandoSesion(false);
    }
  };

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
        source={require('../../assets/images/login-fondo.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.darkOverlay} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <Image
              source={require('../../assets/images/undermusic-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.titleContainer}>
              <Text style={styles.title}>Iniciar sesión</Text>

              <Text style={styles.subtitle}>
                Vuelve a descubrir, conectar y escuchar.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Correo electrónico</Text>

              <LinearGradient
                colors={['#7137A8', '#7137A8']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.inputGradient}
              >
                <View style={styles.inputContainer}>
                  <View style={styles.neonIcon}>
                    <Ionicons
                      name="mail-outline"
                      size={23}
                      color="#D86CFF"
                    />
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="tucorreo@gmail.com"
                    placeholderTextColor="#777184"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!iniciandoSesion}
                    value={correoCuenta}
                    onChangeText={setCorreoCuenta}
                  />
                </View>
              </LinearGradient>

              <Text style={styles.label}>Contraseña</Text>

              <LinearGradient
                colors={['#7137A8', '#7137A8']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.inputGradient}
              >
                <View style={styles.inputContainer}>
                  <View style={styles.neonIcon}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={23}
                      color="#D86CFF"
                    />
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#777184"
                    secureTextEntry={!mostrarPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!iniciandoSesion}
                    value={password}
                    onChangeText={setPassword}
                  />

                  <Pressable
                    onPress={() => setMostrarPassword(!mostrarPassword)}
                    disabled={iniciandoSesion}
                    hitSlop={10}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={
                        mostrarPassword
                          ? 'eye-outline'
                          : 'eye-off-outline'
                      }
                      size={24}
                      color="#8B8795"
                    />
                  </Pressable>
                </View>
              </LinearGradient>

              {mensajeError ? (
                <Text style={styles.errorText}>
                  {mensajeError}
                </Text>
              ) : null}

              {mensajeExito ? (
                <Text style={styles.successText}>
                  {mensajeExito}
                </Text>
              ) : null}

              <Animated.View
                style={[
                  styles.loginButtonWrapper,
                  {
                    transform: [{ scale: buttonScale }],
                  },
                ]}
              >
                <Pressable
                  onPress={iniciarSesion}
                  disabled={iniciandoSesion}
                  style={({ pressed }) => [
                    styles.pressable,
                    pressed && styles.buttonPressed,
                    iniciandoSesion && styles.buttonDisabled,
                  ]}
                >
                  <LinearGradient
                    colors={['#168CFF', '#7047FF', '#E02BFF']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.loginButton}
                  >
                    <Image
                      source={require('../../assets/images/icono-login.png')}
                      style={styles.loginIcon}
                      resizeMode="contain"
                    />

                    <Text style={styles.buttonText}>
                      {iniciandoSesion
                        ? 'Iniciando sesión...'
                        : 'Iniciar sesión'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />

                <Text style={styles.dividerText}>o</Text>

                <View style={styles.divider} />
              </View>

              <Pressable
  onPress={() => router.push('/registro')}
  disabled={iniciandoSesion}
  style={({ pressed }) => [
    styles.createAccountButton,
    pressed && styles.buttonPressed,
  ]}
>
                <Image
                  source={require('../../assets/images/icono-registro.png')}
                  style={styles.registerIcon}
                  resizeMode="contain"
                />

                <Text style={styles.buttonText}>
                  Crear cuenta
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.back()}
              disabled={iniciandoSesion}
              style={styles.backButton}
            >
              <Ionicons
                name="chevron-back"
                size={19}
                color="#AAA6B2"
              />

              <Text style={styles.backText}>Volver</Text>
            </Pressable>
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
    backgroundColor: 'rgba(2, 1, 8, 0.30)',
  },

  safeArea: {
    flex: 1,
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingTop: 8,
    paddingBottom: 24,
  },

  logo: {
    width: '100%',
    height: 225,
    alignSelf: 'center',
  },

  titleContainer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 48,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: '#D0CBD8',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
  },

  form: {
    width: '100%',
  },

  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },

  inputGradient: {
    width: '100%',
    minHeight: 62,
    borderRadius: 16,
    padding: 1.5,
    marginBottom: 29,
  },

  inputContainer: {
    flex: 1,
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14.5,
    backgroundColor: 'rgba(7, 4, 17, 0.94)',
    paddingHorizontal: 16,
  },

  neonIcon: {
    width: 30,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#E34BFF',
    shadowOpacity: 0.9,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 5,
  },

  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
  },

  eyeButton: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    color: '#FF6B9E',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 10,
  },

  successText: {
    color: '#B87CFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 10,
  },

  loginButtonWrapper: {
    width: '100%',
    borderRadius: 16,
    marginTop: 16,
  },

  pressable: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },

  loginButton: {
    width: '100%',
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 12,
    paddingHorizontal: 22,
  },

  loginIcon: {
    width: 27,
    height: 27,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  dividerContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 29,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(170, 155, 195, 0.35)',
  },

  dividerText: {
    color: '#A8A2B1',
    fontSize: 15,
    marginHorizontal: 14,
  },

  createAccountButton: {
    width: '100%',
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#477BFF',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 3, 12, 0.82)',
    gap: 12,
    paddingHorizontal: 22,
  },

  registerIcon: {
    width: 30,
    height: 30,
  },

  buttonPressed: {
    opacity: 0.82,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 34,
    paddingVertical: 8,
    paddingRight: 12,
  },

  backText: {
    color: '#AAA6B2',
    fontSize: 15,
    fontWeight: '600',
  },
});
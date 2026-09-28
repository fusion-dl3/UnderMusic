import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  COMUNAS_POR_REGION,
  PAISES,
  REGIONES_POR_PAIS,
} from '../constants/ubicaciones';

type TipoSelector = 'pais' | 'region' | 'comuna' | null;

export default function RegistroScreen() {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [correoCuenta, setCorreoCuenta] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [rol, setRol] = useState<'artista' | 'oyente' | null>(null);

  const [pais, setPais] = useState('');
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');

  const [priorizarComuna, setPriorizarComuna] = useState<boolean | null>(
    null
  );

  const [selectorAbierto, setSelectorAbierto] =
    useState<TipoSelector>(null);
  
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

  const obtenerOpcionesSelector = () => {
    if (selectorAbierto === 'pais') {
      return PAISES;
    }

    if (selectorAbierto === 'region') {
      return pais ? REGIONES_POR_PAIS[pais] ?? [] : [];
    }

    if (selectorAbierto === 'comuna') {
      return region ? COMUNAS_POR_REGION[region] ?? [] : [];
    }

    return [];
  };

  const seleccionarOpcion = (opcion: string) => {
    if (selectorAbierto === 'pais') {
      setPais(opcion);
      setRegion('');
      setComuna('');
    }

    if (selectorAbierto === 'region') {
      setRegion(opcion);
      setComuna('');
    }

    if (selectorAbierto === 'comuna') {
      setComuna(opcion);
    }

    setSelectorAbierto(null);
  };

  const probarRegistroVisual = () => {
    console.log('Formulario visual de registro listo para conectar.');
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/registro-fondo.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.darkOverlay} />

        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={require('../../assets/images/undermusic-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />

              <View style={styles.titleContainer}>
                <Text style={styles.title}>Crear cuenta</Text>

                <Text style={styles.subtitle}>
                  Únete a la comunidad y descubre talento musical cerca de ti.
                </Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Nombre de usuario</Text>

                <LinearGradient
                  colors={['#7137A8', '#7137A8']}
                  style={styles.inputGradient}
                >
                  <View style={styles.inputContainer}>
                    <View style={styles.neonIcon}>
                      <Ionicons
                        name="person-outline"
                        size={23}
                        color="#D86CFF"
                      />
                    </View>

                    <Text style={styles.atSymbol}>@</Text>

                    <TextInput
                      style={styles.input}
                      placeholder="nombreusuario"
                      placeholderTextColor="#777184"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={nombreUsuario}
                      onChangeText={setNombreUsuario}
                    />
                  </View>
                </LinearGradient>

                <Text style={styles.label}>Correo electrónico</Text>

                <LinearGradient
                  colors={['#7137A8', '#7137A8']}
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
                      value={correoCuenta}
                      onChangeText={setCorreoCuenta}
                    />
                  </View>
                </LinearGradient>

                <Text style={styles.label}>Contraseña</Text>

                <LinearGradient
                  colors={['#7137A8', '#7137A8']}
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
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor="#777184"
                      secureTextEntry={!mostrarPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={password}
                      onChangeText={setPassword}
                    />

                    <Pressable
                      onPress={() => setMostrarPassword(!mostrarPassword)}
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

                <Text style={styles.sectionTitle}>Tipo de cuenta</Text>

                <View style={styles.roleRow}>
                  <Pressable
                    onPress={() => setRol('artista')}
                    style={[
                      styles.roleCard,
                      rol === 'artista' && styles.roleCardActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.roleIconCircle,
                        rol === 'artista' && styles.roleIconCircleActive,
                      ]}
                    >
                      <Ionicons
                        name="mic-outline"
                        size={27}
                        color={
                          rol === 'artista' ? '#F07CFF' : '#9D94AA'
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.roleTitle,
                        rol === 'artista' && styles.roleTitleActive,
                      ]}
                    >
                      Artista
                    </Text>

                    <Text style={styles.roleDescription}>
                      Publica tu música y conecta con nuevos oyentes.
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setRol('oyente')}
                    style={[
                      styles.roleCard,
                      rol === 'oyente' && styles.roleCardActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.roleIconCircle,
                        rol === 'oyente' && styles.roleIconCircleActive,
                      ]}
                    >
                      <Ionicons
                        name="headset-outline"
                        size={28}
                        color={
                          rol === 'oyente' ? '#69B7FF' : '#9D94AA'
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.roleTitle,
                        rol === 'oyente' && styles.roleTitleActive,
                      ]}
                    >
                      Oyente
                    </Text>

                    <Text style={styles.roleDescription}>
                      Descubre artistas y música emergente cerca de ti.
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="location-outline"
                    size={24}
                    color="#D86CFF"
                  />

                  <Text style={styles.sectionTitleNoMargin}>
                    Ubicación
                  </Text>
                </View>

                <Text style={styles.label}>País</Text>

                <Selector
                  icon="globe-outline"
                  texto={pais || 'Selecciona tu país'}
                  seleccionado={Boolean(pais)}
                  onPress={() => setSelectorAbierto('pais')}
                />

                <Text style={styles.label}>Región</Text>

                <Selector
                  icon="map-outline"
                  texto={region || 'Selecciona tu región'}
                  seleccionado={Boolean(region)}
                  disabled={!pais}
                  onPress={() => setSelectorAbierto('region')}
                />

                <Text style={styles.label}>Comuna</Text>

                <Selector
                  icon="business-outline"
                  texto={comuna || 'Selecciona tu comuna'}
                  seleccionado={Boolean(comuna)}
                  disabled={!region}
                  onPress={() => setSelectorAbierto('comuna')}
                />

                <Text style={styles.priorityTitle}>
                  ¿Quieres priorizar artistas de tu comuna?
                </Text>

                <Text style={styles.priorityDescription}>
                  Puedes cambiar esta preferencia más adelante.
                </Text>

                <View style={styles.priorityRow}>
                  <Pressable
                    onPress={() => setPriorizarComuna(true)}
                    style={[
                      styles.priorityButton,
                      priorizarComuna === true &&
                        styles.priorityButtonActive,
                    ]}
                  >
                    <Ionicons
                      name="location"
                      size={21}
                      color={
                        priorizarComuna === true
                          ? '#FFFFFF'
                          : '#A69EAF'
                      }
                    />

                    <Text
                      style={[
                        styles.priorityButtonText,
                        priorizarComuna === true &&
                          styles.priorityButtonTextActive,
                      ]}
                    >
                      Sí
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setPriorizarComuna(false)}
                    style={[
                      styles.priorityButton,
                      priorizarComuna === false &&
                        styles.priorityButtonActive,
                    ]}
                  >
                    <Ionicons
                      name="musical-notes-outline"
                      size={21}
                      color={
                        priorizarComuna === false
                          ? '#FFFFFF'
                          : '#A69EAF'
                      }
                    />

                    <Text
                      style={[
                        styles.priorityButtonText,
                        priorizarComuna === false &&
                          styles.priorityButtonTextActive,
                      ]}
                    >
                      No
                    </Text>
                  </Pressable>
                </View>

                <Animated.View
  style={{
    transform: [{ scale: buttonScale }],
  }}
>
  <Pressable
    onPress={probarRegistroVisual}
    style={({ pressed }) => [
      styles.registerPressable,
      pressed && styles.buttonPressed,
    ]}
  >
    <LinearGradient
      colors={['#168CFF', '#7047FF', '#E02BFF']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.registerButton}
    >
      <Image
        source={require('../../assets/images/icono-registro.png')}
        style={styles.registerIcon}
        resizeMode="contain"
      />

      <Text style={styles.registerButtonText}>
        Registrarse
      </Text>
    </LinearGradient>
  </Pressable>
</Animated.View>

                <View style={styles.loginContainer}>
                  <Text style={styles.loginQuestion}>
                    ¿Ya tienes una cuenta?
                  </Text>

                  <Pressable onPress={() => router.replace('/login')}>
                    <Text style={styles.loginLink}>
                      Inicia sesión
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => router.back()}
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
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <Modal
          visible={selectorAbierto !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectorAbierto(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setSelectorAbierto(null)}
          >
            <Pressable
              style={styles.modalCard}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectorAbierto === 'pais'
                    ? 'Selecciona tu país'
                    : selectorAbierto === 'region'
                      ? 'Selecciona tu región'
                      : 'Selecciona tu comuna'}
                </Text>

                <Pressable
                  onPress={() => setSelectorAbierto(null)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close"
                    size={26}
                    color="#D7D1DD"
                  />
                </Pressable>
              </View>

              <ScrollView
                style={styles.optionsScroll}
                showsVerticalScrollIndicator={false}
              >
                {obtenerOpcionesSelector().map((opcion) => (
                  <Pressable
                    key={opcion}
                    onPress={() => seleccionarOpcion(opcion)}
                    style={({ pressed }) => [
                      styles.optionButton,
                      pressed && styles.optionButtonPressed,
                    ]}
                  >
                    <Text style={styles.optionText}>
                      {opcion}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#8E849A"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </ImageBackground>
    </View>
  );
}

type SelectorProps = {
  icon:
    | 'globe-outline'
    | 'map-outline'
    | 'business-outline';
  texto: string;
  seleccionado: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function Selector({
  icon,
  texto,
  seleccionado,
  disabled = false,
  onPress,
}: SelectorProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.selectorOuter,
        disabled && styles.selectorDisabled,
      ]}
    >
      <View style={styles.selectorInner}>
        <View style={styles.neonIcon}>
          <Ionicons
            name={icon}
            size={23}
            color={disabled ? '#625D69' : '#D86CFF'}
          />
        </View>

        <Text
          style={[
            styles.selectorText,
            seleccionado && styles.selectorTextSelected,
            disabled && styles.selectorTextDisabled,
          ]}
          numberOfLines={1}
        >
          {texto}
        </Text>

        <Ionicons
          name="chevron-down"
          size={21}
          color={disabled ? '#625D69' : '#A69EAF'}
        />
      </View>
    </Pressable>
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
    backgroundColor: 'rgba(2, 1, 8, 0.34)',
  },

  safeArea: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingTop: 4,
    paddingBottom: 45,
  },

  logo: {
    width: '100%',
    height: 185,
    alignSelf: 'center',
  },

  titleContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 36,
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
    maxWidth: 400,
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
    minHeight: 60,
    borderRadius: 16,
    padding: 1.5,
    marginBottom: 24,
  },

  inputContainer: {
    flex: 1,
    minHeight: 57,
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

  atSymbol: {
    color: '#AFA8B8',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 2,
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

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 14,
  },

  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 36,
  },

  roleCard: {
    flex: 1,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(117, 91, 139, 0.55)',
    borderRadius: 18,
    backgroundColor: 'rgba(7, 4, 17, 0.90)',
    paddingHorizontal: 12,
    paddingVertical: 17,
  },

  roleCardActive: {
    borderColor: '#B347FF',
    backgroundColor: 'rgba(50, 15, 72, 0.88)',
    shadowColor: '#B347FF',
    shadowOpacity: 0.55,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 5,
  },

  roleIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(83, 67, 96, 0.30)',
    marginBottom: 9,
  },

  roleIconCircleActive: {
    backgroundColor: 'rgba(137, 46, 180, 0.25)',
  },

  roleTitle: {
    color: '#C7C0CE',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 5,
  },

  roleTitleActive: {
    color: '#FFFFFF',
  },

  roleDescription: {
    color: '#938B9B',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 18,
  },

  sectionTitleNoMargin: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },

  selectorOuter: {
    width: '100%',
    minHeight: 60,
    borderWidth: 1.5,
    borderColor: '#7137A8',
    borderRadius: 16,
    padding: 1,
    marginBottom: 24,
  },

  selectorInner: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(7, 4, 17, 0.94)',
    paddingHorizontal: 16,
  },

  selectorText: {
    flex: 1,
    color: '#777184',
    fontSize: 16,
  },

  selectorTextSelected: {
    color: '#FFFFFF',
  },

  selectorDisabled: {
    opacity: 0.52,
  },

  selectorTextDisabled: {
    color: '#777184',
  },

  priorityTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 5,
    textAlign: 'center',
  },

  priorityDescription: {
    color: '#9991A1',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 15,
  },

  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 34,
  },

  priorityButton: {
    minWidth: 105,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(117, 91, 139, 0.65)',
    borderRadius: 14,
    backgroundColor: 'rgba(7, 4, 17, 0.92)',
  },

  priorityButtonActive: {
    borderColor: '#B347FF',
    backgroundColor: 'rgba(104, 35, 150, 0.78)',
  },

  priorityButtonText: {
    color: '#A69EAF',
    fontSize: 15,
    fontWeight: '800',
  },

  priorityButtonTextActive: {
    color: '#FFFFFF',
  },

  registerPressable: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },

  registerButton: {
    width: '100%',
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 12,
    paddingHorizontal: 22,
  },

  registerIcon: {
    width: 30,
    height: 30,
  },

  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.82,
  },

  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 25,
  },

  loginQuestion: {
    color: '#AFA8B8',
    fontSize: 14,
  },

  loginLink: {
    color: '#4FA3FF',
    fontSize: 14,
    fontWeight: '800',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 28,
    paddingVertical: 8,
    paddingRight: 12,
  },

  backText: {
    color: '#AAA6B2',
    fontSize: 15,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
  },

  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '70%',
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: '#7137A8',
    borderRadius: 20,
    backgroundColor: '#0B0712',
    overflow: 'hidden',
  },

  modalHeader: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(129, 92, 156, 0.30)',
    paddingHorizontal: 20,
  },

  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  optionsScroll: {
    width: '100%',
  },

  optionButton: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(129, 92, 156, 0.18)',
    paddingHorizontal: 20,
  },

  optionButtonPressed: {
    backgroundColor: 'rgba(122, 51, 165, 0.22)',
  },

  optionText: {
    color: '#E8E2EC',
    fontSize: 16,
    fontWeight: '600',
  },
});
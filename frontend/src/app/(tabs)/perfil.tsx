import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Usuario = {
  id: string;
  nombreUsuario: string;
  correoCuenta: string;
  rol: 'oyente' | 'artista';
  fotoPerfil: string | null;
  ubicacion: {
    pais: string;
    region: string;
    comuna: string;
  };
  generosFavoritos: string[];
  priorizarComuna: boolean;
};

export default function PerfilScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
  useCallback(() => {
    cargarPerfil();
  }, [])
);;

  const cargarPerfil = async () => {
    try {
      setCargando(true);
      setError('');

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        setError('No encontramos una sesión activa.');
        return;
      }

      const respuesta = await fetch(
        'http://192.168.1.14:3000/api/usuarios/me',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.message || 'No fue posible cargar tu perfil.'
        );
        return;
      }

      setUsuario(datos.usuario);
    } catch (error) {
      console.error('Error al cargar el perfil:', error);

      setError('No fue posible conectar con UnderMusic.');
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#B64DFF" />

        <Text style={styles.loadingText}>
          Cargando tu perfil...
        </Text>
      </View>
    );
  }

  if (error || !usuario) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color="#FF5FA2"
        />

        <Text style={styles.errorText}>
          {error || 'No fue posible cargar tu perfil.'}
        </Text>
      </View>
    );
  }

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
            <Text style={styles.headerTitle}>
              Mi perfil
            </Text>

            <View style={styles.headerActions}>
              <Pressable
  onPress={() => {
    router.push('/editar-perfil');
  }}
  style={({ pressed }) => [
    styles.headerButton,
    pressed && styles.buttonPressed,
  ]}
>
                <Ionicons
                  name="pencil-outline"
                  size={27}
                  color="#FFFFFF"
                />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={28}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarBorder}>
  <View style={styles.avatar}>
    {usuario.fotoPerfil ? (
      <Image
        source={{
          uri: `http://192.168.1.14:3000/api/usuarios/foto-perfil/${usuario.fotoPerfil}`,
        }}
        style={styles.avatarImage}
        resizeMode="cover"
      />
    ) : (
      <Ionicons
        name="person"
        size={72}
        color="#D8A6FF"
      />
    )}
  </View>
</View>

            <Text style={styles.username}>
              @{usuario.nombreUsuario}
            </Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {usuario.rol === 'artista'
                  ? 'ARTISTA'
                  : 'OYENTE'}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={27}
                color="#54E6FF"
              />

              <Text style={styles.locationText}>
                {usuario.ubicacion.comuna},{' '}
                {usuario.ubicacion.region}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.preferencesSection}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="musical-notes-outline"
                size={27}
                color="#E05BFF"
              />

              <Text style={styles.sectionTitle}>
                Preferencias musicales
              </Text>
            </View>

            {usuario.generosFavoritos.length > 0 ? (
              <View style={styles.genresContainer}>
                {usuario.generosFavoritos.map((genero) => (
                  <View
                    key={genero}
                    style={styles.genreChip}
                  >
                    <Text style={styles.genreText}>
                      {genero}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyPreferences}>
                <Text style={styles.emptyTitle}>
                  Aún no has seleccionado tus géneros favoritos
                </Text>

                <Text style={styles.emptyDescription}>
                  Elige los estilos de música que más te gustan
                  para mejorar tus recomendaciones.
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.chooseGenresButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={21}
                    color="#FFFFFF"
                  />

                  <Text style={styles.chooseGenresText}>
                    Elegir mis géneros
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.localPreferenceCard}>
              <View style={styles.localPreferenceIcon}>
                <Ionicons
                  name="location"
                  size={23}
                  color="#61E4FF"
                />
              </View>

              <View style={styles.localPreferenceInfo}>
                <Text style={styles.localPreferenceTitle}>
                  Priorizar artistas de mi comuna
                </Text>

                <Text style={styles.localPreferenceSubtitle}>
                  Da mayor prioridad a artistas cercanos a ti.
                </Text>
              </View>

              <View
                style={[
                  styles.preferenceStatus,
                  usuario.priorizarComuna &&
                    styles.preferenceStatusActive,
                ]}
              >
                <Text
                  style={[
                    styles.preferenceStatusText,
                    usuario.priorizarComuna &&
                      styles.preferenceStatusTextActive,
                  ]}
                >
                  {usuario.priorizarComuna ? 'Sí' : 'No'}
                </Text>
              </View>
            </View>
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

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020106',
    paddingHorizontal: 30,
  },

  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 50,
  },

  header: {
    minHeight: 64,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 28,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },

  headerActions: {
    position: 'absolute',
    right: 0,
    top: 4,
    flexDirection: 'row',
    gap: 10,
  },

  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 18, 54, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(187, 81, 255, 0.65)',
  },

  buttonPressed: {
    opacity: 0.72,
  },

  profileSection: {
    alignItems: 'center',
  },

  avatarBorder: {
    width: 170,
    height: 170,
    borderRadius: 43,
    padding: 3,
    backgroundColor: '#7C39FF',
    marginBottom: 18,
  },

  avatar: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: '#171026',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarImage: {
  width: '100%',
  height: '100%',
  borderRadius: 40,
},

  username: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    textAlign: 'center',
  },

  roleBadge: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(105, 35, 167, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(196, 87, 255, 0.45)',
  },

  roleText: {
    color: '#E0A4FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingHorizontal: 15,
  },

  locationText: {
    flexShrink: 1,
    color: '#D7D1DE',
    fontSize: 17,
    marginLeft: 8,
    textAlign: 'center',
  },

  divider: {
    height: 2,
    width: '100%',
    backgroundColor: 'rgba(126, 70, 220, 0.45)',
    marginTop: 31,
    marginBottom: 27,
  },

  preferencesSection: {
    width: '100%',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    marginLeft: 10,
  },

  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  genreChip: {
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: 'rgba(76, 21, 121, 0.78)',
    borderWidth: 1,
    borderColor: '#A346FF',
  },

  genreText: {
    color: '#E8C9FF',
    fontSize: 14,
    fontWeight: '700',
  },

  emptyPreferences: {
    width: '100%',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 19,
    backgroundColor: 'rgba(12, 7, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(137, 63, 209, 0.52)',
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  emptyDescription: {
    color: '#AAA3B3',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },

  chooseGenresButton: {
    alignSelf: 'flex-start',
    minHeight: 43,
    marginTop: 17,
    paddingHorizontal: 17,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(116, 47, 206, 0.88)',
    borderWidth: 1,
    borderColor: '#C256FF',
  },

  chooseGenresText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 7,
  },

  localPreferenceCard: {
    width: '100%',
    minHeight: 92,
    marginTop: 22,
    borderRadius: 22,
    paddingHorizontal: 17,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 7, 28, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(61, 195, 255, 0.35)',
  },

  localPreferenceIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28, 139, 181, 0.18)',
  },

  localPreferenceInfo: {
    flex: 1,
    marginHorizontal: 13,
  },

  localPreferenceTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  localPreferenceSubtitle: {
    color: '#9E98A7',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  preferenceStatus: {
    minWidth: 48,
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(86, 80, 96, 0.45)',
  },

  preferenceStatusActive: {
    backgroundColor: 'rgba(146, 49, 217, 0.65)',
  },

  preferenceStatusText: {
    color: '#B9B2C0',
    fontSize: 13,
    fontWeight: '800',
  },

  preferenceStatusTextActive: {
    color: '#F0C7FF',
  },

  loadingText: {
    color: '#BDB5C6',
    fontSize: 14,
    marginTop: 14,
  },

  errorText: {
    color: '#FF8AAF',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
  },
});
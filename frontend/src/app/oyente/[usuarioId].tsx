import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://192.168.1.5:3000';

type UsuarioPublico = {
  id: string;
  nombreUsuario: string;
  rol: 'oyente' | 'artista';
  fotoPerfil: string | null;
  ubicacion: { pais: string; region: string; comuna: string } | null;
  generosFavoritos: string[];
};

export default function PerfilPublicoOyente() {
  const { usuarioId } = useLocalSearchParams<{ usuarioId: string }>();
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setCargando(true);
      setError('');
      setUsuario(null);
      try {
        if (!usuarioId) throw new Error('No se indicó el usuario.');
        const token = await SecureStore.getItemAsync('token');
        if (!token) throw new Error('Inicia sesión para ver este perfil.');
        const respuesta = await fetch(`${API_URL}/api/usuarios/publico/${encodeURIComponent(usuarioId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos?.message || 'No se pudo cargar el perfil.');
        if (!datos?.usuario || datos.usuario.rol !== 'oyente') {
          throw new Error('Este perfil no corresponde a un oyente.');
        }
        if (activo) setUsuario(datos.usuario);
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'Error al consultar el perfil.');
      } finally {
        if (activo) setCargando(false);
      }
    };
    void cargar();
    return () => { activo = false; };
  }, [usuarioId]);

  const generos = Array.isArray(usuario?.generosFavoritos) ? usuario.generosFavoritos : [];

  return (
    <ImageBackground source={require('../../../assets/images/fondo-app.png')} style={styles.fondo} resizeMode="cover">
      <SafeAreaView style={styles.seguro} edges={['top', 'bottom']}>
        <View style={styles.encabezado}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" style={styles.volver}>
            <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.titulo}>Perfil de oyente</Text>
        </View>
        {cargando ? (
          <View style={styles.centro}><ActivityIndicator size="large" color="#B64DFF" /><Text style={styles.estado}>Cargando perfil...</Text></View>
        ) : error || !usuario ? (
          <View style={styles.centro}><Ionicons name="alert-circle-outline" size={44} color="#FF83B3" /><Text style={styles.estado}>{error || 'Perfil no disponible.'}</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.contenido}>
            <View style={styles.avatarBorde}>
              <View style={styles.avatar}>
                {usuario.fotoPerfil ? (
                  <Image source={{ uri: `${API_URL}/api/usuarios/foto-perfil/${usuario.fotoPerfil}` }} style={styles.foto} resizeMode="cover" />
                ) : <Ionicons name="person" size={72} color="#D8A6FF" />}
              </View>
            </View>
            <Text style={styles.nombre}>@{usuario.nombreUsuario}</Text>
            <View style={styles.insignia}><Text style={styles.textoInsignia}>OYENTE</Text></View>
            {usuario.ubicacion && (usuario.ubicacion.comuna || usuario.ubicacion.region) ? (
              <View style={styles.ubicacion}>
                <Ionicons name="location-outline" size={22} color="#54E6FF" />
                <Text style={styles.textoUbicacion}>
                  {[usuario.ubicacion.comuna, usuario.ubicacion.region].filter(Boolean).join(', ')}
                </Text>
              </View>
            ) : null}
            <View style={styles.tarjetaGeneros}>
              <View style={styles.encabezadoGeneros}>
                <Ionicons name="headset-outline" size={22} color="#D8A6FF" />
                <Text style={styles.tituloGeneros}>Géneros musicales favoritos</Text>
              </View>
              {generos.length ? (
                <View style={styles.listaGeneros}>
                  {generos.map((genero, indice) => (
                    <View key={`${genero}-${indice}`} style={styles.genero}>
                      <Text style={styles.textoGenero}>{genero}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.sinGeneros}>Este oyente aún no ha seleccionado sus géneros musicales favoritos.</Text>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#020106' },
  seguro: { flex: 1 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingVertical: 18 },
  volver: { padding: 4 },
  titulo: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15, paddingHorizontal: 30 },
  estado: { color: '#D7D1DE', textAlign: 'center', fontSize: 15 },
  contenido: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 38, paddingBottom: 50 },
  avatarBorde: { width: 170, height: 170, borderRadius: 43, padding: 3, backgroundColor: '#7C39FF', marginBottom: 18 },
  avatar: { flex: 1, borderRadius: 40, overflow: 'hidden', backgroundColor: '#171026', alignItems: 'center', justifyContent: 'center' },
  foto: { width: '100%', height: '100%' },
  nombre: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  insignia: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(105,35,167,0.48)', borderWidth: 1, borderColor: 'rgba(196,87,255,0.45)' },
  textoInsignia: { color: '#E0A4FF', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  ubicacion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 },
  textoUbicacion: { color: '#D7D1DE', fontSize: 15, textAlign: 'center', flexShrink: 1 },
  tarjetaGeneros: { alignSelf: 'stretch', marginTop: 30, padding: 18, borderRadius: 20, backgroundColor: 'rgba(18, 10, 39, 0.88)', borderWidth: 1, borderColor: 'rgba(170, 95, 235, 0.38)' },
  encabezadoGeneros: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  tituloGeneros: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', flexShrink: 1 },
  listaGeneros: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  genero: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(111, 49, 177, 0.32)', borderWidth: 1, borderColor: 'rgba(194, 117, 255, 0.50)' },
  textoGenero: { color: '#E9C5FF', fontSize: 13, fontWeight: '700' },
  sinGeneros: { color: '#BFB3D0', fontSize: 14, lineHeight: 21 },
});

import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { router, useFocusEffect } from 'expo-router';
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

const API_URL = 'http://192.168.1.14:3000';

type FiltroBiblioteca = 'todos' | 'artistas' | 'gustas' | 'guardadas';

type ArtistaSeguido = {
  usuarioId: string;
  nombreUsuario: string;
  nombreArtistico: string;
  fotoPerfil: string | null;
  generoPrincipal: string;
  ubicacion: {
    pais: string;
    region: string;
    comuna: string;
  };
  fechaSeguimiento: string;
};

const filtros: { id: Exclude<FiltroBiblioteca, 'todos'>; titulo: string }[] = [
  { id: 'artistas', titulo: 'Artistas seguidos' },
  { id: 'gustas', titulo: 'Me gusta' },
  { id: 'guardadas', titulo: 'Guardadas' },
];

export default function BibliotecaScreen() {
  const [filtroActivo, setFiltroActivo] = useState<FiltroBiblioteca>('todos');
  const [artistas, setArtistas] = useState<ArtistaSeguido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      const cargarArtistas = async () => {
        setCargando(true);
        setError('');

        try {
          const token = await SecureStore.getItemAsync('token');
          if (!token) {
            throw new Error('Inicia sesión para ver tus artistas seguidos.');
          }

          const respuesta = await fetch(`${API_URL}/api/seguimientos/me/artistas`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const datos = await respuesta.json();
          if (!respuesta.ok) {
            throw new Error(datos.message || 'No fue posible cargar tus artistas seguidos.');
          }
          if (!Array.isArray(datos.artistas)) {
            throw new Error('La respuesta de artistas seguidos no es válida.');
          }

          if (activo) setArtistas(datos.artistas);
        } catch (err) {
          if (activo) {
            setError(err instanceof Error ? err.message : 'No fue posible conectar con UnderMusic.');
          }
        } finally {
          if (activo) setCargando(false);
        }
      };

      void cargarArtistas();
      return () => { activo = false; };
    }, [intento])
  );

  const mostrarArtistas = filtroActivo === 'todos' || filtroActivo === 'artistas';
  const mostrarGustas = filtroActivo === 'todos' || filtroActivo === 'gustas';
  const mostrarGuardadas = filtroActivo === 'todos' || filtroActivo === 'guardadas';

  const cambiarFiltro = (filtro: Exclude<FiltroBiblioteca, 'todos'>) => {
    setFiltroActivo(actual => actual === filtro ? 'todos' : filtro);
  };

  const renderizarArtistas = () => {
    if (cargando) {
      return (
        <View style={styles.estadoContenedor}>
          <ActivityIndicator color="#D75BFF" size="large" />
          <Text style={styles.estadoDescripcion}>Cargando tus artistas...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.estadoContenedor}>
          <Ionicons name="alert-circle-outline" size={35} color="#FF7BB9" />
          <Text style={styles.estadoDescripcion}>{error}</Text>
          <Pressable onPress={() => setIntento(actual => actual + 1)} style={styles.reintentarBoton}>
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    if (artistas.length === 0) {
      return (
        <View style={[styles.estadoContenedor, styles.estadoArtistas]}>
          <Ionicons name="people-outline" size={36} color="#DB78FF" />
          <Text style={styles.estadoTitulo}>Todavía no sigues artistas</Text>
          <Text style={styles.estadoDescripcion}>Cuando sigas a un artista, aparecerá aquí.</Text>
        </View>
      );
    }

    return (
      <View style={styles.listaArtistas}>
        {artistas.map(artista => {
          const ubicacion = [artista.ubicacion?.comuna, artista.ubicacion?.region]
            .filter(Boolean).join(', ');
          return (
            <Pressable
              key={String(artista.usuarioId)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir perfil de ${artista.nombreArtistico || artista.nombreUsuario}`}
              onPress={() => router.push({
                pathname: '/artista/[usuarioId]',
                params: { usuarioId: String(artista.usuarioId) },
              })}
              style={({ pressed }) => [styles.tarjetaArtista, pressed && styles.presionado]}
            >
              <View style={styles.fotoContenedor}>
                {artista.fotoPerfil ? (
                  <Image
                    source={{ uri: `${API_URL}/api/usuarios/foto-perfil/${artista.fotoPerfil}` }}
                    style={styles.fotoArtista}
                  />
                ) : (
                  <Ionicons name="person" size={29} color="#E4B7FF" />
                )}
              </View>
              <View style={styles.datosArtista}>
                <Text style={styles.nombreArtista} numberOfLines={1}>
                  {artista.nombreArtistico || artista.nombreUsuario}
                </Text>
                <Text style={styles.detalleArtista} numberOfLines={1}>
                  @{artista.nombreUsuario}{artista.generoPrincipal ? ` · ${artista.generoPrincipal}` : ''}
                </Text>
                {!!ubicacion && (
                  <View style={styles.ubicacionFila}>
                    <Ionicons name="location-outline" size={13} color="#64DFFF" />
                    <Text style={styles.ubicacionTexto} numberOfLines={1}>{ubicacion}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={22} color="#DB78FF" />
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderizarPendiente = (tipo: 'gustas' | 'guardadas') => (
    <View style={[styles.estadoContenedor, tipo === 'gustas' ? styles.estadoGustas : styles.estadoGuardadas]}>
      <Ionicons
        name={tipo === 'gustas' ? 'heart-outline' : 'bookmark-outline'}
        size={36}
        color={tipo === 'gustas' ? '#FF73BB' : '#65E3FF'}
      />
      <Text style={styles.estadoTitulo}>
        {tipo === 'gustas' ? 'Tus canciones favoritas' : 'Tus canciones guardadas'}
      </Text>
      <Text style={styles.estadoDescripcion}>
        {tipo === 'gustas'
          ? 'Próximamente podrás encontrar aquí las canciones que te gustan.'
          : 'Próximamente podrás guardar canciones y encontrarlas aquí.'}
      </Text>
    </View>
  );

  return (
    <ImageBackground
      source={require('../../../assets/images/fondo-app.png')}
      style={styles.contenedor}
      resizeMode="cover"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>Tu biblioteca</Text>
          <Ionicons name="library-outline" size={29} color="#E15CFF" />
        </View>

        <View style={styles.filtrosFila}>
          {filtros.map(filtro => (
            <Pressable
              key={filtro.id}
              accessibilityRole="button"
              accessibilityState={{ selected: filtroActivo === filtro.id }}
              onPress={() => cambiarFiltro(filtro.id)}
              style={({ pressed }) => [
                styles.filtro,
                filtroActivo === filtro.id && styles.filtroActivo,
                pressed && styles.presionado,
              ]}
            >
              <Text style={[styles.filtroTexto, filtroActivo === filtro.id && styles.filtroTextoActivo]}>
                {filtro.titulo}
              </Text>
            </Pressable>
          ))}
        </View>

        {mostrarArtistas && (
          <View style={styles.seccion}>
            <View style={styles.seccionEncabezado}>
              <Text style={styles.seccionTitulo}>Artistas seguidos</Text>
              <Ionicons name="people-outline" size={23} color="#DB78FF" />
            </View>
            {renderizarArtistas()}
          </View>
        )}

        {mostrarGustas && (
          <View style={styles.seccion}>
            <View style={styles.seccionEncabezado}>
              <Text style={styles.seccionTitulo}>Me gusta</Text>
              <Ionicons name="heart-outline" size={23} color="#FF73BB" />
            </View>
            {renderizarPendiente('gustas')}
          </View>
        )}

        {mostrarGuardadas && (
          <View style={styles.seccion}>
            <View style={styles.seccionEncabezado}>
              <Text style={styles.seccionTitulo}>Canciones guardadas</Text>
              <Ionicons name="bookmark-outline" size={23} color="#65E3FF" />
            </View>
            {renderizarPendiente('guardadas')}
          </View>
        )}

        {!cargando && !error && artistas.length === 0 && filtroActivo === 'todos' && (
          <View style={styles.descubrirCaja}>
            <Ionicons name="sparkles-outline" size={25} color="#E4A3FF" />
            <Text style={styles.descubrirTitulo}>Descubre artistas emergentes</Text>
            <Text style={styles.descubrirDescripcion}>
              Explora UnderMusic y encuentra artistas para comenzar tu colección.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/busqueda')}
              style={({ pressed }) => [styles.descubrirBoton, pressed && styles.presionado]}
            >
              <Text style={styles.descubrirBotonTexto}>Explorar artistas</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#020106' },
  scroll: { flex: 1 },
  contenido: { width: '100%', maxWidth: 700, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 30, paddingBottom: 55 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 23 },
  titulo: { color: '#FFFFFF', fontSize: 29, fontWeight: '800' },
  filtrosFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 30 },
  filtro: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 25, backgroundColor: '#21112F', borderWidth: 1, borderColor: '#573070' },
  filtroActivo: { backgroundColor: '#61248C', borderColor: '#E16DFF' },
  filtroTexto: { color: '#D6C3E0', fontSize: 13, fontWeight: '700' },
  filtroTextoActivo: { color: '#FFFFFF' },
  presionado: { opacity: 0.72 },
  seccion: { marginBottom: 32 },
  seccionEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  seccionTitulo: { color: '#FFFFFF', fontSize: 21, fontWeight: '800', flexShrink: 1 },
  listaArtistas: { gap: 11 },
  tarjetaArtista: { minHeight: 84, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(23, 12, 43, 0.92)', borderWidth: 1, borderColor: 'rgba(143, 68, 205, 0.55)', flexDirection: 'row', alignItems: 'center', gap: 12 },
  fotoContenedor: { width: 59, height: 59, borderRadius: 15, backgroundColor: '#4B2370', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fotoArtista: { width: '100%', height: '100%' },
  datosArtista: { flex: 1, minWidth: 0 },
  nombreArtista: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  detalleArtista: { color: '#C9B3D9', fontSize: 12, marginTop: 4 },
  ubicacionFila: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  ubicacionTexto: { color: '#B6A9C4', fontSize: 12, flexShrink: 1 },
  estadoContenedor: { minHeight: 150, borderRadius: 19, backgroundColor: 'rgba(24, 13, 44, 0.78)', borderWidth: 1, borderColor: 'rgba(112, 58, 155, 0.55)', paddingHorizontal: 20, paddingVertical: 25, alignItems: 'center', justifyContent: 'center', gap: 9 },
  estadoArtistas: { backgroundColor: 'rgba(24, 13, 44, 0.78)', borderColor: 'rgba(112, 58, 155, 0.55)' },
  estadoGustas: { backgroundColor: 'rgba(65, 16, 45, 0.78)', borderColor: 'rgba(255, 115, 187, 0.58)' },
  estadoGuardadas: { backgroundColor: 'rgba(8, 44, 59, 0.78)', borderColor: 'rgba(101, 227, 255, 0.58)' },
  estadoTitulo: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  estadoDescripcion: { color: '#BDAEC9', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  reintentarBoton: { backgroundColor: '#6F2BA1', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, marginTop: 7 },
  reintentarTexto: { color: '#FFFFFF', fontWeight: '800' },
  descubrirCaja: { borderRadius: 20, padding: 22, alignItems: 'center', gap: 10, backgroundColor: '#241237', borderWidth: 1, borderColor: '#A34ED1', marginBottom: 12 },
  descubrirTitulo: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  descubrirDescripcion: { color: '#C9B6D7', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  descubrirBoton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8D35C8', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 12, marginTop: 7 },
  descubrirBotonTexto: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

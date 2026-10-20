
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
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
} from '../../constants/ubicaciones';
import { GENEROS_MUSICALES } from '../../constants/generos';

const API_URL = 'http://192.168.1.5:3000';

type TipoSelector = 'pais' | 'region' | 'comuna' | 'genero';

type Artista = {
  usuarioId: string;
  nombreUsuario: string;
  nombreArtistico: string;
  fotoPerfil: string | null;
  ubicacion: {
    pais: string;
    region: string;
    comuna: string;
  };
  generoPrincipal: string;
  generosAdicionales: string[];
};

type GeneroDisponible = { nombre: string; cantidadArtistas: number };
type RespuestaGeneros = { generos: GeneroDisponible[]; message?: string };

type RespuestaBusqueda = {
  artistas: Artista[];
  total: number;
  message?: string;
};

const COLORES = {
  blanco: '#FFFFFF',
  secundario: '#D5D0DE',
  violeta: '#7137A8',
  fucsia: '#F25CFF',
  fondoControl: 'rgba(11,7,22,0.94)',
};

export default function BusquedaScreen() {
  const router = useRouter();
  const solicitudActual = useRef(0);

  const [nombre, setNombre] = useState('');
  const [pais, setPais] = useState('');
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');
  const [genero, setGenero] = useState('');

  const [selectorAbierto, setSelectorAbierto] =
    useState<TipoSelector | null>(null);

  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [error, setError] = useState('');
  const [generosDisponibles, setGenerosDisponibles] = useState<GeneroDisponible[]>([]);
  const [cargandoGeneros, setCargandoGeneros] = useState(true);
  const [errorGeneros, setErrorGeneros] = useState('');
  const [generoExplorado, setGeneroExplorado] = useState('');
  const [tipoBusqueda, setTipoBusqueda] = useState<'filtros' | 'nombre' | 'explorar' | null>(null);

  useFocusEffect(useCallback(() => {
    let activo = true;
    const cargarGeneros = async () => {
      setCargandoGeneros(true);
      setErrorGeneros('');
      try {
        const respuesta = await fetch(`${API_URL}/api/canciones/generos/disponibles`);
        const datos: RespuestaGeneros = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.message || 'No se pudieron cargar los géneros.');
        if (activo) setGenerosDisponibles(datos.generos ?? []);
      } catch (err) {
        if (activo) setErrorGeneros(err instanceof Error ? err.message : 'Error de conexión.');
      } finally {
        if (activo) setCargandoGeneros(false);
      }
    };
    void cargarGeneros();
    return () => { activo = false; };
  }, []));

  const hayFiltros = Boolean(pais || region || comuna || genero);
  const limpiarFiltros = () => {
  solicitudActual.current += 1;
  setCargando(false);
  setPais('');
  setRegion('');
  setComuna('');
  setGenero('');
  setSelectorAbierto(null);
  setArtistas([]);
  setBusquedaRealizada(false);
  setError('');
  setGeneroExplorado('');
  setTipoBusqueda(null);
};

  const cambiarNombre = (texto: string) => {
    setNombre(texto);
    if (tipoBusqueda === 'nombre') {
      solicitudActual.current += 1;
      setCargando(false);
      setArtistas([]);
      setBusquedaRealizada(false);
      setError('');
      setTipoBusqueda(null);
    }
  };

  const borrarNombre = () => {
    setNombre('');
    if (tipoBusqueda === 'nombre') {
      solicitudActual.current += 1;
      setCargando(false);
      setArtistas([]);
      setBusquedaRealizada(false);
      setError('');
      setTipoBusqueda(null);
    }
  };

  const opcionesSelector = (): string[] => {
    switch (selectorAbierto) {
      case 'pais':
        return [...PAISES];

      case 'region':
        return [
          'Todas las regiones',
          ...(REGIONES_POR_PAIS[pais] ?? []),
        ];

      case 'comuna':
        return [
          'Todas las comunas',
          ...(COMUNAS_POR_REGION[region] ?? []),
        ];

      case 'genero':
        return [
          'Todos los géneros',
          ...GENEROS_MUSICALES,
        ];

      default:
        return [];
    }
  };

  const seleccionarOpcion = (opcion: string) => {
  if (selectorAbierto === 'pais') {
    if (opcion !== pais) {
      setPais(opcion);
      setRegion('');
      setComuna('');
    }
  }

  if (selectorAbierto === 'region') {
    const nuevaRegion =
      opcion === 'Todas las regiones' ? 'Todas' : opcion;

    if (nuevaRegion !== region) {
      setRegion(nuevaRegion);
      setComuna('');
    }
  }

  if (selectorAbierto === 'comuna') {
    setComuna(
      opcion === 'Todas las comunas' ? 'Todas' : opcion
    );
  }

  if (selectorAbierto === 'genero') {
    setGenero(
      opcion === 'Todos los géneros' ? 'Todos' : opcion
    );
  }

  setSelectorAbierto(null);
};

  const abrirSelector = (tipo: TipoSelector) => {
    if (tipo === 'region' && !pais) return;
    if (tipo === 'comuna' && (!region || region === 'Todas')) return;

    setSelectorAbierto(tipo);
  };

  const buscarArtistas = async (
    filtros: {
      nombre?: string;
      pais?: string;
      region?: string;
      comuna?: string;
      genero?: string;
    },
    permitirSoloNombre = false
  ) => {
    const tieneFiltro = Boolean(
      filtros.pais ||
      filtros.region ||
      filtros.comuna ||
      filtros.genero
    );

    if (!tieneFiltro && !permitirSoloNombre) return;

    const solicitud = ++solicitudActual.current;
    setCargando(true);
    setTipoBusqueda(permitirSoloNombre ? 'nombre' : 'filtros');
    setGeneroExplorado('');
    setError('');
    setBusquedaRealizada(true);

    try {
      const parametros = new URLSearchParams();

      if (filtros.nombre?.trim()) {
        parametros.append('nombre', filtros.nombre.trim());
      }

      if (filtros.pais) {
        parametros.append('pais', filtros.pais);
      }

      if (filtros.region && filtros.region !== 'Todas') {
        parametros.append('region', filtros.region);
      }

      if (filtros.comuna && filtros.comuna !== 'Todas') {
        parametros.append('comuna', filtros.comuna);
      }

      if (filtros.genero && filtros.genero !== 'Todos') {
        parametros.append('genero', filtros.genero);
      }

      const respuesta = await fetch(
        `${API_URL}/api/perfiles-artista/buscar?${parametros.toString()}`
      );

      const datos: RespuestaBusqueda = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.message || 'No se pudo realizar la búsqueda.'
        );
      }

      if (solicitud === solicitudActual.current) setArtistas(datos.artistas ?? []);
    } catch (err) {
      if (solicitud !== solicitudActual.current) return;
      setArtistas([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al buscar artistas.'
      );
    } finally {
      if (solicitud === solicitudActual.current) setCargando(false);
    }
  };

  const explorarGenero = async (nombreGenero: string) => {
  // Si presionamos nuevamente el género seleccionado,
  // quitamos la selección y ocultamos sus resultados.
  if (
    tipoBusqueda === 'explorar' &&
    generoExplorado === nombreGenero
  ) {
    solicitudActual.current += 1;

    setGeneroExplorado('');
    setTipoBusqueda(null);
    setArtistas([]);
    setBusquedaRealizada(false);
    setCargando(false);
    setError('');

    return;
  }

  if (cargando) return;
    const solicitud = ++solicitudActual.current;
    setGeneroExplorado(nombreGenero);
    setTipoBusqueda('explorar');
    setCargando(true);
    setError('');
    setArtistas([]);
    setBusquedaRealizada(true);
    try {
      const respuesta = await fetch(
        `${API_URL}/api/canciones/generos/artistas?genero=${encodeURIComponent(nombreGenero)}`
      );
      const datos: { usuarioIds?: string[]; message?: string } = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No fue posible explorar este género.');
      const ids = Array.isArray(datos.usuarioIds) ? datos.usuarioIds : [];
      const perfiles = await Promise.all(ids.map(async (id) => {
        const r = await fetch(`${API_URL}/api/perfiles-artista/${encodeURIComponent(id)}`);
        if (!r.ok) return null;
        const d: { artista?: Artista } = await r.json();
        return d.artista ? { ...d.artista, usuarioId: id } : null;
      }));
      if (solicitud === solicitudActual.current) setArtistas(perfiles.filter((perfil): perfil is Artista => perfil !== null));
    } catch (err) {
      if (solicitud !== solicitudActual.current) return;
      setArtistas([]);
      setError(err instanceof Error ? err.message : 'Ocurrió un error al explorar el género.');
    } finally {
      if (solicitud === solicitudActual.current) setCargando(false);
    }
  };

  const buscarPorFiltros = () => {
    buscarArtistas({ pais, region, comuna, genero });
  };

  const buscarPorNombre = () => {
    if (!nombre.trim()) return;

    buscarArtistas({ nombre }, true);
  };

  const etiquetaRegion =
    region === 'Todas' ? 'Todas las regiones' : region;

  const etiquetaComuna =
    comuna === 'Todas' ? 'Todas las comunas' : comuna;

  const etiquetaGenero =
    genero === 'Todos' ? 'Todos los géneros' : genero;

  const renderFiltro = (
    titulo: string,
    valor: string,
    tipo: TipoSelector,
    deshabilitado = false
  ) => (
    <Pressable
      key={tipo}
      disabled={deshabilitado}
      onPress={() => abrirSelector(tipo)}
      style={[
        styles.filterBox,
        deshabilitado && styles.filterDisabled,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          valor && styles.filterSelectedText,
        ]}
        numberOfLines={1}
      >
        {valor || titulo}
      </Text>

      <Ionicons
        name="chevron-down"
        size={20}
        color={deshabilitado ? '#6F647D' : '#BDA6E9'}
      />
    </Pressable>
  );

  return (
    <ImageBackground
      source={require('../../../assets/images/fondo-app.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topHeader}>
            <Text style={styles.topHeaderTitle}>
              Búsqueda
            </Text>

            <View style={styles.topHeaderIcon}>
              <Ionicons
                name="search-outline"
                size={34}
                color={COLORES.fucsia}
              />
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>
              Explorar artistas
            </Text>

            <Text style={styles.subtitle}>
              Descubre talento local
            </Text>
          </View>

          <View style={styles.searchBox}>
            <Pressable
              onPress={buscarPorNombre}
              disabled={!nombre.trim() || cargando}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Buscar por nombre artístico"
              style={styles.inlineSearchIcon}
            >
              <Ionicons
                name="search-outline"
                size={23}
                color={nombre.trim() ? '#F25CFF' : '#B9A9D1'}
              />
            </Pressable>

            <TextInput
              style={styles.searchInput}
              value={nombre}
              onChangeText={cambiarNombre}
              placeholder="Buscar por nombre artístico..."
              placeholderTextColor="#AFA3BE"
              returnKeyType="search"
              onSubmitEditing={buscarPorNombre}
              autoCapitalize="none"
            />

            {nombre.length > 0 && (
              <Pressable
                onPress={borrarNombre}
                hitSlop={10}
              >
                <Ionicons
                  name="close-circle"
                  size={21}
                  color="#B9A9D1"
                />
              </Pressable>
            )}
          </View>

          {nombre.trim().length > 0 && (
            <Pressable
              onPress={buscarPorNombre}
              style={styles.nameSearchButton}
            >
              <Ionicons
                name="search"
                size={17}
                color="#F25CFF"
              />
              <Text style={styles.nameSearchButtonText}>
                Buscar «{nombre.trim()}»
              </Text>
            </Pressable>
          )}

          <View style={styles.filtersHeader}>
  <Text style={styles.filtersHeaderTitle}>
    Filtrar artistas
  </Text>

  {hayFiltros && (
    <Pressable
      onPress={limpiarFiltros}
      style={styles.clearFiltersButton}
      accessibilityRole="button"
      accessibilityLabel="Limpiar filtros"
    >
      <Ionicons
        name="close"
        size={17}
        color="#F25CFF"
      />

      <Text style={styles.clearFiltersText}>
        Limpiar filtros
      </Text>
    </Pressable>
  )}
</View>

          <View style={styles.filtersContainer}>
            {renderFiltro('País', pais, 'pais')}

            {renderFiltro(
              'Región',
              etiquetaRegion,
              'region',
              !pais
            )}

            {renderFiltro(
              'Comuna',
              etiquetaComuna,
              'comuna',
              !region || region === 'Todas'
            )}

            {renderFiltro(
              'Género musical',
              etiquetaGenero,
              'genero'
            )}
          </View>

          <Pressable
            disabled={!hayFiltros || cargando}
            onPress={buscarPorFiltros}
            style={styles.searchButtonWrapper}
          >
            <LinearGradient
              colors={['#168CFF', '#7047FF', '#E02BFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.searchButton,
                (!hayFiltros || cargando) &&
                  styles.searchButtonDisabled,
              ]}
            >
              {cargando && tipoBusqueda === 'filtros' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="search" size={20} color="#FFFFFF" />
              )}

              <Text style={styles.searchButtonText}>
                {cargando && tipoBusqueda === 'filtros' ? 'Buscando...' : 'Buscar artistas'}
              </Text>
            </LinearGradient>
          </Pressable>

          {busquedaRealizada && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>
                {tipoBusqueda === 'explorar' ? `Artistas de ${generoExplorado}` : 'Resultados'}
              </Text>

              {cargando ? (
                <ActivityIndicator
                  size="large"
                  color="#F25CFF"
                  style={styles.loader}
                />
              ) : error ? (
                <Text style={styles.statusText}>
                  {error}
                </Text>
              ) : artistas.length === 0 ? (
                <Text style={styles.statusText}>
                  No encontramos artistas con esta búsqueda.
                </Text>
              ) : (
                <>
                  <Text style={styles.resultsCount}>
                    {artistas.length}{' '}
                    {artistas.length === 1
                      ? 'artista encontrado'
                      : 'artistas encontrados'}
                  </Text>

                  {artistas.map((artista) => (
                    <Pressable
                      key={artista.usuarioId}
                      style={styles.artistCard}
                      onPress={() =>
                        router.push({
                          pathname: '/artista/[usuarioId]',
                          params: {
                            usuarioId: artista.usuarioId,
                          },
                        })
                      }
                    >
                      <View style={styles.artistAvatar}>
  {artista.fotoPerfil ? (
    <Image
      source={{
        uri: `${API_URL}/api/usuarios/foto-perfil/${artista.fotoPerfil}`,
      }}
      style={styles.artistAvatarImage}
      resizeMode="cover"
    />
  ) : (
    <Ionicons
      name="person"
      size={27}
      color="#C99BFF"
    />
  )}
</View>

                      <View style={styles.artistInfo}>
                        <Text
                          style={styles.artistName}
                          numberOfLines={1}
                        >
                          {artista.nombreArtistico}
                        </Text>

                        <Text
                          style={styles.artistUsername}
                          numberOfLines={1}
                        >
                          @{artista.nombreUsuario}
                        </Text>

                        <Text style={styles.artistGenre}>
                          {artista.generoPrincipal}
                        </Text>

                        <Text
                          style={styles.artistLocation}
                          numberOfLines={2}
                        >
                          <Ionicons
                            name="location-outline"
                            size={13}
                            color="#6DDFFF"
                          />{' '}
                          {[
                            artista.ubicacion.comuna,
                            artista.ubicacion.region,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={22}
                        color="#F25CFF"
                      />
                    </Pressable>
                  ))}
                </>
              )}
            </View>
          )}

          <View style={styles.genreSection}>
            <Text style={styles.sectionTitle}>
              Explorar por género
            </Text>

            <Text style={styles.sectionDescription}>
              Encuentra artistas según los géneros de sus canciones publicadas
            </Text>

            {cargandoGeneros ? (
              <ActivityIndicator size="small" color="#F25CFF" style={styles.loader} />
            ) : errorGeneros ? (
              <Text style={[styles.statusText, styles.genreStatus]}>{errorGeneros}</Text>
            ) : generosDisponibles.length === 0 ? (
              <Text style={[styles.statusText, styles.genreStatus]}>
                Todavía no hay géneros con canciones publicadas.
              </Text>
            ) : (
              <View style={styles.genreGrid}>
                {generosDisponibles.map((item) => (
                  <Pressable
                    key={item.nombre}
                    disabled={cargando}
                    accessibilityRole="button"
                    accessibilityLabel={`Explorar ${item.nombre}, ${item.cantidadArtistas} artistas`}
                    onPress={() => void explorarGenero(item.nombre)}
                    style={[
                      styles.genreChip,
                      generoExplorado === item.nombre && tipoBusqueda === 'explorar' && styles.genreChipActive,
                    ]}
                  >
                    <Ionicons name="musical-notes-outline" size={19} color="#428DFF" />
                    <View style={styles.genreChipTextContainer}>
                      <Text style={styles.genreChipTitle}>{item.nombre}</Text>
                      <Text style={styles.genreChipSubtitle}>
                        {item.cantidadArtistas} {item.cantidadArtistas === 1 ? 'artista' : 'artistas'}
                      </Text>
                    </View>
                    {cargando && generoExplorado === item.nombre && tipoBusqueda === 'explorar' ? (
                      <ActivityIndicator size="small" color="#428DFF" />
                    ) : (
                      <Ionicons name="chevron-forward" size={17} color="#428DFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          transparent
          visible={selectorAbierto !== null}
          animationType="fade"
          onRequestClose={() => setSelectorAbierto(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectorAbierto === 'pais'
                    ? 'Selecciona un país'
                    : selectorAbierto === 'region'
                      ? 'Selecciona una región'
                      : selectorAbierto === 'comuna'
                        ? 'Selecciona una comuna'
                        : 'Selecciona un género musical'}
                </Text>

                <Pressable
                  onPress={() => setSelectorAbierto(null)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close"
                    size={25}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {opcionesSelector().map((opcion) => (
                  <Pressable
                    key={opcion}
                    style={styles.modalOption}
                    onPress={() => seleccionarOpcion(opcion)}
                  >
                    <Text style={styles.modalOptionText}>
                      {opcion}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 45,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    marginBottom: 24,
  },
  topHeaderIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
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
    marginTop: 8,
    textAlign: 'center',
  },
  searchBox: {
    minHeight: 57,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#7137A8',
    backgroundColor: 'rgba(11,7,22,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 17,
    marginBottom: 15,
  },
  inlineSearchIcon: {
    minWidth: 26,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 12,
  },
  nameSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 22,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(113,55,168,0.24)',
  },
  nameSearchButtonText: {
    color: '#F2D9FF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 15,
  },
  filtersContainer: {
    gap: 13,
  },
  filterBox: {
    minHeight: 56,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#7137A8',
    backgroundColor: 'rgba(11,7,22,0.9)',
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterDisabled: {
    opacity: 0.45,
  },
  filterText: {
    flex: 1,
    color: '#D9D0E8',
    fontSize: 16,
  },
  filterSelectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchButtonWrapper: {
    marginTop: 25,
    borderRadius: 17,
    overflow: 'hidden',
  },
  searchButton: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  searchButtonDisabled: {
    opacity: 0.45,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  resultsSection: {
    marginTop: 35,
  },
  loader: {
    marginVertical: 25,
  },
  statusText: {
    color: '#C9BBD8',
    fontSize: 15,
    lineHeight: 23,
  },
  resultsCount: {
    color: '#B9AEC8',
    fontSize: 14,
    marginBottom: 14,
  },

  artistCard: {
  backgroundColor: 'rgba(49, 13, 37, 0.86)',
  borderWidth: 1,
  borderColor: 'rgba(255, 115, 187, 0.48)',
  borderRadius: 18,
  padding: 15,
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},

  artistAvatar: {
  width: 58,
  height: 58,
  borderRadius: 15,
  backgroundColor: '#2D154C',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 13,
  overflow: 'hidden',
},
artistAvatarImage: {
  width: '100%',
  height: '100%',
},

artistInfo: {
    flex: 1,
  },
  artistName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  artistUsername: {
    color: '#B9AEC8',
    fontSize: 13,
    marginTop: 2,
  },
  artistGenre: {
    color: '#D67BFF',
    fontSize: 14,
    marginTop: 5,
  },
  artistLocation: {
    color: '#B9AEC8',
    fontSize: 12,
    marginTop: 4,
  },
  genreSection: {
    marginTop: 42,
  },
  sectionDescription: {
    color: '#B9AEC8',
    fontSize: 14,
  },
  genreStatus: { marginTop: 15 },
  genreGrid: { marginTop: 18, gap: 11 },
  genreChip: {
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2766D9',
    backgroundColor: 'rgba(9, 31, 83, 0.92)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  genreChipActive: { borderColor: '#428DFF', backgroundColor: 'rgba(18, 54, 121, 0.94)' },
  genreChipTextContainer: { flex: 1 },
  genreChipTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  genreChipSubtitle: { color: '#A8C6FF', fontSize: 12, marginTop: 3 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  modalContent: {
    backgroundColor: '#10091E',
    borderWidth: 1,
    borderColor: '#7137A8',
    borderRadius: 22,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
  },
  modalOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(113,55,168,0.28)',
  },
  modalOptionText: {
    color: '#E8DFF0',
    fontSize: 16,
  },

  filtersHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 15,
  gap: 10,
},
filtersHeaderTitle: {
  color: '#FFFFFF',
  fontSize: 21,
  fontWeight: '800',
  flexShrink: 1,
},
clearFiltersButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
  paddingVertical: 8,
  paddingHorizontal: 5,
},
clearFiltersText: {
  color: '#F25CFF',
  fontSize: 13,
  fontWeight: '700',
},

});

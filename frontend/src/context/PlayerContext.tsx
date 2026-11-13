import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://192.168.1.13:3000';
const SEGUNDOS_MINIMOS_ESCUCHA = 30;

export type CancionReproductor = {
  id: string;
  audioId: string;
  titulo: string;
  nombreArtista: string;
  usuarioId?: string;
  portadaId: string | null;
  fotoArtista: string | null;
};

type PlayerContextType = {
  cancionActual: CancionReproductor | null;
  cola: CancionReproductor[]; // Lista automática existente
  colaManual: CancionReproductor[];
  colaPendienteAutomatica: CancionReproductor[];
  historialReproduccion: CancionReproductor[];
  agregarACola: (cancion: CancionReproductor) => boolean;
  quitarDeCola: (indice: number) => void;
  moverEnCola: (origen: number, destino: number) => void;
  vaciarColaManual: () => void;
  moverEnColaAutomatica: (origen: number, destino: number) => void;
  quitarDeColaAutomatica: (indice: number) => void;
  vaciarColaAutomatica: () => void;
  reproducirDesdeCola: (tipo: 'manual' | 'automatica', indice: number) => void;
  colaVisible: boolean;
  abrirVentanaCola: () => void;
  cerrarVentanaCola: () => void;
  tieneSiguiente: boolean;
  tieneAnterior: boolean;
  reproduciendo: boolean;
  posicion: number;
  duracion: number;
  progreso: number;

  reproducirCancion: (
    cancion: CancionReproductor,
    nuevaCola?: CancionReproductor[],
    reiniciar?: boolean
  ) => void;

  alternarReproduccion: () => void;

  buscarPosicion: (
    segundos: number
  ) => void;

  reproducirAnterior: () => void;

  reproducirSiguiente: () => void;

  cerrarReproductor: () => void;
};

const PlayerContext =
  createContext<PlayerContextType | null>(null);

type PlayerProviderProps = {
  children: ReactNode;
};

export function PlayerProvider({
  children,
}: PlayerProviderProps) {
  const [cancionActual, setCancionActual] =
    useState<CancionReproductor | null>(null);

  const [cola, setCola] = useState<
    CancionReproductor[]
  >([]);

  // La cola manual es independiente de la lista de reproducción automática.
  const [colaVisible, setColaVisible] = useState(false);
  const abrirVentanaCola = () => setColaVisible(true);
  const cerrarVentanaCola = () => setColaVisible(false);
  const [colaManual, setColaManual] = useState<CancionReproductor[]>([]);
  const colaManualRef = useRef<CancionReproductor[]>([]);
  const [historialReproduccion, setHistorialReproduccion] = useState<CancionReproductor[]>([]);
  const historialRef = useRef<CancionReproductor[]>([]);
  const cursorAutomaticoRef = useRef(0);
  const colaAutomaticaRef = useRef<CancionReproductor[]>([]);
  const cancionActualRef = useRef<CancionReproductor | null>(null);

  const actualizarColaManual = (siguiente: CancionReproductor[]) => {
    colaManualRef.current = siguiente;
    setColaManual(siguiente);
  };
  const actualizarHistorial = (siguiente: CancionReproductor[]) => {
    historialRef.current = siguiente;
    setHistorialReproduccion(siguiente);
  };

  const agregarACola = (cancion: CancionReproductor): boolean => {
    if (!cancion.audioId || !cancionActualRef.current) return false;
    // Se permiten repeticiones deliberadas: cada entrada ocupa un lugar.
    actualizarColaManual([...colaManualRef.current, cancion]);
    return true;
  };
  const quitarDeCola = (indice: number) => {
    actualizarColaManual(colaManualRef.current.filter((_, i) => i !== indice));
  };
  const moverEnCola = (origen: number, destino: number) => {
    const siguiente = [...colaManualRef.current];
    if (origen < 0 || origen >= siguiente.length || destino < 0 || destino >= siguiente.length) return;
    const [elemento] = siguiente.splice(origen, 1);
    siguiente.splice(destino, 0, elemento);
    actualizarColaManual(siguiente);
  };
  const vaciarColaManual = () => actualizarColaManual([]);

  // Modificar únicamente el tramo aún pendiente, sin alterar la canción actual.
  const actualizarPendientesAutomaticas = (transformar: (pendientes: CancionReproductor[]) => CancionReproductor[]) => {
    const corte = cursorAutomaticoRef.current + 1;
    const siguiente = [
      ...colaAutomaticaRef.current.slice(0, corte),
      ...transformar(colaAutomaticaRef.current.slice(corte)),
    ];
    colaAutomaticaRef.current = siguiente;
    setCola(siguiente);
  };
  const moverEnColaAutomatica = (origen: number, destino: number) => {
    actualizarPendientesAutomaticas(pendientes => {
      if (origen < 0 || destino < 0 || origen >= pendientes.length || destino >= pendientes.length) return pendientes;
      const siguiente = [...pendientes];
      const [item] = siguiente.splice(origen, 1);
      siguiente.splice(destino, 0, item);
      return siguiente;
    });
  };
  const quitarDeColaAutomatica = (indice: number) => {
    actualizarPendientesAutomaticas(pendientes => pendientes.filter((_, i) => i !== indice));
  };
  const vaciarColaAutomatica = () => actualizarPendientesAutomaticas(() => []);

  const player = useAudioPlayer(null, {
    updateInterval: 250,
  });

  const status = useAudioPlayerStatus(player);

  useEffect(() => {
  const configurarAudio = async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });

      console.log(
        'UNDERMUSIC: audio en segundo plano configurado'
      );
    } catch (error) {
      console.error(
        'UNDERMUSIC: error al configurar audio',
        error
      );
    }
  };

  void configurarAudio();
}, []);

useEffect(() => {
  if (!cancionActual) {
    player.clearLockScreenControls();
    return;
  }

  const metadata = {
    title: cancionActual.titulo,
    artist: cancionActual.nombreArtista,
    artworkUrl: cancionActual.portadaId
      ? `${API_URL}/api/canciones/portada/${cancionActual.portadaId}`
      : undefined,
  };

  player.setActiveForLockScreen(true, metadata, {
    showSeekForward: false,
    showSeekBackward: false,
  });

  return () => {
    player.clearLockScreenControls();
  };
}, [player, cancionActual]);

  // Identifica la reproducción que estamos contabilizando.
const registrarEscuchaEnBackend = async (
  cancionId: string
) => {
  try {
    const token = await SecureStore.getItemAsync('token');

    if (!token) {
      console.log(
        'REPRODUCCIÓN NO REGISTRADA: usuario sin sesión'
      );
      return;
    }

    const respuesta = await fetch(
      `${API_URL}/api/reproducciones`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancionId,
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        'ERROR AL REGISTRAR REPRODUCCIÓN:',
        datos.message || respuesta.status
      );
      return;
    }

    console.log(
      'REPRODUCCIÓN GUARDADA EN MONGODB:',
      cancionId
    );
  } catch (error) {
    console.error(
      'ERROR DE CONEXIÓN AL REGISTRAR REPRODUCCIÓN:',
      error
    );
  }
};
const escuchaRef = useRef({
  cancionId: '',
  segundosAcumulados: 0,
  ultimaPosicion: null as number | null,
  ultimoInstante: null as number | null,
  registrada: false,
  esperandoSalto: false,
});

  // Inicia un nuevo ciclo de escucha, sin modificar el audio ni la cola.
  const reiniciarCicloEscucha = (cancionId: string) => {
    escuchaRef.current = {
      cancionId,
      segundosAcumulados: 0,
      ultimaPosicion: null,
      ultimoInstante: null,
      registrada: false,
      esperandoSalto: true,
    };
  };

  const cargarYReproducir = (
  cancion: CancionReproductor,
  guardarHistorial = true
) => {
  const anterior = cancionActualRef.current;
  if (guardarHistorial && anterior) {
    actualizarHistorial([...historialRef.current, anterior]);
  }
  cancionActualRef.current = cancion;
  reiniciarCicloEscucha(cancion.id);

  const urlAudio =
    `${API_URL}/api/canciones/audio/${cancion.audioId}`;

  player.replace(urlAudio);

  setCancionActual(cancion);

  player.play();
};
  const reproducirCancion = (
    cancion: CancionReproductor,
    nuevaCola?: CancionReproductor[],
    reiniciar = false
  ) => {
    if (nuevaCola) {
      colaAutomaticaRef.current = nuevaCola;
      setCola(nuevaCola);
      cursorAutomaticoRef.current = Math.max(0, nuevaCola.findIndex(item => item.id === cancion.id));
      actualizarColaManual([]);
      actualizarHistorial([]);
    } else if (colaAutomaticaRef.current.length === 0) {
      colaAutomaticaRef.current = [cancion];
      setCola([cancion]);
      cursorAutomaticoRef.current = 0;
    } else {
      const indice = colaAutomaticaRef.current.findIndex(item => item.id === cancion.id);
      if (indice >= 0) cursorAutomaticoRef.current = indice;
    }

    if (cancionActualRef.current?.id === cancion.id && !reiniciar) {
      if (!status.playing) player.play();
      return;
    }
    cargarYReproducir(cancion, !nuevaCola);
  };

  // Consumir una entrada concreta sin reiniciar la lista ni descartar las pendientes.
  // El índice identifica la entrada, no el ID: se admiten canciones repetidas.
  const reproducirDesdeCola = (tipo: 'manual' | 'automatica', indice: number) => {
    if (!cancionActualRef.current) return;
    if (tipo === 'manual') {
      const pendientes = colaManualRef.current;
      if (indice < 0 || indice >= pendientes.length) return;
      const elegida = pendientes[indice];
      actualizarColaManual(pendientes.filter((_, i) => i !== indice));
      cargarYReproducir(elegida);
      return;
    }

    const cursor = cursorAutomaticoRef.current;
    const lista = colaAutomaticaRef.current;
    const indiceAbsoluto = cursor + 1 + indice;
    if (indice < 0 || indiceAbsoluto >= lista.length) return;
    const elegida = lista[indiceAbsoluto];
    // La seleccionada pasa a ocupar el puesto actual; las demás pendientes
    // conservan su orden (incluidas las que estaban antes de ella).
    const siguiente = [
      ...lista.slice(0, cursor),
      elegida,
      ...lista.slice(cursor + 1).filter((_, i) => i !== indice),
    ];
    colaAutomaticaRef.current = siguiente;
    setCola(siguiente);
    cargarYReproducir(elegida);
  };

  const alternarReproduccion = () => {
    if (!cancionActual) {
      return;
    }

    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const buscarPosicion = (
    segundos: number
  ) => {
    if (!cancionActual) {
      return;
    }

    const duracionActual =
      typeof status.duration === 'number'
        ? status.duration
        : 0;

    const posicionSegura =
      duracionActual > 0
        ? Math.min(
            Math.max(segundos, 0),
            duracionActual
          )
        : Math.max(segundos, 0);

    escuchaRef.current.esperandoSalto = true;
escuchaRef.current.ultimaPosicion = null;
escuchaRef.current.ultimoInstante = null;

player.seekTo(posicionSegura);
  };

  const obtenerSiguiente = (): CancionReproductor | null => {
    if (colaManualRef.current.length > 0) {
      const [primera, ...resto] = colaManualRef.current;
      actualizarColaManual(resto);
      return primera;
    }
    const siguienteIndice = cursorAutomaticoRef.current + 1;
    if (siguienteIndice < colaAutomaticaRef.current.length) {
      cursorAutomaticoRef.current = siguienteIndice;
      return colaAutomaticaRef.current[siguienteIndice];
    }
    return null;
  };

  const reproducirAnterior = () => {
    const actual = cancionActualRef.current;
    if (!actual) return;
    const tiempo = typeof status.currentTime === 'number' ? status.currentTime : 0;
    if (tiempo >= 5) {
      reiniciarCicloEscucha(actual.id);
      void player.seekTo(0);
      return;
    }
    if (historialRef.current.length > 0) {
      const anterior = historialRef.current[historialRef.current.length - 1];
      actualizarHistorial(historialRef.current.slice(0, -1));
      // Regresar no debe consumir una canción pendiente de la cola manual.
      cargarYReproducir(anterior, false);
      return;
    }
    const indice = colaAutomaticaRef.current.findIndex(item => item.id === actual.id);
    if (indice > 0) {
      cursorAutomaticoRef.current = indice - 1;
      cargarYReproducir(colaAutomaticaRef.current[indice - 1], false);
      return;
    }
    reiniciarCicloEscucha(actual.id);
    void player.seekTo(0);
  };

  const reproducirSiguiente = () => {
    if (!cancionActualRef.current) return;
    const siguiente = obtenerSiguiente();
    if (siguiente) cargarYReproducir(siguiente);
  };

  const cerrarReproductor = () => {
    // Detiene la reproducción sin pasar null a AudioPlayer.replace.
    player.pause();
    void player.seekTo(0);
    reiniciarCicloEscucha('');
    cancionActualRef.current = null;
    setCancionActual(null);
    setCola([]);
    colaAutomaticaRef.current = [];
    cursorAutomaticoRef.current = 0;
    actualizarColaManual([]);
    actualizarHistorial([]);
  };

  useEffect(() => {
  const escucha = escuchaRef.current;

  if (
    !cancionActual ||
    escucha.cancionId !== cancionActual.id
  ) {
    return;
  }

  const posicionActual = status.currentTime;
  const instanteActual = Date.now();

  if (
    !status.playing ||
    !status.isLoaded ||
    !Number.isFinite(posicionActual)
  ) {
    escucha.ultimaPosicion = null;
    escucha.ultimoInstante = null;
    return;
  }

  if (escucha.esperandoSalto) {
    escucha.esperandoSalto = false;
    escucha.ultimaPosicion = posicionActual;
    escucha.ultimoInstante = instanteActual;
    return;
  }

  if (
    escucha.ultimaPosicion === null ||
    escucha.ultimoInstante === null
  ) {
    escucha.ultimaPosicion = posicionActual;
    escucha.ultimoInstante = instanteActual;
    return;
  }

  const avanceAudio =
    posicionActual - escucha.ultimaPosicion;

  const tiempoReal =
    (instanteActual - escucha.ultimoInstante) / 1000;

  escucha.ultimaPosicion = posicionActual;
  escucha.ultimoInstante = instanteActual;

  // Descartar retrocesos, saltos y pausas largas
  // entre actualizaciones.
  if (
    avanceAudio <= 0 ||
    tiempoReal <= 0 ||
    tiempoReal > 2 ||
    avanceAudio > tiempoReal + 0.5
  ) {
    return;
  }

  // No contabilizar más tiempo del que realmente
  // transcurrió entre actualizaciones.
  escucha.segundosAcumulados += Math.min(
    avanceAudio,
    tiempoReal
  );

  if (
  escucha.segundosAcumulados >=
    SEGUNDOS_MINIMOS_ESCUCHA &&
  !escucha.registrada
) {
  escucha.registrada = true;

  console.log(
    'ESCUCHA VÁLIDA:',
    cancionActual.titulo,
    escucha.segundosAcumulados.toFixed(1),
    'segundos'
  );

  void registrarEscuchaEnBackend(cancionActual.id);
}
}, [
  cancionActual,
  status.currentTime,
  status.playing,
  status.isLoaded,
]);

  // didJustFinish puede permanecer activo mientras cambia el estado de React.
  const finProcesadoRef = useRef(false);
  useEffect(() => {
    if (!status.didJustFinish) {
      finProcesadoRef.current = false;
      return;
    }
    if (!cancionActual || finProcesadoRef.current) return;
    finProcesadoRef.current = true;
    const siguiente = obtenerSiguiente();
    if (siguiente) {
      cargarYReproducir(siguiente);
    } else {
      player.pause();
      reiniciarCicloEscucha(cancionActual.id);
      void player.seekTo(0);
    }
  }, [cancionActual, player, status.didJustFinish]);

  // Canciones que faltan del recorrido automático (en orden o aleatorio).
  // La canción actual se muestra aparte; las añadidas manualmente tienen prioridad.
  const colaPendienteAutomatica = cancionActual
    ? cola.slice(cursorAutomaticoRef.current + 1)
    : [];

  const tieneSiguiente = colaManual.length > 0 ||
    cursorAutomaticoRef.current < cola.length - 1;
  const tieneAnterior = historialReproduccion.length > 0 ||
    cola.findIndex(item => item.id === cancionActual?.id) > 0;

  const posicion =
    typeof status.currentTime === 'number'
      ? status.currentTime
      : 0;

  const duracion =
    typeof status.duration === 'number'
      ? status.duration
      : 0;

  const progreso =
    duracion > 0
      ? Math.min(
          Math.max(
            posicion / duracion,
            0
          ),
          1
        )
      : 0;

  const value = useMemo(
    () => ({
      cancionActual,
      cola,
      colaManual,
      colaPendienteAutomatica,
      historialReproduccion,
      agregarACola,
      quitarDeCola,
      moverEnCola,
      vaciarColaManual,
      moverEnColaAutomatica,
      quitarDeColaAutomatica,
      vaciarColaAutomatica,
      reproducirDesdeCola,
      colaVisible,
      abrirVentanaCola,
      cerrarVentanaCola,
      tieneSiguiente,
      tieneAnterior,
      reproduciendo: status.playing,
      posicion,
      duracion,
      progreso,
      reproducirCancion,
      alternarReproduccion,
      buscarPosicion,
      reproducirAnterior,
      reproducirSiguiente,
      cerrarReproductor,
    }),
    [
      cancionActual,
      cola,
      colaManual,
      colaVisible,
      historialReproduccion,
      status.playing,
      posicion,
      duracion,
      progreso,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error(
      'usePlayer debe utilizarse dentro de PlayerProvider'
    );
  }

  return context;
}
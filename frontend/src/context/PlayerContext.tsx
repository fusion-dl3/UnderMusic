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
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://192.168.1.5:3000';
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
  cola: CancionReproductor[];
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

  const player = useAudioPlayer(null, {
    updateInterval: 250,
  });

  const status = useAudioPlayerStatus(player);

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

  const cargarYReproducir = (
  cancion: CancionReproductor
) => {
  escuchaRef.current = {
    cancionId: cancion.id,
    segundosAcumulados: 0,
    ultimaPosicion: null,
    ultimoInstante: null,
    registrada: false,
    esperandoSalto: false,
  };

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
      setCola(nuevaCola);
    } else if (cola.length === 0) {
      setCola([cancion]);
    }

    const esLaMismaCancion =
      cancionActual?.id === cancion.id;

    if (esLaMismaCancion && !reiniciar) {
      if (!status.playing) {
        player.play();
      }

      return;
    }

    cargarYReproducir(cancion);
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

  const reproducirAnterior = () => {
    if (!cancionActual) {
      return;
    }

    const posicionActual =
      typeof status.currentTime === 'number'
        ? status.currentTime
        : 0;

    if (posicionActual >= 5) {
      player.seekTo(0);
      return;
    }

    const indiceActual = cola.findIndex(
      (cancion) =>
        cancion.id === cancionActual.id
    );

    if (indiceActual > 0) {
      cargarYReproducir(
        cola[indiceActual - 1]
      );
      return;
    }

    player.seekTo(0);
  };

  const reproducirSiguiente = () => {
    if (!cancionActual) {
      return;
    }

    const indiceActual = cola.findIndex(
      (cancion) =>
        cancion.id === cancionActual.id
    );

    if (
      indiceActual >= 0 &&
      indiceActual < cola.length - 1
    ) {
      cargarYReproducir(
        cola[indiceActual + 1]
      );
    }
  };

  const cerrarReproductor = () => {
    player.pause();
    player.seekTo(0);

    setCancionActual(null);
    setCola([]);
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

  useEffect(() => {
    if (
      !cancionActual ||
      !status.didJustFinish
    ) {
      return;
    }

    const indiceActual = cola.findIndex(
      (cancion) =>
        cancion.id === cancionActual.id
    );

    if (
      indiceActual >= 0 &&
      indiceActual < cola.length - 1
    ) {
      cargarYReproducir(
        cola[indiceActual + 1]
      );

      return;
    }

    player.pause();
    player.seekTo(0);
  }, [
    cancionActual,
    cola,
    player,
    status.didJustFinish,
  ]);

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
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';

const API_URL = 'http://192.168.1.14:3000';

export type CancionReproductor = {
  id: string;
  audioId: string;
  titulo: string;
  nombreArtista: string;
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
    nuevaCola?: CancionReproductor[]
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

  const cargarYReproducir = (
    cancion: CancionReproductor
  ) => {
    const urlAudio =
      `${API_URL}/api/canciones/audio/${cancion.audioId}`;

    player.replace(urlAudio);

    setCancionActual(cancion);

    player.play();
  };

  const reproducirCancion = (
    cancion: CancionReproductor,
    nuevaCola?: CancionReproductor[]
  ) => {
    if (nuevaCola) {
      setCola(nuevaCola);
    } else if (cola.length === 0) {
      setCola([cancion]);
    }

    const esLaMismaCancion =
      cancionActual?.id === cancion.id;

    if (esLaMismaCancion) {
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
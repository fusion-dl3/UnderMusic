
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const API_URL = 'http://192.168.1.13:3000';

type NotificacionesContextType = {
  noLeidas: number;
  actualizarContador: () => Promise<void>;
  establecerContador: (cantidad: number) => void;
};

const NotificacionesContext =
  createContext<NotificacionesContextType | null>(null);

export function NotificacionesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [noLeidas, setNoLeidas] = useState(0);
  const solicitudActualRef = useRef(0);

  const establecerContador = useCallback((cantidad: number) => {
    solicitudActualRef.current += 1;

    if (Number.isFinite(cantidad)) {
      setNoLeidas(Math.max(0, Math.floor(cantidad)));
    }
  }, []);

  const actualizarContador = useCallback(async () => {
    const solicitud = ++solicitudActualRef.current;

    try {
      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        if (solicitud === solicitudActualRef.current) {
          setNoLeidas(0);
        }
        return;
      }

      const respuesta = await fetch(
        `${API_URL}/api/notificaciones/contador`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!respuesta.ok) return;

      const datos = await respuesta.json();

      if (
        solicitud === solicitudActualRef.current &&
        typeof datos.noLeidas === 'number' &&
        Number.isFinite(datos.noLeidas)
      ) {
        setNoLeidas(Math.max(0, Math.floor(datos.noLeidas)));
      }
    } catch (error) {
      console.warn(
        'No se pudo actualizar el contador de notificaciones:',
        error
      );
    }
  }, []);

  return (
    <NotificacionesContext.Provider
      value={{
        noLeidas,
        actualizarContador,
        establecerContador,
      }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const contexto = useContext(NotificacionesContext);

  if (!contexto) {
    throw new Error(
      'useNotificaciones debe utilizarse dentro de NotificacionesProvider.'
    );
  }

  return contexto;
}

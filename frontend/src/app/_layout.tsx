
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { PlayerProvider } from '@/context/PlayerContext';
import { NotificacionesProvider } from '@/context/NotificacionesContext';
import { ColaReproduccionModal } from '@/components/ColaReproduccionModal';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AnimatedSplashOverlay />

      <PlayerProvider>
        <NotificacionesProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: '#020106',
              },
            }}
          />
          <ColaReproduccionModal />
        </NotificacionesProvider>
      </PlayerProvider>
    </ThemeProvider>
  );
}

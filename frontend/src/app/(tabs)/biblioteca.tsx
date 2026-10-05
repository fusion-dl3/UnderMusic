import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function BibliotecaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Biblioteca
      </Text>

      <Text style={styles.subtitle}>
        Prueba temporal del perfil público
      </Text>

      <Pressable
        onPress={() => {
          router.push({
  pathname: '/artista/[usuarioId]',
  params: {
    usuarioId: '6abfd6f43dc4987bffbaaea4',
  },
});
        }}
        style={({ pressed }) => [
          styles.testButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <Ionicons
          name="person-outline"
          size={22}
          color="#FFFFFF"
        />

        <Text style={styles.testButtonText}>
          Abrir perfil de Turim Mc
        </Text>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#D8A6FF"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020106',
    paddingHorizontal: 28,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },

  subtitle: {
    color: '#AAA2B2',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },

  testButton: {
    width: '100%',
    maxWidth: 500,
    minHeight: 58,
    paddingHorizontal: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(76, 21, 121, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(190, 82, 255, 0.65)',
  },

  testButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.72,
  },
});
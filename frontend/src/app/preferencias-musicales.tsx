import { StyleSheet, Text, View } from 'react-native';

export default function PreferenciasMusicalesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Preferencias musicales</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020106',
  },

  text: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
});
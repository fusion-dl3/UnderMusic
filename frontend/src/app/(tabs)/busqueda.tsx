import { StyleSheet, Text, View } from 'react-native';

export default function BusquedaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Búsqueda</Text>
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

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
});
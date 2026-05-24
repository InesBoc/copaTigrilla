import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SeleccionarCategoria() {
  const router = useRouter();
  const { adminMode } = useLocalSearchParams(); // Captura si viene de la Home como admin

  const entrarACategoria = (catNombre: string) => {
    // Viaja a las pestañas pasando la categoría Y el modo administrador
    router.push({ 
      pathname: '/categorias/tabs', 
      params: { 
        categoria: catNombre,
        adminMode: adminMode // Se lo reenvía a las pestañas
      } 
    });
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona una Categoría</Text>
      
      <View style={styles.list}>
        {/* Categoría Sub 12 */}
        <TouchableOpacity style={styles.button} onPress={() => entrarACategoria('8va - Sub 12')}>
          <Text style={styles.buttonText}>🏑 8va - SUB 12</Text>
        </TouchableOpacity>

        {/* Categoría Sub 14 (Corregido el parámetro) */}
        <TouchableOpacity style={styles.button} onPress={() => entrarACategoria('9na - Sub 10')}>
          <Text style={styles.buttonText}>🏑 9na - SUB 10</Text>
        </TouchableOpacity>

        {/* Categoría Sub 16 (Corregido el parámetro) */}
        <TouchableOpacity style={styles.button} onPress={() => entrarACategoria('10ma - Sub 8')}>
          <Text style={styles.buttonText}>🏑 10ma - SUB 8</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40, color: '#1a1a1a', letterSpacing: 0.5 },
  list: { width: '85%' },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#1a1a1a', // Negro oficial
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#d32f2f', // Detalle en Rojo oficial
    elevation: 3, // Sombra en Android
    shadowColor: '#000', // Sombra en iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
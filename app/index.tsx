import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const partidosSemilla = [
  { categoria: "Sub 12", cancha: "Cancha 1", hora: "09:00", local: "Tigres Azul", visitante: "SICC Verde", jugado: false },
  { categoria: "Sub 12", cancha: "Cancha 1", hora: "09:30", local: "Popeye A", visitante: "Tigres Rosa", jugado: false },
  { categoria: "Sub 12", cancha: "Cancha 2", hora: "09:00", local: "Uni Verde", visitante: "Suri Azul", jugado: false },
  { categoria: "Sub 10", cancha: "Cancha 5", hora: "09:00", local: "Tigres 1", visitante: "SICC Verde", jugado: false },
  { categoria: "Sub 10", cancha: "Cancha 5", hora: "09:30", local: "Popeye B", visitante: "Tigres 5", jugado: false },
  { categoria: "Sub 8", cancha: "Cancha 9", hora: "09:00", local: "Tigres Azul", visitante: "Jockey Rojo", jugado: false },
  { categoria: "Sub 8", cancha: "Cancha 10", hora: "09:00", local: "Mitre", visitante: "Uni Rugby Verde", jugado: false }
];

export default function Index() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  
  // Estados para el acceso del Administrador
  const [esAdmin, setEsAdmin] = useState(false);
  const [mostrarLoginAdmin, setMostrarLoginAdmin] = useState(false);
  const [pinIngresado, setPinIngresado] = useState('');

  // PIN de acceso rápido para el administrador
  const PIN_CORRECTO = "2026"; 

  async function ejecutarSubidaManual() {
    setCargando(true);
    setMensaje('Conectando e importando fixture...');
    try {
      const { db } = await import('../firebaseConfig');
      const { collection, addDoc } = await import('firebase/firestore');

      const partidosRef = collection(db, "partidos");
      for (const partido of partidosSemilla) {
        await addDoc(partidosRef, partido);
      }
      setMensaje('¡Fixture cargado con éxito en Firebase! 🎉');
    } catch (error: any) {
      console.error(error);
      setMensaje(`Error: ${error.message || 'Error de conexión'}`);
    } finally {
      setCargando(false);
    }
  }

  async function generarCodigosPrueba() {
    setCargando(true);
    setMensaje('Generando códigos de votación...');
    try {
      const { db } = await import('../firebaseConfig');
      const { doc, setDoc } = await import('firebase/firestore');

      const nuevosCodigos = [
        { id: "TIGRES101", clubPertenece: "Tigres RC", usado: false },
        { id: "POPEYE100", clubPertenece: "Popeye HC", usado: false },
        { id: "GIMNASIA100", clubPertenece: "Gimnasia y Tiro", usado: false },
        { id: "JOCKEY100", clubPertenece: "Jockey Club", usado: false },
        { id: "UNI100", clubPertenece: "Universitario", usado: false },
      ];

      for (const item of nuevosCodigos) {
        await setDoc(doc(db, "codigos_votos", item.id), {
          clubPertenece: item.clubPertenece,
          usado: item.usado
        });
      }
      setMensaje('¡Códigos de prueba creados con éxito! 🎫');
    } catch (error: any) {
      console.error(error);
      setMensaje(`Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  }

  const verificarPinAdmin = () => {
    if (pinIngresado === PIN_CORRECTO) {
      setEsAdmin(true);
      setMostrarLoginAdmin(false);
      setPinIngresado('');
      Alert.alert("¡Éxito!", "Ingresaste como Administrador.");
    } else {
      Alert.alert("Error", "PIN incorrecto. Inténtalo de nuevo.");
      setPinIngresado('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Image source={require('../assets/images/logo-trc.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>COPA TIGRILLA 2026</Text>
      <Text style={styles.subtitle}>Tigres Rugby Club</Text>

      {/* 📅 INFORMACIÓN DEL TORNEO */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📅 Información del Torneo</Text>
        <Text style={styles.infoText}><Text style={{ fontWeight: 'bold' }}>Día:</Text> Domingo 7 de Junio</Text>
        <Text style={styles.infoText}><Text style={{ fontWeight: 'bold' }}>Hora de Inicio:</Text> 09:00 hs</Text>
        
        <View style={styles.divider} />
        <Text style={styles.cronogramaTitle}>📌 Cronograma General</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>09:00 hs</Text> - Desfile de Delegaciones</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>10:00 hs</Text> - Inicio de Partidos</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>13:00 hs</Text> - Almuerzo y Tercer Tiempo</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>14:00 hs</Text> - Concurso de Coreos 💃 y Sorteos</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>16:00 hs</Text> - Cierre</Text>
      </View>
    
{/* 🏆 BOTONES PRINCIPALES DE USUARIO (SIEMPRE VISIBLES) */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#1a1a1a', marginBottom: 15 }]} 
          onPress={() => router.push({
            pathname: '/categorias',
            params: { adminMode: esAdmin ? 'true' : 'false' }
          })}
        >
          <Text style={styles.buttonText}>🏆 VER CATEGORÍAS / FIXTURE</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#d32f2f', marginBottom: 15 }]} 
          onPress={() => router.push('/votacion')}
        >
          <Text style={styles.buttonText}>💃 VOTAR MEJOR COREO</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#7b1fa2' }]} 
          onPress={() => router.push('/resultados')}
        >
          <Text style={styles.buttonText}>📊 VER RESULTADOS COREOS</Text>
        </TouchableOpacity>
      </View>

      {/* ⚙️ SECCIÓN ACCESO EXCLUSIVO ADMINISTRADOR */}
      <View style={styles.adminSectionWrapper}>
        {!esAdmin ? (
          !mostrarLoginAdmin ? (
            <TouchableOpacity style={styles.linkAdmin} onPress={() => setMostrarLoginAdmin(true)}>
              <Text style={styles.linkAdminTexto}>⚙️ Acceso Administrador</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.loginAdminBox}>
              <Text style={styles.loginAdminTitle}>Ingresar PIN de Admin</Text>
              <TextInput
                style={styles.pinInput}
                placeholder="Ej: 2026"
                placeholderTextColor="#999"
                secureTextEntry
                keyboardType="numeric"
                value={pinIngresado}
                onChangeText={setPinIngresado}
              />
              <View style={styles.adminLoginButtons}>
                <TouchableOpacity style={[styles.adminSubButton, { backgroundColor: '#666' }]} onPress={() => setMostrarLoginAdmin(false)}>
                  <Text style={styles.adminSubButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.adminSubButton, { backgroundColor: '#7b1fa2' }]} onPress={verificarPinAdmin}>
                  <Text style={styles.adminSubButtonText}>Entrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          /* VISTA CUANDO YA INICIÓ SESIÓN COMO ADMIN */
          <View style={styles.adminBox}>
            <Text style={styles.adminModoActivo}>✨ Modo Administrador Activo</Text>
            
            <TouchableOpacity style={[styles.adminButton, { marginBottom: 10 }]} onPress={ejecutarSubidaManual} disabled={cargando}>
              {cargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.adminButtonText}>⚙️ RE-SEMBRAR FIXTURE</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.adminButton, { backgroundColor: '#e65100', marginBottom: 15 }]} onPress={generarCodigosPrueba} disabled={cargando}>
              {cargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.adminButtonText}>🎫 GENERAR CÓDIGOS DE PRUEBA</Text>}
            </TouchableOpacity>

            {mensaje ? <Text style={styles.adminFeedback}>{mensaje}</Text> : null}

            <TouchableOpacity style={styles.buttonSalirAdmin} onPress={() => { setEsAdmin(false); setMensaje(''); }}>
              <Text style={styles.buttonSalirAdminTexto}>Salir del Modo Admin</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { flexGrow: 1, alignItems: 'center', padding: 20 },
  logo: { width: 140, height: 140, marginTop: 10, marginBottom: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#d32f2f', fontWeight: '600', marginBottom: 25 },
  infoCard: { width: '100%', backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 25, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#1a1a1a' },
  cronogramaTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 5, marginBottom: 10, color: '#1a1a1a' },
  infoText: { fontSize: 14, color: '#444', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  buttonContainer: { width: '100%', paddingHorizontal: 10, marginBottom: 30 },
  button: { width: '100%', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  
  // Estilos de la Zona Admin
  adminSectionWrapper: { width: '100%', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  linkAdmin: { padding: 10 },
  linkAdminTexto: { color: '#777', fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
  loginAdminBox: { width: '90%', backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  loginAdminTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  pinInput: { width: '80%', height: 40, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, textAlign: 'center', fontSize: 16, marginBottom: 12, backgroundColor: '#fafafa' },
  adminLoginButtons: { flexDirection: 'row', gap: 10 },
  adminSubButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 5 },
  adminSubButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  adminBox: { width: '100%', padding: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#7b1fa2', borderRadius: 8, alignItems: 'center', backgroundColor: '#f3e5f5' },
  adminModoActivo: { fontSize: 14, fontWeight: 'bold', color: '#7b1fa2', marginBottom: 12 },
  adminButton: { backgroundColor: '#7b1fa2', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 6, width: '100%', alignItems: 'center' },
  adminButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  adminFeedback: { marginTop: 8, fontSize: 12, color: '#555', fontWeight: '500', textAlign: 'center' },
  buttonSalirAdmin: { marginTop: 15, padding: 5 },
  buttonSalirAdminTexto: { color: '#c2185b', fontSize: 13, fontWeight: 'bold', textDecorationLine: 'underline' }
});
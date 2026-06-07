import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as XLSX from 'xlsx';

// Lista oficial de los 13 clubes de la Copa Tigrilla
const clubesOficiales = [
  "UNI RUGBY", "JOCKEY", "GRAND BOURG", "SAN ANTONIO", "CACHORROS",
  "GIMNASIA Y TIRO", "ACADEMIA FENIX", "SICC", "TIGRES", 
  "CENTRAL NORTE", "POPEYE", "FENIX (SALTA)", "WAYRA TORO"
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

// 🚀 VERSIÓN COMPATIBLE CON WEB Y CELULAR
  const seleccionarYSubirExcel = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ],
        copyToCacheDirectory: true
      });

      if (resultado.canceled || !resultado.assets || resultado.assets.length === 0) {
        return; 
      }

      setCargando(true);
      setMensaje('Abriendo archivo seleccionado...');
      const archivo = resultado.assets[0];
      const nombreArchivo = archivo.name.toLowerCase();

      let categoriaDetectada = "";
      if (nombreArchivo.includes('8va')) categoriaDetectada = "8va";
      else if (nombreArchivo.includes('9na')) categoriaDetectada = "9na";
      else if (nombreArchivo.includes('10ma')) categoriaDetectada = "10ma";

      if (!categoriaDetectada) {
        setCargando(false);
        setMensaje('');
        alert("El nombre del archivo debe contener '8va', '9na' o '10ma' para identificar la categoría.");
        return;
      }

      setMensaje('Analizando las planillas de juego...');
      const respuesta = await fetch(archivo.uri);
      const arrayBuffer = await respuesta.arrayBuffer();
      
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const primeraHojaNombre = workbook.SheetNames[0];
      const hoja = workbook.Sheets[primeraHojaNombre];
      
      const filas: any[] = XLSX.utils.sheet_to_json(hoja, { defval: "" });

      setCargando(false);
      setMensaje('');

      if (!filas || filas.length === 0) {
        alert("El archivo Excel seleccionado no contiene filas válidas.");
        return;
      }

      const mensajeConfirmacion = `Documento: ${archivo.name}\nPartidos encontrados: ${filas.length}\nCategoría destino: ${categoriaDetectada}\n\n¿Querés subir estos partidos ahora?`;

      // 🌐 DETECCIÓN DE PLATAFORMA (WEB vs MOBILE)
      import('react-native').then(({ Platform, Alert }) => {
        if (Platform.OS === 'web') {
          // Si estás en el navegador (Web), usamos el confirm estándar del explorador
          const respuestaWeb = window.confirm(mensajeConfirmacion);
          if (respuestaWeb) {
            procesarSubidaFirestore(filas, categoriaDetectada);
          }
        } else {
          // Si estás en el Celular (Android/iOS), usamos la alerta nativa estilizada
          Alert.alert(
            "Archivo Verificado 📁",
            mensajeConfirmacion,
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Subir Fixture", onPress: () => procesarSubidaFirestore(filas, categoriaDetectada) }
            ],
            { cancelable: true }
          );
        }
      });

    } catch (error: any) {
      setCargando(false);
      setMensaje('');
      alert(error.message || "Ocurrió un error al procesar el archivo Excel.");
    }
  };

  // 🔥 FUNCIÓN QUE SUBE LOS DATOS MAPEADOS A FIRESTORE EN BLOQUE (BATCH)
  const procesarSubidaFirestore = async (partidosExcel: any[], categoria: string) => {
    setCargando(true);
    setMensaje(`Subiendo fixture de ${categoria} a Firebase...`);
    try {
      const { db } = await import('@/firebaseConfig');
      const { collection, writeBatch, doc } = await import('firebase/firestore');

      const partidosRef = collection(db, "partidos");
      const batch = writeBatch(db);
      let partidosValidosContados = 0;

      partidosExcel.forEach((fila) => {
        const canchaNum = String(fila["Cancha"] || "").trim();
        const numPartido = parseInt(fila["Part"]) || 1;
        const horaInicio = String(fila["Hs Inicio"] || "").trim();
        const horaFin = String(fila["Hs Fin"] || "").trim();
        
        // Atajamos el duplicado automático que genera xlsx para columnas idénticas
        const equipoLocal = String(fila["Equipo"] || "").trim();
        const equipoVisitante = String(fila["Equipo_1"] || fila["Equipo.1"] || fila["Equipo1"] || "").trim();

        // Si la fila está vacía al final del Excel, la ignoramos de forma segura
        if (!equipoLocal || !equipoVisitante) return;

        partidosValidosContados++;
        const nuevoDocRef = doc(partidosRef);
        batch.set(nuevoDocRef, {
          categoria: categoria,
          cancha: canchaNum,
          partidoNum: numPartido,
          hora: horaInicio,
          horaFin: horaFin,
          local: equipoLocal,
          visitante: equipoVisitante,
          jugado: false
        });
      });

      if (partidosValidosContados === 0) {
        throw new Error("No se encontraron partidos válidos con local y visitante para estructurar.");
      }

      await batch.commit();
      setMensaje(`¡Fixture de ${categoria} subido con éxito! 🎉`);
      Alert.alert("¡Éxito! 🚀", `Se importaron ${partidosValidosContados} partidos de la categoría ${categoria} correctamente.`);
    } catch (error: any) {
      Alert.alert("Error en la subida a Firebase", error.message);
      setMensaje('Error al guardar datos.');
    } finally {
      setCargando(false);
    }
  };

  // 🎫 Función para generar códigos alfanuméricos únicos por Club
  async function generarCodigosOficiales() {
    setCargando(true);
    setMensaje('Generando códigos únicos de votación...');
    try {
      const { db } = await import('@/firebaseConfig');
      const { doc, setDoc } = await import('firebase/firestore');

      const generarHash = () => Math.random().toString(36).substring(2, 6).toUpperCase();

      for (const nombreClub of clubesOficiales) {
        const prefijo = nombreClub.substring(0, 2).toUpperCase();
        const codigoUnico = `${prefijo}-${generarHash()}`;

        await setDoc(doc(db, "codigos_votos", codigoUnico), {
          clubPertenece: nombreClub,
          votoEmitido: false,
          votoPara: ""
        });
      }

      setMensaje('¡Códigos oficiales creados con éxito! 🎫');
      Alert.alert("Éxito", "Códigos guardados en la colección 'codigos_votos'.");
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
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>09:00 hs</Text> - Acreditaciones (Cantina)</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>09:30 hs</Text> - Acto de Inauguración (Cancha 2)</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>10:00 hs</Text> - Inicio de Partidos</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>12:30 hs</Text> - Almuerzo 10 ma</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>13:00 hs</Text> - Almuerzo 9na</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>13:30 hs</Text> - Almuerzo 8va</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>14:00 hs</Text> - Concurso de Coreos 💃 y Sorteos (Cancha 2)</Text>
        <Text style={styles.infoText}>• <Text style={{ fontWeight: '600' }}>16:00 hs</Text> - Cierre</Text>
      </View>
    
      {/* 🏆 BOTONES PRINCIPALES DE USUARIO */}
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
            
            {/* 📥 BOTÓN SEGURO PARA SUBIR CUALQUIER EXCEL */}
            <TouchableOpacity 
              style={[styles.adminButton, { backgroundColor: '#2e7d32', marginBottom: 10 }]} 
              onPress={seleccionarYSubirExcel} 
              disabled={cargando}
            >
              {cargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.adminButtonText}>📥 SUBIR FIXTURE DESDE EXCEL</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.adminButton, { backgroundColor: '#e65100', marginBottom: 15 }]} onPress={generarCodigosOficiales} disabled={cargando}>
              {cargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.adminButtonText}>🎫 GENERAR CÓDIGOS OFICIALES</Text>}
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
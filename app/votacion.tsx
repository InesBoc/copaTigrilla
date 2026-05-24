import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig'; // Asegúrate de que la ruta sea correcta

  export default function Votacion() {
  const router = useRouter(); 
  const [codigo, setCodigo] = useState('');
  const [codigoValidado, setCodigoValidado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [miClub, setMiClub] = useState(''); 
  const [clubSeleccionado, setClubSeleccionado] = useState('');
  const [votoEnviado, setVotoEnviado] = useState(false);

  // --- LISTA OFICIAL DE CLUBES PARTICIPANTES ---
  const listaClubes = ['Tigres RC', 'Gimnasia y Tiro', 'Popeye BC', 'Jockey Club', 'Universitario RC', 'Central Norte'];

  // --- PASO 1: VALIDAR EL CÓDIGO EN FIRESTORE ---
 const validarCodigoEnBaseDeDatos = async () => {
    const codigoLimpio = codigo.trim().toUpperCase();
    if (!codigoLimpio) {
      Alert.alert('Error', 'Por favor, ingresá un código.');
      return;
    }

    setCargando(true);
    // Reseteamos estados por si quedaba algo de una prueba anterior
    setCodigoValidado(false);
    setClubSeleccionado('');

    try {
      const docRef = doc(db, "codigos_votos", codigoLimpio);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        Alert.alert('Código Inválido ❌', 'El código ingresado no existe en el registro del torneo.');
        setCargando(false);
        return;
      }

      const datos = docSnap.data();

      // ESTA ES LA VERIFICACIÓN CRÍTICA
      if (datos.usado === true) {
        Alert.alert(
          'Código Ya Utilizado ⚠️', 
          'Este código exclusivo ya fue usado para emitir un voto y no puede reutilizarse.'
        );
        setCargando(false);
        return;
      }

      // Si pasa los filtros, se habilita el voto
      setMiClub(datos.clubPertenece);
      setCodigoValidado(true);
      setCodigo(codigoLimpio);
      Alert.alert('¡Código Validado! ✅', `Habilitado para votar. Tu club es: ${datos.clubPertenece}`);

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema al validar el código.');
    } finally {
      setCargando(false);
    }
  };

// --- PASO 2: GUARDAR EL VOTO (VERSIÓN DIRECTA CON CONTROL DE ERRORES) ---
  const manejarVotacion = async () => {
    if (!codigo) {
      Alert.alert('Error', 'Falta el código de validación.');
      return;
    }
    if (!clubSeleccionado) {
      Alert.alert('Error', 'Por favor, seleccioná un club para votar.');
      return;
    }

    setCargando(true);
    try {
      const { doc, updateDoc, getDoc, setDoc } = await import('firebase/firestore');
      
      const codigoRef = doc(db, "codigos_votos", codigo);
      const resultadosRef = doc(db, "resultados_coreos", clubSeleccionado);

      // 1. Doble verificación de seguridad por las dudas
      const verificarDoc = await getDoc(codigoRef);
      if (!verificarDoc.exists()) {
        Alert.alert('Error', 'El código ya no existe.');
        setCargando(false);
        return;
      }
      
      if (verificarDoc.data().usado === true) {
        Alert.alert('Código Usado', 'Este código ya fue utilizado.');
        setCargando(false);
        return;
      }

      // 2. Primero quemamos el código para que no se pueda reusar (Cambia a usado: true)
      await updateDoc(codigoRef, { usado: true });

      // 3. Registramos o sumamos el voto al club seleccionado
      const resultadoDoc = await getDoc(resultadosRef);
      if (!resultadoDoc.exists()) {
        await setDoc(resultadosRef, { club: clubSeleccionado, votos: 1 });
      } else {
        const votosActuales = resultadoDoc.data().votos || 0;
        await updateDoc(resultadosRef, { votos: votosActuales + 1 });
      }

      // 4. Cambiamos el estado de la pantalla para mostrar el cartel de éxito
      setVotoEnviado(true);

    } catch (error: any) {
      console.error("Error detallado en la votación: ", error);
      // Esto nos va a decir exactamente qué está pasando (ej: si son reglas de Firebase)
      Alert.alert(
        'Error al registrar voto', 
        `Detalle: ${error.message || 'Error de conexión o permisos'}`
      );
    } finally {
      setCargando(false);
    }
  };
 if (votoEnviado) {
    return (
      <View style={styles.containerCentrado}>
        <Text style={styles.exitoIcono}>🎉</Text>
        <Text style={styles.exitoTitle}>¡Voto enviado con éxito!</Text>
        <Text style={styles.graciasTexto}>Ya registramos tu elección para el concurso de coreografías.</Text>
        
        {/* BOTÓN PARA VOLVER AL INICIO DE FORMA SEGURA */}
        <TouchableOpacity 
          style={styles.botonVolverHome} 
          onPress={() => router.replace('/')} // 'replace' resetea el historial para volver limpio
        >
          <Text style={styles.botonVolverHomeTexto}>VOLVER AL INICIO</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>💃 Concurso de Coreografías 🕺</Text>
      <Text style={styles.subtitle}>Elegí la mejor presentación del torneo</Text>

      {/* Bloque 1: Ingreso de Código */}
      <View style={styles.card}>
        <Text style={styles.label}>1. Ingresá tu código exclusivo:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, codigoValidado && styles.inputBloqueado]}
            placeholder="Ej: TIGRE123"
            placeholderTextColor="#aaa"
            value={codigo}
            onChangeText={setCodigo}
            autoCapitalize="characters"
            editable={!codigoValidado} // Bloquea el input si ya se validó
          />
          {!codigoValidado && (
            <TouchableOpacity style={styles.botonValidar} onPress={validarCodigoEnBaseDeDatos} disabled={cargando}>
              {cargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.botonValidarTexto}>Validar</Text>}
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.ayudaTexto}>*Cada código permite un solo voto y prohíbe votar por tu propio club.</Text>
      </View>

      {/* Bloque 2: Selección de Club (Se activa solo al validar el código) */}
      {codigoValidado && (
        <View style={styles.card}>
          <Text style={styles.label}>2. Seleccioná el club que más te gustó:</Text>
          <Text style={styles.simulacionTexto}>Club emisor: {miClub} (Autovoto deshabilitado ❌)</Text>
          
          <View style={styles.listaClubes}>
            {listaClubes.map((club, index) => {
              const esMiPropioClub = club === miClub;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.clubOption,
                    clubSeleccionado === club && styles.clubSeleccionado,
                    esMiPropioClub && styles.clubDeshabilitado
                  ]}
                  onPress={() => !esMiPropioClub && setClubSeleccionado(club)}
                  disabled={esMiPropioClub || cargando}
                >
                  <Text style={[
                    styles.clubTexto,
                    clubSeleccionado === club && styles.clubTextoSeleccionado,
                    esMiPropioClub && styles.clubTextoDeshabilitado
                  ]}>
                    🏑 {club} {esMiPropioClub ? '(Tu Club)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Botón de Enviar (Visible sólo cuando se seleccionó un club válido) */}
      {codigoValidado && clubSeleccionado ? (
        <TouchableOpacity style={styles.botonEnviar} onPress={manejarVotacion} disabled={cargando}>
          {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>ENVIAR MI VOTO</Text>}
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  containerCentrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#d32f2f', textAlign: 'center', fontWeight: '600', marginBottom: 25 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  inputContainer: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 45, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 15, fontSize: 16, color: '#1a1a1a', backgroundColor: '#fafafa' },
  inputBloqueado: { backgroundColor: '#e8f5e9', borderColor: '#a5d6a7', color: '#2e7d32', fontWeight: 'bold' },
  botonValidar: { backgroundColor: '#1a1a1a', paddingHorizontal: 15, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  botonValidarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  ayudaTexto: { fontSize: 12, color: '#666', marginTop: 8, fontStyle: 'italic' },
  simulacionTexto: { fontSize: 13, color: '#d32f2f', marginBottom: 15, fontStyle: 'italic', fontWeight: '600' },
  listaClubes: { marginTop: 5 },
  clubOption: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 8, backgroundColor: '#fff' },
  clubSeleccionado: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  clubDeshabilitado: { backgroundColor: '#f5f5f5', borderColor: '#e0e0e0' },
  clubTexto: { fontSize: 15, fontWeight: '600', color: '#444' },
  clubTextoSeleccionado: { color: '#fff' },
  clubTextoDeshabilitado: { color: '#bbb', textDecorationLine: 'line-through' },
  botonEnviar: { backgroundColor: '#d32f2f', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 30, elevation: 2 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  exitoTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 10, textAlign: 'center' },
  graciasTexto: { fontSize: 16, color: '#666', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  exitoIcono: { fontSize: 50, marginBottom: 15 },
  botonVolverHome: { 
    backgroundColor: '#1a1a1a', 
    paddingVertical: 14, 
    paddingHorizontal: 30, 
    borderRadius: 8, 
    marginTop: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  botonVolverHomeTexto: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: 'bold', 
    letterSpacing: 1 
  },
});
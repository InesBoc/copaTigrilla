import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig'; // Asegúrate de que la ruta a tu config sea correcta

// Tipado básico para TypeScript
interface Partido {
  id: string;
  categoria: string;
  cancha: string;
  hora: string;
  local: string;
  visitante: string;
  jugado?: boolean;
}

export default function CategoriaTabs() {
  const { categoria, adminMode } = useLocalSearchParams();
  const esAdministradorReal = adminMode === 'true';   
  const router = useRouter();
  const [tabActiva, setTabActiva] = useState('fixture');
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);

  // Mapeo seguro para que coincida el botón con el texto guardado en Firebase
  const obtenerCategoriaFirebase = (catParam: string | string[]) => {
    const stringCat = Array.isArray(catParam) ? catParam[0] : catParam;
    if (stringCat.includes('Sub 12')) return 'Sub 12';
    if (stringCat.includes('Sub 10')) return 'Sub 10';
    if (stringCat.includes('Sub 8')) return 'Sub 8';
    return stringCat;
  };

  const categoriaFiltrar = obtenerCategoriaFirebase(categoria);

  // --- TRAER PARTIDOS EN TIEMPO REAL DESDE FIRESTORE ---
  useEffect(() => {
    const partidosRef = collection(db, "partidos");
    const q = query(partidosRef, where("categoria", "==", categoriaFiltrar));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaPartidos: Partido[] = [];
      snapshot.forEach((docSnap) => {
        listaPartidos.push({ id: docSnap.id, ...docSnap.data() } as Partido);
      });
      // Opcional: Ordenar por hora del partido
      listaPartidos.sort((a, b) => a.hora.localeCompare(b.hora));
      setPartidos(listaPartidos);
      setCargando(false);
    }, (error) => {
      console.error("Error al traer partidos: ", error);
      setCargando(false);
    });

    return () => unsubscribe();
  }, [categoriaFiltrar]);

  // --- FUNCIÓN ADMINISTRADOR: MARCAR COMO JUGADO (CORREGIDA WEB/MOBILE) ---
  const cambiarEstadoJugado = (id: string, estadoActual: boolean) => {
    // Si NO es administrador, cancelamos la acción silenciosamente
    if (!esAdministradorReal) return;

    const titulo = "Control de Partido (Admin)";
    const mensaje = estadoActual ? "¿Querés cambiar el partido a PENDIENTE?" : "¿Dar por JUGADO este partido?";

    // 1. CONTROL EXCLUSIVO PARA NAVEGADOR WEB (PC / Netlify / Expo Web)
    if (typeof window !== 'undefined' && typeof (window as any).confirm === 'function') {
      const confirmar = window.confirm(`${titulo}\n\n${mensaje}`);
      if (confirmar) {
        ejecutarActualizacion(id, estadoActual);
      }
      return; // Corta acá para que no intente usar el Alert de celular
    }

    // 2. CONTROL NATIVO PARA CELULARES (Expo Go Android/iOS)
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, cambiar", onPress: () => ejecutarActualizacion(id, estadoActual) }
      ]
    );
  };

  // Función de diagnóstico pesado para obligar a mostrar el error en pantalla
  const ejecutarActualizacion = async (id: string, estadoActual: boolean) => {
    try {
      // 1. Alerta de control: Ver si el ID existe y es real
      alert("Paso 1: Intentando actualizar Partido ID:\n" + id);

      const partidoRef = doc(db, "partidos", id);
      const nuevoEstado = !estadoActual;

      // 2. Intentar impactar Firebase
      await setDoc(partidoRef, { jugado: nuevoEstado }, { merge: true });
      
      alert("Paso 2: ¡Firebase aceptó la escritura con éxito! 🎉");

      // 3. Forzar actualización local
      setPartidos(prevPartidos => 
        prevPartidos.map(p => p.id === id ? { ...p, jugado: nuevoEstado } : p)
      );

    } catch (error: any) {
      console.error(error);
      // 3. Si Firebase falla, nos va a decir EXACTAMENTE por qué acá:
      alert("❌ ERROR CRÍTICO DE FIREBASE:\n" + error.message + "\n\nCódigo: " + error.code);
    }
  };

  // --- COMPONENTES DE PESTAÑAS ---

  const VistaPlano = () => (
    <View style={styles.tabContenido}>
      <Text style={styles.seccionTitle}>🗺️ Distribución de Canchas</Text>
      <Text style={styles.bajada}>Ubicación de las canchas asignadas para {categoria}</Text>
      <View style={styles.placeholderPlano}>
        <Text style={styles.placeholderTexto}>Acá vamos a cargar la imagen del plano del club</Text>
      </View>
    </View>
  );

  const VistaEquipos = () => {
    // Extraer equipos únicos de los partidos cargados
    const equiposUnicos = Array.from(new Set(partidos.flatMap(p => [p.local, p.visitante]))).sort();

    return (
      <ScrollView contentContainerStyle={styles.tabContenido}>
        <Text style={styles.seccionTitle}>👥 Equipos Participantes ({partidos.length ? partidos.length * 2 : 0})</Text>
        {equiposUnicos.length === 0 ? (
          <Text style={styles.textoVacio}>No hay equipos registrados para esta categoría.</Text>
        ) : (
          equiposUnicos.map((equipo, index) => (
            <View key={index} style={styles.itemEquipo}>
              <Text style={styles.itemEquipoTexto}>🏑 {equipo}</Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const VistaFixture = () => (
    <ScrollView contentContainerStyle={styles.tabContenido}>
      <Text style={styles.seccionTitle}>🗓️ Rol de Partidos</Text>
      
      {esAdministradorReal && (
        <Text style={styles.adminTip}>💡 Admin: Toca una tarjeta para marcar/desmarcar como jugado.</Text>
      )}
      
      {cargando ? (
        <ActivityIndicator size="large" color="#d32f2f" style={{ marginTop: 20 }} />
      ) : partidos.length === 0 ? (
        <Text style={styles.textoVacio}>No hay partidos cargados para esta categoría.</Text>
      ) : (
        partidos.map((partido) => {
          const esJugado = partido.jugado === true;

          return (
            <TouchableOpacity 
              key={partido.id} 
              onPress={() => cambiarEstadoJugado(partido.id, esJugado)}
              activeOpacity={esAdministradorReal ? 0.7 : 1}
              style={[
                styles.cardPartido, 
                esJugado && styles.cardPartidoJugado 
              ]}
            >
              {/* HEADER DE LA TARJETA */}
              <View style={[styles.partidoHeader, esJugado && { borderBottomColor: '#c8e6c9' }]}>
                <View style={styles.headerFilaSuperior}>
                  <Text style={[styles.partidoHora, esJugado && { color: '#2e7d32' }]}>
                    ⏰ {partido.hora} hs {esJugado ? '✅ JUGADO' : ''}
                  </Text>
                  <Text style={[styles.partidoCancha, esJugado && { color: '#388e3c' }]}>
                    📍 {partido.cancha}
                  </Text>
                </View>

                {/* 👁️ ACCIÓN DE ADMIN EN UNA LÍNEA EXCLUSIVA INFERIOR PARA QUE NO SE SOLAPE */}
                {esAdministradorReal && (
                  <View style={styles.adminAccionContenedor}>
                    <Text style={[styles.adminAccionTexto, esJugado ? styles.textoPendiente : styles.textoJugado]}>
                      {esJugado ? '🔄 Tocar para cambiar a Pendiente' : '⚡ Tocar para marcar como Jugado'}
                    </Text>
                  </View>
                )}
              </View>

              {/* CRUCES DE EQUIPOS */}
              <View style={styles.partidoCruces}>
                <Text style={[styles.partidoEquipo, esJugado && { color: '#1b5e20' }]}>{partido.local}</Text>
                <Text style={[styles.vs, esJugado && { color: '#757575' }]}>vs</Text>
                <Text style={[styles.partidoEquipo, esJugado && { color: '#1b5e20' }]}>{partido.visitante}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  const RenderContenido = () => {
    switch (tabActiva) {
      case 'plano': return <VistaPlano />;
      case 'equipos': return <VistaEquipos />;
      case 'fixture':
      default: return <VistaFixture />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Copa Tigrilla - {categoriaFiltrar}</Text>
      </View>

      <View style={styles.cuerpo}>
        <RenderContenido />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, tabActiva === 'plano' && styles.tabActiva]} 
          onPress={() => setTabActiva('plano')}
        >
          <Text style={[styles.tabText, tabActiva === 'plano' && styles.tabTextActivo]}>Plano</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, tabActiva === 'fixture' && styles.tabActiva]} 
          onPress={() => setTabActiva('fixture')}
        >
          <Text style={[styles.tabText, tabActiva === 'fixture' && styles.tabTextActivo]}>Fixture</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, tabActiva === 'equipos' && styles.tabActiva]} 
          onPress={() => setTabActiva('equipos')}
        >
          <Text style={[styles.tabText, tabActiva === 'equipos' && styles.tabTextActivo]}>Equipos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#1a1a1a', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#d32f2f' },
  backButton: { marginRight: 15, backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  backButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cuerpo: { flex: 1 },
  tabContenido: { padding: 20 },
  seccionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 },
  bajada: { fontSize: 14, color: '#666', marginBottom: 20 },
  adminTip: { fontSize: 11, color: '#7b1fa2', fontWeight: '600', marginBottom: 15 },
  textoVacio: { textAlign: 'center', color: '#888', marginTop: 30, fontSize: 15 },
  
  placeholderPlano: { width: '100%', height: 250, backgroundColor: '#e0e0e0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#aaa' },
  placeholderTexto: { color: '#666', textAlign: 'center', fontSize: 16 },

  itemEquipo: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  itemEquipoTexto: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },

  // Estilos del Fixture Normal
  cardPartido: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, borderLeftWidth: 5, borderLeftColor: '#d32f2f' },
  // Estilo Verde Especial para el partido jugado
  cardPartidoJugado: { backgroundColor: '#e8f5e9', borderLeftColor: '#4caf50', elevation: 1 },
  
  partidoHeader: { flexDirection: 'column', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  headerFilaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%'},
  adminAccionContenedor: { marginTop: 6, backgroundColor: '#f0f0f0', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, alignSelf: 'flex-start'},
  adminAccionTexto: { fontSize: 11, fontWeight: 'bold'},
  textoJugado: {color: '#7b1fa2'},
  textoPendiente: { color: '#c62828'},
  partidoHora: { fontWeight: 'bold', color: '#d32f2f', fontSize: 14 },
  partidoCancha: { color: '#666', fontWeight: '500', fontSize: 14 },
  partidoCruces: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 5 },
  partidoEquipo: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center' },
  vs: { paddingHorizontal: 10, color: '#888', fontStyle: 'italic', fontWeight: 'bold' },

  tabBar: { flexDirection: 'row', height: 75, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff',paddingBottom: 15, position: 'relative', },
  tabButton: { flex: 1, justifyContent: 'center', alignItems: 'center' ,  paddingVertical: 5},
  tabActiva: { borderTopWidth: 3, borderTopColor: '#1a1a1a', backgroundColor: '#f9f9f9' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888', textAlign: 'center' },
  tabTextActivo: { color: '#1a1a1a', fontWeight: 'bold' }
});

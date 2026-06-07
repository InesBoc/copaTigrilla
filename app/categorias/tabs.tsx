import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

interface Partido {
  id: string;
  categoria: string;
  cancha: string | number;
  partidoNum: number; // 🆕 Número correlativo del partido por cancha (ej: 1, 2, 3...)
  hora: string;       // Hs Inicio (ej: "10:00")
  horaFin?: string;   // Hs Fin (ej: "10:12")
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

  // Mapeo adaptado a las categorías reales del encuentro infantil
  const obtenerCategoriaFirebase = (catParam: string | string[]) => {
    const stringCat = Array.isArray(catParam) ? catParam[0] : catParam;
    if (stringCat.includes('8')) return '8va';
    if (stringCat.includes('9')) return '9na';
    if (stringCat.includes('10')) return '10ma';
    return stringCat;
  };

  const categoriaFiltrar = obtenerCategoriaFirebase(categoria);

  // --- TRAER PARTIDOS EN TIEMPO REAL ---
  useEffect(() => {
    const partidosRef = collection(db, "partidos");
    const q = query(partidosRef, where("categoria", "==", categoriaFiltrar));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaPartidos: Partido[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        listaPartidos.push({ 
          id: docSnap.id, 
          categoria: data.categoria,
          cancha: data.cancha,
          partidoNum: data.partidoNum || data.Part || data.part, // Mapeo flexible del número de partido
          hora: data.hora || data.hsInicio || data.HsInicio,
          horaFin: data.horaFin || data.hsFin || data.HsFin,
          local: data.local || data.Equipo || data.equipo,
          visitante: data.visitante || data.Equipo1 || data.equipo1,
          jugado: data.jugado || false
        } as Partido);
      });
      
      // Ordenamos primero por número de cancha y luego por horario
      listaPartidos.sort((a, b) => {
        const canchaA = Number(a.cancha) || 0;
        const canchaB = Number(b.cancha) || 0;
        if (canchaA !== canchaB) return canchaA - canchaB;
        return a.hora.localeCompare(b.hora);
      });

      setPartidos(listaPartidos);
      setCargando(false);
    }, (error) => {
      console.error("Error al traer partidos: ", error);
      setCargando(false);
    });

    return () => unsubscribe();
  }, [categoriaFiltrar]);

  // --- SWITCH DE ESTADO RÁPIDO PARA EL ADMIN (UN SOLO CLIC SIN CARTALITOS) ---
  const conmutarEstadoPartidoAdmin = async (id: string, estadoActual: boolean) => {
    if (!esAdministradorReal) return;
    try {
      const partidoRef = doc(db, "partidos", id);
      await setDoc(partidoRef, { jugado: !estadoActual }, { merge: true });
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  // --- COMPONENTES DE INTERFAZ ---

const VistaPlano = () => (
  <View style={styles.tabContenido}>
    <Text style={styles.seccionTitle}>🗺️ Ubicación de Canchas</Text>
    <Text style={styles.bajada}>Distribución asignada para la categoría {categoriaFiltrar}</Text>
    
    <View style={styles.contenedorPlano}>
      <Image 
        source={require('../../assets/images/plano.jpeg') as any} 
        resizeMode="contain"
      />
    </View>

    <View style={styles.placeholderPlano}>
      <Text style={styles.placeholderTexto}>
        {categoriaFiltrar === '8va' && "🏑 Canchas asignadas: 1, 2, 3 y 4"}
        {categoriaFiltrar === '9na' && "🏑 Canchas asignadas: 5, 6, 7 y 8"}
        {categoriaFiltrar === '10ma' && "🏑 Canchas asignadas: 9, 10, 11 y 12"}
      </Text>
    </View>
  </View>
);
  const VistaEquipos = () => {
    const equiposUnicos = Array.from(new Set(partidos.flatMap(p => [p.local, p.visitante]))).filter(Boolean).sort();
    return (
      <ScrollView contentContainerStyle={styles.tabContenido}>
        <Text style={styles.seccionTitle}>👥 Clubes Participantes ({equiposUnicos.length})</Text>
        {equiposUnicos.length === 0 ? (
          <Text style={styles.textoVacio}>No hay equipos asignados a esta categoría.</Text>
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
      <View style={styles.headerFixtureSeccion}>
        <Text style={styles.seccionTitle}>🗓️ Rol de Partidos</Text>
        {esAdministradorReal && <Text style={styles.badgeAdminMode}>Modo Admin Listo</Text>}
      </View>
      
      {cargando ? (
        <ActivityIndicator size="large" color="#d32f2f" style={{ marginTop: 20 }} />
      ) : partidos.length === 0 ? (
        <Text style={styles.textoVacio}>No hay partidos cargados para {categoriaFiltrar}.</Text>
      ) : (
        partidos.map((partido) => {
          const esJugado = partido.jugado === true;

          return (
            <TouchableOpacity 
              key={partido.id}
              onPress={() => conmutarEstadoPartidoAdmin(partido.id, esJugado)}
              activeOpacity={esAdministradorReal ? 0.7 : 1}
              style={[styles.cardPartido, esJugado && styles.cardPartidoJugado]}
            >
              {/* Encabezado: Nº Partido - Cancha - Bloque Horario */}
              <View style={[styles.partidoHeader, esJugado && styles.partidoHeaderJugado]}>
                <View style={styles.headerInfoIzquierda}>
                  <Text style={[styles.txtPartidoNum, esJugado && styles.txtTextoJugadoVerde]}>
                    PARTIDO {partido.partidoNum}
                  </Text>
                  <Text style={styles.txtHorario}>
                    ⏰ {partido.hora} a {partido.horaFin || '--:--'} hs
                  </Text>
                </View>
                <Text style={[styles.txtCancha, esJugado && styles.txtCanchaJugado]}>
                  📍 Cancha {partido.cancha}
                </Text>
              </View>

              {/* Cruce directo en formato limpio tipo grilla */}
              <View style={styles.partidoCruces}>
                <View style={[styles.contenedorEquipo, esJugado && styles.contenedorEquipoJugado]}>
                  <Text style={[styles.partidoEquipo, esJugado && styles.txtTextoJugadoVerde]} numberOfLines={1}>
                    {partido.local}
                  </Text>
                </View>
                
                <Text style={[styles.vs, esJugado && { color: '#a5d6a7' }]}>vs</Text>
                
                <View style={[styles.contenedorEquipo, esJugado && styles.contenedorEquipoJugado]}>
                  <Text style={[styles.partidoEquipo, esJugado && styles.txtTextoJugadoVerde]} numberOfLines={1}>
                    {partido.visitante}
                  </Text>
                </View>
              </View>

              {/* Indicador inferior estético solo para el Admin */}
              {esAdministradorReal && (
                <View style={styles.footerAdminAccion}>
                  <Text style={[styles.txtAdminFeedback, esJugado ? styles.txtStyleReset : styles.txtCheck]}>
                    {esJugado ? "🔄 Tocar para poner Pendiente" : "⚡ Tocar para marcar Jugado"}
                  </Text>
                </View>
              )}
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
        <Text style={styles.headerTitle}>Copa Tigrilla — {categoriaFiltrar}</Text>
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
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#1a1a1a', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#d32f2f' },
  backButton: { marginRight: 15, backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  backButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cuerpo: { flex: 1 },
  tabContenido: { padding: 15 },
  headerFixtureSeccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seccionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  badgeAdminMode: { fontSize: 11, fontWeight: 'bold', color: '#fff', backgroundColor: '#7b1fa2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  bajada: { fontSize: 13, color: '#666', marginBottom: 15 },
  textoVacio: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
  
  placeholderPlano: { width: '100%', height: 180, backgroundColor: '#eef1f4', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  placeholderTexto: { color: '#475569', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  itemEquipo: { backgroundColor: '#fff', padding: 12, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  itemEquipoTexto: { fontSize: 14, fontWeight: '600', color: '#334155' },

  // Tarjetas del fixture adaptadas al modelo infantil
  cardPartido: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#dee2e6', overflow: 'hidden', elevation: 1 },
  cardPartidoJugado: { backgroundColor: '#edf7ed', borderColor: '#c8e6c9' },
  
  partidoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  partidoHeaderJugado: { backgroundColor: '#e8f5e9', borderBottomColor: '#c8e6c9' },
  headerInfoIzquierda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txtPartidoNum: { fontSize: 12, fontWeight: 'bold', color: '#495057' },
  txtHorario: { fontSize: 12, fontWeight: '600', color: '#6c757d' },
  txtCancha: { fontSize: 12, fontWeight: 'bold', color: '#d32f2f' },
  txtCanchaJugado: { color: '#2e7d32' },

  partidoCruces: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#fff' },
  contenedorEquipo: { flex: 1, backgroundColor: '#f1f3f5', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 4, alignItems: 'center' },
  contenedorEquipoJugado: { backgroundColor: '#f1f8e9' },
  partidoEquipo: { fontSize: 13, fontWeight: '700', color: '#212529' },
  txtTextoJugadoVerde: { color: '#2e7d32' },
  vs: { paddingHorizontal: 12, color: '#ced4da', fontWeight: 'bold', fontSize: 12 },

  footerAdminAccion: { backgroundColor: '#fafafa', paddingVertical: 4, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f1f1' },
  txtAdminFeedback: { fontSize: 10, fontWeight: 'bold' },
  txtCheck: { color: '#7b1fa2' },
  txtStyleReset: { color: '#c62828' },

  tabBar: { flexDirection: 'row', height: 70, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff', paddingBottom: 10 },
  tabButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabActiva: { borderTopWidth: 3, borderTopColor: '#d32f2f' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActivo: { color: '#d32f2f', fontWeight: 'bold' },
  contenedorPlano: {
  width: '100%',
  height: 250, // Ajustá la altura según consideres cómodo para el diseño
  backgroundColor: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  justifyContent: 'center',
  alignItems: 'center',
  marginVertical: 10,
  borderWidth: 1,
  borderColor: '#eee',
},
imagenPlano: {
  width: '100%',
  height: '100%',
},
});
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

interface Resultado {
  id: string;
  club: string;
  votos: number;
}

export default function ResultadosVotacion() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Escuchamos los cambios en tiempo real ordenando por votos
    const q = query(collection(db, "resultados_coreos"), orderBy("votos", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Resultado[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Resultado);
      });
      setResultados(docs);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  const totalVotos = resultados.reduce((acc, curr) => acc + curr.votos, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ranking de Coreografías</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.votosTotales}>Total de votos emitidos: {totalVotos}</Text>

        {cargando ? (
          <ActivityIndicator size="large" color="#d32f2f" style={{ marginTop: 50 }} />
        ) : resultados.length === 0 ? (
          <Text style={styles.sinDatos}>Esperando los primeros votos...</Text>
        ) : (
          resultados.map((res, index) => (
            <View key={res.id} style={styles.cardRanking}>
              <View style={styles.rankingInfo}>
                <Text style={styles.puesto}>{index + 1}°</Text>
                <Text style={styles.clubNombre}>{res.club}</Text>
                <Text style={styles.votosCuenta}>{res.votos} {res.votos === 1 ? 'voto' : 'votos'}</Text>
              </View>
              {/* Barra visual de progreso */}
              <View style={styles.barraContenedor}>
                <View 
                  style={[
                    styles.barraProgreso, 
                    { width: `${(res.votos / (resultados[0].votos || 1)) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#1a1a1a', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#d32f2f' },
  backButton: { marginRight: 15, backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  backButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  votosTotales: { textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 20, fontWeight: 'bold' },
  sinDatos: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
  cardRanking: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  rankingInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  puesto: { fontSize: 20, fontWeight: 'bold', color: '#d32f2f', width: 40 },
  clubNombre: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  votosCuenta: { fontSize: 14, fontWeight: '600', color: '#7b1fa2' },
  barraContenedor: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  barraProgreso: { height: '100%', backgroundColor: '#d32f2f' }
});
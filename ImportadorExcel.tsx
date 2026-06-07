import { db } from '@/firebaseConfig';
import * as DocumentPicker from 'expo-document-picker';
import { collection, doc, writeBatch } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as XLSX from 'xlsx';

export default function ImportadorExcel() {
  const [cargando, setCargando] = useState(false);

  const seleccionarYSubirExcel = async () => {
    try {
      // 1. Abrir el selector de archivos
      const resultado = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel' // .xls
        ],
        copyToCacheDirectory: true
      });

      if (resultado.canceled || !resultado.assets || resultado.assets.length === 0) {
        return; 
      }

      setCargando(true);
      const archivo = resultado.assets[0];
      const nombreArchivo = archivo.name.toLowerCase(); // ej: "fixture_8va.xlsx"

      // 2. Detectar la categoría de manera exacta usando el nombre del archivo
      let categoriaDetectada = "";
      if (nombreArchivo.includes('8va')) categoriaDetectada = "8va";
      else if (nombreArchivo.includes('9na')) categoriaDetectada = "9na";
      else if (nombreArchivo.includes('10ma')) categoriaDetectada = "10ma";

      if (!categoriaDetectada) {
        setCargando(false);
        Alert.alert(
          "Archivo no reconocido",
          "El nombre del archivo debe contener '8va', '9na' o '10ma' para identificar la categoría."
        );
        return;
      }

      // 3. Leer el archivo binario
      const respuesta = await fetch(archivo.uri);
      const blob = await respuesta.blob();

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Tomamos la primera hoja disponible
          const primeraHojaNombre = workbook.SheetNames[0];
          const hoja = workbook.Sheets[primeraHojaNombre];
          
          // Convertimos la planilla a objetos JSON
          const filas: any[] = XLSX.utils.sheet_to_json(hoja, { defval: "" });

          if (filas.length === 0) {
            throw new Error("El archivo Excel no contiene filas de datos.");
          }

          // Confirmación en pantalla antes de escribir en Firestore
          Alert.alert(
            "Archivo Verificado 📁",
            `Documento: ${archivo.name}\nPartidos encontrados: ${filas.length}\nCategoría destino: ${categoriaDetectada}\n\n¿Querés subir estos partidos ahora?`,
            [
              { text: "Cancelar", style: "cancel", onPress: () => setCargando(false) },
              { text: "Subir Fixture", onPress: () => procesarSubidaFirestore(filas, categoriaDetectada) }
            ]
          );

        } catch (err: any) {
          Alert.alert("Error al procesar el contenido", err.message);
          setCargando(false);
        }
      };

      reader.readAsBinaryString(blob);

    } catch (error: any) {
      Alert.alert("Error al abrir el archivo", error.message);
      setCargando(false);
    }
  };

 const procesarSubidaFirestore = async (partidosExcel: any[], categoria: string) => {
    try {
      const partidosRef = collection(db, "partidos");
      const batch = writeBatch(db);

      partidosExcel.forEach((fila) => {
        // 1. Acceso seguro usando corchetes para columnas con espacios o caracteres especiales
        const canchaNum = String(fila["Cancha"] || "").trim();
        const numPartido = parseInt(fila["Part"]) || 1;
        const horaInicio = String(fila["Hs Inicio"] || "").trim();
        const horaFin = String(fila["Hs Fin"] || "").trim();
        
        // 2. Manejo de las columnas duplicadas de equipos
        // Excel no permite dos columnas con el mismo nombre, por lo que la librería 
        // autonombra la segunda como "Equipo_1" o "Equipo.1"
        const equipoLocal = String(fila["Equipo"] || "").trim();
        const equipoVisitante = String(fila["Equipo_1"] || fila["Equipo.1"] || fila["Equipo1"] || "").trim();

        // Evitamos procesar filas que queden vacías al final del archivo
        if (!equipoLocal || !equipoVisitante) return;

        const nuevoDocRef = doc(partidosRef);
        batch.set(nuevoDocRef, {
          categoria: categoria,           // "8va", "9na" o "10ma"
          cancha: canchaNum,              // ej: "1", "5", "9"
          partidoNum: numPartido,         // Nº correlativo del partido
          hora: horaInicio,               // Hs Inicio
          horaFin: horaFin,               // Hs Fin
          local: equipoLocal,
          visitante: equipoVisitante,
          jugado: false                   // Arrancan todos pendientes
        });
      });

      await batch.commit();
      Alert.alert("¡Éxito! 🚀", `Se importó el fixture completo de la categoría ${categoria} correctamente.`);
    } catch (error: any) {
      Alert.alert("Error en la subida a Firebase", error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.cardContainer}>
      <Text style={styles.titulo}>📥 Importador de Fixtures Oficiales</Text>
      <Text style={styles.bajada}>
        Seleccioná cualquiera de los archivos oficiales (fixture_8va, fixture_9na o fixture_10ma) para poblar la base de datos de manera automática.
      </Text>

      {cargando ? (
        <View style={styles.bloqueCarga}>
          <ActivityIndicator size="small" color="#d32f2f" />
          <Text style={styles.txtProcesando}>Subiendo datos a Firestore...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.botonExcel} onPress={seleccionarYSubirExcel}>
          <Text style={styles.textoBoton}>🟢 SELECCIONAR ARCHIVO EXCEL</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 10, margin: 15, borderWidth: 1, borderColor: '#dee2e6', elevation: 2 },
  titulo: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 6 },
  bajada: { fontSize: 13, color: '#64748b', marginBottom: 15, lineHeight: 18 },
  botonExcel: { backgroundColor: '#1e7e34', paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  textoBoton: { color: '#fff', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },
  bloqueCarga: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 10 },
  txtProcesando: { fontSize: 13, fontWeight: '600', color: '#64748b' }
});
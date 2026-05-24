import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1a1a', 
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* 1. Página de Inicio */}
      <Stack.Screen name="index" options={{ title: 'Copa Tigrilla 2026' }} />
      
      {/* 2. El flujo interno de categorías (maneja su diseño propio) */}
      <Stack.Screen name="categorias" options={{ headerShown: false }} />
      
      {/* 3. Pantalla de votación */}
      <Stack.Screen name="votacion" options={{ title: 'Votar Mejor Coreo' }} />
    </Stack>
  );
}
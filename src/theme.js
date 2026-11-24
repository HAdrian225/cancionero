import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const H_INSET = 22; // Sangría lateral fija para iPhone 15 Pro Max + borde negro de vidrio templado

export const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const LIGHT = {
  mode: 'light',
  bg: '#FAF8F4',         // Papel/marfil suave (menos fatiga visual que blanco puro)
  surface: '#FFFFFF',    // Tarjetas y paneles elevados
  surfaceAlt: '#EFEAE0', // Controles segmentados, buscador, chips inactivos
  fg: '#1C1917',         // Tinta carbón cálido
  sub: '#6E685F',        // Metadatos y subtítulos (contraste >= 4.5:1)
  line: '#E6E0D6',       // Divisores sutiles
  accent: '#A34806',     // Ámbar/terracota editorial (> 5:1 sobre claro y accentSoft)
  accentSoft: '#FEF3E2', // Fondo suave para pills y estados activos
  onAccent: '#FFFFFF',   // Texto sobre botones primarios
  chord: '#B8421B',      // Acordes sobre la letra (alto contraste > 5:1)
  danger: '#DC2626',     // Acciones destructivas
  dangerSoft: '#FEE2E2',
  shadow: '#1C1917',
};

export const DARK = {
  mode: 'dark',
  bg: '#09090B',         // Negro OLED profundo para iPhone 15 Pro Max
  surface: '#151519',    // Tarjetas y paneles con separación limpia
  surfaceAlt: '#222229', // Controles secundarios, buscador, chips
  fg: '#F5F3EE',         // Marfil claro (sin halo en OLED)
  sub: '#A19B91',        // Metadatos legibles
  line: '#2A2A33',       // Divisores finos
  accent: '#E5954A',     // Ámbar cálido luminoso en oscuro
  accentSoft: '#2E2115', // Fondo suave para pills activas
  onAccent: '#160E07',   // Texto oscuro de alto contraste sobre acento claro
  chord: '#F59E56',      // Acordes muy legibles a distancia de atril
  danger: '#F87171',
  dangerSoft: '#35181A',
  shadow: '#000000',
};

export const hapticSelect = () => {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {});
  }
};

export const hapticLight = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
};

export const hapticSuccess = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
};

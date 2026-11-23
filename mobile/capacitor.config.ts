import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fll.quadratsinteligente',
  appName: 'Quadrats Inteligentes',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Procurando quadrats ESP32...',
        cancel: 'Cancelar',
        availableDevices: 'Quadrats encontrados',
        noDeviceFound: 'Nenhum quadrat ESP32 encontrado',
      },
    },
  },
}

export default config

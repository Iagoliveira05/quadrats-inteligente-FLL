import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Geolocation } from '@capacitor/geolocation'
import { Network } from '@capacitor/network'
import { Share } from '@capacitor/share'

export type NativePosition = {
  latitude: number
  longitude: number
  altitude: number | null
  accuracy: number | null
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export async function getCurrentGpsPosition(): Promise<NativePosition> {
  if (Capacitor.isNativePlatform()) {
    const permissions = await Geolocation.checkPermissions()
    if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
      const requested = await Geolocation.requestPermissions()
      if (requested.location !== 'granted' && requested.coarseLocation !== 'granted') {
        throw new Error('Permissão de localização negada no dispositivo.')
      }
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12_000,
    })
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: typeof position.coords.altitude === 'number' ? position.coords.altitude : null,
      accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
    }
  }

  return new Promise<NativePosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste navegador.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: typeof position.coords.altitude === 'number' ? position.coords.altitude : null,
          accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
        }),
      () => reject(new Error('Não foi possível obter a localização GPS.')),
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  })
}

export async function exportCsvFile(fileName: string, csvWithBom: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: fileName,
      data: csvWithBom,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({
      title: 'Exportar coletas (CSV)',
      text: 'Dados ecológicos exportados pelo Quadrats Inteligentes',
      url: written.uri,
      dialogTitle: 'Salvar ou compartilhar CSV',
    })
    return
  }

  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}

export async function isDeviceOnline(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Network.getStatus()
      return status.connected
    } catch {
      return navigator.onLine
    }
  }
  return navigator.onLine
}

export function subscribeNetworkOnline(onChange: (online: boolean) => void): () => void {
  if (Capacitor.isNativePlatform()) {
    let removeListener: (() => Promise<void>) | null = null
    void Network.getStatus()
      .then((status) => onChange(status.connected))
      .catch(() => onChange(navigator.onLine))
    void Network.addListener('networkStatusChange', (status) => {
      onChange(status.connected)
    }).then((handle) => {
      removeListener = () => handle.remove()
    })
    return () => {
      if (removeListener) void removeListener()
    }
  }

  const update = () => onChange(navigator.onLine)
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
  return () => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  }
}

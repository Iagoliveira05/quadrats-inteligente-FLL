import { Capacitor } from '@capacitor/core'
import { BleClient } from '@capacitor-community/bluetooth-le'

export const QUADRAT_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
export const QUADRAT_MEASUREMENT_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'

export type SensorMeasurement = {
  deviceId?: string
  sequence?: number
  uptimeMs?: number
  airTemperature?: number | null
  airHumidity?: number | null
  soilTemperature?: number | null
  soilMoisture?: boolean | null
  soilMoisturePercent?: number | null
  soilMoistureRaw?: number | null
  lightLux?: number | null
  latitude?: number | null
  longitude?: number | null
  gpsValid?: boolean
  receivedAt: string
}

type WebBluetoothCharacteristic = {
  value: DataView
  addEventListener: (name: string, listener: EventListener) => void
  removeEventListener: (name: string, listener: EventListener) => void
  startNotifications: () => Promise<unknown>
}

type WebBluetoothDevice = {
  name?: string
  addEventListener: (name: string, listener: EventListener) => void
  removeEventListener: (name: string, listener: EventListener) => void
  gatt?: {
    connect: () => Promise<{
      getPrimaryService: (uuid: string) => Promise<{
        getCharacteristic: (uuid: string) => Promise<WebBluetoothCharacteristic>
      }>
    }>
    disconnect: () => void
  }
}

type WebBluetoothApi = {
  requestDevice: (options: { filters: Array<{ services: string[] }> }) => Promise<WebBluetoothDevice>
}

export type QuadratConnection = {
  device: { name?: string; id?: string }
  disconnect: () => void
}

function parseMeasurementPayload(dataView: DataView): SensorMeasurement | null {
  try {
    const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength)
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Omit<
      SensorMeasurement,
      'receivedAt'
    >
    const temperatureValid =
      parsed.airTemperature === undefined ||
      parsed.airTemperature === null ||
      typeof parsed.airTemperature === 'number'
    const humidityValid =
      parsed.airHumidity === undefined ||
      parsed.airHumidity === null ||
      (typeof parsed.airHumidity === 'number' &&
        parsed.airHumidity >= 0 &&
        parsed.airHumidity <= 100)
    const soilTemperatureValid =
      parsed.soilTemperature === undefined ||
      parsed.soilTemperature === null ||
      typeof parsed.soilTemperature === 'number'
    const soilMoistureValid =
      parsed.soilMoisture === undefined ||
      parsed.soilMoisture === null ||
      typeof parsed.soilMoisture === 'boolean'
    const soilMoisturePercentValid =
      parsed.soilMoisturePercent === undefined ||
      parsed.soilMoisturePercent === null ||
      (typeof parsed.soilMoisturePercent === 'number' &&
        parsed.soilMoisturePercent >= 0 &&
        parsed.soilMoisturePercent <= 100)
    const lightLuxValid =
      parsed.lightLux === undefined ||
      parsed.lightLux === null ||
      (typeof parsed.lightLux === 'number' && parsed.lightLux >= 0)

    if (
      temperatureValid &&
      humidityValid &&
      soilTemperatureValid &&
      soilMoistureValid &&
      soilMoisturePercentValid &&
      lightLuxValid
    ) {
      return { ...parsed, receivedAt: new Date().toISOString() }
    }
    return null
  } catch {
    return null
  }
}

export function bluetoothSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator && window.isSecureContext
}

async function connectNativeBle(
  onMeasurement: (measurement: SensorMeasurement) => void,
  onDisconnect?: () => void,
): Promise<QuadratConnection> {
  try {
    await BleClient.initialize({ androidNeverForLocation: false })
  } catch {
    throw new Error('Ative o Bluetooth e conceda as permissões de Bluetooth/Localização no Android.')
  }

  let device
  try {
    device = await BleClient.requestDevice({
      services: [QUADRAT_SERVICE_UUID],
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : ''
    if (message.toLowerCase().includes('cancel')) {
      throw new Error('Seleção de dispositivo cancelada.', { cause })
    }
    throw new Error('Nenhum quadrat ESP32 selecionado. Verifique se o equipamento está ligado.', {
      cause,
    })
  }

  let closedByUser = false

  await BleClient.connect(device.deviceId, () => {
    if (!closedByUser) onDisconnect?.()
  })

  await BleClient.startNotifications(
    device.deviceId,
    QUADRAT_SERVICE_UUID,
    QUADRAT_MEASUREMENT_UUID,
    (value) => {
      const measurement = parseMeasurementPayload(value)
      if (measurement) onMeasurement(measurement)
    },
  )

  return {
    device: { name: device.name || 'Quadrat ESP32', id: device.deviceId },
    disconnect: () => {
      closedByUser = true
      void BleClient.stopNotifications(
        device.deviceId,
        QUADRAT_SERVICE_UUID,
        QUADRAT_MEASUREMENT_UUID,
      ).catch(() => undefined)
      void BleClient.disconnect(device.deviceId).catch(() => undefined)
    },
  }
}

async function connectWebBle(
  onMeasurement: (measurement: SensorMeasurement) => void,
  onDisconnect?: () => void,
): Promise<QuadratConnection> {
  const bluetooth = (navigator as Navigator & { bluetooth: WebBluetoothApi }).bluetooth
  const device = await bluetooth.requestDevice({
    filters: [{ services: [QUADRAT_SERVICE_UUID] }],
  })
  const server = await device.gatt?.connect()
  if (!server) throw new Error('Não foi possível abrir a conexão GATT.')
  const service = await server.getPrimaryService(QUADRAT_SERVICE_UUID)
  const characteristic = (await service.getCharacteristic(
    QUADRAT_MEASUREMENT_UUID,
  )) as WebBluetoothCharacteristic

  const listener = (event: Event) => {
    const value = (event.target as unknown as WebBluetoothCharacteristic).value
    const measurement = parseMeasurementPayload(value)
    if (measurement) onMeasurement(measurement)
  }
  const disconnected = () => onDisconnect?.()
  device.addEventListener('gattserverdisconnected', disconnected)
  characteristic.addEventListener('characteristicvaluechanged', listener)
  await characteristic.startNotifications()

  return {
    device,
    disconnect: () => {
      characteristic.removeEventListener('characteristicvaluechanged', listener)
      device.removeEventListener('gattserverdisconnected', disconnected)
      device.gatt?.disconnect()
    },
  }
}

export async function connectQuadrat(
  onMeasurement: (measurement: SensorMeasurement) => void,
  onDisconnect?: () => void,
): Promise<QuadratConnection> {
  if (Capacitor.isNativePlatform()) {
    return connectNativeBle(onMeasurement, onDisconnect)
  }
  if (!bluetoothSupported()) {
    throw new Error('Bluetooth indisponível neste navegador. Use o app Android ou Chrome em HTTPS.')
  }
  return connectWebBle(onMeasurement, onDisconnect)
}

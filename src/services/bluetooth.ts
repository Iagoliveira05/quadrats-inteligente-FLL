export const QUADRAT_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
export const QUADRAT_MEASUREMENT_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'

export type SensorMeasurement = { deviceId?: string; sequence?: number; uptimeMs?: number; airTemperature?: number | null; airHumidity?: number | null; waterLevelPercent?: number | null; soilMoistureRaw?: number | null; latitude?: number | null; longitude?: number | null; gpsValid?: boolean; receivedAt: string }
type BluetoothCharacteristic = { value: DataView; addEventListener: (name: string, listener: EventListener) => void; removeEventListener: (name: string, listener: EventListener) => void; startNotifications: () => Promise<unknown> }
type BluetoothDevice = { name?: string; addEventListener: (name: string, listener: EventListener) => void; removeEventListener: (name: string, listener: EventListener) => void; gatt?: { connect: () => Promise<{ getPrimaryService: (uuid: string) => Promise<{ getCharacteristic: (uuid: string) => Promise<BluetoothCharacteristic> }> }>; disconnect: () => void } }
type BluetoothApi = { requestDevice: (options: { filters: Array<{ services: string[] }> }) => Promise<BluetoothDevice> }

export function bluetoothSupported() { return typeof navigator !== 'undefined' && 'bluetooth' in navigator && window.isSecureContext }

export async function connectQuadrat(onMeasurement: (measurement: SensorMeasurement) => void, onDisconnect?: () => void) {
  if (!bluetoothSupported()) throw new Error('Web Bluetooth exige navegador compatível e HTTPS ou localhost.')
  const bluetooth = (navigator as Navigator & { bluetooth: BluetoothApi }).bluetooth
  const device = await bluetooth.requestDevice({ filters: [{ services: [QUADRAT_SERVICE_UUID] }] })
  const server = await device.gatt?.connect()
  if (!server) throw new Error('Não foi possível abrir a conexão GATT.')
  const service = await server.getPrimaryService(QUADRAT_SERVICE_UUID)
  const characteristic = await service.getCharacteristic(QUADRAT_MEASUREMENT_UUID) as BluetoothCharacteristic
  const listener = (event: Event) => {
    const value = (event.target as unknown as BluetoothCharacteristic).value
    try {
      const parsed = JSON.parse(new TextDecoder().decode(value.buffer)) as Omit<SensorMeasurement, 'receivedAt'>
      const temperatureValid = parsed.airTemperature === null || typeof parsed.airTemperature === 'number'
      const humidityValid = parsed.airHumidity === null || (typeof parsed.airHumidity === 'number' && parsed.airHumidity >= 0 && parsed.airHumidity <= 100)
      const waterLevelValid = parsed.waterLevelPercent === null || (typeof parsed.waterLevelPercent === 'number' && parsed.waterLevelPercent >= 0 && parsed.waterLevelPercent <= 100)
      if (temperatureValid && humidityValid && waterLevelValid) onMeasurement({ ...parsed, receivedAt: new Date().toISOString() })
    } catch { /* Pacotes incompletos são ignorados. */ }
  }
  const disconnected = () => onDisconnect?.()
  device.addEventListener('gattserverdisconnected', disconnected)
  characteristic.addEventListener('characteristicvaluechanged', listener)
  await characteristic.startNotifications()
  return { device, disconnect: () => { characteristic.removeEventListener('characteristicvaluechanged', listener); device.removeEventListener('gattserverdisconnected', disconnected); device.gatt?.disconnect() } }
}

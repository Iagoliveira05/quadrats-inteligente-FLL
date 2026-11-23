import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Bluetooth,
  Bug,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  Droplets,
  FlaskConical,
  Grid3X3,
  Layers,
  Leaf,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Ruler,
  Save,
  ShieldAlert,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Trash2,
  Unlock,
  Wind,
} from 'lucide-react'
import type { SensorMeasurement } from '../services/bluetooth'
import type { WorkspaceItem } from '../services/data'
import { loadCollectionPhotoBlobs, stripDraftPhotoMeta } from '../services/photos'
import {
  ASPECT_OPTIONS,
  BRAUN_BLANQUET_OPTIONS,
  calculateEcologicalMetrics,
  DISTURBANCE_OPTIONS,
  formatAreaM2,
  formatSpeciesLabel,
  getQuadrantInfo,
  getQuadratSizeOption,
  isQuadrantCode,
  ORGANISM_TYPES,
  PHENOLOGY_OPTIONS,
  PHOTO_TAGS,
  QUADRAT_ORIENTATIONS,
  QUADRAT_SIZE_OPTIONS,
  SAMPLING_METHODS,
  SUBSTRATE_OPTIONS,
  SUN_EXPOSURE_OPTIONS,
  VEGETATION_STRATA,
  WEATHER_OPTIONS,
  WIND_OPTIONS,
  type BraunBlanquetCode,
  type CollectionPhotoMeta,
  type DraftPhoto,
  type QuadrantCode,
  type QuadratOrientation,
  type SpeciesEntry,
} from '../types/collection'
import { PhotoUploadSection } from './PhotoUploadSection'
import { QuadratGrid } from './QuadratGrid'
import './CollectionForm.css'

type SensorFieldKey =
  | 'temperature'
  | 'humidity'
  | 'soilTemperature'
  | 'soilMoisturePercent'
  | 'lightLux'

type ManualSensorOverrides = Record<SensorFieldKey, string | null>

type Props = {
  areas: WorkspaceItem[]
  quadrats: WorkspaceItem[]
  existingCollections: WorkspaceItem[]
  latest: SensorMeasurement | null
  initialCollection?: WorkspaceItem | null
  onCancel: () => void
  onSave: (item: WorkspaceItem, photos: DraftPhoto[]) => Promise<void>
}

function toLocalDateTimeInput(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function initialDateTimeValue(initial?: WorkspaceItem | null): string {
  if (typeof initial?.collectedAt === 'string') {
    const parsed = new Date(initial.collectedAt)
    if (!Number.isNaN(parsed.getTime())) return toLocalDateTimeInput(parsed)
  }
  if (typeof initial?.createdAt === 'number' && Number.isFinite(initial.createdAt)) {
    return toLocalDateTimeInput(new Date(initial.createdAt))
  }
  return toLocalDateTimeInput(new Date())
}

function asStringField(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumberField(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : ''
}

function asInitialOrientation(value: unknown): QuadratOrientation {
  return typeof value === 'string' &&
    (QUADRAT_ORIENTATIONS as readonly string[]).includes(value)
    ? (value as QuadratOrientation)
    : 'N'
}

function extractInitialSpecies(initial?: WorkspaceItem | null): SpeciesEntry[] {
  if (!initial) return []
  if (Array.isArray(initial.speciesEntries) && initial.speciesEntries.length > 0) {
    return initial.speciesEntries
      .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
      .map((entry) => ({
        id: typeof entry.id === 'string' && entry.id ? entry.id : crypto.randomUUID(),
        commonName: typeof entry.commonName === 'string' ? entry.commonName : '',
        scientificName: typeof entry.scientificName === 'string' ? entry.scientificName : '',
        organismType:
          typeof entry.organismType === 'string' && entry.organismType
            ? entry.organismType
            : ORGANISM_TYPES[0],
        count: typeof entry.count === 'number' && Number.isFinite(entry.count) ? entry.count : null,
        coverPercent:
          typeof entry.coverPercent === 'number' && Number.isFinite(entry.coverPercent)
            ? entry.coverPercent
            : null,
        braunBlanquet:
          typeof entry.braunBlanquet === 'string'
            ? (entry.braunBlanquet as BraunBlanquetCode)
            : '',
        phenology:
          typeof entry.phenology === 'string' && entry.phenology
            ? entry.phenology
            : PHENOLOGY_OPTIONS[0],
        invasive: Boolean(entry.invasive),
        notes: typeof entry.notes === 'string' ? entry.notes : '',
      }))
  }
  if (Array.isArray(initial.species) && initial.species.length > 0) {
    return initial.species
      .map((item) => String(item).trim())
      .filter(Boolean)
      .map((commonName) => createEmptySpecies(commonName))
  }
  return []
}

function extractInitialPhotoMetas(initial?: WorkspaceItem | null): CollectionPhotoMeta[] {
  if (!initial || !Array.isArray(initial.photos)) return []
  return initial.photos
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null && typeof (entry as Record<string, unknown>).id === 'string')
    .map((entry) => ({
      id: String(entry.id),
      fileName: typeof entry.fileName === 'string' ? entry.fileName : 'foto.jpg',
      mimeType: typeof entry.mimeType === 'string' ? entry.mimeType : 'image/jpeg',
      sizeBytes: typeof entry.sizeBytes === 'number' ? entry.sizeBytes : 0,
      originalSizeBytes: typeof entry.originalSizeBytes === 'number' ? entry.originalSizeBytes : 0,
      width: typeof entry.width === 'number' ? entry.width : 0,
      height: typeof entry.height === 'number' ? entry.height : 0,
      tag: typeof entry.tag === 'string' && entry.tag ? entry.tag : PHOTO_TAGS[0],
      caption: typeof entry.caption === 'string' ? entry.caption : '',
      capturedAt: typeof entry.capturedAt === 'string' ? entry.capturedAt : new Date().toISOString(),
      syncStatus:
        entry.syncStatus === 'pending_upload' ||
        entry.syncStatus === 'synced' ||
        entry.syncStatus === 'error'
          ? entry.syncStatus
          : 'local_only',
    }))
}

function parseOptionalNumber(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function createEmptySpecies(commonName = ''): SpeciesEntry {
  return {
    id: crypto.randomUUID(),
    commonName,
    scientificName: '',
    organismType: ORGANISM_TYPES[0],
    count: null,
    coverPercent: null,
    braunBlanquet: '',
    phenology: PHENOLOGY_OPTIONS[0],
    invasive: false,
    notes: '',
  }
}

export function CollectionForm({
  areas,
  quadrats,
  existingCollections,
  latest,
  initialCollection = null,
  onCancel,
  onSave,
}: Props) {
  const isEditing = Boolean(initialCollection)
  const initialSoilMoisture =
    typeof initialCollection?.soilMoisturePercent === 'number'
      ? String(initialCollection.soilMoisturePercent)
      : typeof initialCollection?.soilMoisture === 'boolean'
        ? initialCollection.soilMoisture
          ? '100'
          : '0'
        : ''

  // 1. Identificação & Localização
  const [name, setName] = useState(() => asStringField(initialCollection?.name))
  const [collectedAt, setCollectedAt] = useState(() => initialDateTimeValue(initialCollection))
  const [areaId, setAreaId] = useState(() =>
    initialCollection ? asStringField(initialCollection.areaId) : areas[0]?.id ?? '',
  )
  const [quadratId, setQuadratId] = useState(() =>
    initialCollection ? asStringField(initialCollection.quadratId) : quadrats[0]?.id ?? '',
  )
  const [transect, setTransect] = useState(() => asStringField(initialCollection?.transect))
  const [quadratSize, setQuadratSize] = useState(
    () => asStringField(initialCollection?.quadratSize) || '1x1',
  )
  const [samplingMethod, setSamplingMethod] = useState<string>(
    () => asStringField(initialCollection?.samplingMethod) || SAMPLING_METHODS[0],
  )
  const [latitude, setLatitude] = useState(() => asNumberField(initialCollection?.latitude))
  const [longitude, setLongitude] = useState(() => asNumberField(initialCollection?.longitude))
  const [altitude, setAltitude] = useState(() => asNumberField(initialCollection?.altitude))
  const [gpsStatus, setGpsStatus] = useState('')
  const [locatingGps, setLocatingGps] = useState(false)

  // 2. Quadrante 5×5
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantCode | null>(() =>
    isQuadrantCode(initialCollection?.quadrant) ? initialCollection.quadrant : null,
  )
  const [orientation, setOrientation] = useState<QuadratOrientation>(() =>
    asInitialOrientation(initialCollection?.quadratOrientation),
  )
  const [quadrantError, setQuadrantError] = useState(false)

  // 3. Sensores (ESP32 + edição manual sem conflito) & Abióticas
  const [frozenReading, setFrozenReading] = useState<SensorMeasurement | null>(null)
  const [isFrozen, setIsFrozen] = useState(() => Boolean(initialCollection))
  const [manualSensors, setManualSensors] = useState<ManualSensorOverrides>(() =>
    initialCollection
      ? {
          temperature: asNumberField(initialCollection.temperature),
          humidity: asNumberField(initialCollection.humidity),
          soilTemperature: asNumberField(initialCollection.soilTemperature),
          soilMoisturePercent: initialSoilMoisture,
          lightLux: asNumberField(initialCollection.lightLux),
        }
      : {
          temperature: null,
          humidity: null,
          soilTemperature: null,
          soilMoisturePercent: null,
          lightLux: null,
        },
  )
  const [weather, setWeather] = useState(() => asStringField(initialCollection?.weather))
  const [sunExposure, setSunExposure] = useState(() => asStringField(initialCollection?.sunExposure))
  const [windCondition, setWindCondition] = useState(() =>
    asStringField(initialCollection?.windCondition),
  )
  const [soilPh, setSoilPh] = useState(() => asNumberField(initialCollection?.soilPh))
  const [slopeDegrees, setSlopeDegrees] = useState(() =>
    asNumberField(initialCollection?.slopeDegrees),
  )
  const [aspect, setAspect] = useState(() => asStringField(initialCollection?.aspect))

  // 4. Substrato, Cobertura & Estrutura Vegetal
  const [substrateType, setSubstrateType] = useState(() =>
    asStringField(initialCollection?.substrateType),
  )
  const [vegetationCover, setVegetationCover] = useState(() =>
    asNumberField(initialCollection?.vegetationCoverPercent),
  )
  const [bareSoilCover, setBareSoilCover] = useState(() =>
    asNumberField(initialCollection?.bareSoilPercent),
  )
  const [litterCover, setLitterCover] = useState(() =>
    asNumberField(initialCollection?.litterCoverPercent),
  )
  const [rockCover, setRockCover] = useState(() => asNumberField(initialCollection?.rockCoverPercent))
  const [waterCover, setWaterCover] = useState(() =>
    asNumberField(initialCollection?.waterCoverPercent),
  )
  const [litterDepthCm, setLitterDepthCm] = useState(() =>
    asNumberField(initialCollection?.litterDepthCm),
  )
  const [canopyCover, setCanopyCover] = useState(() =>
    asNumberField(initialCollection?.canopyCoverPercent),
  )
  const [avgHeightCm, setAvgHeightCm] = useState(() =>
    asNumberField(initialCollection?.avgVegetationHeightCm),
  )
  const [maxHeightCm, setMaxHeightCm] = useState(() =>
    asNumberField(initialCollection?.maxVegetationHeightCm),
  )
  const [vegetationStratum, setVegetationStratum] = useState(() =>
    asStringField(initialCollection?.vegetationStratum),
  )

  // 5. Biótico — Espécies
  const [speciesEntries, setSpeciesEntries] = useState<SpeciesEntry[]>(() =>
    extractInitialSpecies(initialCollection),
  )

  // 6. Fotografias do quadrante
  const [photos, setPhotos] = useState<DraftPhoto[]>(() =>
    extractInitialPhotoMetas(initialCollection).map((meta) => ({
      ...meta,
      blob: null,
      previewUrl: null,
    })),
  )
  const previewUrlsRef = useRef<Set<string>>(new Set())

  // 7. Perturbações, Fauna & Observações
  const [disturbances, setDisturbances] = useState<string[]>(() =>
    Array.isArray(initialCollection?.disturbances)
      ? initialCollection.disturbances.map(String)
      : [],
  )
  const [faunaEvidence, setFaunaEvidence] = useState(() =>
    asStringField(initialCollection?.faunaEvidence),
  )
  const [notes, setNotes] = useState(() => asStringField(initialCollection?.notes))

  // Form state
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const quadratSectionRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  // Load existing local photo Blobs from IndexedDB when editing a collection
  useEffect(() => {
    const collectionId = initialCollection?.id
    if (!collectionId) return
    let active = true

    void loadCollectionPhotoBlobs(collectionId).then((records) => {
      if (!active || records.length === 0) return
      const byId = new Map(records.map((record) => [record.id, record]))
      setPhotos((prev) =>
        prev.map((photo) => {
          const match = byId.get(photo.id)
          if (!match || photo.blob !== null) return photo
          const url = URL.createObjectURL(match.blob)
          previewUrlsRef.current.add(url)
          return { ...photo, blob: match.blob, previewUrl: url }
        }),
      )
    })

    return () => {
      active = false
    }
  }, [initialCollection?.id])

  useEffect(() => {
    const activeUrls = previewUrlsRef.current
    return () => {
      for (const url of activeUrls) {
        URL.revokeObjectURL(url)
      }
      activeUrls.clear()
    }
  }, [])

  const activeReading = isFrozen ? frozenReading : latest

  const sensorValues = useMemo(() => {
    const resolve = (key: SensorFieldKey, bleValue: number | null | undefined) => {
      if (manualSensors[key] !== null) {
        return { value: manualSensors[key] ?? '', source: 'manual' as const }
      }
      if (typeof bleValue === 'number' && Number.isFinite(bleValue)) {
        return { value: String(bleValue), source: 'esp32' as const }
      }
      return { value: '', source: 'empty' as const }
    }
    return {
      temperature: resolve('temperature', activeReading?.airTemperature),
      humidity: resolve('humidity', activeReading?.airHumidity),
      soilTemperature: resolve('soilTemperature', activeReading?.soilTemperature),
      soilMoisturePercent: resolve('soilMoisturePercent', activeReading?.soilMoisturePercent),
      lightLux: resolve('lightLux', activeReading?.lightLux),
    }
  }, [activeReading, manualSensors])

  const filledSensorCount = useMemo(
    () =>
      Object.values(sensorValues).filter((entry) => parseOptionalNumber(entry.value) !== null)
        .length,
    [sensorValues],
  )

  const hasManualSensorEdits = Object.values(manualSensors).some((value) => value !== null)

  const selectedArea = areas.find((item) => item.id === areaId) ?? null
  const selectedQuadrat = quadrats.find((item) => item.id === quadratId) ?? null
  const sizeOption = getQuadratSizeOption(quadratSize)

  const previousCounts = useMemo(() => {
    const counts: Partial<Record<QuadrantCode, number>> = {}
    const filtered = existingCollections.filter((item) => {
      if (initialCollection && item.id === initialCollection.id) return false
      if (quadratId && item.quadratId === quadratId) return true
      if (!quadratId && areaId && item.areaId === areaId) return true
      if (!quadratId && !areaId) return true
      return false
    })
    for (const item of filtered) {
      if (isQuadrantCode(item.quadrant)) {
        counts[item.quadrant] = (counts[item.quadrant] ?? 0) + 1
      }
    }
    return counts
  }, [existingCollections, initialCollection, quadratId, areaId])

  const coverParts = useMemo(() => {
    const veg = Math.max(0, parseOptionalNumber(vegetationCover) ?? 0)
    const bare = Math.max(0, parseOptionalNumber(bareSoilCover) ?? 0)
    const litter = Math.max(0, parseOptionalNumber(litterCover) ?? 0)
    const rock = Math.max(0, parseOptionalNumber(rockCover) ?? 0)
    const water = Math.max(0, parseOptionalNumber(waterCover) ?? 0)
    const total = Number((veg + bare + litter + rock + water).toFixed(1))
    return { veg, bare, litter, rock, water, total }
  }, [vegetationCover, bareSoilCover, litterCover, rockCover, waterCover])

  const ecologicalMetrics = useMemo(
    () => calculateEcologicalMetrics(speciesEntries, sizeOption.areaM2),
    [speciesEntries, sizeOption.areaM2],
  )

  const isDirty = isEditing
    ? touched
    : Boolean(
        name.trim() ||
          selectedQuadrant ||
          transect.trim() ||
          notes.trim() ||
          speciesEntries.length > 0 ||
          photos.length > 0 ||
          disturbances.length > 0 ||
          faunaEvidence.trim(),
      )

  function handleBack() {
    if (
      isDirty &&
      !window.confirm(
        isEditing
          ? 'Descartar as alterações feitas nesta coleta?'
          : 'Descartar os dados preenchidos desta coleta?',
      )
    ) {
      return
    }
    onCancel()
  }

  function updateSensorField(key: SensorFieldKey, value: string) {
    setManualSensors((prev) => ({ ...prev, [key]: value }))
  }

  function syncSensorsFromEsp32() {
    setTouched(true)
    setIsFrozen(false)
    setFrozenReading(null)
    setManualSensors({
      temperature: null,
      humidity: null,
      soilTemperature: null,
      soilMoisturePercent: null,
      lightLux: null,
    })
  }

  function toggleFreezeReading() {
    if (isFrozen) {
      setIsFrozen(false)
      setFrozenReading(null)
    } else if (latest) {
      setFrozenReading(latest)
      setIsFrozen(true)
    }
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocalização não suportada neste navegador.')
      return
    }
    setLocatingGps(true)
    setGpsStatus('Obtendo coordenadas GPS...')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTouched(true)
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        if (typeof position.coords.altitude === 'number') {
          setAltitude(position.coords.altitude.toFixed(1))
        }
        setGpsStatus(`GPS obtido (±${Math.round(position.coords.accuracy)} m).`)
        setLocatingGps(false)
      },
      () => {
        setGpsStatus('Não foi possível obter o GPS. Informe manualmente se necessário.')
        setLocatingGps(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  function useAreaCoordinates() {
    if (!selectedArea) return
    setTouched(true)
    if (typeof selectedArea.latitude === 'number') {
      setLatitude(String(selectedArea.latitude))
    }
    if (typeof selectedArea.longitude === 'number') {
      setLongitude(String(selectedArea.longitude))
    }
    setGpsStatus(`Coordenadas copiadas da área "${selectedArea.name}".`)
  }

  function addSpecies(morpho = false) {
    setTouched(true)
    const nextMorpho = speciesEntries.length + 1
    setSpeciesEntries((prev) => [
      ...prev,
      createEmptySpecies(morpho ? `Morfoespécie ${String(nextMorpho).padStart(2, '0')}` : ''),
    ])
  }

  function updateSpecies<K extends keyof SpeciesEntry>(
    id: string,
    field: K,
    value: SpeciesEntry[K],
  ) {
    setTouched(true)
    setSpeciesEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    )
  }

  function removeSpecies(id: string) {
    setTouched(true)
    setSpeciesEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  function addPhotos(newPhotos: DraftPhoto[]) {
    setTouched(true)
    for (const photo of newPhotos) {
      if (photo.previewUrl) previewUrlsRef.current.add(photo.previewUrl)
    }
    setPhotos((prev) => [...prev, ...newPhotos])
  }

  function updatePhoto(id: string, patch: Partial<Pick<DraftPhoto, 'tag' | 'caption'>>) {
    setTouched(true)
    setPhotos((prev) =>
      prev.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)),
    )
  }

  function removePhoto(id: string) {
    setTouched(true)
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
        previewUrlsRef.current.delete(target.previewUrl)
      }
      return prev.filter((photo) => photo.id !== id)
    })
  }

  function toggleDisturbance(option: string) {
    setTouched(true)
    const noneLabel = DISTURBANCE_OPTIONS[0]
    setDisturbances((prev) => {
      if (option === noneLabel) {
        return prev.includes(noneLabel) ? [] : [noneLabel]
      }
      const withoutNone = prev.filter((item) => item !== noneLabel)
      return withoutNone.includes(option)
        ? withoutNone.filter((item) => item !== option)
        : [...withoutNone, option]
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setFormError('Informe um nome identificador para a coleta.')
      nameInputRef.current?.focus()
      return
    }

    if (!selectedQuadrant) {
      setQuadrantError(true)
      setFormError('Selecione no mapa 5×5 o quadrante (A1 a E5) onde a coleta foi realizada.')
      quadratSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const parsedPh = parseOptionalNumber(soilPh)
    if (parsedPh !== null && (parsedPh < 0 || parsedPh > 14)) {
      setFormError('O pH do solo deve estar entre 0 e 14.')
      return
    }

    const parsedSlope = parseOptionalNumber(slopeDegrees)
    if (parsedSlope !== null && (parsedSlope < 0 || parsedSlope > 90)) {
      setFormError('A declividade do terreno deve estar entre 0° e 90°.')
      return
    }

    setBusy(true)
    try {
      const quadrantInfo = getQuadrantInfo(selectedQuadrant)
      const cleanedSpeciesEntries = speciesEntries
        .filter((entry) => entry.commonName.trim() !== '' || entry.scientificName.trim() !== '')
        .map((entry) => ({
          id: entry.id,
          commonName: entry.commonName.trim(),
          scientificName: entry.scientificName.trim(),
          organismType: entry.organismType,
          count: entry.count,
          coverPercent: entry.coverPercent,
          braunBlanquet: entry.braunBlanquet,
          phenology: entry.phenology === PHENOLOGY_OPTIONS[0] ? '' : entry.phenology,
          invasive: entry.invasive,
          notes: entry.notes.trim(),
        }))

      const metrics = calculateEcologicalMetrics(cleanedSpeciesEntries, sizeOption.areaM2)

      const airTemp = parseOptionalNumber(sensorValues.temperature.value)
      const airHum = parseOptionalNumber(sensorValues.humidity.value)
      const soilTemp = parseOptionalNumber(sensorValues.soilTemperature.value)
      const soilMoist = parseOptionalNumber(sensorValues.soilMoisturePercent.value)
      const light = parseOptionalNumber(sensorValues.lightLux.value)

      const parsedCollectedAt = collectedAt ? new Date(collectedAt) : new Date()
      const collectedAtIso = Number.isNaN(parsedCollectedAt.getTime())
        ? new Date().toISOString()
        : parsedCollectedAt.toISOString()

      const payload: WorkspaceItem = {
        id: initialCollection?.id ?? crypto.randomUUID(),
        name: trimmedName,
        createdAt:
          typeof initialCollection?.createdAt === 'number'
            ? initialCollection.createdAt
            : Date.now(),
        collectedAt: collectedAtIso,

        // Contexto amostral
        areaId: selectedArea?.id ?? null,
        areaName: selectedArea?.name ?? null,
        quadratId: selectedQuadrat?.id ?? null,
        quadratName: selectedQuadrat?.name ?? null,
        transect: transect.trim() || null,
        quadratSize,
        quadratAreaM2: sizeOption.areaM2,
        samplingMethod: samplingMethod || null,

        // Quadrante 5×5 (25 quadrantes)
        quadrant: quadrantInfo.code,
        quadrantRow: quadrantInfo.row,
        quadrantCol: quadrantInfo.col,
        quadrantNumber: quadrantInfo.number,
        quadrantZone: quadrantInfo.zoneLabel,
        quadratOrientation: orientation,

        // Localização GPS
        latitude: parseOptionalNumber(latitude),
        longitude: parseOptionalNumber(longitude),
        altitude: parseOptionalNumber(altitude),

        // Sensores (compatível com schema existente)
        temperature: airTemp,
        humidity: airHum,
        soilTemperature: soilTemp,
        soilMoisture: soilMoist !== null ? soilMoist >= 50 : activeReading?.soilMoisture ?? null,
        soilMoisturePercent: soilMoist,
        lightLux: light,
        deviceId:
          activeReading?.deviceId ??
          (typeof initialCollection?.deviceId === 'string' ? initialCollection.deviceId : null),
        sensorSources: {
          temperature: sensorValues.temperature.source,
          humidity: sensorValues.humidity.source,
          soilTemperature: sensorValues.soilTemperature.source,
          soilMoisturePercent: sensorValues.soilMoisturePercent.source,
          lightLux: sensorValues.lightLux.source,
        },

        // Variáveis abióticas de campo
        weather: weather || null,
        sunExposure: sunExposure || null,
        windCondition: windCondition || null,
        soilPh: parsedPh,
        slopeDegrees: parsedSlope,
        aspect: aspect || null,

        // Substrato, cobertura do solo e estrutura vegetal
        substrateType: substrateType || null,
        vegetationCoverPercent: parseOptionalNumber(vegetationCover),
        bareSoilPercent: parseOptionalNumber(bareSoilCover),
        litterCoverPercent: parseOptionalNumber(litterCover),
        rockCoverPercent: parseOptionalNumber(rockCover),
        waterCoverPercent: parseOptionalNumber(waterCover),
        litterDepthCm: parseOptionalNumber(litterDepthCm),
        canopyCoverPercent: parseOptionalNumber(canopyCover),
        avgVegetationHeightCm: parseOptionalNumber(avgHeightCm),
        maxVegetationHeightCm: parseOptionalNumber(maxHeightCm),
        vegetationStratum: vegetationStratum || null,

        // Variáveis bióticas (legado + estruturado)
        species: cleanedSpeciesEntries.map(formatSpeciesLabel),
        speciesEntries: cleanedSpeciesEntries,
        speciesRichness: metrics.richness,
        totalIndividuals: metrics.totalIndividuals,
        estimatedDensityPerM2: metrics.densityPerM2,
        shannonIndex: metrics.shannonIndex,

        // Fotografias (apenas metadados leves no Firestore; Blobs ficam no IndexedDB)
        photoCount: photos.length,
        photos: photos.map(stripDraftPhotoMeta),

        // Perturbações, fauna e observações
        disturbances,
        faunaEvidence: faunaEvidence.trim() || null,
        notes: notes.trim(),
      }

      await onSave(payload, photos)
    } catch {
      setFormError('Não foi possível salvar a coleta. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  const areaHasCoords =
    selectedArea !== null &&
    typeof selectedArea.latitude === 'number' &&
    typeof selectedArea.longitude === 'number'

  const quadrantInfo = selectedQuadrant ? getQuadrantInfo(selectedQuadrant) : null

  return (
    <form
      className="cf-page"
      onSubmit={handleSubmit}
      onChange={() => setTouched(true)}
      noValidate
    >
      <div className="cf-topbar">
        <button type="button" className="cf-back-button" onClick={handleBack}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className={`cf-ble-chip ${latest ? 'online' : ''}`}>
          <Bluetooth size={14} />
          {latest
            ? `ESP32 conectado (${latest.deviceId || 'Quadrat'})`
            : 'Modo manual (sem ESP32)'}
        </div>
      </div>

      <section className="cf-hero">
        <div>
          <span className="eyebrow">
            {isEditing ? 'EDIÇÃO DE COLETA · QUADRAT 5 × 5' : 'FICHA DE CAMPO · QUADRAT 5 × 5'}
          </span>
          <h2>{isEditing ? 'Editar coleta ecológica' : 'Nova coleta ecológica'}</h2>
          <p>
            {isEditing
              ? 'Atualize o quadrante, variáveis abióticas, cobertura do solo, espécies ou fotografias desta coleta.'
              : 'Preencha as variáveis ambientais, de substrato e de biodiversidade e selecione o quadrante exato dentro da grade 5×5.'}
          </p>
        </div>
        <div className="cf-hero-badges">
          <span>
            <Grid3X3 size={14} />
            {quadrantInfo ? `Quadrante ${quadrantInfo.code} (#${quadrantInfo.number})` : 'Quadrante pendente'}
          </span>
          <span>
            <Sprout size={14} />
            {ecologicalMetrics.richness} espécie(s)
          </span>
          <span>
            <Camera size={14} />
            {photos.length} foto(s)
          </span>
        </div>
      </section>

      {formError && (
        <div className="cf-error-banner" role="alert">
          <AlertTriangle size={16} />
          <span>{formError}</span>
        </div>
      )}

      <div className="cf-layout">
        {/* SEÇÃO 1: IDENTIFICAÇÃO E LOCALIZAÇÃO */}
        <div className="cf-area-ident">
          <section className="cf-card">
            <div className="cf-card-head">
              <span className="cf-step-badge">1</span>
              <div>
                <span className="eyebrow">CONTEXTO AMOSTRAL</span>
                <h3>Identificação e localização</h3>
              </div>
            </div>

            <div className="cf-grid-2">
              <label className="cf-field cf-span-2">
                <span>
                  Nome da coleta <em className="cf-req">*</em>
                </span>
                <input
                  ref={nameInputRef}
                  required
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (formError) setFormError('')
                  }}
                  placeholder="Ex.: Parcela Borda Sul — Manhã"
                />
              </label>

              <label className="cf-field">
                <span>Data e hora da coleta</span>
                <input
                  type="datetime-local"
                  value={collectedAt}
                  onChange={(event) => setCollectedAt(event.target.value)}
                />
              </label>

              <label className="cf-field">
                <span>Transecto / Ponto amostral</span>
                <input
                  value={transect}
                  onChange={(event) => setTransect(event.target.value)}
                  placeholder="Ex.: Transecto T1 · 15 m"
                />
              </label>

              <label className="cf-field">
                <span>Área de pesquisa</span>
                <select value={areaId} onChange={(event) => setAreaId(event.target.value)}>
                  <option value="">Não especificada</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="cf-field">
                <span>Quadrat utilizado</span>
                <select value={quadratId} onChange={(event) => setQuadratId(event.target.value)}>
                  <option value="">Não especificado</option>
                  {quadrats.map((quadrat) => (
                    <option key={quadrat.id} value={quadrat.id}>
                      {quadrat.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="cf-field">
                <span>Dimensão do quadrat</span>
                <select
                  value={quadratSize}
                  onChange={(event) => setQuadratSize(event.target.value)}
                >
                  {QUADRAT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="cf-field">
                <span>Método de amostragem</span>
                <select
                  value={samplingMethod}
                  onChange={(event) => setSamplingMethod(event.target.value)}
                >
                  {SAMPLING_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cf-subblock">
              <div className="cf-subblock-head">
                <strong>
                  <MapPin size={14} />
                  Coordenadas geográficas (GPS)
                </strong>
                <div className="cf-inline-actions">
                  <button
                    type="button"
                    className="cf-ghost-btn"
                    onClick={captureGps}
                    disabled={locatingGps}
                  >
                    <MapPin size={13} />
                    {locatingGps ? 'Capturando...' : 'Capturar GPS'}
                  </button>
                  {areaHasCoords && (
                    <button
                      type="button"
                      className="cf-ghost-btn"
                      onClick={useAreaCoordinates}
                    >
                      Usar GPS da área
                    </button>
                  )}
                </div>
              </div>
              <div className="cf-grid-3">
                <label className="cf-field">
                  <span>Latitude</span>
                  <input
                    inputMode="decimal"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    placeholder="-23.550520"
                  />
                </label>
                <label className="cf-field">
                  <span>Longitude</span>
                  <input
                    inputMode="decimal"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    placeholder="-46.633308"
                  />
                </label>
                <label className="cf-field">
                  <span>Altitude (m)</span>
                  <input
                    inputMode="decimal"
                    value={altitude}
                    onChange={(event) => setAltitude(event.target.value)}
                    placeholder="760"
                  />
                </label>
              </div>
              {gpsStatus && <p className="cf-helper-note">{gpsStatus}</p>}
            </div>
          </section>
        </div>

        {/* SELETOR 5×5 DO QUADRAT + RESUMO (STICKY NO DESKTOP, LOGO APÓS IDENTIFICAÇÃO NO MOBILE) */}
        <aside className="cf-area-quadrat" ref={quadratSectionRef}>
          <QuadratGrid
            selected={selectedQuadrant}
            onSelect={(code) => {
              setTouched(true)
              setSelectedQuadrant(code)
              setQuadrantError(false)
              if (formError) setFormError('')
            }}
            orientation={orientation}
            onOrientationChange={(next) => {
              setTouched(true)
              setOrientation(next)
            }}
            quadratSize={quadratSize}
            previousCounts={previousCounts}
            hasError={quadrantError}
          />

          <section className="cf-summary-card">
            <div className="cf-summary-head">
              <ClipboardCheck size={16} />
              <strong>Resumo da ficha</strong>
            </div>
            <ul className="cf-checklist">
              <li className={name.trim() ? 'done' : ''}>
                <CheckCircle2 size={14} />
                <span>Nome: {name.trim() || 'Pendente'}</span>
              </li>
              <li className={quadrantInfo ? 'done' : ''}>
                <CheckCircle2 size={14} />
                <span>
                  Quadrante:{' '}
                  {quadrantInfo
                    ? `${quadrantInfo.code} (#${quadrantInfo.number}/25 · ${orientation})`
                    : 'Selecione na grade 5×5'}
                </span>
              </li>
              <li className={filledSensorCount > 0 ? 'done' : ''}>
                <CheckCircle2 size={14} />
                <span>Sensores ambientais: {filledSensorCount}/5 preenchidos</span>
              </li>
              <li className={coverParts.total > 0 ? 'done' : ''}>
                <CheckCircle2 size={14} />
                <span>Cobertura do solo: {coverParts.total}% registrada</span>
              </li>
              <li className={ecologicalMetrics.richness > 0 ? 'done' : ''}>
                <CheckCircle2 size={14} />
                <span>
                  Espécies: {ecologicalMetrics.richness} ({ecologicalMetrics.totalIndividuals} ind.)
                </span>
              </li>
              <li className={photos.length > 0 ? 'done' : ''}>
                <CheckCircle2 size={14} />
                <span>
                  Fotos do quadrante: {photos.length} anexada{photos.length === 1 ? '' : 's'}
                </span>
              </li>
            </ul>
            <button type="submit" className="cf-save-btn cf-desktop-save" disabled={busy}>
              <Save size={16} />
              {busy
                ? isEditing
                  ? 'Salvando alterações...'
                  : 'Salvando coleta...'
                : quadrantInfo
                  ? isEditing
                    ? `Salvar alterações · ${quadrantInfo.code}`
                    : `Salvar no quadrante ${quadrantInfo.code}`
                  : isEditing
                    ? 'Salvar alterações'
                    : 'Salvar coleta'}
            </button>
          </section>
        </aside>

        {/* CORPO PRINCIPAL: SEÇÕES 2, 3, 4 E 5 */}
        <div className="cf-area-body">
          {/* SEÇÃO 2: VARIÁVEIS ABIÓTICAS E SENSORES */}
          <section className="cf-card">
            <div className="cf-card-head">
              <span className="cf-step-badge">2</span>
              <div>
                <span className="eyebrow">FATORES ABIÓTICOS</span>
                <h3>Sensores e microclima</h3>
              </div>
            </div>

            <div className={`cf-sensor-banner ${latest ? 'live' : ''}`}>
              <div className="cf-sensor-banner-copy">
                <span className={`status-dot ${latest ? 'online' : ''}`} />
                <div>
                  <strong>
                    {latest
                      ? isFrozen
                        ? `Leitura congelada (${activeReading?.deviceId || 'ESP32'})`
                        : `Recebendo ao vivo do ESP32 (${latest.deviceId || 'Quadrat'})`
                      : 'ESP32 não conectado'}
                  </strong>
                  <small>
                    {latest
                      ? 'Os valores dos sensores são preenchidos automaticamente e podem ser ajustados manualmente.'
                      : 'Você pode preencher as medições manualmente com instrumentos de campo ou conectar o ESP32 na aba Início.'}
                  </small>
                </div>
              </div>
              {latest && (
                <div className="cf-inline-actions">
                  <button
                    type="button"
                    className="cf-ghost-btn"
                    onClick={toggleFreezeReading}
                  >
                    {isFrozen ? <Unlock size={13} /> : <Lock size={13} />}
                    {isFrozen ? 'Retomar ao vivo' : 'Congelar leitura'}
                  </button>
                  {(hasManualSensorEdits || isFrozen) && (
                    <button
                      type="button"
                      className="cf-ghost-btn"
                      onClick={syncSensorsFromEsp32}
                    >
                      <RefreshCw size={13} />
                      Puxar do ESP32
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="cf-sensor-grid">
              <label className="cf-sensor-box">
                <div className="cf-sensor-box-top">
                  <span>
                    <Thermometer size={14} /> Temp. do ar
                  </span>
                  <em className={`cf-src ${sensorValues.temperature.source}`}>
                    {sensorValues.temperature.source === 'esp32'
                      ? 'ESP32'
                      : sensorValues.temperature.source === 'manual'
                        ? 'Manual'
                        : '—'}
                  </em>
                </div>
                <div className="cf-unit-input">
                  <input
                    inputMode="decimal"
                    value={sensorValues.temperature.value}
                    onChange={(event) => updateSensorField('temperature', event.target.value)}
                    placeholder="24.5"
                  />
                  <b>°C</b>
                </div>
              </label>

              <label className="cf-sensor-box">
                <div className="cf-sensor-box-top">
                  <span>
                    <Droplets size={14} /> Umidade do ar
                  </span>
                  <em className={`cf-src ${sensorValues.humidity.source}`}>
                    {sensorValues.humidity.source === 'esp32'
                      ? 'ESP32'
                      : sensorValues.humidity.source === 'manual'
                        ? 'Manual'
                        : '—'}
                  </em>
                </div>
                <div className="cf-unit-input">
                  <input
                    inputMode="decimal"
                    value={sensorValues.humidity.value}
                    onChange={(event) => updateSensorField('humidity', event.target.value)}
                    placeholder="68"
                  />
                  <b>%</b>
                </div>
              </label>

              <label className="cf-sensor-box">
                <div className="cf-sensor-box-top">
                  <span>
                    <Thermometer size={14} /> Temp. do solo
                  </span>
                  <em className={`cf-src ${sensorValues.soilTemperature.source}`}>
                    {sensorValues.soilTemperature.source === 'esp32'
                      ? 'ESP32'
                      : sensorValues.soilTemperature.source === 'manual'
                        ? 'Manual'
                        : '—'}
                  </em>
                </div>
                <div className="cf-unit-input">
                  <input
                    inputMode="decimal"
                    value={sensorValues.soilTemperature.value}
                    onChange={(event) => updateSensorField('soilTemperature', event.target.value)}
                    placeholder="21.2"
                  />
                  <b>°C</b>
                </div>
              </label>

              <label className="cf-sensor-box">
                <div className="cf-sensor-box-top">
                  <span>
                    <Droplets size={14} /> Umidade do solo
                  </span>
                  <em className={`cf-src ${sensorValues.soilMoisturePercent.source}`}>
                    {sensorValues.soilMoisturePercent.source === 'esp32'
                      ? 'ESP32'
                      : sensorValues.soilMoisturePercent.source === 'manual'
                        ? 'Manual'
                        : '—'}
                  </em>
                </div>
                <div className="cf-unit-input">
                  <input
                    inputMode="decimal"
                    value={sensorValues.soilMoisturePercent.value}
                    onChange={(event) =>
                      updateSensorField('soilMoisturePercent', event.target.value)
                    }
                    placeholder="45"
                  />
                  <b>%</b>
                </div>
              </label>

              <label className="cf-sensor-box">
                <div className="cf-sensor-box-top">
                  <span>
                    <Sun size={14} /> Luminosidade
                  </span>
                  <em className={`cf-src ${sensorValues.lightLux.source}`}>
                    {sensorValues.lightLux.source === 'esp32'
                      ? 'ESP32'
                      : sensorValues.lightLux.source === 'manual'
                        ? 'Manual'
                        : '—'}
                  </em>
                </div>
                <div className="cf-unit-input">
                  <input
                    inputMode="decimal"
                    value={sensorValues.lightLux.value}
                    onChange={(event) => updateSensorField('lightLux', event.target.value)}
                    placeholder="1250"
                  />
                  <b>lux</b>
                </div>
              </label>
            </div>

            <div className="cf-subblock">
              <span className="cf-chip-group-label">
                <CloudSun size={14} /> Condição climática
              </span>
              <div className="cf-chip-row">
                {WEATHER_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`cf-chip ${weather === option ? 'active' : ''}`}
                    onClick={() => {
                      setTouched(true)
                      setWeather(weather === option ? '' : option)
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="cf-subblock">
              <span className="cf-chip-group-label">
                <Sun size={14} /> Insolação no quadrante
              </span>
              <div className="cf-chip-row">
                {SUN_EXPOSURE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`cf-chip ${sunExposure === option ? 'active' : ''}`}
                    onClick={() => {
                      setTouched(true)
                      setSunExposure(sunExposure === option ? '' : option)
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="cf-grid-4 cf-mt-sm">
              <label className="cf-field">
                <span>
                  <Wind size={12} /> Vento
                </span>
                <select
                  value={windCondition}
                  onChange={(event) => setWindCondition(event.target.value)}
                >
                  <option value="">Não informado</option>
                  {WIND_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="cf-field">
                <span>
                  <FlaskConical size={12} /> pH do solo
                </span>
                <input
                  inputMode="decimal"
                  value={soilPh}
                  onChange={(event) => setSoilPh(event.target.value)}
                  placeholder="0 a 14 (ex.: 6.2)"
                />
              </label>

              <label className="cf-field">
                <span>Declividade (°)</span>
                <input
                  inputMode="decimal"
                  value={slopeDegrees}
                  onChange={(event) => setSlopeDegrees(event.target.value)}
                  placeholder="0 a 90°"
                />
              </label>

              <label className="cf-field">
                <span>Face / Aspecto</span>
                <select value={aspect} onChange={(event) => setAspect(event.target.value)}>
                  <option value="">Não informado</option>
                  {ASPECT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* SEÇÃO 3: SUBSTRATO, COBERTURA DO SOLO E ESTRUTURA VEGETAL */}
          <section className="cf-card">
            <div className="cf-card-head">
              <span className="cf-step-badge">3</span>
              <div>
                <span className="eyebrow">ESTRUTURA E SUPERFÍCIE</span>
                <h3>Substrato e cobertura do solo</h3>
              </div>
            </div>

            <div className="cf-grid-2">
              <label className="cf-field">
                <span>
                  <Layers size={12} /> Tipo de substrato predominante
                </span>
                <select
                  value={substrateType}
                  onChange={(event) => setSubstrateType(event.target.value)}
                >
                  <option value="">Não informado</option>
                  {SUBSTRATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="cf-field">
                <span>Estrato vegetal predominante</span>
                <select
                  value={vegetationStratum}
                  onChange={(event) => setVegetationStratum(event.target.value)}
                >
                  <option value="">Não informado</option>
                  {VEGETATION_STRATA.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cf-subblock">
              <div className="cf-subblock-head">
                <strong>Composição da cobertura no quadrante (%)</strong>
                <span
                  className={`cf-cover-total ${
                    coverParts.total === 100
                      ? 'exact'
                      : coverParts.total > 100
                        ? 'over'
                        : ''
                  }`}
                >
                  Total: {coverParts.total}%
                </span>
              </div>

              <div className="cf-cover-grid">
                <label className="cf-cover-item">
                  <span>
                    <i className="cf-dot veg" /> Vegetação (%)
                  </span>
                  <input
                    inputMode="decimal"
                    value={vegetationCover}
                    onChange={(event) => setVegetationCover(event.target.value)}
                    placeholder="0–100"
                  />
                </label>
                <label className="cf-cover-item">
                  <span>
                    <i className="cf-dot bare" /> Solo exposto (%)
                  </span>
                  <input
                    inputMode="decimal"
                    value={bareSoilCover}
                    onChange={(event) => setBareSoilCover(event.target.value)}
                    placeholder="0–100"
                  />
                </label>
                <label className="cf-cover-item">
                  <span>
                    <i className="cf-dot litter" /> Serapilheira (%)
                  </span>
                  <input
                    inputMode="decimal"
                    value={litterCover}
                    onChange={(event) => setLitterCover(event.target.value)}
                    placeholder="0–100"
                  />
                </label>
                <label className="cf-cover-item">
                  <span>
                    <i className="cf-dot rock" /> Rochas (%)
                  </span>
                  <input
                    inputMode="decimal"
                    value={rockCover}
                    onChange={(event) => setRockCover(event.target.value)}
                    placeholder="0–100"
                  />
                </label>
                <label className="cf-cover-item">
                  <span>
                    <i className="cf-dot water" /> Água (%)
                  </span>
                  <input
                    inputMode="decimal"
                    value={waterCover}
                    onChange={(event) => setWaterCover(event.target.value)}
                    placeholder="0–100"
                  />
                </label>
              </div>

              <div className="cf-cover-bar" aria-label={`Composição de cobertura total ${coverParts.total}%`}>
                {coverParts.total > 0 ? (
                  <>
                    {coverParts.veg > 0 && (
                      <span
                        className="veg"
                        style={{ width: `${(coverParts.veg / Math.max(100, coverParts.total)) * 100}%` }}
                        title={`Vegetação: ${coverParts.veg}%`}
                      />
                    )}
                    {coverParts.bare > 0 && (
                      <span
                        className="bare"
                        style={{ width: `${(coverParts.bare / Math.max(100, coverParts.total)) * 100}%` }}
                        title={`Solo exposto: ${coverParts.bare}%`}
                      />
                    )}
                    {coverParts.litter > 0 && (
                      <span
                        className="litter"
                        style={{ width: `${(coverParts.litter / Math.max(100, coverParts.total)) * 100}%` }}
                        title={`Serapilheira: ${coverParts.litter}%`}
                      />
                    )}
                    {coverParts.rock > 0 && (
                      <span
                        className="rock"
                        style={{ width: `${(coverParts.rock / Math.max(100, coverParts.total)) * 100}%` }}
                        title={`Rochas: ${coverParts.rock}%`}
                      />
                    )}
                    {coverParts.water > 0 && (
                      <span
                        className="water"
                        style={{ width: `${(coverParts.water / Math.max(100, coverParts.total)) * 100}%` }}
                        title={`Água: ${coverParts.water}%`}
                      />
                    )}
                  </>
                ) : (
                  <span className="empty" style={{ width: '100%' }} />
                )}
              </div>
              {coverParts.total > 100 && (
                <p className="cf-helper-note warn">
                  Soma acima de 100% ({coverParts.total}%) — comum quando há sobreposição de estratos, mas confirme se deseja manter assim.
                </p>
              )}
            </div>

            <div className="cf-grid-4 cf-mt-sm">
              <label className="cf-field">
                <span>Dossel / Copa (%)</span>
                <input
                  inputMode="decimal"
                  value={canopyCover}
                  onChange={(event) => setCanopyCover(event.target.value)}
                  placeholder="0–100"
                />
              </label>

              <label className="cf-field">
                <span>Serapilheira (cm)</span>
                <input
                  inputMode="decimal"
                  value={litterDepthCm}
                  onChange={(event) => setLitterDepthCm(event.target.value)}
                  placeholder="Ex.: 2.5"
                />
              </label>

              <label className="cf-field">
                <span>
                  <Ruler size={12} /> Altura média (cm)
                </span>
                <input
                  inputMode="decimal"
                  value={avgHeightCm}
                  onChange={(event) => setAvgHeightCm(event.target.value)}
                  placeholder="Ex.: 22"
                />
              </label>

              <label className="cf-field">
                <span>
                  <Ruler size={12} /> Altura máx. (cm)
                </span>
                <input
                  inputMode="decimal"
                  value={maxHeightCm}
                  onChange={(event) => setMaxHeightCm(event.target.value)}
                  placeholder="Ex.: 48"
                />
              </label>
            </div>
          </section>

          {/* SEÇÃO 4: ESPÉCIES E ORGANISMOS (BIÓTICO) */}
          <section className="cf-card">
            <div className="cf-card-head cf-card-head-between">
              <div className="cf-card-head-left">
                <span className="cf-step-badge">4</span>
                <div>
                  <span className="eyebrow">FITOSSOCIOLOGIA E BIODIVERSIDADE</span>
                  <h3>Espécies e organismos no quadrante</h3>
                </div>
              </div>
              <div className="cf-inline-actions">
                <button
                  type="button"
                  className="cf-ghost-btn"
                  onClick={() => addSpecies(true)}
                >
                  <Sparkles size={13} />
                  + Morfoespécie
                </button>
                <button
                  type="button"
                  className="small"
                  onClick={() => addSpecies(false)}
                >
                  <Plus size={14} />
                  Adicionar espécie
                </button>
              </div>
            </div>

            {speciesEntries.length === 0 ? (
              <div className="cf-empty-species">
                <Leaf size={22} />
                <div>
                  <strong>Nenhuma espécie registrada ainda</strong>
                  <p>
                    Adicione plantas, briófitas, fungos ou fauna observados neste quadrante
                    com contagem de indivíduos, cobertura (%) e escala de Braun-Blanquet.
                  </p>
                </div>
                <button
                  type="button"
                  className="cf-ghost-btn"
                  onClick={() => addSpecies(false)}
                >
                  <Plus size={14} />
                  Registrar primeira espécie
                </button>
              </div>
            ) : (
              <div className="cf-species-list">
                {speciesEntries.map((entry, index) => (
                  <article key={entry.id} className="cf-species-card">
                    <div className="cf-species-card-head">
                      <span className="cf-species-index">Espécie #{index + 1}</span>
                      <button
                        type="button"
                        className="cf-remove-species"
                        onClick={() => removeSpecies(entry.id)}
                        aria-label={`Remover espécie ${index + 1}`}
                      >
                        <Trash2 size={13} />
                        Remover
                      </button>
                    </div>

                    <div className="cf-grid-3">
                      <label className="cf-field">
                        <span>Nome popular / Morfoespécie</span>
                        <input
                          value={entry.commonName}
                          onChange={(event) =>
                            updateSpecies(entry.id, 'commonName', event.target.value)
                          }
                          placeholder="Ex.: Samambaia-do-campo"
                        />
                      </label>

                      <label className="cf-field">
                        <span>Nome científico</span>
                        <input
                          className="cf-italic-input"
                          value={entry.scientificName}
                          onChange={(event) =>
                            updateSpecies(entry.id, 'scientificName', event.target.value)
                          }
                          placeholder="Ex.: Pteridium aquilinum"
                        />
                      </label>

                      <label className="cf-field">
                        <span>Grupo / Organismo</span>
                        <select
                          value={entry.organismType}
                          onChange={(event) =>
                            updateSpecies(entry.id, 'organismType', event.target.value)
                          }
                        >
                          {ORGANISM_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="cf-grid-4 cf-mt-xs">
                      <label className="cf-field">
                        <span>Nº de indivíduos</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={entry.count ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            const parsed = Number(raw)
                            updateSpecies(
                              entry.id,
                              'count',
                              raw === '' || !Number.isFinite(parsed)
                                ? null
                                : Math.max(0, Math.floor(parsed)),
                            )
                          }}
                          placeholder="0"
                        />
                      </label>

                      <label className="cf-field">
                        <span>Cobertura (%)</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={entry.coverPercent ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            const parsed = Number(raw)
                            updateSpecies(
                              entry.id,
                              'coverPercent',
                              raw === '' || !Number.isFinite(parsed)
                                ? null
                                : Math.min(100, Math.max(0, parsed)),
                            )
                          }}
                          placeholder="0–100"
                        />
                      </label>

                      <label className="cf-field">
                        <span>Braun-Blanquet</span>
                        <select
                          value={entry.braunBlanquet}
                          onChange={(event) =>
                            updateSpecies(
                              entry.id,
                              'braunBlanquet',
                              event.target.value as BraunBlanquetCode,
                            )
                          }
                        >
                          {BRAUN_BLANQUET_OPTIONS.map((opt) => (
                            <option key={opt.code || 'none'} value={opt.code}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="cf-field">
                        <span>Fenologia</span>
                        <select
                          value={entry.phenology}
                          onChange={(event) =>
                            updateSpecies(entry.id, 'phenology', event.target.value)
                          }
                        >
                          {PHENOLOGY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="cf-species-footer">
                      <label className="cf-toggle-pill">
                        <input
                          type="checkbox"
                          checked={entry.invasive}
                          onChange={(event) =>
                            updateSpecies(entry.id, 'invasive', event.target.checked)
                          }
                        />
                        <span>Espécie exótica / invasora</span>
                      </label>
                      <input
                        className="cf-species-note-input"
                        value={entry.notes}
                        onChange={(event) =>
                          updateSpecies(entry.id, 'notes', event.target.value)
                        }
                        placeholder="Observação rápida da espécie (opcional)"
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="cf-metrics-strip">
              <article>
                <small>Riqueza (S)</small>
                <strong>{ecologicalMetrics.richness}</strong>
                <span>espécies</span>
              </article>
              <article>
                <small>Abundância (N)</small>
                <strong>{ecologicalMetrics.totalIndividuals}</strong>
                <span>indivíduos</span>
              </article>
              <article>
                <small>Densidade estimada</small>
                <strong>
                  {ecologicalMetrics.densityPerM2 === null
                    ? '--'
                    : ecologicalMetrics.densityPerM2.toLocaleString('pt-BR')}
                </strong>
                <span>ind/m² ({formatAreaM2(ecologicalMetrics.quadrantAreaM2)})</span>
              </article>
              <article>
                <small>Diversidade Shannon (H&apos;)</small>
                <strong>
                  {ecologicalMetrics.shannonIndex === null
                    ? '--'
                    : ecologicalMetrics.shannonIndex.toFixed(2).replace('.', ',')}
                </strong>
                <span>índice H&apos;</span>
              </article>
            </div>
          </section>

          {/* SEÇÃO 5: FOTOGRAFIAS DO QUADRANTE */}
          <PhotoUploadSection
            photos={photos}
            selectedQuadrant={selectedQuadrant}
            onAddPhotos={addPhotos}
            onUpdatePhoto={updatePhoto}
            onRemovePhoto={removePhoto}
          />

          {/* SEÇÃO 6: PERTURBAÇÕES, FAUNA E OBSERVAÇÕES */}
          <section className="cf-card">
            <div className="cf-card-head">
              <span className="cf-step-badge">6</span>
              <div>
                <span className="eyebrow">IMPACTOS E ANOTAÇÕES</span>
                <h3>Perturbações, fauna e observações</h3>
              </div>
            </div>

            <div className="cf-subblock">
              <span className="cf-chip-group-label">
                <ShieldAlert size={14} /> Sinais de perturbação ambiental
              </span>
              <div className="cf-chip-row">
                {DISTURBANCE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`cf-chip ${disturbances.includes(option) ? 'active' : ''}`}
                    onClick={() => toggleDisturbance(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="cf-grid-1 cf-mt-sm">
              <label className="cf-field">
                <span>
                  <Bug size={12} /> Evidências de fauna
                </span>
                <input
                  value={faunaEvidence}
                  onChange={(event) => setFaunaEvidence(event.target.value)}
                  placeholder="Ex.: Pegadas, fezes, tocas, formigas, polinizadores..."
                />
              </label>

              <label className="cf-field">
                <span>Observações gerais de campo</span>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Registre detalhes do micro-habitat, borda, sombreamento, estado das plantas ou particularidades do quadrante..."
                />
              </label>
            </div>
          </section>
        </div>

        {/* BARRA FINAL DE AÇÕES */}
        <div className="cf-area-footer">
          <div className="cf-footer-bar">
            <button type="button" className="cf-cancel-btn" onClick={handleBack} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="cf-save-btn" disabled={busy}>
              <Save size={16} />
              {busy
                ? isEditing
                  ? 'Salvando alterações...'
                  : 'Salvando coleta...'
                : quadrantInfo
                  ? isEditing
                    ? `Salvar alterações · Quadrante ${quadrantInfo.code}`
                    : `Salvar coleta · Quadrante ${quadrantInfo.code}`
                  : isEditing
                    ? 'Salvar alterações'
                    : 'Salvar coleta'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

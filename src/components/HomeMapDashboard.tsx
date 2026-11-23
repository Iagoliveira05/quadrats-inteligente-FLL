import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Bluetooth,
  Camera,
  ClipboardPlus,
  Crosshair,
  ExternalLink,
  Filter,
  Layers,
  Leaf,
  LocateFixed,
  MapPin,
  Maximize2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Sprout,
  Thermometer,
  X,
} from 'lucide-react'
import type { WorkspaceItem } from '../services/data'
import {
  isQuadrantCode,
  QUADRAT_COLS,
  QUADRAT_ROWS,
  SUBSTRATE_OPTIONS,
  WEATHER_OPTIONS,
  type QuadrantCode,
  type SpeciesEntry,
} from '../types/collection'
import { CollectionDetails } from './CollectionDetails'
import './HomeMapDashboard.css'

type MapStyle = 'osm' | 'satellite' | 'topo'
type DateFilter = 'all' | 'today' | '7d' | '30d' | '90d'
type SideTab = 'collections' | 'areas'

type ResolvedCoords = {
  lat: number
  lng: number
  source: 'collection' | 'area'
}

type EnrichedCollection = {
  item: WorkspaceItem
  coords: ResolvedCoords | null
  displayLat: number | null
  displayLng: number | null
  areaId: string
  areaName: string
  quadratId: string
  quadratName: string
  quadrant: QuadrantCode | null
  speciesList: string[]
  hasInvasive: boolean
  photoCount: number
  hasEsp32: boolean
  timestampMs: number
  searchText: string
}

type Props = {
  areas: WorkspaceItem[]
  quadrats: WorkspaceItem[]
  collections: WorkspaceItem[]
  onNewCollection: () => void
  onNewArea: () => void
  onEditCollection: (item: WorkspaceItem) => void
  onOpenCollectionInHistory: (collectionId: string) => void
}

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253]
const DEFAULT_ZOOM = 4

const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string; maxZoom: number }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    maxZoom: 19,
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
    maxZoom: 17,
  },
}

const ALL_QUADRANTS: QuadrantCode[] = QUADRAT_ROWS.flatMap((row) =>
  QUADRAT_COLS.map((col) => `${row}${col}` as QuadrantCode),
)

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function asValidCoord(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function extractSpeciesInfo(item: WorkspaceItem): { names: string[]; hasInvasive: boolean } {
  const names: string[] = []
  let hasInvasive = false

  if (Array.isArray(item.speciesEntries)) {
    for (const raw of item.speciesEntries) {
      if (typeof raw === 'object' && raw !== null) {
        const entry = raw as Partial<SpeciesEntry>
        if (typeof entry.commonName === 'string' && entry.commonName.trim()) {
          names.push(entry.commonName.trim())
        }
        if (typeof entry.scientificName === 'string' && entry.scientificName.trim()) {
          names.push(entry.scientificName.trim())
        }
        if (entry.invasive) hasInvasive = true
      }
    }
  }
  if (names.length === 0 && Array.isArray(item.species)) {
    for (const raw of item.species) {
      if (typeof raw === 'string' && raw.trim()) names.push(raw.trim())
    }
  }

  return { names, hasInvasive }
}

function getCollectionTimestamp(item: WorkspaceItem): number {
  if (typeof item.collectedAt === 'string') {
    const parsed = Date.parse(item.collectedAt)
    if (Number.isFinite(parsed)) return parsed
  }
  return typeof item.createdAt === 'number' ? item.createdAt : Date.now()
}

function matchesDateFilter(timestampMs: number, filter: DateFilter): boolean {
  if (filter === 'all') return true
  const now = new Date()
  if (filter === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    return timestampMs >= startOfToday
  }
  const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90
  return timestampMs >= Date.now() - days * 86_400_000
}

export function HomeMapDashboard({
  areas,
  quadrats,
  collections,
  onNewCollection,
  onNewArea,
  onEditCollection,
  onOpenCollectionInHistory,
}: Props) {
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [quadratFilter, setQuadratFilter] = useState('all')
  const [quadrantFilter, setQuadrantFilter] = useState('all')
  const [substrateFilter, setSubstrateFilter] = useState('all')
  const [weatherFilter, setWeatherFilter] = useState('all')
  const [onlyWithGps, setOnlyWithGps] = useState(false)
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false)
  const [onlyWithInvasive, setOnlyWithInvasive] = useState(false)
  const [onlyWithEsp32, setOnlyWithEsp32] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Map & panel state
  const [mapStyle, setMapStyle] = useState<MapStyle>('osm')
  const [showAreaZones, setShowAreaZones] = useState(true)
  const [sideTab, setSideTab] = useState<SideTab>('collections')
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [locatingUser, setLocatingUser] = useState(false)

  // Leaflet refs
  const mapWrapRef = useRef<HTMLDivElement | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const userLayerRef = useRef<L.LayerGroup | null>(null)
  const collectionMarkersRef = useRef<Map<string, { marker: L.Marker; label: string }>>(new Map())
  const selectedIdRef = useRef<string | null>(null)
  const hasAutoFittedRef = useRef(false)

  const areaById = useMemo(() => {
    const map = new Map<string, WorkspaceItem>()
    for (const area of areas) map.set(area.id, area)
    return map
  }, [areas])

  const areaByName = useMemo(() => {
    const map = new Map<string, WorkspaceItem>()
    for (const area of areas) map.set(normalizeSearch(area.name), area)
    return map
  }, [areas])

  const quadratById = useMemo(() => {
    const map = new Map<string, WorkspaceItem>()
    for (const quadrat of quadrats) map.set(quadrat.id, quadrat)
    return map
  }, [quadrats])

  // Enrich collections with resolved coordinates and searchable index
  const enrichedCollections = useMemo<EnrichedCollection[]>(() => {
    return collections
      .map((item) => {
        const rawAreaId = typeof item.areaId === 'string' ? item.areaId : ''
        const rawAreaName = typeof item.areaName === 'string' ? item.areaName.trim() : ''
        const matchedArea =
          (rawAreaId ? areaById.get(rawAreaId) : undefined) ??
          (rawAreaName ? areaByName.get(normalizeSearch(rawAreaName)) : undefined)

        const resolvedAreaId = matchedArea?.id ?? rawAreaId
        const resolvedAreaName = matchedArea?.name ?? rawAreaName

        const rawQuadratId = typeof item.quadratId === 'string' ? item.quadratId : ''
        const rawQuadratName = typeof item.quadratName === 'string' ? item.quadratName.trim() : ''
        const matchedQuadrat = rawQuadratId ? quadratById.get(rawQuadratId) : undefined
        const resolvedQuadratId = matchedQuadrat?.id ?? rawQuadratId
        const resolvedQuadratName = matchedQuadrat?.name ?? rawQuadratName

        const ownLat = asValidCoord(item.latitude)
        const ownLng = asValidCoord(item.longitude)
        const areaLat = matchedArea ? asValidCoord(matchedArea.latitude) : null
        const areaLng = matchedArea ? asValidCoord(matchedArea.longitude) : null

        let coords: ResolvedCoords | null = null
        if (ownLat !== null && ownLng !== null) {
          coords = { lat: ownLat, lng: ownLng, source: 'collection' }
        } else if (areaLat !== null && areaLng !== null) {
          coords = { lat: areaLat, lng: areaLng, source: 'area' }
        }

        const quadrant = isQuadrantCode(item.quadrant) ? item.quadrant : null
        const { names: speciesList, hasInvasive } = extractSpeciesInfo(item)
        const photoCount = Array.isArray(item.photos)
          ? item.photos.length
          : typeof item.photoCount === 'number'
            ? item.photoCount
            : 0
        const hasEsp32 = Boolean(typeof item.deviceId === 'string' && item.deviceId.trim())
        const timestampMs = getCollectionTimestamp(item)

        const disturbances = Array.isArray(item.disturbances)
          ? item.disturbances.map(String).join(' ')
          : ''

        const searchText = normalizeSearch(
          [
            item.name,
            resolvedAreaName,
            resolvedQuadratName,
            quadrant ?? '',
            typeof item.quadrantNumber === 'number' ? `#${item.quadrantNumber}` : '',
            typeof item.transect === 'string' ? item.transect : '',
            typeof item.substrateType === 'string' ? item.substrateType : '',
            typeof item.weather === 'string' ? item.weather : '',
            typeof item.faunaEvidence === 'string' ? item.faunaEvidence : '',
            typeof item.notes === 'string' ? item.notes : '',
            typeof item.deviceId === 'string' ? item.deviceId : '',
            typeof item.createdByName === 'string' ? item.createdByName : '',
            speciesList.join(' '),
            disturbances,
          ].join(' '),
        )

        return {
          item,
          coords,
          displayLat: coords?.lat ?? null,
          displayLng: coords?.lng ?? null,
          areaId: resolvedAreaId,
          areaName: resolvedAreaName,
          quadratId: resolvedQuadratId,
          quadratName: resolvedQuadratName,
          quadrant,
          speciesList,
          hasInvasive,
          photoCount,
          hasEsp32,
          timestampMs,
          searchText,
        }
      })
      .sort((a, b) => b.timestampMs - a.timestampMs)
  }, [collections, areaById, areaByName, quadratById])

  // Apply search & filters
  const filteredCollections = useMemo<EnrichedCollection[]>(() => {
    const queryTokens = normalizeSearch(searchQuery).split(/\s+/).filter(Boolean)

    const matched = enrichedCollections.filter((entry) => {
      if (queryTokens.length > 0 && !queryTokens.every((token) => entry.searchText.includes(token))) {
        return false
      }
      if (areaFilter === '__none__') {
        if (entry.areaId || entry.areaName) return false
      } else if (areaFilter !== 'all') {
        const selectedArea = areaById.get(areaFilter)
        const matchesId = entry.areaId === areaFilter
        const matchesName =
          selectedArea !== undefined &&
          normalizeSearch(entry.areaName) === normalizeSearch(selectedArea.name)
        if (!matchesId && !matchesName) return false
      }
      if (quadratFilter !== 'all' && entry.quadratId !== quadratFilter) return false
      if (quadrantFilter !== 'all' && entry.quadrant !== quadrantFilter) return false
      if (substrateFilter !== 'all' && entry.item.substrateType !== substrateFilter) return false
      if (weatherFilter !== 'all' && entry.item.weather !== weatherFilter) return false
      if (!matchesDateFilter(entry.timestampMs, dateFilter)) return false
      if (onlyWithGps && !entry.coords) return false
      if (onlyWithPhotos && entry.photoCount === 0) return false
      if (onlyWithInvasive && !entry.hasInvasive) return false
      if (onlyWithEsp32 && !entry.hasEsp32) return false
      return true
    })

    // Apply gentle spiral visual offset ONLY when multiple pins share identical coordinates
    const buckets = new Map<string, EnrichedCollection[]>()
    for (const entry of matched) {
      if (!entry.coords) continue
      const key = `${entry.coords.lat.toFixed(6)},${entry.coords.lng.toFixed(6)}`
      const list = buckets.get(key) ?? []
      list.push(entry)
      buckets.set(key, list)
    }

    return matched.map((entry) => {
      if (!entry.coords) return entry
      const key = `${entry.coords.lat.toFixed(6)},${entry.coords.lng.toFixed(6)}`
      const group = buckets.get(key) ?? []
      if (group.length <= 1) return entry
      const idx = group.indexOf(entry)
      const ring = Math.floor(idx / 6)
      const angle = ((idx % 6) * Math.PI) / 3 + ring * 0.45
      const radius = 0.00014 * (1 + ring * 0.7)
      return {
        ...entry,
        displayLat: entry.coords.lat + Math.sin(angle) * radius,
        displayLng: entry.coords.lng + Math.cos(angle) * radius,
      }
    })
  }, [
    enrichedCollections,
    searchQuery,
    areaFilter,
    areaById,
    quadratFilter,
    quadrantFilter,
    substrateFilter,
    weatherFilter,
    dateFilter,
    onlyWithGps,
    onlyWithPhotos,
    onlyWithInvasive,
    onlyWithEsp32,
  ])

  const geocodedFiltered = useMemo(
    () => filteredCollections.filter((entry) => entry.coords !== null),
    [filteredCollections],
  )

  const withoutGpsCount = filteredCollections.length - geocodedFiltered.length

  // Per-area summaries based on filtered collections
  const areaSummaries = useMemo(() => {
    const queryNorm = normalizeSearch(searchQuery)
    return areas
      .map((area) => {
        const areaCollections = filteredCollections.filter(
          (entry) =>
            entry.areaId === area.id ||
            (entry.areaName !== '' &&
              normalizeSearch(entry.areaName) === normalizeSearch(area.name)),
        )
        const lat = asValidCoord(area.latitude)
        const lng = asValidCoord(area.longitude)
        const uniqueQuadrants = new Set(
          areaCollections.map((entry) => entry.quadrant).filter(Boolean),
        )
        const temps = areaCollections
          .map((entry) => entry.item.temperature)
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        const avgTemp = temps.length
          ? temps.reduce((sum, value) => sum + value, 0) / temps.length
          : null

        return {
          area,
          lat,
          lng,
          hasGps: lat !== null && lng !== null,
          collectionsCount: areaCollections.length,
          uniqueQuadrantsCount: uniqueQuadrants.size,
          avgTemp,
        }
      })
      .filter((summary) => {
        if (areaFilter !== 'all' && areaFilter !== '__none__' && summary.area.id !== areaFilter) {
          return false
        }
        if (
          queryNorm &&
          summary.collectionsCount === 0 &&
          !normalizeSearch(summary.area.name).includes(queryNorm)
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => b.collectionsCount - a.collectionsCount)
  }, [areas, filteredCollections, areaFilter, searchQuery])

  // Dashboard live KPIs
  const kpis = useMemo(() => {
    const areaSet = new Set<string>()
    const speciesSet = new Set<string>()
    const temps: number[] = []
    const hums: number[] = []

    for (const entry of filteredCollections) {
      if (entry.areaId || entry.areaName) {
        areaSet.add(entry.areaId || normalizeSearch(entry.areaName))
      }
      for (const sp of entry.speciesList) {
        speciesSet.add(normalizeSearch(sp))
      }
      if (typeof entry.item.temperature === 'number' && Number.isFinite(entry.item.temperature)) {
        temps.push(entry.item.temperature)
      }
      if (typeof entry.item.humidity === 'number' && Number.isFinite(entry.item.humidity)) {
        hums.push(entry.item.humidity)
      }
    }

    return {
      coveredAreas: areaSet.size,
      uniqueSpecies: speciesSet.size,
      avgTemp: temps.length ? temps.reduce((s, v) => s + v, 0) / temps.length : null,
      avgHum: hums.length ? hums.reduce((s, v) => s + v, 0) / hums.length : null,
    }
  }, [filteredCollections])

  const activeAdvancedCount =
    (quadratFilter !== 'all' ? 1 : 0) +
    (quadrantFilter !== 'all' ? 1 : 0) +
    (substrateFilter !== 'all' ? 1 : 0) +
    (weatherFilter !== 'all' ? 1 : 0) +
    (onlyWithGps ? 1 : 0) +
    (onlyWithPhotos ? 1 : 0) +
    (onlyWithInvasive ? 1 : 0) +
    (onlyWithEsp32 ? 1 : 0)

  const hasAnyFilter =
    Boolean(searchQuery.trim()) ||
    areaFilter !== 'all' ||
    dateFilter !== 'all' ||
    activeAdvancedCount > 0

  const selectedEntry = useMemo(
    () => filteredCollections.find((entry) => entry.item.id === selectedCollectionId) ?? null,
    [filteredCollections, selectedCollectionId],
  )

  function clearAllFilters() {
    setSearchQuery('')
    setAreaFilter('all')
    setDateFilter('all')
    setQuadratFilter('all')
    setQuadrantFilter('all')
    setSubstrateFilter('all')
    setWeatherFilter('all')
    setOnlyWithGps(false)
    setOnlyWithPhotos(false)
    setOnlyWithInvasive(false)
    setOnlyWithEsp32(false)
  }

  const fitToVisiblePoints = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const points: Array<[number, number]> = []

    for (const entry of geocodedFiltered) {
      if (entry.displayLat !== null && entry.displayLng !== null) {
        points.push([entry.displayLat, entry.displayLng])
      }
    }
    if (showAreaZones) {
      for (const summary of areaSummaries) {
        if (summary.lat !== null && summary.lng !== null) {
          points.push([summary.lat, summary.lng])
        }
      }
    }

    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      return
    }
    if (points.length === 1) {
      map.flyTo(points[0], 16, { duration: 0.65 })
      return
    }
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds.pad(0.22), { maxZoom: 17, animate: true })
  }, [geocodedFiltered, areaSummaries, showAreaZones])

  // Initialize Leaflet map once
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container || mapRef.current) return

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    })

    markersLayerRef.current = L.layerGroup().addTo(map)
    userLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    if (mapWrapRef.current) {
      resizeObserver.observe(mapWrapRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
      markersLayerRef.current = null
      userLayerRef.current = null
    }
  }, [])

  // Manage base tile layer
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tileLayerRef.current) {
      tileLayerRef.current.remove()
    }
    const spec = TILE_LAYERS[mapStyle]
    tileLayerRef.current = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      maxZoom: spec.maxZoom,
    }).addTo(map)
  }, [mapStyle])

  // Render area zones & collection pins
  useEffect(() => {
    const map = mapRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    collectionMarkersRef.current.clear()

    // 1. Area zones & labels
    if (showAreaZones) {
      for (const summary of areaSummaries) {
        if (summary.lat === null || summary.lng === null) continue

        L.circle([summary.lat, summary.lng], {
          radius: 75,
          color: '#075f47',
          weight: 1.5,
          fillColor: '#119c66',
          fillOpacity: 0.14,
        }).addTo(layer)

        const areaIcon = L.divIcon({
          className: 'hmd-area-marker-wrap',
          html: `<div class="hmd-area-pill">${escapeHtml(summary.area.name)}<em>${summary.collectionsCount}</em></div>`,
          iconSize: [0, 0],
        })

        const areaPopupHtml = `
          <div class="hmd-popup">
            <span class="hmd-popup-tag">Área de pesquisa</span>
            <strong>${escapeHtml(summary.area.name)}</strong>
            <small>${summary.lat.toFixed(5)}, ${summary.lng.toFixed(5)}</small>
            <div class="hmd-popup-metrics">
              <span>${summary.collectionsCount} coleta${summary.collectionsCount === 1 ? '' : 's'}</span>
              <span>${summary.uniqueQuadrantsCount}/25 quadrantes</span>
              ${summary.avgTemp !== null ? `<span>${summary.avgTemp.toFixed(1)} °C</span>` : ''}
            </div>
          </div>
        `

        const areaMarker = L.marker([summary.lat, summary.lng], {
          icon: areaIcon,
          zIndexOffset: 100,
        })
          .bindPopup(areaPopupHtml)
          .addTo(layer)

        areaMarker.on('click', () => {
          map.flyTo([summary.lat!, summary.lng!], Math.max(map.getZoom(), 15), { duration: 0.55 })
        })
      }
    }

    // 2. Collection pins
    for (const entry of geocodedFiltered) {
      if (entry.displayLat === null || entry.displayLng === null || !entry.coords) continue
      const isSelected = entry.item.id === selectedIdRef.current
      const pinLabel = entry.quadrant ?? '●'

      const pinIcon = L.divIcon({
        className: 'hmd-collection-marker-wrap',
        html: `<div class="hmd-collection-pin ${isSelected ? 'selected' : ''}"><span>${escapeHtml(pinLabel)}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      })

      const dateStr = new Date(entry.timestampMs).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      const popupMetrics: string[] = []
      if (typeof entry.item.temperature === 'number') {
        popupMetrics.push(`${entry.item.temperature} °C`)
      }
      if (typeof entry.item.humidity === 'number') {
        popupMetrics.push(`${entry.item.humidity}% UR`)
      }
      if (entry.speciesList.length > 0) {
        popupMetrics.push(`${entry.speciesList.length} esp.`)
      }
      if (entry.photoCount > 0) {
        popupMetrics.push(`${entry.photoCount} foto${entry.photoCount > 1 ? 's' : ''}`)
      }

      const popupHtml = `
        <div class="hmd-popup">
          <span class="hmd-popup-tag">${
            entry.quadrant
              ? `Quadrante ${escapeHtml(entry.quadrant)}${typeof entry.item.quadrantNumber === 'number' ? ` (#${entry.item.quadrantNumber})` : ''}`
              : 'Coleta ecológica'
          }</span>
          <strong>${escapeHtml(entry.item.name)}</strong>
          <small>${escapeHtml(entry.areaName || 'Sem área vinculada')} · ${escapeHtml(dateStr)}</small>
          ${
            entry.coords.source === 'area'
              ? '<small>Posição herdada das coordenadas da área</small>'
              : `<small>GPS: ${entry.coords.lat.toFixed(5)}, ${entry.coords.lng.toFixed(5)}</small>`
          }
          ${
            popupMetrics.length > 0
              ? `<div class="hmd-popup-metrics">${popupMetrics.map((m) => `<span>${escapeHtml(m)}</span>`).join('')}</div>`
              : ''
          }
        </div>
      `

      const marker = L.marker([entry.displayLat, entry.displayLng], {
        icon: pinIcon,
        zIndexOffset: isSelected ? 500 : 250,
      })
        .bindPopup(popupHtml)
        .addTo(layer)

      marker.on('click', () => {
        setSelectedCollectionId(entry.item.id)
      })

      collectionMarkersRef.current.set(entry.item.id, { marker, label: pinLabel })
    }

    // Auto-fit once when initial points arrive
    const hasAnyPoint =
      geocodedFiltered.length > 0 || areaSummaries.some((summary) => summary.hasGps)
    if (!hasAutoFittedRef.current && hasAnyPoint) {
      hasAutoFittedRef.current = true
      fitToVisiblePoints()
    }
  }, [geocodedFiltered, areaSummaries, showAreaZones, fitToVisiblePoints])

  // Update selected pin highlight in-place so open popups are preserved
  useEffect(() => {
    selectedIdRef.current = selectedCollectionId
    for (const [id, { marker, label }] of collectionMarkersRef.current.entries()) {
      const isSelected = id === selectedCollectionId
      marker.setIcon(
        L.divIcon({
          className: 'hmd-collection-marker-wrap',
          html: `<div class="hmd-collection-pin ${isSelected ? 'selected' : ''}"><span>${escapeHtml(label)}</span></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -28],
        }),
      )
      marker.setZIndexOffset(isSelected ? 500 : 250)
    }
  }, [selectedCollectionId])

  function focusCollection(entry: EnrichedCollection) {
    setSelectedCollectionId(entry.item.id)
    if (entry.displayLat !== null && entry.displayLng !== null && mapRef.current) {
      mapRef.current.flyTo(
        [entry.displayLat, entry.displayLng],
        Math.max(mapRef.current.getZoom(), 16),
        { duration: 0.6 },
      )
      const record = collectionMarkersRef.current.get(entry.item.id)
      if (record) {
        window.setTimeout(() => record.marker.openPopup(), 320)
      }
    }
  }

  function focusArea(lat: number, lng: number) {
    if (!mapRef.current) return
    mapRef.current.flyTo([lat, lng], 16, { duration: 0.6 })
  }

  function locateUserOnMap() {
    if (!navigator.geolocation || !mapRef.current || !userLayerRef.current) return
    setLocatingUser(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        userLayerRef.current?.clearLayers()
        const userIcon = L.divIcon({
          className: 'hmd-user-dot-wrap',
          html: '<div class="hmd-user-dot"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        L.marker([lat, lng], { icon: userIcon, zIndexOffset: 600 })
          .bindPopup('<div class="hmd-popup"><strong>Sua localização atual</strong></div>')
          .addTo(userLayerRef.current!)
        mapRef.current?.flyTo([lat, lng], 16, { duration: 0.7 })
        setLocatingUser(false)
      },
      () => {
        setLocatingUser(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const hasAnyGeoPointsOnMap =
    geocodedFiltered.length > 0 || (showAreaZones && areaSummaries.some((s) => s.hasGps))

  return (
    <section className="hmd-section" aria-label="Dashboard e mapa interativo de coletas">
      <div className="hmd-panel">
        <div className="hmd-head">
          <div>
            <span className="eyebrow">DASHBOARD ESPACIAL</span>
            <h2>Mapa interativo de coletas por área</h2>
            <p>
              Pesquise, filtre e explore geograficamente os quadrantes coletados em cada área de
              estudo.
            </p>
          </div>
          <div className="hmd-head-actions">
            <button type="button" className="hmd-ghost-btn" onClick={onNewArea}>
              <MapPin size={14} />
              Nova área
            </button>
            <button type="button" className="small" onClick={onNewCollection}>
              <Plus size={14} />
              Nova coleta
            </button>
          </div>
        </div>

        {/* Live KPIs */}
        <div className="hmd-kpis">
          <article className="hmd-kpi">
            <span className="hmd-kpi-icon">
              <ClipboardPlus size={16} />
            </span>
            <div className="hmd-kpi-body">
              <small>Coletas filtradas</small>
              <strong>{filteredCollections.length}</strong>
              <span>
                {geocodedFiltered.length} no mapa · {collections.length} total
              </span>
            </div>
          </article>

          <article className="hmd-kpi">
            <span className="hmd-kpi-icon">
              <MapPin size={16} />
            </span>
            <div className="hmd-kpi-body">
              <small>Áreas com coletas</small>
              <strong>{kpis.coveredAreas}</strong>
              <span>de {areas.length} área(s) cadastrada(s)</span>
            </div>
          </article>

          <article className="hmd-kpi">
            <span className="hmd-kpi-icon">
              <Sprout size={16} />
            </span>
            <div className="hmd-kpi-body">
              <small>Riqueza observada</small>
              <strong>{kpis.uniqueSpecies}</strong>
              <span>espécies distintas no filtro</span>
            </div>
          </article>

          <article className="hmd-kpi">
            <span className="hmd-kpi-icon">
              <Thermometer size={16} />
            </span>
            <div className="hmd-kpi-body">
              <small>Média ambiental</small>
              <strong>
                {kpis.avgTemp === null ? '--' : `${kpis.avgTemp.toFixed(1)} °C`}
              </strong>
              <span>
                {kpis.avgHum === null ? 'Sem umidade registrada' : `Umidade ${kpis.avgHum.toFixed(0)}%`}
              </span>
            </div>
          </article>
        </div>

        {/* Search + Filter Toolbar */}
        <div className="hmd-toolbar">
          <div className="hmd-search-row">
            <div className="hmd-search-box">
              <Search size={15} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Pesquisar coleta, espécie, área, quadrante (ex.: C3), substrato..."
                aria-label="Pesquisar coletas no mapa"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="hmd-clear-input"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar pesquisa"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              className="hmd-select"
              value={areaFilter}
              onChange={(event) => {
                setAreaFilter(event.target.value)
                const area = areas.find((a) => a.id === event.target.value)
                if (area && typeof area.latitude === 'number' && typeof area.longitude === 'number') {
                  focusArea(area.latitude, area.longitude)
                }
              }}
              aria-label="Filtrar por área"
            >
              <option value="all">Todas as áreas ({areas.length})</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
              <option value="__none__">Sem área vinculada</option>
            </select>

            <select
              className="hmd-select"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              aria-label="Filtrar por período"
            >
              <option value="all">Todo o período</option>
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>

            <button
              type="button"
              className={`hmd-filter-toggle ${showAdvanced ? 'open' : ''}`}
              onClick={() => setShowAdvanced((value) => !value)}
              aria-expanded={showAdvanced}
            >
              <Filter size={14} />
              Filtros
              {activeAdvancedCount > 0 && (
                <span className="hmd-filter-badge">{activeAdvancedCount}</span>
              )}
            </button>
          </div>

          {showAdvanced && (
            <div className="hmd-advanced-filters">
              <div className="hmd-adv-grid">
                <label className="hmd-adv-field">
                  <span>Quadrat físico</span>
                  <select
                    className="hmd-select"
                    value={quadratFilter}
                    onChange={(event) => setQuadratFilter(event.target.value)}
                  >
                    <option value="all">Todos os quadrats</option>
                    {quadrats.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="hmd-adv-field">
                  <span>Quadrante (5×5)</span>
                  <select
                    className="hmd-select"
                    value={quadrantFilter}
                    onChange={(event) => setQuadrantFilter(event.target.value)}
                  >
                    <option value="all">Todos (A1–E5)</option>
                    {ALL_QUADRANTS.map((code, index) => (
                      <option key={code} value={code}>
                        {code} (#{index + 1})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="hmd-adv-field">
                  <span>Substrato</span>
                  <select
                    className="hmd-select"
                    value={substrateFilter}
                    onChange={(event) => setSubstrateFilter(event.target.value)}
                  >
                    <option value="all">Todos os substratos</option>
                    {SUBSTRATE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="hmd-adv-field">
                  <span>Condição climática</span>
                  <select
                    className="hmd-select"
                    value={weatherFilter}
                    onChange={(event) => setWeatherFilter(event.target.value)}
                  >
                    <option value="all">Todos os climas</option>
                    {WEATHER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="hmd-quick-chips">
                <div className="hmd-chip-list">
                  <button
                    type="button"
                    className={`hmd-chip ${onlyWithGps ? 'active' : ''}`}
                    onClick={() => setOnlyWithGps((v) => !v)}
                  >
                    <MapPin size={12} />
                    Apenas com GPS
                  </button>
                  <button
                    type="button"
                    className={`hmd-chip ${onlyWithPhotos ? 'active' : ''}`}
                    onClick={() => setOnlyWithPhotos((v) => !v)}
                  >
                    <Camera size={12} />
                    Com fotos
                  </button>
                  <button
                    type="button"
                    className={`hmd-chip ${onlyWithInvasive ? 'active' : ''}`}
                    onClick={() => setOnlyWithInvasive((v) => !v)}
                  >
                    <ShieldAlert size={12} />
                    Com espécie invasora
                  </button>
                  <button
                    type="button"
                    className={`hmd-chip ${onlyWithEsp32 ? 'active' : ''}`}
                    onClick={() => setOnlyWithEsp32((v) => !v)}
                  >
                    <Bluetooth size={12} />
                    Com sensores ESP32
                  </button>
                </div>

                {hasAnyFilter && (
                  <button type="button" className="hmd-reset-btn" onClick={clearAllFilters}>
                    <RotateCcw size={12} />
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="hmd-status-strip">
            <span>
              Exibindo <b>{filteredCollections.length}</b> de <b>{collections.length}</b> coleta(s)
              {geocodedFiltered.length > 0 && (
                <>
                  {' '}
                  · <b>{geocodedFiltered.length}</b> posicionada(s) no mapa
                </>
              )}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {withoutGpsCount > 0 && (
                <span className="hmd-nogps-tag">
                  {withoutGpsCount} coleta{withoutGpsCount > 1 ? 's' : ''} sem GPS (listada
                  {withoutGpsCount > 1 ? 's' : ''} ao lado)
                </span>
              )}
              {hasAnyFilter && !showAdvanced && (
                <button type="button" className="hmd-reset-btn" onClick={clearAllFilters}>
                  <RotateCcw size={12} />
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Map + Side List */}
        <div className="hmd-grid">
          <div className="hmd-map-wrap" ref={mapWrapRef}>
            <div className="hmd-map-canvas" ref={mapContainerRef} />

            <div className="hmd-map-controls">
              <div className="hmd-layer-switcher" role="group" aria-label="Estilo do mapa">
                <button
                  type="button"
                  className={mapStyle === 'osm' ? 'active' : ''}
                  onClick={() => setMapStyle('osm')}
                >
                  Mapa
                </button>
                <button
                  type="button"
                  className={mapStyle === 'satellite' ? 'active' : ''}
                  onClick={() => setMapStyle('satellite')}
                >
                  Satélite
                </button>
                <button
                  type="button"
                  className={mapStyle === 'topo' ? 'active' : ''}
                  onClick={() => setMapStyle('topo')}
                >
                  Relevo
                </button>
              </div>

              <button
                type="button"
                className={`hmd-map-btn ${showAreaZones ? 'active' : ''}`}
                onClick={() => setShowAreaZones((v) => !v)}
                title="Mostrar ou ocultar zonas das áreas"
              >
                <Layers size={13} />
                Áreas
              </button>

              <button
                type="button"
                className="hmd-map-btn"
                onClick={fitToVisiblePoints}
                title="Enquadrar todos os pontos visíveis"
              >
                <Maximize2 size={13} />
                Enquadrar
              </button>

              <button
                type="button"
                className="hmd-map-btn"
                onClick={locateUserOnMap}
                disabled={locatingUser}
                title="Ir para minha localização atual"
              >
                <LocateFixed size={13} className={locatingUser ? 'spin' : ''} />
              </button>
            </div>

            <div className="hmd-map-legend">
              <span>
                <i className="hmd-legend-dot area" /> Área
              </span>
              <span>
                <i className="hmd-legend-dot collection" /> Coleta / Quadrante
              </span>
              <span>
                <i className="hmd-legend-dot selected" /> Selecionada
              </span>
            </div>

            {!hasAnyGeoPointsOnMap && (
              <div className="hmd-map-empty-overlay">
                <div className="hmd-map-empty-card">
                  <MapPin size={24} />
                  <strong>
                    {hasAnyFilter
                      ? 'Nenhuma coleta com GPS neste filtro'
                      : 'Nenhum ponto com coordenadas GPS ainda'}
                  </strong>
                  <p>
                    {hasAnyFilter
                      ? 'Ajuste a pesquisa ou limpe os filtros para visualizar outros pontos no mapa.'
                      : 'Cadastre uma área com latitude/longitude ou capture o GPS ao registrar uma coleta para visualizar os marcadores aqui.'}
                  </p>
                  <div className="hmd-map-empty-actions">
                    {hasAnyFilter ? (
                      <button type="button" className="small" onClick={clearAllFilters}>
                        <RotateCcw size={13} />
                        Limpar filtros
                      </button>
                    ) : (
                      <>
                        <button type="button" className="hmd-ghost-btn" onClick={onNewArea}>
                          <MapPin size={13} />
                          Cadastrar área com GPS
                        </button>
                        <button type="button" className="small" onClick={onNewCollection}>
                          <Plus size={13} />
                          Nova coleta
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side Panel: Filtered Collections & Areas Breakdown */}
          <aside className="hmd-side">
            <div className="hmd-side-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === 'collections'}
                className={sideTab === 'collections' ? 'active' : ''}
                onClick={() => setSideTab('collections')}
              >
                Coletas ({filteredCollections.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === 'areas'}
                className={sideTab === 'areas' ? 'active' : ''}
                onClick={() => setSideTab('areas')}
              >
                Por área ({areaSummaries.length})
              </button>
            </div>

            {sideTab === 'collections' ? (
              <div className="hmd-side-list">
                {filteredCollections.length === 0 ? (
                  <div className="hmd-list-empty">
                    <Leaf size={20} />
                    <span>Nenhuma coleta encontrada com os critérios atuais.</span>
                  </div>
                ) : (
                  filteredCollections.map((entry) => {
                    const isSelected = entry.item.id === selectedCollectionId
                    return (
                      <button
                        key={entry.item.id}
                        type="button"
                        className={`hmd-side-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => focusCollection(entry)}
                      >
                        <div className="hmd-side-item-top">
                          <strong>{entry.item.name}</strong>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {entry.quadrant && (
                              <span className="hmd-q-chip">{entry.quadrant}</span>
                            )}
                            {!entry.coords && <span className="hmd-nogps-chip">Sem GPS</span>}
                          </div>
                        </div>
                        <small>
                          {entry.areaName || 'Sem área'} ·{' '}
                          {new Date(entry.timestampMs).toLocaleDateString('pt-BR')}
                        </small>
                        <div className="hmd-side-meta">
                          {typeof entry.item.temperature === 'number' && (
                            <span>{entry.item.temperature} °C</span>
                          )}
                          {entry.speciesList.length > 0 && (
                            <span>{entry.speciesList.length} esp.</span>
                          )}
                          {entry.photoCount > 0 && (
                            <span>
                              {entry.photoCount} foto{entry.photoCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {entry.coords?.source === 'area' && <span>GPS da área</span>}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="hmd-side-list">
                {areaSummaries.length === 0 ? (
                  <div className="hmd-list-empty">
                    <MapPin size={20} />
                    <span>Nenhuma área cadastrada ou correspondente ao filtro.</span>
                  </div>
                ) : (
                  areaSummaries.map((summary) => {
                    const isAreaActive = areaFilter === summary.area.id
                    return (
                      <article
                        key={summary.area.id}
                        className={`hmd-area-card ${isAreaActive ? 'active' : ''}`}
                      >
                        <div className="hmd-area-card-head">
                          <strong>{summary.area.name}</strong>
                          <span className="hmd-q-chip">
                            {summary.collectionsCount} coleta{summary.collectionsCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="hmd-area-card-stats">
                          <span>{summary.uniqueQuadrantsCount}/25 quadrantes</span>
                          {summary.avgTemp !== null && (
                            <span>Média {summary.avgTemp.toFixed(1)} °C</span>
                          )}
                          <span>{summary.hasGps ? 'Com GPS' : 'Sem GPS'}</span>
                        </div>
                        <div className="hmd-area-card-actions">
                          <button
                            type="button"
                            className={`hmd-mini-btn ${isAreaActive ? 'active' : ''}`}
                            onClick={() => {
                              const nextFilter = isAreaActive ? 'all' : summary.area.id
                              setAreaFilter(nextFilter)
                              if (nextFilter !== 'all' && summary.hasGps) {
                                focusArea(summary.lat!, summary.lng!)
                              }
                            }}
                          >
                            <Filter size={11} />
                            {isAreaActive ? 'Filtrada' : 'Filtrar área'}
                          </button>
                          {summary.hasGps && (
                            <button
                              type="button"
                              className="hmd-mini-btn"
                              onClick={() => focusArea(summary.lat!, summary.lng!)}
                            >
                              <Crosshair size={11} />
                              Focar no mapa
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Selected Collection Full Inspector */}
      {selectedEntry && (
        <article className="hmd-inspector">
          <div className="hmd-inspector-head">
            <div>
              <span className="eyebrow">COLETA SELECIONADA NO MAPA</span>
              <h3>{selectedEntry.item.name}</h3>
              <small>
                {selectedEntry.areaName || 'Sem área vinculada'} ·{' '}
                {new Date(selectedEntry.timestampMs).toLocaleString('pt-BR')}
                {typeof selectedEntry.item.createdByName === 'string'
                  ? ` · por ${selectedEntry.item.createdByName}`
                  : ''}
              </small>
            </div>
            <div className="hmd-inspector-actions">
              <button
                type="button"
                className="small"
                onClick={() => onEditCollection(selectedEntry.item)}
              >
                <Pencil size={13} />
                Editar
              </button>
              <button
                type="button"
                className="hmd-ghost-btn"
                onClick={() => onOpenCollectionInHistory(selectedEntry.item.id)}
              >
                <ExternalLink size={13} />
                Abrir em Coletas
              </button>
              <button
                type="button"
                className="hmd-ghost-btn"
                onClick={() => setSelectedCollectionId(null)}
                aria-label="Fechar detalhes da coleta selecionada"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <CollectionDetails item={selectedEntry.item} />
        </article>
      )}
    </section>
  )
}

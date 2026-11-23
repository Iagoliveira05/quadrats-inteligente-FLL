import type { WorkspaceItem } from '../services/data'
import {
  getQuadrantInfo,
  isQuadrantCode,
  QUADRAT_COLS,
  QUADRAT_ROWS,
  type QuadrantCode,
  type SpeciesEntry,
} from '../types/collection'

export type DateFilter = 'all' | 'today' | '7d' | '30d' | '90d'
export type CollectionSortOption = 'newest' | 'oldest' | 'name' | 'quadrant' | 'richness'

export type CollectionFilterCriteria = {
  searchQuery: string
  areaFilter: string
  quadratFilter: string
  quadrantFilter: string
  substrateFilter: string
  weatherFilter: string
  authorFilter: string
  dateFilter: DateFilter
  onlyWithGps: boolean
  onlyWithPhotos: boolean
  onlyWithInvasive: boolean
  onlyWithEsp32: boolean
  sortBy: CollectionSortOption
}

export const DEFAULT_COLLECTION_FILTERS: CollectionFilterCriteria = {
  searchQuery: '',
  areaFilter: 'all',
  quadratFilter: 'all',
  quadrantFilter: 'all',
  substrateFilter: 'all',
  weatherFilter: 'all',
  authorFilter: 'all',
  dateFilter: 'all',
  onlyWithGps: false,
  onlyWithPhotos: false,
  onlyWithInvasive: false,
  onlyWithEsp32: false,
  sortBy: 'newest',
}

export const ALL_QUADRANTS: QuadrantCode[] = QUADRAT_ROWS.flatMap((row) =>
  QUADRAT_COLS.map((col) => `${row}${col}` as QuadrantCode),
)

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function getCollectionTimestamp(item: WorkspaceItem): number {
  if (typeof item.collectedAt === 'string') {
    const parsed = Date.parse(item.collectedAt)
    if (Number.isFinite(parsed)) return parsed
  }
  return typeof item.createdAt === 'number' ? item.createdAt : Date.now()
}

export function matchesDateFilter(timestampMs: number, filter: DateFilter): boolean {
  if (filter === 'all') return true
  const now = new Date()
  if (filter === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    return timestampMs >= startOfToday
  }
  const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90
  return timestampMs >= Date.now() - days * 86_400_000
}

export function extractCollectionSpecies(item: WorkspaceItem): {
  names: string[]
  richness: number
  hasInvasive: boolean
} {
  const names: string[] = []
  let hasInvasive = false
  let richness = 0

  if (Array.isArray(item.speciesEntries) && item.speciesEntries.length > 0) {
    richness = item.speciesEntries.length
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
  } else if (Array.isArray(item.species)) {
    for (const raw of item.species) {
      if (typeof raw === 'string' && raw.trim()) {
        names.push(raw.trim())
        richness++
      }
    }
  }

  return { names, richness, hasInvasive }
}

export function getCollectionPhotoCount(item: WorkspaceItem): number {
  if (Array.isArray(item.photos)) return item.photos.length
  return typeof item.photoCount === 'number' && Number.isFinite(item.photoCount)
    ? item.photoCount
    : 0
}

export function filterAndSortCollections(
  collections: WorkspaceItem[],
  areas: WorkspaceItem[],
  quadrats: WorkspaceItem[],
  criteria: CollectionFilterCriteria,
): WorkspaceItem[] {
  const areaById = new Map(areas.map((area) => [area.id, area]))
  const areaByName = new Map(areas.map((area) => [normalizeSearch(area.name), area]))
  const quadratById = new Map(quadrats.map((quadrat) => [quadrat.id, quadrat]))
  const queryTokens = normalizeSearch(criteria.searchQuery).split(/\s+/).filter(Boolean)

  const matched = collections.filter((item) => {
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

    const quadrant = isQuadrantCode(item.quadrant) ? item.quadrant : null
    const { names: speciesNames, hasInvasive } = extractCollectionSpecies(item)
    const photoCount = getCollectionPhotoCount(item)
    const hasEsp32 = Boolean(typeof item.deviceId === 'string' && item.deviceId.trim())
    const hasGps =
      (typeof item.latitude === 'number' &&
        Number.isFinite(item.latitude) &&
        typeof item.longitude === 'number' &&
        Number.isFinite(item.longitude)) ||
      (matchedArea !== undefined &&
        typeof matchedArea.latitude === 'number' &&
        Number.isFinite(matchedArea.latitude) &&
        typeof matchedArea.longitude === 'number' &&
        Number.isFinite(matchedArea.longitude))

    const timestampMs = getCollectionTimestamp(item)

    if (queryTokens.length > 0) {
      const disturbances = Array.isArray(item.disturbances)
        ? item.disturbances.map(String).join(' ')
        : ''
      const searchable = normalizeSearch(
        [
          item.name,
          resolvedAreaName,
          resolvedQuadratName,
          quadrant ?? '',
          typeof item.quadrantNumber === 'number' ? `#${item.quadrantNumber}` : '',
          typeof item.transect === 'string' ? item.transect : '',
          typeof item.substrateType === 'string' ? item.substrateType : '',
          typeof item.weather === 'string' ? item.weather : '',
          typeof item.vegetationStratum === 'string' ? item.vegetationStratum : '',
          typeof item.faunaEvidence === 'string' ? item.faunaEvidence : '',
          typeof item.notes === 'string' ? item.notes : '',
          typeof item.deviceId === 'string' ? item.deviceId : '',
          typeof item.createdByName === 'string' ? item.createdByName : '',
          speciesNames.join(' '),
          disturbances,
        ].join(' '),
      )
      if (!queryTokens.every((token) => searchable.includes(token))) return false
    }

    if (criteria.areaFilter === '__none__') {
      if (resolvedAreaId || resolvedAreaName) return false
    } else if (criteria.areaFilter !== 'all') {
      const selectedArea = areaById.get(criteria.areaFilter)
      const matchesId = resolvedAreaId === criteria.areaFilter
      const matchesName =
        selectedArea !== undefined &&
        normalizeSearch(resolvedAreaName) === normalizeSearch(selectedArea.name)
      if (!matchesId && !matchesName) return false
    }

    if (criteria.quadratFilter !== 'all' && resolvedQuadratId !== criteria.quadratFilter) {
      return false
    }

    if (criteria.quadrantFilter !== 'all' && quadrant !== criteria.quadrantFilter) {
      return false
    }

    if (criteria.substrateFilter !== 'all' && item.substrateType !== criteria.substrateFilter) {
      return false
    }

    if (criteria.weatherFilter !== 'all' && item.weather !== criteria.weatherFilter) {
      return false
    }

    if (criteria.authorFilter !== 'all') {
      const authorName = typeof item.createdByName === 'string' ? item.createdByName.trim() : ''
      if (authorName !== criteria.authorFilter) return false
    }

    if (!matchesDateFilter(timestampMs, criteria.dateFilter)) return false
    if (criteria.onlyWithGps && !hasGps) return false
    if (criteria.onlyWithPhotos && photoCount === 0) return false
    if (criteria.onlyWithInvasive && !hasInvasive) return false
    if (criteria.onlyWithEsp32 && !hasEsp32) return false

    return true
  })

  return [...matched].sort((a, b) => {
    switch (criteria.sortBy) {
      case 'oldest':
        return getCollectionTimestamp(a) - getCollectionTimestamp(b)
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR')
      case 'quadrant': {
        const qa = isQuadrantCode(a.quadrant) ? getQuadrantInfo(a.quadrant).number : 999
        const qb = isQuadrantCode(b.quadrant) ? getQuadrantInfo(b.quadrant).number : 999
        return qa !== qb ? qa - qb : getCollectionTimestamp(b) - getCollectionTimestamp(a)
      }
      case 'richness': {
        const ra = extractCollectionSpecies(a).richness
        const rb = extractCollectionSpecies(b).richness
        return rb !== ra ? rb - ra : getCollectionTimestamp(b) - getCollectionTimestamp(a)
      }
      case 'newest':
      default:
        return getCollectionTimestamp(b) - getCollectionTimestamp(a)
    }
  })
}

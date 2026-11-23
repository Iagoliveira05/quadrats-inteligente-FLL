import L from 'leaflet'
import { getMapTile, saveMapTile } from '../database/db'

export type MapStyleKey = 'osm' | 'satellite' | 'topo'

export const TILE_LAYER_SPECS: Record<
  MapStyleKey,
  { url: string; attribution: string; maxZoom: number }
> = {
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

const TRANSPARENT_TILE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

function buildTileUrl(style: MapStyleKey, x: number, y: number, z: number): string {
  const template = TILE_LAYER_SPECS[style].url
  const sub = ['a', 'b', 'c'][Math.abs(x + y) % 3]
  return template
    .replace('{s}', sub)
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
}

function tileCacheKey(style: MapStyleKey, x: number, y: number, z: number): string {
  return `${style}:${z}:${x}:${y}`
}

class OfflineCachedTileLayer extends L.TileLayer {
  private readonly styleKey: MapStyleKey
  private readonly activeUrls = new Map<HTMLElement, string>()

  constructor(style: MapStyleKey) {
    const spec = TILE_LAYER_SPECS[style]
    super(spec.url, {
      attribution: spec.attribution,
      maxZoom: spec.maxZoom,
      crossOrigin: true,
    })
    this.styleKey = style
    this.on('tileunload', (event) => {
      const tileEl = (event as L.TileEvent).tile
      const url = this.activeUrls.get(tileEl)
      if (url) {
        URL.revokeObjectURL(url)
        this.activeUrls.delete(tileEl)
      }
    })
  }

  override createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const img = document.createElement('img')
    img.alt = ''
    img.setAttribute('role', 'presentation')

    const key = tileCacheKey(this.styleKey, coords.x, coords.y, coords.z)
    const remoteUrl = buildTileUrl(this.styleKey, coords.x, coords.y, coords.z)

    const renderBlob = (blob: Blob) => {
      const objectUrl = URL.createObjectURL(blob)
      this.activeUrls.set(img, objectUrl)
      img.onload = () => done(undefined, img)
      img.onerror = () => done(undefined, img)
      img.src = objectUrl
    }

    void getMapTile(key)
      .then(async (cached) => {
        if (cached?.blob) {
          renderBlob(cached.blob)
          return
        }
        if (!navigator.onLine) {
          img.src = TRANSPARENT_TILE
          done(undefined, img)
          return
        }
        try {
          const response = await fetch(remoteUrl, { mode: 'cors' })
          if (!response.ok) throw new Error('Tile fetch failed')
          const blob = await response.blob()
          void saveMapTile(key, this.styleKey, blob).catch(() => undefined)
          renderBlob(blob)
        } catch {
          // Fallback direto para <img> caso CORS bloqueie fetch em algum provedor
          img.onload = () => done(undefined, img)
          img.onerror = () => {
            img.src = TRANSPARENT_TILE
            done(undefined, img)
          }
          img.src = remoteUrl
        }
      })
      .catch(() => {
        img.src = TRANSPARENT_TILE
        done(undefined, img)
      })

    return img
  }
}

export function createOfflineTileLayer(style: MapStyleKey): L.TileLayer {
  return new OfflineCachedTileLayer(style)
}

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180
  const n = 2 ** zoom
  const x = Math.floor(((lng + 180) / 360) * n)
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

export async function downloadRegionTilesOffline(
  bounds: L.LatLngBounds,
  baseZoom: number,
  style: MapStyleKey,
  onProgress?: (done: number, total: number) => void,
): Promise<{ saved: number; total: number }> {
  const maxAllowedZoom = TILE_LAYER_SPECS[style].maxZoom
  const minZoom = Math.max(2, Math.floor(baseZoom))
  const maxZoom = Math.min(maxAllowedZoom, minZoom + 2)
  const MAX_TILES_PER_DOWNLOAD = 120

  const jobs: Array<{ x: number; y: number; z: number }> = []
  const nw = bounds.getNorthWest()
  const se = bounds.getSouthEast()

  for (let z = minZoom; z <= maxZoom; z++) {
    const topLeft = latLngToTile(nw.lat, nw.lng, z)
    const bottomRight = latLngToTile(se.lat, se.lng, z)
    const minX = Math.min(topLeft.x, bottomRight.x)
    const maxX = Math.max(topLeft.x, bottomRight.x)
    const minY = Math.min(topLeft.y, bottomRight.y)
    const maxY = Math.max(topLeft.y, bottomRight.y)

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (jobs.length >= MAX_TILES_PER_DOWNLOAD) break
        jobs.push({ x, y, z })
      }
      if (jobs.length >= MAX_TILES_PER_DOWNLOAD) break
    }
    if (jobs.length >= MAX_TILES_PER_DOWNLOAD) break
  }

  let completed = 0
  let saved = 0
  onProgress?.(0, jobs.length)

  for (const job of jobs) {
    const key = tileCacheKey(style, job.x, job.y, job.z)
    try {
      const existing = await getMapTile(key)
      if (!existing) {
        const url = buildTileUrl(style, job.x, job.y, job.z)
        const response = await fetch(url, { mode: 'cors' })
        if (response.ok) {
          const blob = await response.blob()
          await saveMapTile(key, style, blob)
          saved++
        }
      } else {
        saved++
      }
    } catch {
      // Continua nos próximos tiles se um falhar.
    }
    completed++
    onProgress?.(completed, jobs.length)
  }

  return { saved, total: jobs.length }
}

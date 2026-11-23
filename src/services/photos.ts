import {
  deleteCollectionPhotos,
  deletePhotosByIds,
  getCollectionPhotos,
  saveOfflinePhotos,
  type LocalPhotoRecord,
} from '../database/db'
import {
  PHOTO_TAGS,
  type CollectionPhotoMeta,
  type DraftPhoto,
} from '../types/collection'

export const PHOTO_COMPRESSION_CONFIG = {
  maxDimension: 1600,
  quality: 0.82,
  maxPhotosPerCollection: 12,
  maxInputSizeBytes: 25 * 1024 * 1024, // 25 MB por arquivo antes da compressão
} as const

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`Não foi possível ler a imagem "${file.name}".`))
    }
    image.src = objectUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

export async function createDraftPhotoFromFile(
  file: File,
  defaultTag: string = PHOTO_TAGS[0],
): Promise<DraftPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" não é um arquivo de imagem válido.`)
  }
  if (file.size > PHOTO_COMPRESSION_CONFIG.maxInputSizeBytes) {
    throw new Error(`"${file.name}" excede o limite de 25 MB.`)
  }

  const image = await loadImageElement(file)
  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height

  const scale = Math.min(
    1,
    PHOTO_COMPRESSION_CONFIG.maxDimension / Math.max(naturalWidth, naturalHeight, 1),
  )
  const targetWidth = Math.max(1, Math.round(naturalWidth * scale))
  const targetHeight = Math.max(1, Math.round(naturalHeight * scale))

  let finalBlob: Blob = file
  let finalMime = file.type || 'image/jpeg'

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight)
    const targetMime = file.type === 'image/png' ? 'image/jpeg' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
    const compressed = await canvasToBlob(canvas, targetMime, PHOTO_COMPRESSION_CONFIG.quality)
    if (compressed && (compressed.size < file.size || scale < 1)) {
      finalBlob = compressed
      finalMime = compressed.type || targetMime
    }
  }

  return {
    id: crypto.randomUUID(),
    fileName: file.name || `quadrante-${Date.now()}.jpg`,
    mimeType: finalMime,
    sizeBytes: finalBlob.size,
    originalSizeBytes: file.size,
    width: targetWidth,
    height: targetHeight,
    tag: defaultTag,
    caption: '',
    capturedAt: new Date().toISOString(),
    syncStatus: 'local_only',
    blob: finalBlob,
    previewUrl: URL.createObjectURL(finalBlob),
  }
}

export function stripDraftPhotoMeta(photo: DraftPhoto): CollectionPhotoMeta {
  return {
    id: photo.id,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    originalSizeBytes: photo.originalSizeBytes,
    width: photo.width,
    height: photo.height,
    tag: photo.tag,
    caption: photo.caption.trim(),
    capturedAt: photo.capturedAt,
    syncStatus: photo.syncStatus,
  }
}

/**
 * Camada desacoplada de persistência de fotografias.
 * Sincroniza adições, edições de legenda/enquadramento e remoções no IndexedDB
 * e devolve apenas os metadados leves (sem Base64) para gravação no Firestore.
 */
export async function persistCollectionPhotos(
  projectId: string,
  collectionId: string,
  drafts: DraftPhoto[],
): Promise<CollectionPhotoMeta[]> {
  const existing = await getCollectionPhotos(collectionId)
  const keptIds = new Set(drafts.map((photo) => photo.id))
  const removedIds = existing.filter((record) => !keptIds.has(record.id)).map((record) => record.id)

  if (removedIds.length > 0) {
    await deletePhotosByIds(removedIds)
  }

  const now = Date.now()
  const recordsToSave: LocalPhotoRecord[] = drafts
    .filter((photo): photo is DraftPhoto & { blob: Blob } => photo.blob !== null)
    .map((photo) => ({
      ...stripDraftPhotoMeta(photo),
      collectionId,
      projectId,
      blob: photo.blob,
      createdAt: now,
    }))

  if (recordsToSave.length > 0) {
    await saveOfflinePhotos(recordsToSave)
  }

  return drafts.map(stripDraftPhotoMeta)
}

export async function loadCollectionPhotoBlobs(collectionId: string): Promise<LocalPhotoRecord[]> {
  return getCollectionPhotos(collectionId)
}

export async function removeCollectionPhotos(collectionId: string): Promise<void> {
  await deleteCollectionPhotos(collectionId)
}

import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  HardDrive,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react'
import {
  createDraftPhotoFromFile,
  formatBytes,
  PHOTO_COMPRESSION_CONFIG,
} from '../services/photos'
import { PHOTO_TAGS, type DraftPhoto, type QuadrantCode } from '../types/collection'
import './PhotoUploadSection.css'

export type LightboxImage = {
  id: string
  src: string
  fileName: string
  tag: string
  caption: string
  width?: number
  height?: number
  sizeBytes?: number
}

export function PhotoLightbox({
  images,
  activeIndex,
  onClose,
  onChangeIndex,
}: {
  images: LightboxImage[]
  activeIndex: number
  onClose: () => void
  onChangeIndex: (index: number) => void
}) {
  const current = images[activeIndex]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && images.length > 1) {
        onChangeIndex((activeIndex - 1 + images.length) % images.length)
      }
      if (event.key === 'ArrowRight' && images.length > 1) {
        onChangeIndex((activeIndex + 1) % images.length)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, images.length, onChangeIndex, onClose])

  if (!current) return null

  return (
    <div
      className="plb-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Visualização da foto ${current.fileName}`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="plb-shell">
        <div className="plb-head">
          <div className="plb-title">
            <span className="plb-tag">{current.tag || 'Foto do quadrante'}</span>
            <strong>
              {current.caption || current.fileName}
              {images.length > 1 ? ` (${activeIndex + 1}/${images.length})` : ''}
            </strong>
          </div>
          <div className="plb-actions">
            <a
              className="plb-icon-btn"
              href={current.src}
              download={current.fileName}
              aria-label="Baixar foto"
              title="Baixar foto"
            >
              <Download size={17} />
            </a>
            <button
              type="button"
              className="plb-icon-btn"
              onClick={onClose}
              aria-label="Fechar visualização"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="plb-stage">
          {images.length > 1 && (
            <button
              type="button"
              className="plb-nav prev"
              onClick={() => onChangeIndex((activeIndex - 1 + images.length) % images.length)}
              aria-label="Foto anterior"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <img src={current.src} alt={current.caption || current.fileName} />
          {images.length > 1 && (
            <button
              type="button"
              className="plb-nav next"
              onClick={() => onChangeIndex((activeIndex + 1) % images.length)}
              aria-label="Próxima foto"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>

        <div className="plb-foot">
          <span>{current.fileName}</span>
          <span>
            {current.width && current.height ? `${current.width} × ${current.height}px` : ''}
            {current.sizeBytes ? ` · ${formatBytes(current.sizeBytes)}` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

type Props = {
  photos: DraftPhoto[]
  selectedQuadrant: QuadrantCode | null
  onAddPhotos: (newPhotos: DraftPhoto[]) => void
  onUpdatePhoto: (id: string, patch: Partial<Pick<DraftPhoto, 'tag' | 'caption'>>) => void
  onRemovePhoto: (id: string) => void
}

export function PhotoUploadSection({
  photos,
  selectedQuadrant,
  onAddPhotos,
  onUpdatePhoto,
  onRemovePhoto,
}: Props) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const maxPhotos = PHOTO_COMPRESSION_CONFIG.maxPhotosPerCollection
  const remainingSlots = Math.max(0, maxPhotos - photos.length)

  async function processFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    if (!files.length) return
    setError('')

    if (remainingSlots <= 0) {
      setError(`Limite de ${maxPhotos} fotos por coleta atingido.`)
      return
    }

    const acceptedFiles = files.slice(0, remainingSlots)
    const truncated = files.length > remainingSlots

    setProcessing(true)
    const created: DraftPhoto[] = []
    const errors: string[] = []

    for (const file of acceptedFiles) {
      try {
        const draft = await createDraftPhotoFromFile(file, PHOTO_TAGS[0])
        created.push(draft)
      } catch (cause) {
        errors.push(
          cause instanceof Error ? cause.message : `Erro ao processar "${file.name}".`,
        )
      }
    }

    if (created.length > 0) {
      onAddPhotos(created)
    }

    if (truncated) {
      errors.push(`Apenas ${remainingSlots} foto(s) adicionada(s) para respeitar o limite de ${maxPhotos}.`)
    }
    if (errors.length > 0) {
      setError(errors.join(' '))
    }
    setProcessing(false)
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void processFiles(event.target.files)
    }
    event.target.value = ''
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files?.length) {
      void processFiles(event.dataTransfer.files)
    }
  }

  const lightboxImages: LightboxImage[] = photos
    .filter((photo): photo is DraftPhoto & { previewUrl: string } => Boolean(photo.previewUrl))
    .map((photo) => ({
      id: photo.id,
      src: photo.previewUrl,
      fileName: photo.fileName,
      tag: photo.tag,
      caption: photo.caption,
      width: photo.width,
      height: photo.height,
      sizeBytes: photo.sizeBytes,
    }))

  return (
    <section className="cf-card">
      <div className="cf-card-head cf-card-head-between">
        <div className="cf-card-head-left">
          <span className="cf-step-badge">5</span>
          <div>
            <span className="eyebrow">REGISTRO FOTOGRÁFICO</span>
            <h3>Fotografias do quadrante</h3>
          </div>
        </div>
        <span className={`pu-counter ${photos.length > 0 ? 'has-items' : ''}`}>
          {photos.length} / {maxPhotos} foto{photos.length === 1 ? '' : 's'}
        </span>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="pu-hidden-input"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="pu-hidden-input"
        onChange={handleFileChange}
      />

      <div
        className={`pu-dropzone ${dragging ? 'dragging' : ''} ${remainingSlots === 0 ? 'disabled' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          if (remainingSlots > 0) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="pu-drop-icon">
          {processing ? <Loader2 size={22} className="spin" /> : <ImagePlus size={22} />}
        </div>
        <div className="pu-drop-copy">
          <strong>
            {processing
              ? 'Processando e comprimindo imagens...'
              : selectedQuadrant
                ? `Envie ou fotografe o quadrante ${selectedQuadrant}`
                : 'Envie ou fotografe o quadrante analisado'}
          </strong>
          <p>
            Arraste imagens aqui ou use os botões abaixo. As fotos são comprimidas
            automaticamente para economizar espaço em campo.
          </p>
        </div>
        <div className="pu-drop-actions">
          <button
            type="button"
            className="small"
            disabled={processing || remainingSlots === 0}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera size={14} />
            Tirar foto
          </button>
          <button
            type="button"
            className="cf-ghost-btn"
            disabled={processing || remainingSlots === 0}
            onClick={() => galleryInputRef.current?.click()}
          >
            <Upload size={14} />
            Escolher imagens
          </button>
        </div>
      </div>

      {error && (
        <p className="pu-error" role="alert">
          {error}
        </p>
      )}

      {photos.length > 0 && (
        <div className="pu-grid">
          {photos.map((photo, index) => {
            const savedRatio =
              photo.originalSizeBytes > photo.sizeBytes
                ? Math.round((1 - photo.sizeBytes / photo.originalSizeBytes) * 100)
                : 0

            const lightboxIdx = photo.previewUrl
              ? lightboxImages.findIndex((img) => img.id === photo.id)
              : -1

            return (
              <article key={photo.id} className="pu-card">
                <div className="pu-thumb-wrap">
                  {photo.previewUrl ? (
                    <>
                      <img
                        src={photo.previewUrl}
                        alt={photo.caption || photo.fileName}
                        onClick={() => lightboxIdx >= 0 && setLightboxIndex(lightboxIdx)}
                      />
                      <button
                        type="button"
                        className="pu-thumb-btn zoom"
                        onClick={() => lightboxIdx >= 0 && setLightboxIndex(lightboxIdx)}
                        aria-label="Ampliar foto"
                        title="Ampliar foto"
                      >
                        <ZoomIn size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="pu-thumb-missing">
                      <HardDrive size={20} />
                      <span>Salva no dispositivo de origem</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="pu-thumb-btn remove"
                    onClick={() => onRemovePhoto(photo.id)}
                    aria-label="Remover foto"
                    title="Remover foto"
                  >
                    <Trash2 size={14} />
                  </button>
                  <span className="pu-thumb-index">#{index + 1}</span>
                </div>

                <div className="pu-card-body">
                  <label className="cf-field">
                    <span>Enquadramento</span>
                    <select
                      value={photo.tag}
                      onChange={(event) =>
                        onUpdatePhoto(photo.id, { tag: event.target.value })
                      }
                    >
                      {PHOTO_TAGS.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="cf-field">
                    <span>Legenda (opcional)</span>
                    <input
                      value={photo.caption}
                      onChange={(event) =>
                        onUpdatePhoto(photo.id, { caption: event.target.value })
                      }
                      placeholder={
                        selectedQuadrant
                          ? `Ex.: Vista vertical do quadrante ${selectedQuadrant}`
                          : 'Ex.: Vista vertical do quadrante'
                      }
                    />
                  </label>

                  <div className="pu-meta">
                    <span>
                      {photo.width}×{photo.height}px
                    </span>
                    <span>
                      {formatBytes(photo.sizeBytes)}
                      {savedRatio >= 10 ? ` (-${savedRatio}%)` : ''}
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="pu-storage-note">
        <HardDrive size={14} />
        <span>
          As imagens são armazenadas localmente neste dispositivo (IndexedDB) vinculadas à
          coleta, sem custos de armazenamento em nuvem. Os metadados das fotos são sincronizados
          com a equipe no Firestore.
        </span>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          images={lightboxImages}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={setLightboxIndex}
        />
      )}
    </section>
  )
}

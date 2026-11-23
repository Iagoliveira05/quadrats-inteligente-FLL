import { useEffect, useMemo, useState } from 'react'
import { Camera, Grid3X3, HardDrive, MapPin, Sprout, Thermometer, ZoomIn } from 'lucide-react'
import type { WorkspaceItem } from '../services/data'
import { formatBytes, loadCollectionPhotoBlobs } from '../services/photos'
import {
  BRAUN_BLANQUET_OPTIONS,
  getQuadrantInfo,
  getQuadratSizeOption,
  isQuadrantCode,
  type CollectionPhotoMeta,
  type SpeciesEntry,
} from '../types/collection'
import { PhotoLightbox, type LightboxImage } from './PhotoUploadSection'
import { QuadratGrid } from './QuadratGrid'
import './CollectionDetails.css'

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asSpeciesEntries(value: unknown): SpeciesEntry[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is SpeciesEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      ('commonName' in entry || 'scientificName' in entry),
  )
}

function asPhotoMetas(value: unknown): CollectionPhotoMeta[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is CollectionPhotoMeta =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as Record<string, unknown>).id === 'string',
  )
}

function braunBlanquetShort(code: string | undefined): string {
  if (!code) return ''
  return BRAUN_BLANQUET_OPTIONS.find((item) => item.code === code)?.short ?? code
}

export function CollectionSummaryBadges({ item }: { item: WorkspaceItem }) {
  const quadrant = isQuadrantCode(item.quadrant) ? getQuadrantInfo(item.quadrant) : null
  const areaName = asString(item.areaName)
  const quadratName = asString(item.quadratName)
  const speciesEntries = asSpeciesEntries(item.speciesEntries)
  const legacySpecies = Array.isArray(item.species) ? item.species.filter(Boolean) : []
  const speciesCount = speciesEntries.length || legacySpecies.length
  const totalIndividuals = asNumber(item.totalIndividuals)
  const photoMetas = asPhotoMetas(item.photos)
  const photoCount = photoMetas.length || (asNumber(item.photoCount) ?? 0)
  const temperature = asNumber(item.temperature)
  const humidity = asNumber(item.humidity)

  if (
    !quadrant &&
    !areaName &&
    !quadratName &&
    !speciesCount &&
    !photoCount &&
    temperature === null
  ) {
    return null
  }

  return (
    <div className="cd-badges">
      {quadrant && (
        <span className="cd-badge cd-badge-quadrant">
          <Grid3X3 size={11} />
          Quadrante {quadrant.code} (#{quadrant.number})
        </span>
      )}
      {(areaName || quadratName) && (
        <span className="cd-badge">
          <MapPin size={11} />
          {[areaName, quadratName].filter(Boolean).join(' · ')}
        </span>
      )}
      {speciesCount > 0 && (
        <span className="cd-badge">
          <Sprout size={11} />
          {speciesCount} espécie{speciesCount > 1 ? 's' : ''}
          {totalIndividuals && totalIndividuals > 0 ? ` · ${totalIndividuals} ind.` : ''}
        </span>
      )}
      {photoCount > 0 && (
        <span className="cd-badge">
          <Camera size={11} />
          {photoCount} foto{photoCount > 1 ? 's' : ''}
        </span>
      )}
      {temperature !== null && (
        <span className="cd-badge">
          <Thermometer size={11} />
          {temperature} °C{humidity !== null ? ` · ${humidity}%` : ''}
        </span>
      )}
    </div>
  )
}

export function CollectionDetails({ item }: { item: WorkspaceItem }) {
  const photoMetas = useMemo(() => asPhotoMetas(item.photos), [item.photos])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    if (photoMetas.length === 0) return
    let active = true
    const createdUrls: string[] = []

    void loadCollectionPhotoBlobs(item.id).then((records) => {
      if (!active) return
      const nextMap: Record<string, string> = {}
      for (const record of records) {
        const url = URL.createObjectURL(record.blob)
        createdUrls.push(url)
        nextMap[record.id] = url
      }
      setPhotoUrls(nextMap)
    })

    return () => {
      active = false
      for (const url of createdUrls) {
        URL.revokeObjectURL(url)
      }
    }
  }, [item.id, photoMetas.length])

  const lightboxImages: LightboxImage[] = useMemo(
    () =>
      photoMetas
        .filter((meta) => Boolean(photoUrls[meta.id]))
        .map((meta) => ({
          id: meta.id,
          src: photoUrls[meta.id],
          fileName: meta.fileName,
          tag: meta.tag,
          caption: meta.caption,
          width: meta.width,
          height: meta.height,
          sizeBytes: meta.sizeBytes,
        })),
    [photoMetas, photoUrls],
  )

  const quadrant = isQuadrantCode(item.quadrant) ? item.quadrant : null
  const quadratOrientation = asString(item.quadratOrientation)
  const quadratSize = asString(item.quadratSize)
  const sizeOption = quadratSize ? getQuadratSizeOption(quadratSize) : null

  const areaName = asString(item.areaName)
  const quadratName = asString(item.quadratName)
  const transect = asString(item.transect)
  const samplingMethod = asString(item.samplingMethod)
  const collectedAt = asString(item.collectedAt)

  const temperature = asNumber(item.temperature)
  const humidity = asNumber(item.humidity)
  const soilTemperature = asNumber(item.soilTemperature)
  const soilMoisturePercent = asNumber(item.soilMoisturePercent)
  const soilMoistureLegacy = typeof item.soilMoisture === 'boolean' ? item.soilMoisture : null
  const lightLux = asNumber(item.lightLux)
  const deviceId = asString(item.deviceId)

  const weather = asString(item.weather)
  const sunExposure = asString(item.sunExposure)
  const windCondition = asString(item.windCondition)
  const soilPh = asNumber(item.soilPh)
  const slopeDegrees = asNumber(item.slopeDegrees)
  const aspect = asString(item.aspect)

  const substrateType = asString(item.substrateType)
  const vegetationStratum = asString(item.vegetationStratum)
  const vegCover = asNumber(item.vegetationCoverPercent)
  const bareCover = asNumber(item.bareSoilPercent)
  const litterCover = asNumber(item.litterCoverPercent)
  const rockCover = asNumber(item.rockCoverPercent)
  const waterCover = asNumber(item.waterCoverPercent)
  const litterDepthCm = asNumber(item.litterDepthCm)
  const canopyCover = asNumber(item.canopyCoverPercent)
  const avgHeightCm = asNumber(item.avgVegetationHeightCm)
  const maxHeightCm = asNumber(item.maxVegetationHeightCm)

  const latitude = asNumber(item.latitude)
  const longitude = asNumber(item.longitude)
  const altitude = asNumber(item.altitude)

  const speciesEntries = asSpeciesEntries(item.speciesEntries)
  const legacySpecies = Array.isArray(item.species)
    ? item.species.map((value) => String(value)).filter(Boolean)
    : []
  const speciesRichness = asNumber(item.speciesRichness)
  const totalIndividuals = asNumber(item.totalIndividuals)
  const estimatedDensity = asNumber(item.estimatedDensityPerM2)
  const shannonIndex = asNumber(item.shannonIndex)

  const disturbances = Array.isArray(item.disturbances)
    ? item.disturbances.map((value) => String(value)).filter(Boolean)
    : []
  const faunaEvidence = asString(item.faunaEvidence)
  const notes = asString(item.notes)

  const coverSum =
    (vegCover ?? 0) +
    (bareCover ?? 0) +
    (litterCover ?? 0) +
    (rockCover ?? 0) +
    (waterCover ?? 0)
  const hasGroundCover =
    vegCover !== null ||
    bareCover !== null ||
    litterCover !== null ||
    rockCover !== null ||
    waterCover !== null

  const hasContext = Boolean(
    areaName ||
      quadratName ||
      transect ||
      sizeOption ||
      samplingMethod ||
      collectedAt ||
      deviceId ||
      (latitude !== null && longitude !== null),
  )

  const hasAbiotic = Boolean(
    temperature !== null ||
      humidity !== null ||
      soilTemperature !== null ||
      soilMoisturePercent !== null ||
      soilMoistureLegacy !== null ||
      lightLux !== null ||
      weather ||
      sunExposure ||
      windCondition ||
      soilPh !== null ||
      slopeDegrees !== null ||
      aspect,
  )

  const hasStructure = Boolean(
    substrateType ||
      vegetationStratum ||
      hasGroundCover ||
      litterDepthCm !== null ||
      canopyCover !== null ||
      avgHeightCm !== null ||
      maxHeightCm !== null,
  )

  return (
    <div className="record-details cd-details">
      {quadrant && (
        <QuadratGrid
          compact
          selected={quadrant}
          orientation={quadratOrientation || null}
          quadratSize={quadratSize || null}
        />
      )}

      {hasContext && (
        <div className="cd-group">
          <span className="cd-group-title">Contexto amostral</span>
          <div className="cd-kv-grid">
            {collectedAt && (
              <p>
                <b>Data da coleta:</b> {new Date(collectedAt).toLocaleString('pt-BR')}
              </p>
            )}
            {areaName && (
              <p>
                <b>Área:</b> {areaName}
              </p>
            )}
            {quadratName && (
              <p>
                <b>Quadrat:</b> {quadratName}
              </p>
            )}
            {transect && (
              <p>
                <b>Transecto:</b> {transect}
              </p>
            )}
            {sizeOption && (
              <p>
                <b>Dimensão:</b> {sizeOption.label}
              </p>
            )}
            {samplingMethod && (
              <p>
                <b>Método:</b> {samplingMethod}
              </p>
            )}
            {deviceId && (
              <p>
                <b>Equipamento:</b> {deviceId}
              </p>
            )}
            {latitude !== null && longitude !== null && (
              <p>
                <b>Localização:</b>{' '}
                <a
                  href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {latitude}, {longitude}
                </a>
                {altitude !== null ? ` (${altitude} m)` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {hasAbiotic && (
        <div className="cd-group">
          <span className="cd-group-title">Fatores abióticos e sensores</span>
          <div className="cd-kv-grid">
            {temperature !== null && (
              <p>
                <b>Temperatura do ar:</b> {temperature} °C
              </p>
            )}
            {humidity !== null && (
              <p>
                <b>Umidade do ar:</b> {humidity}%
              </p>
            )}
            {soilTemperature !== null && (
              <p>
                <b>Temperatura do solo:</b> {soilTemperature} °C
              </p>
            )}
            {soilMoisturePercent !== null ? (
              <p>
                <b>Umidade do solo:</b> {soilMoisturePercent}%
              </p>
            ) : (
              soilMoistureLegacy !== null && (
                <p>
                  <b>Umidade do solo:</b> {soilMoistureLegacy ? '100%' : '0%'}
                </p>
              )
            )}
            {lightLux !== null && (
              <p>
                <b>Luminosidade:</b> {lightLux} lux
              </p>
            )}
            {weather && (
              <p>
                <b>Clima:</b> {weather}
              </p>
            )}
            {sunExposure && (
              <p>
                <b>Insolação:</b> {sunExposure}
              </p>
            )}
            {windCondition && (
              <p>
                <b>Vento:</b> {windCondition}
              </p>
            )}
            {soilPh !== null && (
              <p>
                <b>pH do solo:</b> {soilPh}
              </p>
            )}
            {slopeDegrees !== null && (
              <p>
                <b>Declividade:</b> {slopeDegrees}°
              </p>
            )}
            {aspect && (
              <p>
                <b>Face / Aspecto:</b> {aspect}
              </p>
            )}
          </div>
        </div>
      )}

      {hasStructure && (
        <div className="cd-group">
          <span className="cd-group-title">Substrato, cobertura e estrutura</span>
          <div className="cd-kv-grid">
            {substrateType && (
              <p>
                <b>Substrato:</b> {substrateType}
              </p>
            )}
            {vegetationStratum && (
              <p>
                <b>Estrato:</b> {vegetationStratum}
              </p>
            )}
            {canopyCover !== null && (
              <p>
                <b>Dossel / Copa:</b> {canopyCover}%
              </p>
            )}
            {litterDepthCm !== null && (
              <p>
                <b>Prof. serapilheira:</b> {litterDepthCm} cm
              </p>
            )}
            {avgHeightCm !== null && (
              <p>
                <b>Altura média:</b> {avgHeightCm} cm
              </p>
            )}
            {maxHeightCm !== null && (
              <p>
                <b>Altura máxima:</b> {maxHeightCm} cm
              </p>
            )}
          </div>
          {hasGroundCover && (
            <div className="cd-cover-summary">
              <div className="cd-cover-bar">
                {coverSum > 0 && (
                  <>
                    {(vegCover ?? 0) > 0 && (
                      <span
                        className="veg"
                        style={{ width: `${((vegCover ?? 0) / Math.max(100, coverSum)) * 100}%` }}
                      />
                    )}
                    {(bareCover ?? 0) > 0 && (
                      <span
                        className="bare"
                        style={{ width: `${((bareCover ?? 0) / Math.max(100, coverSum)) * 100}%` }}
                      />
                    )}
                    {(litterCover ?? 0) > 0 && (
                      <span
                        className="litter"
                        style={{ width: `${((litterCover ?? 0) / Math.max(100, coverSum)) * 100}%` }}
                      />
                    )}
                    {(rockCover ?? 0) > 0 && (
                      <span
                        className="rock"
                        style={{ width: `${((rockCover ?? 0) / Math.max(100, coverSum)) * 100}%` }}
                      />
                    )}
                    {(waterCover ?? 0) > 0 && (
                      <span
                        className="water"
                        style={{ width: `${((waterCover ?? 0) / Math.max(100, coverSum)) * 100}%` }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="cd-cover-labels">
                {vegCover !== null && <span>Vegetação: <b>{vegCover}%</b></span>}
                {bareCover !== null && <span>Solo exposto: <b>{bareCover}%</b></span>}
                {litterCover !== null && <span>Serapilheira: <b>{litterCover}%</b></span>}
                {rockCover !== null && <span>Rochas: <b>{rockCover}%</b></span>}
                {waterCover !== null && <span>Água: <b>{waterCover}%</b></span>}
              </div>
            </div>
          )}
        </div>
      )}

      {speciesEntries.length > 0 ? (
        <div className="cd-group">
          <span className="cd-group-title">
            Espécies observadas ({speciesRichness ?? speciesEntries.length})
          </span>
          {(totalIndividuals !== null || estimatedDensity !== null || shannonIndex !== null) && (
            <div className="cd-metrics-inline">
              <span>
                Riqueza: <b>{speciesRichness ?? speciesEntries.length}</b>
              </span>
              {totalIndividuals !== null && (
                <span>
                  Indivíduos: <b>{totalIndividuals}</b>
                </span>
              )}
              {estimatedDensity !== null && (
                <span>
                  Densidade: <b>{estimatedDensity.toLocaleString('pt-BR')} ind/m²</b>
                </span>
              )}
              {shannonIndex !== null && (
                <span>
                  Shannon H&apos;: <b>{shannonIndex.toFixed(2).replace('.', ',')}</b>
                </span>
              )}
            </div>
          )}
          <div className="cd-species-list">
            {speciesEntries.map((entry, idx) => (
              <div key={entry.id || idx} className="cd-species-row">
                <div className="cd-species-title">
                  <strong>{entry.commonName || entry.scientificName}</strong>
                  {entry.commonName && entry.scientificName && (
                    <em>{entry.scientificName}</em>
                  )}
                  {entry.invasive && <span className="cd-invasive-tag">Invasora</span>}
                </div>
                <div className="cd-species-meta">
                  {entry.organismType && <span>{entry.organismType}</span>}
                  {typeof entry.count === 'number' && <span>{entry.count} ind.</span>}
                  {typeof entry.coverPercent === 'number' && <span>Cobertura {entry.coverPercent}%</span>}
                  {entry.braunBlanquet && (
                    <span>Braun-Blanquet: {braunBlanquetShort(entry.braunBlanquet)}</span>
                  )}
                  {entry.phenology && <span>{entry.phenology}</span>}
                </div>
                {entry.notes && <small className="cd-species-note">{entry.notes}</small>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        legacySpecies.length > 0 && (
          <p>
            <b>Espécies:</b> {legacySpecies.join(', ')}
          </p>
        )
      )}

      {photoMetas.length > 0 && (
        <div className="cd-group">
          <span className="cd-group-title">
            Fotografias do quadrante ({photoMetas.length})
          </span>
          <div className="cd-photo-grid">
            {photoMetas.map((photo) => {
              const src = photoUrls[photo.id]
              const lightboxIdx = lightboxImages.findIndex((img) => img.id === photo.id)
              return (
                <article key={photo.id} className="cd-photo-card">
                  {src ? (
                    <button
                      type="button"
                      className="cd-photo-thumb"
                      onClick={() => lightboxIdx >= 0 && setLightboxIndex(lightboxIdx)}
                      aria-label={`Ampliar foto ${photo.caption || photo.fileName}`}
                    >
                      <img src={src} alt={photo.caption || photo.fileName} />
                      <span className="cd-photo-zoom" aria-hidden="true">
                        <ZoomIn size={13} />
                      </span>
                    </button>
                  ) : (
                    <div className="cd-photo-missing">
                      <HardDrive size={18} />
                      <span>Salva localmente no dispositivo de origem</span>
                    </div>
                  )}
                  <div className="cd-photo-info">
                    <span className="cd-photo-tag">{photo.tag || 'Foto do quadrante'}</span>
                    {photo.caption && <strong>{photo.caption}</strong>}
                    <small>
                      {photo.fileName} · {formatBytes(photo.sizeBytes)}
                    </small>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {disturbances.length > 0 && (
        <div className="cd-group">
          <span className="cd-group-title">Perturbações observadas</span>
          <div className="cd-pill-list">
            {disturbances.map((itemLabel) => (
              <span key={itemLabel} className="cd-pill">
                {itemLabel}
              </span>
            ))}
          </div>
        </div>
      )}

      {faunaEvidence && (
        <p>
          <b>Evidências de fauna:</b> {faunaEvidence}
        </p>
      )}

      {notes && (
        <p>
          <b>Observações:</b> {notes}
        </p>
      )}

      <p className="cd-record-id">
        <b>ID:</b> {item.id}
        {typeof item.editedAt === 'number' && (
          <>
            {' '}
            · Editada em {new Date(item.editedAt).toLocaleString('pt-BR')}
            {typeof item.editedByName === 'string' && item.editedByName
              ? ` por ${item.editedByName}`
              : ''}
          </>
        )}
      </p>

      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <PhotoLightbox
          images={lightboxImages}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={setLightboxIndex}
        />
      )}
    </div>
  )
}

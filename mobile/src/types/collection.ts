export const QUADRAT_ROWS = ['A', 'B', 'C', 'D', 'E'] as const
export const QUADRAT_COLS = [1, 2, 3, 4, 5] as const

export type QuadrantRow = (typeof QUADRAT_ROWS)[number]
export type QuadrantCol = (typeof QUADRAT_COLS)[number]
export type QuadrantCode = `${QuadrantRow}${QuadrantCol}`

export type QuadrantInfo = {
  code: QuadrantCode
  row: QuadrantRow
  rowIndex: number
  col: QuadrantCol
  colIndex: number
  number: number
  zoneLabel: string
}

export const QUADRAT_ORIENTATIONS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'] as const
export type QuadratOrientation = (typeof QUADRAT_ORIENTATIONS)[number]

export type QuadratSizeOption = {
  value: string
  label: string
  areaM2: number
  sideLabel: string
  cellSideLabel: string
}

export const QUADRAT_SIZE_OPTIONS: readonly QuadratSizeOption[] = [
  { value: '0.25x0.25', label: '0,25 m × 0,25 m (0,0625 m²)', areaM2: 0.0625, sideLabel: '25 cm', cellSideLabel: '5 × 5 cm' },
  { value: '0.5x0.5', label: '0,5 m × 0,5 m (0,25 m²)', areaM2: 0.25, sideLabel: '50 cm', cellSideLabel: '10 × 10 cm' },
  { value: '1x1', label: '1 m × 1 m (1,0 m²) — Padrão', areaM2: 1, sideLabel: '100 cm', cellSideLabel: '20 × 20 cm' },
  { value: '2x2', label: '2 m × 2 m (4,0 m²)', areaM2: 4, sideLabel: '200 cm', cellSideLabel: '40 × 40 cm' },
  { value: '5x5', label: '5 m × 5 m (25,0 m²)', areaM2: 25, sideLabel: '5 m', cellSideLabel: '1 × 1 m' },
  { value: '10x10', label: '10 m × 10 m (100,0 m²)', areaM2: 100, sideLabel: '10 m', cellSideLabel: '2 × 2 m' },
] as const

export const SAMPLING_METHODS = [
  'Aleatória',
  'Sistemática (Transecto)',
  'Estratificada',
  'Parcela permanente',
] as const

export const WEATHER_OPTIONS = [
  'Ensolarado',
  'Parcialmente nublado',
  'Nublado',
  'Chuva leve',
  'Chuva forte',
  'Neblina',
] as const

export const SUN_EXPOSURE_OPTIONS = [
  'Sol pleno',
  'Meia-sombra',
  'Sombra / Sub-bosque',
] as const

export const WIND_OPTIONS = [
  'Calmo',
  'Brisa leve',
  'Moderado',
  'Forte',
] as const

export const ASPECT_OPTIONS = [
  'Plano',
  'Norte',
  'Nordeste',
  'Leste',
  'Sudeste',
  'Sul',
  'Sudoeste',
  'Oeste',
  'Noroeste',
] as const

export const SUBSTRATE_OPTIONS = [
  'Solo argiloso',
  'Solo arenoso',
  'Solo humoso / orgânico',
  'Rochoso / Pedregoso',
  'Serapilheira espessa',
  'Alagado / Lodoso',
  'Antropizado / Compactado',
] as const

export const VEGETATION_STRATA = [
  'Rasteiro / Muscícola (< 10 cm)',
  'Herbáceo (10–50 cm)',
  'Subarbustivo (50 cm–1,5 m)',
  'Arbustivo (1,5–3 m)',
  'Arbóreo (> 3 m)',
  'Misto',
] as const

export const ORGANISM_TYPES = [
  'Flora (Planta)',
  'Briófita / Musgo',
  'Fungo / Líquen',
  'Fauna (Invertebrado)',
  'Fauna (Vertebrado)',
  'Alga / Outro',
] as const

export type BraunBlanquetCode = '' | 'r' | '+' | '1' | '2' | '3' | '4' | '5'

export const BRAUN_BLANQUET_OPTIONS: ReadonlyArray<{ code: BraunBlanquetCode; label: string; short: string }> = [
  { code: '', label: 'Não avaliado', short: '—' },
  { code: 'r', label: 'r — Rara (1 indivíduo, < 1%)', short: 'r (<1%)' },
  { code: '+', label: '+ — Poucos indivíduos (< 5%)', short: '+ (<5%)' },
  { code: '1', label: '1 — Numerosa (< 5%)', short: '1 (<5%)' },
  { code: '2', label: '2 — Cobertura 5% a 25%', short: '2 (5–25%)' },
  { code: '3', label: '3 — Cobertura 25% a 50%', short: '3 (25–50%)' },
  { code: '4', label: '4 — Cobertura 50% a 75%', short: '4 (50–75%)' },
  { code: '5', label: '5 — Cobertura 75% a 100%', short: '5 (75–100%)' },
] as const

export const PHENOLOGY_OPTIONS = [
  'Não informada',
  'Vegetativo',
  'Floração',
  'Frutificação',
  'Plântula / Muda',
  'Senescente / Seco',
  'Não aplicável',
] as const

export const DISTURBANCE_OPTIONS = [
  'Sem perturbação aparente',
  'Pisoteio',
  'Pastejo / Herbivoria',
  'Vestígios de fogo',
  'Erosão',
  'Lixo / Resíduos',
  'Espécies invasoras',
  'Corte / Poda',
  'Alagamento',
] as const

export const PHOTO_TAGS = [
  'Vista superior do quadrante',
  'Visão geral do quadrat 5×5',
  'Detalhe de espécie',
  'Substrato / Solo',
  'Dossel / Copa',
  'Perturbação / Ambiente',
] as const

export type PhotoSyncStatus = 'local_only' | 'pending_upload' | 'synced' | 'error'

export type CollectionPhotoMeta = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  originalSizeBytes: number
  width: number
  height: number
  tag: string
  caption: string
  capturedAt: string
  syncStatus: PhotoSyncStatus
}

export type DraftPhoto = CollectionPhotoMeta & {
  blob: Blob | null
  previewUrl: string | null
}

export type SpeciesEntry = {
  id: string
  commonName: string
  scientificName: string
  organismType: string
  count: number | null
  coverPercent: number | null
  braunBlanquet: BraunBlanquetCode
  phenology: string
  invasive: boolean
  notes: string
}

export type EcologicalMetrics = {
  richness: number
  totalIndividuals: number
  quadrantAreaM2: number
  densityPerM2: number | null
  shannonIndex: number | null
}

export function isQuadrantCode(value: unknown): value is QuadrantCode {
  if (typeof value !== 'string' || value.length !== 2) return false
  const row = value[0] as QuadrantRow
  const col = Number(value[1]) as QuadrantCol
  return (QUADRAT_ROWS as readonly string[]).includes(row) && (QUADRAT_COLS as readonly number[]).includes(col)
}

export function getQuadrantInfo(code: QuadrantCode): QuadrantInfo {
  const row = code[0] as QuadrantRow
  const col = Number(code[1]) as QuadrantCol
  const rowIndex = QUADRAT_ROWS.indexOf(row)
  const colIndex = QUADRAT_COLS.indexOf(col)
  const number = rowIndex * 5 + colIndex + 1

  let zoneLabel = 'Área interna'
  if (rowIndex === 2 && colIndex === 2) zoneLabel = 'Centro do quadrat'
  else if (rowIndex === 0 && colIndex === 0) zoneLabel = 'Canto superior esquerdo'
  else if (rowIndex === 0 && colIndex === 4) zoneLabel = 'Canto superior direito'
  else if (rowIndex === 4 && colIndex === 0) zoneLabel = 'Canto inferior esquerdo'
  else if (rowIndex === 4 && colIndex === 4) zoneLabel = 'Canto inferior direito'
  else if (rowIndex === 0) zoneLabel = 'Borda superior'
  else if (rowIndex === 4) zoneLabel = 'Borda inferior'
  else if (colIndex === 0) zoneLabel = 'Borda esquerda'
  else if (colIndex === 4) zoneLabel = 'Borda direita'

  return { code, row, rowIndex, col, colIndex, number, zoneLabel }
}

export function getQuadratSizeOption(sizeValue: string | null | undefined): QuadratSizeOption {
  return QUADRAT_SIZE_OPTIONS.find((item) => item.value === sizeValue) ?? QUADRAT_SIZE_OPTIONS[2]
}

export function formatAreaM2(areaM2: number): string {
  if (areaM2 < 0.01) return `${areaM2.toFixed(4).replace('.', ',')} m²`
  if (areaM2 < 1) return `${areaM2.toFixed(2).replace('.', ',')} m²`
  return `${Number(areaM2.toFixed(2)).toString().replace('.', ',')} m²`
}

export function calculateEcologicalMetrics(
  entries: SpeciesEntry[],
  quadratAreaM2: number,
): EcologicalMetrics {
  const validEntries = entries.filter(
    (entry) => entry.commonName.trim() !== '' || entry.scientificName.trim() !== '',
  )
  const richness = validEntries.length
  const counts = validEntries
    .map((entry) => entry.count)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
  const totalIndividuals = counts.reduce((sum, value) => sum + value, 0)
  const quadrantAreaM2 = quadratAreaM2 / 25
  const densityPerM2 =
    totalIndividuals > 0 && quadrantAreaM2 > 0
      ? Number((totalIndividuals / quadrantAreaM2).toFixed(1))
      : null

  let shannonIndex: number | null = null
  if (counts.length >= 2 && totalIndividuals > 0) {
    const h = counts.reduce((sum, count) => {
      const p = count / totalIndividuals
      return sum - p * Math.log(p)
    }, 0)
    shannonIndex = Number(h.toFixed(3))
  } else if (counts.length === 1 && totalIndividuals > 0) {
    shannonIndex = 0
  }

  return {
    richness,
    totalIndividuals,
    quadrantAreaM2,
    densityPerM2,
    shannonIndex,
  }
}

export function formatSpeciesLabel(entry: SpeciesEntry): string {
  const common = entry.commonName.trim()
  const scientific = entry.scientificName.trim()
  if (common && scientific) return `${common} (${scientific})`
  return common || scientific
}

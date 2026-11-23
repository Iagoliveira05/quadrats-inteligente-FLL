import { Check, Compass, Grid3X3 } from 'lucide-react'
import {
  formatAreaM2,
  getQuadrantInfo,
  getQuadratSizeOption,
  QUADRAT_COLS,
  QUADRAT_ORIENTATIONS,
  QUADRAT_ROWS,
  type QuadrantCode,
  type QuadratOrientation,
} from '../types/collection'
import './QuadratGrid.css'

type InteractiveProps = {
  compact?: false
  selected: QuadrantCode | null
  onSelect: (code: QuadrantCode) => void
  orientation: QuadratOrientation
  onOrientationChange: (orientation: QuadratOrientation) => void
  quadratSize: string
  previousCounts?: Partial<Record<QuadrantCode, number>>
  hasError?: boolean
}

type CompactProps = {
  compact: true
  selected: QuadrantCode
  orientation?: string | null
  quadratSize?: string | null
}

type Props = InteractiveProps | CompactProps

function isCompactProps(props: Props): props is CompactProps {
  return props.compact === true
}

export function QuadratGrid(props: Props) {
  if (isCompactProps(props)) {
    const info = getQuadrantInfo(props.selected)
    const sizeOption = getQuadratSizeOption(props.quadratSize)
    return (
      <div className="qg-compact-wrap">
        <div
          className="qg-mini-frame"
          role="img"
          aria-label={`Mapa 5 por 5 do quadrat com quadrante ${info.code} selecionado`}
        >
          <div className="qg-mini-top">
            <span className="qg-mini-corner">
              {props.orientation ? `↑${props.orientation}` : '5×5'}
            </span>
            {QUADRAT_COLS.map((col) => (
              <span key={col} className="qg-mini-axis">
                {col}
              </span>
            ))}
          </div>
          {QUADRAT_ROWS.map((row) => (
            <div key={row} className="qg-mini-row">
              <span className="qg-mini-axis">{row}</span>
              {QUADRAT_COLS.map((col) => {
                const code = `${row}${col}` as QuadrantCode
                const active = code === props.selected
                return (
                  <span
                    key={code}
                    className={`qg-mini-cell ${active ? 'active' : ''}`}
                    title={`Quadrante ${code}`}
                  >
                    {active ? code : ''}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
        <div className="qg-compact-meta">
          <span className="qg-badge-primary">
            <Grid3X3 size={13} />
            Quadrante {info.code} (#{info.number}/25)
          </span>
          <small>
            Linha {info.row} · Coluna {info.col} · {info.zoneLabel}
          </small>
          <small>
            4% do quadrat ({formatAreaM2(sizeOption.areaM2 / 25)})
            {props.orientation ? ` · Topo ${props.orientation}` : ''}
          </small>
        </div>
      </div>
    )
  }

  const {
    selected,
    onSelect,
    orientation,
    onOrientationChange,
    quadratSize,
    previousCounts,
    hasError,
  } = props
  const info = selected ? getQuadrantInfo(selected) : null
  const sizeOption = getQuadratSizeOption(quadratSize)
  const quadrantAreaM2 = sizeOption.areaM2 / 25
  const previouslySampledTotal = previousCounts
    ? Object.values(previousCounts).filter(
        (count): count is number => typeof count === 'number' && count > 0,
      ).length
    : 0

  return (
    <div className={`qg-card ${hasError ? 'qg-card-error' : ''}`}>
      <div className="qg-head">
        <div>
          <span className="eyebrow">MAPA DO QUADRAT · 5 × 5</span>
          <h3>Selecione o quadrante</h3>
        </div>
        <span className={`qg-pill ${info ? 'selected' : ''}`}>
          {info ? `${info.code} · #${info.number}` : '0 / 1'}
        </span>
      </div>

      <p className="qg-subtitle">
        Marque em qual dos <b>25 quadrantes</b> esta coleta foi feita. Cada célula
        corresponde a <b>4%</b> da área total ({sizeOption.cellSideLabel}).
      </p>

      <div className="qg-orientation-bar">
        <span className="qg-orientation-label">
          <Compass size={14} />
          Orientação do topo:
        </span>
        <div className="qg-orientation-pills" role="radiogroup" aria-label="Orientação do quadrat">
          {QUADRAT_ORIENTATIONS.map((dir) => (
            <button
              key={dir}
              type="button"
              className={orientation === dir ? 'active' : ''}
              onClick={() => onOrientationChange(dir)}
              aria-pressed={orientation === dir}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>

      <div className="qg-frame" aria-label="Grade interativa de 25 quadrantes 5 por 5">
        <div className="qg-compass-indicator">
          <span>↑ Topo ({orientation})</span>
        </div>

        <div className="qg-col-headers">
          <span className="qg-corner-label">5×5</span>
          {QUADRAT_COLS.map((col) => (
            <span key={col} className="qg-axis-label">
              {col}
            </span>
          ))}
        </div>

        <div className="qg-matrix">
          {QUADRAT_ROWS.map((row, rowIdx) => (
            <div key={row} className="qg-row">
              <span className="qg-axis-label">{row}</span>
              {QUADRAT_COLS.map((col, colIdx) => {
                const code = `${row}${col}` as QuadrantCode
                const cellNumber = rowIdx * 5 + colIdx + 1
                const isSelected = selected === code
                const prevCount = previousCounts?.[code] ?? 0
                return (
                  <button
                    key={code}
                    type="button"
                    className={`qg-cell ${isSelected ? 'selected' : ''} ${prevCount > 0 ? 'has-previous' : ''}`}
                    onClick={() => onSelect(code)}
                    aria-pressed={isSelected}
                    aria-label={`Quadrante ${code}, número ${cellNumber} de 25${prevCount > 0 ? `, com ${prevCount} coleta(s) anterior(es)` : ''}`}
                    title={
                      prevCount > 0
                        ? `Quadrante ${code} (#${cellNumber}) — ${prevCount} coleta(s) anterior(es)`
                        : `Quadrante ${code} (#${cellNumber})`
                    }
                  >
                    {isSelected && (
                      <span className="qg-cell-check" aria-hidden="true">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                    {!isSelected && prevCount > 0 && (
                      <span className="qg-cell-dot" aria-hidden="true" />
                    )}
                    <strong>{code}</strong>
                    <small>#{cellNumber}</small>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {info ? (
        <div className="qg-selection-summary">
          <div className="qg-selection-code">
            <strong>{info.code}</strong>
            <span>#{info.number}/25</span>
          </div>
          <div className="qg-selection-details">
            <b>
              Linha {info.row}, Coluna {info.col} · {info.zoneLabel}
            </b>
            <small>
              Área do quadrante: {formatAreaM2(quadrantAreaM2)} ({sizeOption.cellSideLabel} · 4%)
            </small>
          </div>
        </div>
      ) : (
        <div className={`qg-selection-empty ${hasError ? 'error' : ''}`}>
          <Grid3X3 size={16} />
          <span>
            {hasError
              ? 'Selecione um quadrante (A1 a E5) para salvar a coleta.'
              : 'Toque em um quadrante acima para registrar a posição exata da coleta.'}
          </span>
        </div>
      )}

      <div className="qg-legend">
        <span>
          <i className="qg-swatch selected" /> Selecionado
        </span>
        <span>
          <i className="qg-swatch previous" /> Já coletado ({previouslySampledTotal}/25)
        </span>
        <span>
          <i className="qg-swatch empty" /> Disponível
        </span>
      </div>
    </div>
  )
}

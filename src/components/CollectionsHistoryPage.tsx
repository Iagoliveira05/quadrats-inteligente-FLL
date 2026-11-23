import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  Bluetooth,
  Camera,
  CheckCircle2,
  Download,
  Filter,
  Leaf,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'
import { exportCollectionsCsv, type WorkspaceItem } from '../services/data'
import { SUBSTRATE_OPTIONS, WEATHER_OPTIONS } from '../types/collection'
import {
  ALL_QUADRANTS,
  DEFAULT_COLLECTION_FILTERS,
  filterAndSortCollections,
  type CollectionFilterCriteria,
  type CollectionSortOption,
  type DateFilter,
} from '../utils/collectionFilters'
import { CollectionDetails, CollectionSummaryBadges } from './CollectionDetails'
import './CollectionsHistoryPage.css'

type Props = {
  items: WorkspaceItem[]
  areas: WorkspaceItem[]
  quadrats: WorkspaceItem[]
  onAdd: () => void
  onEdit: (item: WorkspaceItem) => void
  onDelete: (item: WorkspaceItem) => Promise<void>
  onRefresh: () => Promise<void>
  refreshing: boolean
  initialExpandedId?: string | null
  notice?: string
  onDismissNotice?: () => void
}

export function CollectionsHistoryPage({
  items,
  areas,
  quadrats,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  refreshing,
  initialExpandedId = null,
  notice = '',
  onDismissNotice,
}: Props) {
  const [filters, setFilters] = useState<CollectionFilterCriteria>(DEFAULT_COLLECTION_FILTERS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(initialExpandedId)
  const [confirming, setConfirming] = useState<WorkspaceItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const authors = useMemo(() => {
    const unique = new Set<string>()
    for (const item of items) {
      if (typeof item.createdByName === 'string' && item.createdByName.trim()) {
        unique.add(item.createdByName.trim())
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [items])

  const filteredItems = useMemo(
    () => filterAndSortCollections(items, areas, quadrats, filters),
    [items, areas, quadrats, filters],
  )

  const activeAdvancedCount =
    (filters.quadratFilter !== 'all' ? 1 : 0) +
    (filters.quadrantFilter !== 'all' ? 1 : 0) +
    (filters.substrateFilter !== 'all' ? 1 : 0) +
    (filters.weatherFilter !== 'all' ? 1 : 0) +
    (filters.authorFilter !== 'all' ? 1 : 0) +
    (filters.onlyWithGps ? 1 : 0) +
    (filters.onlyWithPhotos ? 1 : 0) +
    (filters.onlyWithInvasive ? 1 : 0) +
    (filters.onlyWithEsp32 ? 1 : 0)

  const hasAnyFilter =
    Boolean(filters.searchQuery.trim()) ||
    filters.areaFilter !== 'all' ||
    filters.dateFilter !== 'all' ||
    activeAdvancedCount > 0

  function updateFilter<K extends keyof CollectionFilterCriteria>(
    key: K,
    value: CollectionFilterCriteria[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setFilters((prev) => ({ ...DEFAULT_COLLECTION_FILTERS, sortBy: prev.sortBy }))
  }

  async function confirmDelete() {
    if (!confirming) return
    setDeleting(true)
    await onDelete(confirming)
    setDeleting(false)
    setConfirming(null)
    setExpanded(null)
  }

  return (
    <section className="panel page-panel">
      <div className="section-title">
        <div>
          <span className="eyebrow">REGISTROS DO PROJETO</span>
          <h2>Histórico de coletas</h2>
        </div>
        <div className="page-actions">
          <button
            className="refresh-records"
            onClick={() => void onRefresh()}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button className="small" onClick={onAdd}>
            <Plus size={14} />
            Nova coleta
          </button>
        </div>
      </div>

      {notice && (
        <div className="saved-notice" role="status">
          <span>
            <CheckCircle2 size={16} />
            {notice}
          </span>
          {onDismissNotice && (
            <button type="button" onClick={onDismissNotice} aria-label="Fechar aviso">
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="chp-toolbar" role="search" aria-label="Pesquisar e filtrar histórico de coletas">
          <div className="chp-main-row">
            <div className="chp-search-box">
              <Search size={15} />
              <input
                type="search"
                value={filters.searchQuery}
                onChange={(event) => updateFilter('searchQuery', event.target.value)}
                placeholder="Pesquisar coleta, espécie, área, quadrante (ex.: C3), autor..."
                aria-label="Pesquisar no histórico de coletas"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  className="chp-clear-input"
                  onClick={() => updateFilter('searchQuery', '')}
                  aria-label="Limpar pesquisa"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              className="chp-select"
              value={filters.areaFilter}
              onChange={(event) => updateFilter('areaFilter', event.target.value)}
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
              className="chp-select"
              value={filters.dateFilter}
              onChange={(event) => updateFilter('dateFilter', event.target.value as DateFilter)}
              aria-label="Filtrar por período"
            >
              <option value="all">Todo o período</option>
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>

            <div className="chp-sort-wrap">
              <ArrowUpDown size={13} />
              <select
                className="chp-select chp-sort-select"
                value={filters.sortBy}
                onChange={(event) =>
                  updateFilter('sortBy', event.target.value as CollectionSortOption)
                }
                aria-label="Ordenar coletas"
              >
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigas</option>
                <option value="name">Nome (A–Z)</option>
                <option value="quadrant">Quadrante (A1–E5)</option>
                <option value="richness">Mais espécies</option>
              </select>
            </div>

            <button
              type="button"
              className={`chp-filter-toggle ${showAdvanced ? 'open' : ''}`}
              onClick={() => setShowAdvanced((value) => !value)}
              aria-expanded={showAdvanced}
            >
              <Filter size={14} />
              Filtros
              {activeAdvancedCount > 0 && (
                <span className="chp-filter-badge">{activeAdvancedCount}</span>
              )}
            </button>
          </div>

          {showAdvanced && (
            <div className="chp-advanced">
              <div className="chp-adv-grid">
                <label className="chp-adv-field">
                  <span>Quadrat físico</span>
                  <select
                    className="chp-select"
                    value={filters.quadratFilter}
                    onChange={(event) => updateFilter('quadratFilter', event.target.value)}
                  >
                    <option value="all">Todos os quadrats</option>
                    {quadrats.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="chp-adv-field">
                  <span>Quadrante (5×5)</span>
                  <select
                    className="chp-select"
                    value={filters.quadrantFilter}
                    onChange={(event) => updateFilter('quadrantFilter', event.target.value)}
                  >
                    <option value="all">Todos (A1–E5)</option>
                    {ALL_QUADRANTS.map((code, index) => (
                      <option key={code} value={code}>
                        {code} (#{index + 1})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="chp-adv-field">
                  <span>Substrato</span>
                  <select
                    className="chp-select"
                    value={filters.substrateFilter}
                    onChange={(event) => updateFilter('substrateFilter', event.target.value)}
                  >
                    <option value="all">Todos os substratos</option>
                    {SUBSTRATE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="chp-adv-field">
                  <span>Condição climática</span>
                  <select
                    className="chp-select"
                    value={filters.weatherFilter}
                    onChange={(event) => updateFilter('weatherFilter', event.target.value)}
                  >
                    <option value="all">Todos os climas</option>
                    {WEATHER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                {authors.length > 1 && (
                  <label className="chp-adv-field">
                    <span>Registrado por</span>
                    <select
                      className="chp-select"
                      value={filters.authorFilter}
                      onChange={(event) => updateFilter('authorFilter', event.target.value)}
                    >
                      <option value="all">Todos os membros</option>
                      {authors.map((author) => (
                        <option key={author} value={author}>
                          {author}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="chp-chips-row">
                <div className="chp-chip-list">
                  <button
                    type="button"
                    className={`chp-chip ${filters.onlyWithPhotos ? 'active' : ''}`}
                    onClick={() => updateFilter('onlyWithPhotos', !filters.onlyWithPhotos)}
                  >
                    <Camera size={12} />
                    Com fotos
                  </button>
                  <button
                    type="button"
                    className={`chp-chip ${filters.onlyWithInvasive ? 'active' : ''}`}
                    onClick={() => updateFilter('onlyWithInvasive', !filters.onlyWithInvasive)}
                  >
                    <ShieldAlert size={12} />
                    Com espécie invasora
                  </button>
                  <button
                    type="button"
                    className={`chp-chip ${filters.onlyWithEsp32 ? 'active' : ''}`}
                    onClick={() => updateFilter('onlyWithEsp32', !filters.onlyWithEsp32)}
                  >
                    <Bluetooth size={12} />
                    Com sensores ESP32
                  </button>
                  <button
                    type="button"
                    className={`chp-chip ${filters.onlyWithGps ? 'active' : ''}`}
                    onClick={() => updateFilter('onlyWithGps', !filters.onlyWithGps)}
                  >
                    <MapPin size={12} />
                    Com GPS
                  </button>
                </div>

                {hasAnyFilter && (
                  <button type="button" className="chp-reset-btn" onClick={resetFilters}>
                    <RotateCcw size={12} />
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="chp-status-bar">
            <span>
              Exibindo <b>{filteredItems.length}</b> de <b>{items.length}</b> coleta
              {items.length === 1 ? '' : 's'}
            </span>
            <div className="chp-status-actions">
              {hasAnyFilter && filteredItems.length > 0 && (
                <button
                  type="button"
                  className="chp-export-filtered"
                  onClick={() => exportCollectionsCsv(filteredItems)}
                >
                  <Download size={12} />
                  Exportar filtradas ({filteredItems.length})
                </button>
              )}
              {hasAnyFilter && !showAdvanced && (
                <button type="button" className="chp-reset-btn" onClick={resetFilters}>
                  <RotateCcw size={12} />
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <Leaf size={24} />
          <p>Nenhuma coleta registrada.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state chp-filtered-empty">
          <Search size={24} />
          <p>Nenhuma coleta encontrada com os critérios de pesquisa e filtro atuais.</p>
          <button type="button" className="small" onClick={resetFilters}>
            <RotateCcw size={13} />
            Limpar pesquisa e filtros
          </button>
        </div>
      ) : (
        <div className="records-list">
          {filteredItems.map((item) => {
            const isOpen = expanded === item.id
            return (
              <article
                className={`record-card ${isOpen ? 'expanded' : ''}`}
                key={item.id}
              >
                <CheckCircle2 size={18} />
                <div className="record-content">
                  <strong>{item.name}</strong>
                  <small>
                    {new Date(Number(item.createdAt)).toLocaleString('pt-BR')}
                  </small>
                  {typeof item.createdByName === 'string' && (
                    <small>Registrado por {item.createdByName}</small>
                  )}
                  <CollectionSummaryBadges item={item} />
                  <div className="record-actions">
                    <button
                      className="details-button"
                      onClick={() => setExpanded(isOpen ? null : item.id)}
                    >
                      {isOpen ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </button>
                    <button className="edit-button" onClick={() => onEdit(item)}>
                      <Pencil size={13} />
                      Editar
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => setConfirming(item)}
                    >
                      <Trash2 size={13} />
                      Excluir
                    </button>
                  </div>
                  {isOpen && <CollectionDetails item={item} />}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {confirming && (
        <div className="modal-backdrop confirm-backdrop">
          <section className="confirm-dialog">
            <span className="confirm-icon">
              <Trash2 size={20} />
            </span>
            <h3>Excluir coleta?</h3>
            <p>
              A coleta <b>{confirming.name}</b> será removida. Esta ação não
              poderá ser desfeita.
            </p>
            <div>
              <button
                className="cancel-delete"
                onClick={() => setConfirming(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="confirm-delete"
                onClick={() => void confirmDelete()}
                disabled={deleting}
              >
                {deleting ? 'Excluindo...' : 'Excluir coleta'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

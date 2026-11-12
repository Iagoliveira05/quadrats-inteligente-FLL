import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Bluetooth,
  BookOpen,
  CheckCircle2,
  ClipboardPlus,
  Download,
  HelpCircle,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Settings,
  Trash2,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { useAuth } from "./auth/AuthContext";
import {
  bluetoothSupported,
  connectQuadrat,
  type SensorMeasurement,
} from "./services/bluetooth";
import {
  deleteRecord,
  ensureProject,
  exportCollectionsCsv,
  loadRecords,
  listProjects,
  saveRecord,
  syncPendingRecords,
  type Project,
  type RecordKind,
  type WorkspaceItem,
} from "./services/data";
import { TeamPage } from "./components/TeamPage";
import "./App.css";
import "./workspace.css";
import "./record-details.css";
import "./navigation-actions.css";
import "./ble-persistence.css";
import "./team-navigation.css";
import "./refresh-controls.css";

type Section =
  | "Inicio"
  | "Areas"
  | "Quadrats"
  | "Coletas"
  | "Equipe"
  | "Dados"
  | "Tutorial";
type Modal = "area" | "quadrat" | "coleta" | null;

function ConnectionPanel({
  onReading,
}: {
  onReading: (value: SensorMeasurement) => void;
}) {
  const [state, setState] = useState<
    "idle" | "searching" | "connected" | "error"
  >("idle");
  const [deviceName, setDeviceName] = useState("Nenhum dispositivo conectado");
  const [reading, setReading] = useState<SensorMeasurement | null>(null);
  const [error, setError] = useState("");
  const connectionRef = useRef<Awaited<ReturnType<typeof connectQuadrat>> | null>(null);
  useEffect(() => () => connectionRef.current?.disconnect(), []);
  async function connect() {
    if (connectionRef.current || state === "searching") return;
    setState("searching");
    setError("");
    try {
      const result = await connectQuadrat(
        (value) => {
          setReading(value);
          onReading(value);
        },
        () => {
          connectionRef.current = null;
          setState("idle");
          setDeviceName("ESP32 desconectado");
          setReading(null);
        },
      );
      connectionRef.current = result;
      setDeviceName(result.device.name || "ESP32 conectado");
      setState("connected");
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Falha ao conectar.");
    }
  }
  function disconnect() {
    const connection = connectionRef.current;
    connectionRef.current = null;
    connection?.disconnect();
    setState("idle");
    setDeviceName("ESP32 desconectado");
    setReading(null);
    setError("");
  }
  return (
    <section className="connection-panel">
      <div className="connection-copy">
        <span className="eyebrow">CONEXÃO COM EQUIPAMENTO</span>
        <h2>Conecte seu quadrat inteligente</h2>
        <p>
          Escolha o ESP32 e confira as leituras do DHT11 antes de iniciar uma
          coleta.
        </p>
        <div className="connection-status">
          <span
            className={`status-dot ${state === "connected" ? "online" : ""}`}
          />
          {deviceName}
        </div>
        {error && <p className="ble-error">{error}</p>}
        <div className="connection-actions">
          <button
            className="connect-button"
            disabled={!bluetoothSupported() || state === "searching" || state === "connected"}
            onClick={() => void connect()}
          >
            <Bluetooth size={17} />
            {state === "searching"
              ? "Escolha o ESP32..."
              : state === "connected"
                ? "ESP32 conectado"
                : "Procurar ESP32"}
          </button>
          {state === "connected" && (
            <button className="connect-button" onClick={disconnect}>
              <WifiOff size={17} />
              Desconectar ESP32
            </button>
          )}
        </div>
        {!bluetoothSupported() && (
          <p className="ble-warning">
            Use Chrome ou Edge em HTTPS ou localhost.
          </p>
        )}
      </div>
      <div className="reading-preview">
        <div className="preview-title">
          <span>LEITURA AO VIVO</span>
          <b>{reading ? "Recebendo dados" : "Aguardando ESP32"}</b>
        </div>
        {reading ? (
          <div className="reading-grid">
            <div>
              <small>Temperatura</small>
              <strong>{reading.airTemperature ?? "--"} °C</strong>
            </div>
            <div>
              <small>Umidade</small>
              <strong>{reading.airHumidity ?? "--"}%</strong>
            </div>
            <div>
              <small>Nível de água</small>
              <strong>{reading.waterLevelPercent == null ? "--" : reading.waterLevelPercent > 0 ? "Água detectada" : "Sem água"}</strong>
            </div>
          </div>
        ) : (
          <div className="preview-empty">
            <Radio size={26} />
            <span>Os dados do ESP32 aparecerão aqui.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function RecordModal({
  type,
  latest,
  close,
  save,
}: {
  type: Exclude<Modal, null>;
  latest: SensorMeasurement | null;
  close: () => void;
  save: (item: WorkspaceItem) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [species, setSpecies] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [busy, setBusy] = useState(false);
  const label =
    type === "area"
      ? "Nova área"
      : type === "quadrat"
        ? "Novo quadrat"
        : "Nova coleta";
  function locate() {
    navigator.geolocation?.getCurrentPosition((position) => {
      setLatitude(String(position.coords.latitude));
      setLongitude(String(position.coords.longitude));
    });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    await save({
      id: crypto.randomUUID(),
      name,
      notes,
      species: species
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      temperature: latest?.airTemperature ?? null,
      humidity: latest?.airHumidity ?? null,
      deviceId: latest?.deviceId ?? null,
      createdAt: Date.now(),
    });
    setBusy(false);
    close();
  }
  return (
    <div className="modal-backdrop">
      <form className="modal-card record-form" onSubmit={submit}>
        <button
          className="modal-close"
          type="button"
          onClick={close}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
        <span className="eyebrow">CADASTRO</span>
        <h2>{label}</h2>
        <label>
          Nome
          <input
            autoFocus
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              type === "area"
                ? "Mata Norte"
                : type === "quadrat"
                  ? "Q-001"
                  : "Coleta da manhã"
            }
          />
        </label>
        {type === "area" && (
          <>
            <div className="coordinate-grid">
              <label>
                Latitude
                <input
                  inputMode="decimal"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                />
              </label>
              <label>
                Longitude
                <input
                  inputMode="decimal"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                />
              </label>
            </div>
            <button className="location-button" type="button" onClick={locate}>
              <MapPin size={15} />
              Usar localização atual
            </button>
          </>
        )}
        {type === "coleta" && (
          <>
            <label>
              Espécies observadas
              <input
                value={species}
                onChange={(event) => setSpecies(event.target.value)}
                placeholder="Ipê, samambaia, musgo"
              />
            </label>
            <div className="sensor-snapshot">
              <span>
                Temperatura: <b>{latest?.airTemperature ?? "--"} °C</b>
              </span>
              <span>
                Umidade: <b>{latest?.airHumidity ?? "--"}%</b>
              </span>
              <span>
                Nível de água: <b>{latest?.waterLevelPercent == null ? "--" : latest.waterLevelPercent > 0 ? "Água detectada" : "Sem água"}</b>
              </span>
            </div>
          </>
        )}
        <label>
          Observações
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Informações adicionais"
          />
        </label>
        <button className="auth-submit" disabled={busy}>
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}

function ItemsPage({
  title,
  items,
  empty,
  addLabel,
  onAdd,
  onDelete,
  onRefresh,
  refreshing,
}: {
  title: string;
  items: WorkspaceItem[];
  empty: string;
  addLabel: string;
  onAdd: () => void;
  onDelete?: (item: WorkspaceItem) => Promise<void>;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<WorkspaceItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  async function confirmDelete() {
    if (!confirming || !onDelete) return;
    setDeleting(true);
    await onDelete(confirming);
    setDeleting(false);
    setConfirming(null);
    setExpanded(null);
  }
  return (
    <section className="panel page-panel">
      <div className="section-title">
        <div>
          <span className="eyebrow">REGISTROS DO PROJETO</span>
          <h2>{title}</h2>
        </div>
        <div className="page-actions">
          <button className="refresh-records" onClick={() => void onRefresh()} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <button className="small" onClick={onAdd}>
            <Plus size={14} />
            {addLabel}
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <Leaf size={24} />
          <p>{empty}</p>
        </div>
      ) : (
        <div className="records-list">
          {[...items]
            .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
            .map((item) => {
              const isOpen = expanded === item.id;
              const species = Array.isArray(item.species)
                ? item.species.join(", ")
                : "";
              return (
                <article
                  className={`record-card ${isOpen ? "expanded" : ""}`}
                  key={item.id}
                >
                  <CheckCircle2 size={18} />
                  <div className="record-content">
                    <strong>{item.name}</strong>
                    <small>
                      {new Date(Number(item.createdAt)).toLocaleString("pt-BR")}
                    </small>
                    {typeof item.createdByName === "string" && <small>Registrado por {item.createdByName}</small>}
                    <div className="record-actions">
                      <button
                        className="details-button"
                        onClick={() => setExpanded(isOpen ? null : item.id)}
                      >
                        {isOpen ? "Ocultar detalhes" : "Ver detalhes"}
                      </button>
                      {onDelete && (
                        <button
                          className="delete-button"
                          onClick={() => setConfirming(item)}
                        >
                          <Trash2 size={13} />
                          Excluir
                        </button>
                      )}
                    </div>
                    {isOpen && (
                      <div className="record-details">
                        {species && (
                          <p>
                            <b>Espécies:</b> {species}
                          </p>
                        )}
                        {typeof item.temperature === "number" && (
                          <p>
                            <b>Temperatura:</b> {item.temperature} °C
                          </p>
                        )}
                        {typeof item.humidity === "number" && (
                          <p>
                            <b>Umidade:</b> {item.humidity}%
                          </p>
                        )}
                        {typeof item.deviceId === "string" && item.deviceId && (
                          <p>
                            <b>Equipamento:</b> {item.deviceId}
                          </p>
                        )}
                        {typeof item.latitude === "number" &&
                          typeof item.longitude === "number" && (
                            <p>
                              <b>Localização:</b>{" "}
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=17/${item.latitude}/${item.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {item.latitude}, {item.longitude}
                              </a>
                            </p>
                          )}
                        {typeof item.notes === "string" && item.notes && (
                          <p>
                            <b>Observações:</b> {item.notes}
                          </p>
                        )}
                        <p>
                          <b>ID:</b> {item.id}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
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
                {deleting ? "Excluindo..." : "Excluir coleta"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function Tutorial() {
  const steps = [
    "Cadastre uma área de pesquisa.",
    "Cadastre e identifique o quadrat.",
    "Conecte o ESP32 por Bluetooth.",
    "Valide temperatura e umidade.",
    "Crie a coleta, registre espécies e observações.",
    "Exporte os dados em CSV quando necessário.",
  ];
  return (
    <section className="tutorial-page">
      <div className="tutorial-hero">
        <BookOpen size={28} />
        <div>
          <span className="eyebrow">GUIA DE CAMPO</span>
          <h2>Como realizar uma coleta</h2>
          <p>Um fluxo curto para manter os registros organizados.</p>
        </div>
      </div>
      <div className="tutorial-steps">
        {steps.map((text, index) => (
          <article key={text}>
            <span>{index + 1}</span>
            <div>
              <h3>{text}</h3>
            </div>
            <CheckCircle2 size={19} />
          </article>
        ))}
      </div>
      <div className="tutorial-help">
        <HelpCircle size={19} />
        <span>
          Os registros são guardados localmente antes da sincronização.
        </span>
      </div>
    </section>
  );
}

function StatCard({
  Icon,
  value,
  label,
  onClick,
}: {
  Icon: ComponentType<{ size?: number }>;
  value: string | number;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="stat-card"
      onClick={onClick}
      disabled={!onClick}
    >
      <b>
        <Icon size={18} />
      </b>
      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </button>
  );
}

export default function App() {
  const { user, logout } = useAuth();
  const [section, setSection] = useState<Section>(() => {
    const saved = localStorage.getItem("activeSection");
    const valid: Section[] = ["Inicio", "Areas", "Quadrats", "Coletas", "Equipe", "Dados", "Tutorial"];
    return valid.includes(saved as Section) ? saved as Section : "Inicio";
  });
  const [modal, setModal] = useState<Modal>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [areas, setAreas] = useState<WorkspaceItem[]>([]);
  const [quadrats, setQuadrats] = useState<WorkspaceItem[]>([]);
  const [collections, setCollections] = useState<WorkspaceItem[]>([]);
  const [latest, setLatest] = useState<SensorMeasurement | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [refreshingRecords, setRefreshingRecords] = useState(false);
  const name = user?.displayName || user?.email?.split("@")[0] || "Pesquisador";
  const initials = name.slice(0, 2).toUpperCase();
  const links: Array<[Section, ComponentType<{ size?: number }>]> = [
    ["Inicio", LayoutDashboard],
    ["Areas", MapPin],
    ["Quadrats", Radio],
    ["Coletas", ClipboardPlus],
    ["Equipe", Users],
    ["Dados", Settings],
    ["Tutorial", BookOpen],
  ];
  useEffect(() => {
    if (!user) return;
    let active = true;
    void ensureProject(user).then(async (fallback) => {
      if (!active) return;
      let available: Project[];
      try { available = await listProjects(user.uid); } catch { available = [fallback]; }
      if (!available.length) available = [fallback];
      const savedId = localStorage.getItem("activeProjectId");
      const value = available.find(item => item.id === savedId) ?? available[0];
      setProjects(available);
      setProject(value);
      const data = await loadRecords(value.id);
      if (active) {
        setAreas(data.areas);
        setQuadrats(data.quadrats);
        setCollections(data.collections);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!online) return;
    void syncNow();
  }, [online]);
  useEffect(() => { localStorage.setItem("activeSection", section); }, [section]);
  async function syncNow() {
    setSyncing(true);
    await syncPendingRecords();
    setSyncing(false);
  }
  async function selectProject(value: Project) {
    setProject(value);
    localStorage.setItem("activeProjectId", value.id);
    const data = await loadRecords(value.id);
    setAreas(data.areas); setQuadrats(data.quadrats); setCollections(data.collections);
  }
  async function refreshRecords() {
    if (!project) return;
    setRefreshingRecords(true);
    if (navigator.onLine) await syncPendingRecords();
    const data = await loadRecords(project.id);
    setAreas(data.areas); setQuadrats(data.quadrats); setCollections(data.collections);
    setRefreshingRecords(false);
  }
  async function projectChanged(value: Project) {
    if (!user) return;
    const available = await listProjects(user.uid);
    setProjects(available);
    await selectProject(available.find(item => item.id === value.id) ?? value);
  }
  async function projectRemoved(projectId: string) {
    if (!user) return;
    let available = await listProjects(user.uid);
    if (!available.length) available = [await ensureProject(user)];
    setProjects(available);
    const next = available.find(item => item.id !== projectId) ?? available[0];
    await selectProject(next);
  }
  async function save(item: WorkspaceItem) {
    if (!project || !modal) return;
    const sharedItem = { ...item, createdBy: user?.uid ?? null, createdByName: name };
    const kind: RecordKind =
      modal === "area"
        ? "areas"
        : modal === "quadrat"
          ? "quadrats"
          : "collections";
    await saveRecord(project.id, kind, sharedItem);
    if (kind === "areas") setAreas((value) => [...value, sharedItem]);
    if (kind === "quadrats") setQuadrats((value) => [...value, sharedItem]);
    if (kind === "collections") setCollections((value) => [...value, sharedItem]);
  }
  async function removeCollection(item: WorkspaceItem) {
    if (!project) return;
    await deleteRecord(project.id, "collections", item.id);
    setCollections((value) => value.filter((entry) => entry.id !== item.id));
  }
  const averages = useMemo(() => {
    const measured = collections.filter(
      (item) => typeof item.temperature === "number",
    );
    return {
      temperature: measured.length
        ? measured.reduce((sum, item) => sum + Number(item.temperature), 0) /
          measured.length
        : null,
      humidity: measured.length
        ? measured.reduce((sum, item) => sum + Number(item.humidity), 0) /
          measured.length
        : null,
    };
  }, [collections]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <b>
            <Leaf size={22} />
          </b>
          <strong>
            Quadrats<small>Inteligentes</small>
          </strong>
        </div>
        <button className="workspace" onClick={() => setProfileOpen(true)}>
          <span className="user-avatar">{initials}</span>
          <span>
            {project?.name ?? "Carregando projeto"}
            <br />
            <b>{name}</b>
          </span>
        </button>
        <nav>
          {links.map(([label, Icon]) => (
            <button
              key={label}
              className={section === label ? "active" : ""}
              onClick={() => setSection(label)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sync">
          <span>{online ? "● Online" : "● Offline"}</span>
          <button className="logout" onClick={() => void logout()}>
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>
      <main className="content">
        <header>
          <div>
            <small>Quadrats Inteligentes / {section}</small>
            <h1>
              {section === "Inicio" ? `Olá, ${name.split(" ")[0]}` : section}
            </h1>
            <p>{project?.name ?? "Preparando seu projeto..."}</p>
          </div>
          <button className="profile" onClick={() => setProfileOpen(true)}>
            <span className="user-avatar">{initials}</span>
            <span>
              {name}
              <br />
              <small>{user?.email}</small>
            </span>
          </button>
        </header>
        {!online && (
          <div className="offline-banner">
            <WifiOff size={15} />
            Modo offline: seus dados serão sincronizados quando a internet
            voltar.
          </div>
        )}
        <div className={section === "Inicio" ? "" : "ble-preserved-hidden"}>
          <ConnectionPanel onReading={setLatest} />
        </div>
        {section === "Inicio" && (
          <>
            <section className="hero">
              <span className="eyebrow">MONITORAMENTO ECOLÓGICO</span>
              <h2>
                Dados da natureza,
                <br />
                <em>decisões mais inteligentes.</em>
              </h2>
              <p>
                {latest
                  ? "Leitura recebida. Você já pode registrar uma coleta."
                  : "Conecte seu ESP32 e visualize os dados antes de coletar."}
              </p>
              <button disabled={!latest} onClick={() => setModal("coleta")}>
                <Plus size={15} />
                Nova coleta
              </button>
            </section>
            <section className="stats">
              <StatCard Icon={MapPin} value={areas.length} label="Áreas" onClick={() => setSection("Areas")} />
              <StatCard Icon={Radio} value={quadrats.length} label="Quadrats" onClick={() => setSection("Quadrats")} />
              <StatCard
                Icon={ClipboardPlus}
                value={collections.length}
                label="Coletas"
                onClick={() => setSection("Coletas")}
              />
              <StatCard
                Icon={Leaf}
                value={latest ? "OK" : "--"}
                label="ESP32"
              />
            </section>
          </>
        )}
        {section === "Areas" && (
          <ItemsPage
            title="Áreas de pesquisa"
            items={areas}
            empty="Nenhuma área cadastrada."
            addLabel="Nova área"
            onAdd={() => setModal("area")}
            onRefresh={refreshRecords}
            refreshing={refreshingRecords}
          />
        )}
        {section === "Quadrats" && (
          <ItemsPage
            title="Quadrats"
            items={quadrats}
            empty="Nenhum quadrat cadastrado."
            addLabel="Novo quadrat"
            onAdd={() => setModal("quadrat")}
            onRefresh={refreshRecords}
            refreshing={refreshingRecords}
          />
        )}
        {section === "Coletas" && (
          <ItemsPage
            title="Histórico de coletas"
            items={collections}
            empty="Nenhuma coleta registrada."
            addLabel="Nova coleta"
            onAdd={() => setModal("coleta")}
            onDelete={removeCollection}
            onRefresh={refreshRecords}
            refreshing={refreshingRecords}
          />
        )}
        {section === "Dados" && (
          <section className="panel page-panel">
            <div className="section-title">
              <div>
                <span className="eyebrow">RESUMO CIENTÍFICO</span>
                <h2>Dados e exportação</h2>
              </div>
              <button
                className="small"
                disabled={!collections.length}
                onClick={() => exportCollectionsCsv(collections)}
              >
                <Download size={14} />
                Exportar CSV
              </button>
            </div>
            <div className="data-summary">
              <article>
                <small>Temperatura média</small>
                <strong>
                  {averages.temperature === null
                    ? "--"
                    : `${averages.temperature.toFixed(1)} °C`}
                </strong>
              </article>
              <article>
                <small>Umidade média</small>
                <strong>
                  {averages.humidity === null
                    ? "--"
                    : `${averages.humidity.toFixed(1)}%`}
                </strong>
              </article>
              <article>
                <small>Total de coletas</small>
                <strong>{collections.length}</strong>
              </article>
            </div>
            <button
              className="sync-button"
              disabled={!online || syncing}
              onClick={() => void syncNow()}
            >
              <RefreshCw size={15} className={syncing ? "spin" : ""} />
              {syncing ? "Sincronizando..." : "Sincronizar agora"}
            </button>
          </section>
        )}
        {section === "Equipe" && user && <TeamPage user={user} projects={projects} activeProject={project} onSelect={selectProject} onChanged={projectChanged} onRemoved={projectRemoved} />}
        {section === "Tutorial" && <Tutorial />}
      </main>
      {modal && (
        <RecordModal
          type={modal}
          latest={latest}
          close={() => setModal(null)}
          save={save}
        />
      )}
      {profileOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setProfileOpen(false)
          }
        >
          <section className="profile-sheet">
            <button
              className="modal-close"
              onClick={() => setProfileOpen(false)}
            >
              <X size={18} />
            </button>
            <div className="profile-sheet-head">
              <span className="profile-avatar-large">{initials}</span>
              <div>
                <span className="eyebrow">MEU PERFIL</span>
                <h2>{name}</h2>
                <p>{user?.email}</p>
              </div>
            </div>
            <div className="profile-actions">
              <div>
                <span>Projeto</span>
                <strong>{project?.name ?? "--"}</strong>
              </div>
              <div>
                <span>Sincronização</span>
                <strong>{online ? "Disponível" : "Offline"}</strong>
              </div>
            </div>
            <button className="profile-signout" onClick={() => void logout()}>
              <LogOut size={17} />
              Sair da conta
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

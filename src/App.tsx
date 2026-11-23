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
import { CollectionForm } from "./components/CollectionForm";
import { CollectionsHistoryPage } from "./components/CollectionsHistoryPage";
import { HomeMapDashboard } from "./components/HomeMapDashboard";
import {
  persistCollectionPhotos,
  removeCollectionPhotos,
} from "./services/photos";
import type { DraftPhoto } from "./types/collection";
import "./App.css";
import "./workspace.css";
import "./record-details.css";
import "./navigation-actions.css";
import "./ble-persistence.css";
import "./team-navigation.css";
import "./refresh-controls.css";
import "./sensor-progress.css";

type Section =
  | "Inicio"
  | "Areas"
  | "Quadrats"
  | "Coletas"
  | "Equipe"
  | "Dados"
  | "Tutorial";
type Modal = "area" | "quadrat" | null;
type CollectionEditorState =
  | { mode: "create" }
  | { mode: "edit"; collection: WorkspaceItem }
  | null;

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
  const [elapsedSinceReading, setElapsedSinceReading] = useState(0);
  const [error, setError] = useState("");
  const connectionRef = useRef<Awaited<ReturnType<typeof connectQuadrat>> | null>(null);
  const SENSOR_UPDATE_INTERVAL_MS = 5000;
  useEffect(() => () => connectionRef.current?.disconnect(), []);
  useEffect(() => {
    if (state !== "connected") return;
    const timer = window.setInterval(() => {
      setElapsedSinceReading((value) => Math.min(value + 100, SENSOR_UPDATE_INTERVAL_MS));
    }, 100);
    return () => window.clearInterval(timer);
  }, [state]);
  async function connect() {
    if (connectionRef.current || state === "searching") return;
    setState("searching");
    setError("");
    try {
      const result = await connectQuadrat(
        (value) => {
          setReading(value);
          setElapsedSinceReading(0);
          onReading(value);
        },
        () => {
          connectionRef.current = null;
          setState("idle");
          setDeviceName("ESP32 desconectado");
          setReading(null);
          setElapsedSinceReading(0);
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
          Escolha o ESP32 e confira as leituras do ar e do solo antes de
          iniciar uma coleta.
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
          <>
          <div className="sensor-progress" aria-label={`Próxima atualização em ${Math.ceil((SENSOR_UPDATE_INTERVAL_MS - elapsedSinceReading) / 1000)} segundos`}>
            <div className="sensor-progress-label">
              <span>Próxima atualização</span>
              <b>{Math.ceil((SENSOR_UPDATE_INTERVAL_MS - elapsedSinceReading) / 1000)}s</b>
            </div>
            <div className="sensor-progress-track"><span style={{ width: `${(elapsedSinceReading / SENSOR_UPDATE_INTERVAL_MS) * 100}%` }} /></div>
          </div>
          <div className="reading-grid">
            <div>
              <small>Temperatura do ar</small>
              <strong>{reading.airTemperature ?? "--"} °C</strong>
            </div>
            <div>
              <small>Umidade do ar</small>
              <strong>{reading.airHumidity ?? "--"}%</strong>
            </div>
            <div>
              <small>Temperatura do solo</small>
              <strong>{reading.soilTemperature ?? "--"} °C</strong>
            </div>
            <div>
              <small>Umidade do solo</small>
              <strong>{reading.soilMoisturePercent == null ? "--" : `${reading.soilMoisturePercent}%`}</strong>
            </div>
            <div>
              <small>Luminosidade</small>
              <strong>{reading.lightLux == null ? "--" : `${reading.lightLux} lux`}</strong>
            </div>
          </div>
          </>
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
  close,
  save,
}: {
  type: Exclude<Modal, null>;
  close: () => void;
  save: (item: WorkspaceItem) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [busy, setBusy] = useState(false);
  const label = type === "area" ? "Nova área" : "Novo quadrat";
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
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
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
            placeholder={type === "area" ? "Mata Norte" : "Q-001"}
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
  onRefresh,
  refreshing,
}: {
  title: string;
  items: WorkspaceItem[];
  empty: string;
  addLabel: string;
  onAdd: () => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
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
                    </div>
                    {isOpen && (
                      <div className="record-details">
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
    </section>
  );
}

function Tutorial() {
  const steps = [
    "Cadastre uma área de pesquisa.",
    "Cadastre e identifique o quadrat.",
    "Conecte o ESP32 por Bluetooth (opcional para leitura automática).",
    "Abra Nova coleta e selecione o quadrante exato na grade 5×5 (A1 a E5).",
    "Preencha variáveis abióticas, substrato, cobertura do solo, espécies e perturbações.",
    "Exporte os dados completos em CSV quando necessário.",
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
  const [collectionEditor, setCollectionEditor] = useState<CollectionEditorState>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [lastSavedVersion, setLastSavedVersion] = useState(0);
  const [savedNotice, setSavedNotice] = useState("");
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
    setCollectionEditor(null);
    setLastSavedId(null);
    setSavedNotice("");
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
  function openNewCollection() {
    setSavedNotice("");
    setCollectionEditor({ mode: "create" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openEditCollection(item: WorkspaceItem) {
    setSavedNotice("");
    setCollectionEditor({ mode: "edit", collection: item });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openCollectionInHistory(collectionId: string) {
    setLastSavedId(collectionId);
    setLastSavedVersion((v) => v + 1);
    setSavedNotice("");
    setSection("Coletas");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(item: WorkspaceItem) {
    if (!project || !modal) return;
    const sharedItem = { ...item, createdBy: user?.uid ?? null, createdByName: name };
    const kind: RecordKind = modal === "area" ? "areas" : "quadrats";
    await saveRecord(project.id, kind, sharedItem);
    if (kind === "areas") setAreas((value) => [...value, sharedItem]);
    if (kind === "quadrats") setQuadrats((value) => [...value, sharedItem]);
  }
  async function saveCollection(item: WorkspaceItem, photos: DraftPhoto[]) {
    if (!project) return;
    const isEditing = collectionEditor?.mode === "edit";
    const original = isEditing ? collectionEditor.collection : null;
    const persistedPhotos = await persistCollectionPhotos(project.id, item.id, photos);
    const sharedItem: WorkspaceItem = {
      ...item,
      photoCount: persistedPhotos.length,
      photos: persistedPhotos,
      createdBy:
        original && "createdBy" in original
          ? original.createdBy
          : user?.uid ?? null,
      createdByName:
        original && typeof original.createdByName === "string"
          ? original.createdByName
          : name,
      ...(isEditing
        ? {
            editedAt: Date.now(),
            editedBy: user?.uid ?? null,
            editedByName: name,
          }
        : {}),
    };
    await saveRecord(project.id, "collections", sharedItem);
    setCollections((value) =>
      isEditing
        ? value.map((entry) => (entry.id === sharedItem.id ? sharedItem : entry))
        : [...value, sharedItem],
    );
    setLastSavedId(sharedItem.id);
    setLastSavedVersion((v) => v + 1);
    const quadrantText =
      typeof sharedItem.quadrant === "string"
        ? ` · Quadrante ${sharedItem.quadrant}${typeof sharedItem.quadrantNumber === "number" ? ` (#${sharedItem.quadrantNumber})` : ""}`
        : "";
    const photoText =
      persistedPhotos.length > 0
        ? ` · ${persistedPhotos.length} foto${persistedPhotos.length > 1 ? "s" : ""}`
        : "";
    setSavedNotice(
      isEditing
        ? `Coleta "${sharedItem.name}" atualizada com sucesso${quadrantText}${photoText}.`
        : `Coleta "${sharedItem.name}" salva com sucesso${quadrantText}${photoText}.`,
    );
    setCollectionEditor(null);
    setSection("Coletas");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function removeCollection(item: WorkspaceItem) {
    if (!project) return;
    await removeCollectionPhotos(item.id);
    await deleteRecord(project.id, "collections", item.id);
    setCollections((value) => value.filter((entry) => entry.id !== item.id));
  }
  const averages = useMemo(() => {
    const tempItems = collections.filter(
      (item) => typeof item.temperature === "number",
    );
    const humidityItems = collections.filter(
      (item) => typeof item.humidity === "number",
    );
    return {
      temperature: tempItems.length
        ? tempItems.reduce((sum, item) => sum + Number(item.temperature), 0) /
          tempItems.length
        : null,
      humidity: humidityItems.length
        ? humidityItems.reduce((sum, item) => sum + Number(item.humidity), 0) /
          humidityItems.length
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
              className={
                (collectionEditor ? label === "Coletas" : section === label)
                  ? "active"
                  : ""
              }
              onClick={() => {
                setCollectionEditor(null);
                setSection(label);
              }}
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
            <small>
              Quadrats Inteligentes /{" "}
              {collectionEditor
                ? collectionEditor.mode === "edit"
                  ? "Coletas / Editar coleta"
                  : "Coletas / Nova coleta"
                : section}
            </small>
            <h1>
              {collectionEditor
                ? collectionEditor.mode === "edit"
                  ? "Editar coleta"
                  : "Nova coleta"
                : section === "Inicio"
                  ? `Olá, ${name.split(" ")[0]}`
                  : section}
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
        <div className={!collectionEditor && section === "Inicio" ? "" : "ble-preserved-hidden"}>
          <ConnectionPanel onReading={setLatest} />
        </div>
        {collectionEditor ? (
          <CollectionForm
            key={
              collectionEditor.mode === "edit"
                ? `edit-${collectionEditor.collection.id}`
                : "create"
            }
            areas={areas}
            quadrats={quadrats}
            existingCollections={collections}
            latest={latest}
            initialCollection={
              collectionEditor.mode === "edit" ? collectionEditor.collection : null
            }
            onCancel={() => setCollectionEditor(null)}
            onSave={saveCollection}
          />
        ) : (
          <>
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
                  ? "Leitura do ESP32 ativa. Os sensores serão preenchidos automaticamente na ficha."
                  : "Conecte o ESP32 para preencher os sensores automaticamente ou inicie uma coleta manual."}
              </p>
              <button onClick={openNewCollection}>
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
            <HomeMapDashboard
              areas={areas}
              quadrats={quadrats}
              collections={collections}
              onNewCollection={openNewCollection}
              onNewArea={() => setModal("area")}
              onEditCollection={openEditCollection}
              onOpenCollectionInHistory={openCollectionInHistory}
            />
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
          <CollectionsHistoryPage
            key={`${lastSavedId ?? "collections"}-${lastSavedVersion}`}
            items={collections}
            areas={areas}
            quadrats={quadrats}
            onAdd={openNewCollection}
            onEdit={openEditCollection}
            onDelete={removeCollection}
            onRefresh={refreshRecords}
            refreshing={refreshingRecords}
            initialExpandedId={lastSavedId}
            notice={savedNotice}
            onDismissNotice={() => setSavedNotice("")}
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
          </>
        )}
      </main>
      {modal && (
        <RecordModal
          type={modal}
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

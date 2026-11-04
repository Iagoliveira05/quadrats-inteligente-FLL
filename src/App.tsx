/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from 'react'
import { Bluetooth, BookOpen, CheckCircle2, ClipboardPlus, HelpCircle, LayoutDashboard, Leaf, LogOut, MapPin, Plus, Radio, Settings, X } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { bluetoothSupported, connectQuadrat, type SensorMeasurement } from './services/bluetooth'
import './App.css'

type Section = 'Inicio' | 'Areas' | 'Quadrats' | 'Coletas' | 'Dados' | 'Tutorial'
type Modal = 'area' | 'quadrat' | 'coleta' | null
type Item = { id: string; name: string }

function ConnectionPanel({ onReading }: { onReading: (value: SensorMeasurement) => void }) {
  const [state, setState] = useState<'idle' | 'searching' | 'connected' | 'error'>('idle')
  const [deviceName, setDeviceName] = useState('Nenhum dispositivo conectado')
  const [reading, setReading] = useState<SensorMeasurement | null>(null)
  const [error, setError] = useState('')

  async function connect() {
    setState('searching'); setError('')
    try {
      const connection = await connectQuadrat(value => { setReading(value); onReading(value) })
      setDeviceName(connection.device.name || 'ESP32 conectado')
      setState('connected')
    } catch (cause) {
      setState('error'); setError(cause instanceof Error ? cause.message : 'Falha ao conectar.')
    }
  }

  return <section className="connection-panel">
    <div className="connection-copy"><span className="eyebrow">CONEXAO COM EQUIPAMENTO</span><h2>Conecte seu quadrat inteligente</h2><p>Escolha o ESP32 pelo Bluetooth, confira as leituras em tempo real e somente depois inicie uma coleta.</p><div className="connection-status"><span className={`status-dot ${state === 'connected' ? 'online' : ''}`} />{deviceName}</div>{error && <p className="ble-error">{error}</p>}<button className="connect-button" disabled={!bluetoothSupported() || state === 'searching'} onClick={() => void connect()}><Bluetooth size={17} />{state === 'searching' ? 'Escolha o ESP32...' : state === 'connected' ? 'Conectar outro ESP32' : 'Procurar ESP32'}</button>{!bluetoothSupported() && <p className="ble-warning">Use Chrome ou Edge em HTTPS ou localhost.</p>}</div>
    <div className="reading-preview"><div className="preview-title"><span>LEITURA AO VIVO</span><b>{reading ? 'Recebendo dados' : 'Aguardando ESP32'}</b></div>{reading ? <div className="reading-grid"><div><small>Temp. ar</small><strong>{reading.airTemperature ?? '--'} C</strong></div><div><small>Umidade ar</small><strong>{reading.airHumidity ?? '--'}%</strong></div><div><small>Umidade solo</small><strong>{reading.soilMoisture ?? '--'}%</strong></div><div><small>Luminosidade</small><strong>{reading.luminosity ?? '--'} lux</strong></div></div> : <div className="preview-empty"><Radio size={26} /><span>Os dados do ESP32 aparecerao aqui.</span></div>}</div>
  </section>
}

function Tutorial() {
  const steps = [['1', 'Prepare o ESP32', 'Grave o firmware quadrat_ble.ino usando o Arduino IDE.'], ['2', 'Ligue os sensores', 'Confirme pinos, alimentacao de 3,3 V e o cabo USB.'], ['3', 'Abra no navegador certo', 'Use Chrome ou Edge, em HTTPS ou localhost.'], ['4', 'Conecte o quadrat', 'Volte ao Inicio e toque em Procurar ESP32.'], ['5', 'Confira os dados', 'Espere aparecerem valores em Leitura ao vivo.'], ['6', 'Inicie a coleta', 'Crie uma coleta apenas depois de confirmar a leitura.']]
  return <section className="tutorial-page"><div className="tutorial-hero"><BookOpen size={28} /><div><span className="eyebrow">GUIA DE CAMPO</span><h2>Como conectar seu ESP32</h2><p>Siga esta sequencia para evitar perder dados da coleta.</p></div></div><div className="tutorial-steps">{steps.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><CheckCircle2 size={19} /></article>)}</div><div className="tutorial-help"><HelpCircle size={19} /><span>O tutorial completo de montagem esta em <code>docs/ESP32-CONEXAO.md</code>.</span></div></section>
}

function RecordModal({ type, close, save }: { type: Exclude<Modal, null>; close: () => void; save: (name: string) => void }) {
  const [name, setName] = useState('')
  const label = type === 'area' ? 'Nova area' : type === 'quadrat' ? 'Novo quadrat' : 'Nova coleta'
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={event => { event.preventDefault(); save(name); close() }}><button className="modal-close" type="button" onClick={close}><X size={18} /></button><span className="eyebrow">CADASTRO</span><h2>{label}</h2><label>Nome<input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder={type === 'area' ? 'Mata Norte' : type === 'quadrat' ? 'Q-001' : 'Coleta da manha'} /></label><button className="auth-submit">Salvar</button></form></div>
}

export default function App() {
  const { user, logout } = useAuth(); const [section, setSection] = useState<Section>('Inicio'); const [modal, setModal] = useState<Modal>(null); const [areas, setAreas] = useState<Item[]>([]); const [quadrats, setQuadrats] = useState<Item[]>([]); const [collections, setCollections] = useState<Item[]>([]); const [latest, setLatest] = useState<SensorMeasurement | null>(null)
  const name = user?.displayName || user?.email?.split('@')[0] || 'Pesquisador'; const initials = name.slice(0, 2).toUpperCase()
  const links: Array<[Section, typeof LayoutDashboard]> = [['Inicio', LayoutDashboard], ['Areas', MapPin], ['Quadrats', Radio], ['Coletas', ClipboardPlus], ['Dados', Settings], ['Tutorial', BookOpen]]
  function save(nameValue: string) { const item = { id: crypto.randomUUID(), name: nameValue }; if (modal === 'area') setAreas(value => [...value, item]); if (modal === 'quadrat') setQuadrats(value => [...value, item]); if (modal === 'coleta') setCollections(value => [...value, item]) }
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><b><Leaf size={22} /></b><strong>Quadrats<small>Inteligentes</small></strong></div><div className="workspace"><span className="user-avatar">{initials}</span><span>Usuario conectado<br /><b>{name}</b></span></div><nav>{links.map(([label, Icon]) => <button key={label} className={section === label ? 'active' : ''} onClick={() => setSection(label)}><Icon size={17} />{label}</button>)}</nav><div className="sync"><span>● Sessao ativa</span><button className="logout" onClick={() => void logout()}><LogOut size={14} />Sair</button></div></aside><main className="content"><header><div><small>Quadrats Inteligentes / {section}</small><h1>{section === 'Inicio' ? `Ola, ${name.split(' ')[0]}` : section}</h1><p>Monitore seus ecossistemas com dados reais.</p></div><div className="profile"><span className="user-avatar">{initials}</span><span>{name}<br /><small>{user?.email}</small></span></div></header>{section === 'Inicio' && <><ConnectionPanel onReading={setLatest} /><section className="hero"><span className="eyebrow">MONITORAMENTO ECOLOGICO</span><h2>Dados da natureza,<br /><em>decisoes mais inteligentes.</em></h2><p>{latest ? 'Leitura real recebida. Agora voce pode iniciar uma coleta.' : 'Conecte seu ESP32 e visualize os dados antes de coletar.'}</p><button disabled={!latest} onClick={() => setModal('coleta')}><Plus size={15} />Nova coleta</button></section><section className="stats">{[[MapPin, areas.length, 'Areas'], [Radio, quadrats.length, 'Quadrats'], [ClipboardPlus, collections.length, 'Coletas'], [Leaf, latest ? 'OK' : '--', 'ESP32']].map(([Icon, value, label]) => <article key={String(label)}><b><Icon size={18} /></b><div><strong>{String(value)}</strong><span>{label}</span></div></article>)}</section><section className="panel areas"><div className="section-title"><div><span className="eyebrow">DADOS CADASTRADOS</span><h3>Seu projeto</h3></div><div className="panel-actions"><button className="small" onClick={() => setModal('area')}><Plus size={14} />Nova area</button><button className="small" onClick={() => setModal('quadrat')}><Plus size={14} />Novo quadrat</button></div></div>{[...areas, ...quadrats, ...collections].length === 0 ? <p className="muted">Cadastre uma area e um quadrat para iniciar.</p> : [...areas, ...quadrats, ...collections].map(item => <div className="list-card" key={item.id}><CheckCircle2 size={17} /><span><strong>{item.name}</strong><small>Registro criado nesta sessao</small></span></div>)}</section></>}{section === 'Tutorial' && <Tutorial />}{!['Inicio', 'Tutorial'].includes(section) && <section className="panel page-panel"><h2>{section}</h2><p className="muted">Use o Inicio para criar e conectar seus registros de campo.</p></section>}</main>{modal && <RecordModal type={modal} close={() => setModal(null)} save={save} />}</div>
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Leaf, LockKeyhole, Mail } from 'lucide-react'
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from '../../firebase'
import '../auth-login.css'

function googleErrorMessage(cause: unknown) {
  if (!(cause instanceof FirebaseError)) return 'Não foi possível entrar com o Google. Tente novamente.'
  if (cause.code === 'auth/unauthorized-domain') return `O domínio ${window.location.hostname} não está autorizado no Firebase.`
  if (cause.code === 'auth/operation-not-allowed') return 'O login Google não está habilitado no Firebase.'
  if (cause.code === 'auth/popup-blocked') return 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.'
  if (cause.code === 'auth/popup-closed-by-user' || cause.code === 'auth/cancelled-popup-request') return 'O login com Google foi cancelado.'
  if (cause.code === 'auth/network-request-failed') return 'Falha de conexão. Verifique a internet e tente novamente.'
  if (cause.code === 'auth/account-exists-with-different-credential') return 'Este e-mail já está cadastrado usando outra forma de login.'
  return `Não foi possível entrar com o Google (${cause.code}).`
}

export function Login() {
  const navigate = useNavigate(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [show, setShow] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(''); setBusy(true); try { await signInWithEmailAndPassword(auth, email, password); navigate('/') } catch { setError('E-mail ou senha inválidos. Verifique os dados e tente novamente.') } finally { setBusy(false) } }
  async function googleLogin() { setError(''); setBusy(true); const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' }); try { await signInWithPopup(auth, provider); navigate('/', { replace: true }) } catch (cause) { setError(googleErrorMessage(cause)) } finally { setBusy(false) } }
  return <main className="auth-page"><section className="auth-visual"><div className="auth-logo"><Leaf size={28} /> <span>Quadrats<br /><small>Inteligentes</small></span></div><div><span className="eyebrow">MONITORAMENTO ECOLÓGICO</span><h1>Dados da natureza,<br /><em>decisões melhores.</em></h1><p>Registre, acompanhe e compreenda cada detalhe dos seus ecossistemas.</p></div></section><section className="auth-card"><div className="auth-card-head"><span className="mobile-leaf"><Leaf size={20} /></span><span className="eyebrow">BEM-VINDA DE VOLTA</span><h2>Entrar na sua conta</h2><p>Acesse seus projetos de monitoramento.</p></div><form onSubmit={submit}><label>E-mail<div className="field"><Mail size={17} /><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@exemplo.com" /></div></label><label>Senha<div className="field"><LockKeyhole size={17} /><input type={show ? 'text' : 'password'} required minLength={6} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{error && <div className="form-error">{error}</div>}<button className="auth-submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button></form><div className="login-divider"><span>ou</span></div><button type="button" className="google-button" disabled={busy} onClick={() => void googleLogin()}><span className="google-mark">G</span><span>{busy ? 'Abrindo Google...' : 'Continuar com Google'}</span></button><div className="auth-footer">Ainda não tem uma conta? <Link to="/cadastro">Criar conta</Link></div></section></main>
}

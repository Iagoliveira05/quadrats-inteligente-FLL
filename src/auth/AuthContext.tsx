/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'

type AuthContextValue = { user: User | null; loading: boolean; logout: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser)
    setLoading(false)
    if (nextUser) void setDoc(doc(db, 'users', nextUser.uid), { uid: nextUser.uid, email: nextUser.email, displayName: nextUser.displayName ?? '', updatedAt: serverTimestamp() }, { merge: true }).catch(() => undefined)
  }), [])
  const value = useMemo(() => ({ user, loading, logout: () => auth.signOut() }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider'); return context }

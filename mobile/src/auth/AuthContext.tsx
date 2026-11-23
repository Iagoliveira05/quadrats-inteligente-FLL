/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'

export type AppUser = {
  uid: string
  email: string | null
  displayName: string | null
  isOfflineGuest?: boolean
}

const OFFLINE_GUEST_STORAGE_KEY = 'quadrats_offline_guest_user'

function readStoredOfflineGuest(): AppUser | null {
  try {
    const raw = localStorage.getItem(OFFLINE_GUEST_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppUser
    return parsed && typeof parsed.uid === 'string' ? parsed : null
  } catch {
    return null
  }
}

type AuthContextValue = {
  user: AppUser | null
  loading: boolean
  enterOfflineMode: (researcherName?: string) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => readStoredOfflineGuest())
  const [loading, setLoading] = useState(() => !readStoredOfflineGuest())

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        localStorage.removeItem(OFFLINE_GUEST_STORAGE_KEY)
        const appUser: AppUser = {
          uid: nextUser.uid,
          email: nextUser.email,
          displayName: nextUser.displayName,
          isOfflineGuest: false,
        }
        setUser(appUser)
        setLoading(false)
        void setDoc(
          doc(db, 'users', nextUser.uid),
          {
            uid: nextUser.uid,
            email: nextUser.email,
            displayName: nextUser.displayName ?? '',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ).catch(() => undefined)
        return
      }

      const offlineGuest = readStoredOfflineGuest()
      setUser(offlineGuest)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      enterOfflineMode: (researcherName?: string) => {
        const guest: AppUser = {
          uid: 'local-offline',
          email: 'modo.offline@dispositivo',
          displayName: researcherName?.trim() || 'Pesquisador (Offline)',
          isOfflineGuest: true,
        }
        localStorage.setItem(OFFLINE_GUEST_STORAGE_KEY, JSON.stringify(guest))
        setUser(guest)
        setLoading(false)
      },
      logout: async () => {
        localStorage.removeItem(OFFLINE_GUEST_STORAGE_KEY)
        setUser(null)
        await auth.signOut().catch(() => undefined)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getCurrentUser } from '../services/api'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CurrentUser } from '../types/auth'

interface AuthContextValue { user: CurrentUser | null; session: Session | null; loading: boolean; error: string | null; signIn(email: string, password: string): Promise<void>; signOut(): Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
async function profileFor(session: Session | null) { return session ? getCurrentUser(session.access_token) : null }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null); const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  useEffect(() => { const client = supabase; if (!client) { setLoading(false); return } let active = true
    const restore = async () => { const { data } = await client.auth.getSession(); if (!active) return; setSession(data.session); try { setUser(await profileFor(data.session)); setError(null) } catch (err) { setUser(null); setError(err instanceof Error ? err.message : 'Unable to load your profile') } finally { if (active) setLoading(false) } }
    void restore(); const { data: listener } = client.auth.onAuthStateChange((_event, next) => { setSession(next); void profileFor(next).then(profile => { if (active) { setUser(profile); setError(null) } }).catch(err => { if (active) { setUser(null); setError(err instanceof Error ? err.message : 'Unable to load profile') } }) }); return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  const value = useMemo<AuthContextValue>(() => ({ user, session, loading, error, async signIn(email, password) { if (!supabase) throw new Error('Supabase is not configured yet. Add the public values to frontend/.env.'); const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password }); if (signInError || !data.session) throw new Error('Email or password was not recognised.'); const profile = await profileFor(data.session); setSession(data.session); setUser(profile); setError(null) }, async signOut() { if (supabase) await supabase.auth.signOut(); setSession(null); setUser(null); setError(null) } }), [user, session, loading, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context }
export { isSupabaseConfigured }

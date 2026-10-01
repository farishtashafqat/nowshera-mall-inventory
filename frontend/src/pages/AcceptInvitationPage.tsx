import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, LockKeyhole, Store } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'
import { acceptInvitation } from '../services/api'

export function AcceptInvitationPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [ready, setReady] = useState(Boolean(session))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (session) { setReady(true); return }
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)))
  }, [session])

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!supabase || !session) { setError('This invitation link is invalid or has expired. Ask a manager to send a new invitation.'); return }
    if (password.length < 8) { setError('Choose a password with at least 8 characters.'); return }
    if (password !== confirmation) { setError('Passwords do not match.'); return }
    setSaving(true)
    try {
      const updated = await supabase.auth.updateUser({ password })
      if (updated.error) throw updated.error
      await acceptInvitation(session.access_token)
      setSuccess('Your account is active. Redirecting you to sign in…')
      window.setTimeout(() => navigate('/login', { replace: true }), 900)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not activate your account.') } finally { setSaving(false) }
  }

  return <main className="login-page"><section className="login-panel"><div className="login-brand"><span className="brand-mark"><Store size={24} /></span><div><strong>Nowshera Shopping Mall</strong><small>Inventory Management System</small></div></div><p className="eyebrow">Invitation accepted</p><h1>Set your password</h1><p>Create a password to activate your authorised staff account.</p>{!ready && <p className="login-alert">Open the invitation link from your email to continue. If it has expired, ask a manager for a new invitation.</p>}<form onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} /></label><label>Confirm password<input type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status"><CheckCircle2 size={16} /> {success}</p>}<button className="login-button" disabled={!ready || saving}><LockKeyhole size={17} /> {saving ? 'Activating…' : 'Activate account'}</button></form></section><aside className="login-aside"><div><p className="eyebrow">Secure access</p><h2>Your invitation unlocks your Staff account.</h2><p>Accounts created outside the manager invitation flow remain inactive.</p></div></aside></main>
}

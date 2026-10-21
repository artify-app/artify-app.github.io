import { useState } from 'react'
import { LogIn, HardDrive, Mail, KeyRound } from 'lucide-react'
import { useStore } from '../lib/store'
import { Button, Field, Input, cx } from '../components/ui'
import { Logo } from '../components/Layout'
import { useBrand } from '../lib/brand'

export default function Login() {
  const signIn = useStore((s) => s.signIn)
  const disconnect = useStore((s) => s.disconnectSupabase)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const [done, setDone] = useState(false)
  const brand = useBrand()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null)
    const r = await signIn(email.trim(), pw)
    if (r) { setErr(/invalid/i.test(r) ? 'Погрешен е-маил или лозинка.' : r); setShake(true); setTimeout(() => setShake(false), 500) }
    else setDone(true)
    setBusy(false)
  }
  return (
    <div className="login-bg min-h-full flex items-center justify-center p-6 relative overflow-hidden">
      <span className="blob blob-1" /><span className="blob blob-2" /><span className="blob blob-3" />
      <div className={cx('relative w-full max-w-sm bg-surface/90 backdrop-blur-xl border border-line rounded-3xl shadow-pop p-7 login-card', shake && 'anim-shake', done && 'login-done')}>
        <div className="flex flex-col items-center text-center mb-6">
          <div className="logo-float"><Logo size={64} /></div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-4 login-stagger" style={{ animationDelay: '.15s' }}>{brand.name}</h1>
          <p className="text-sm text-ink-3 login-stagger" style={{ animationDelay: '.22s' }}>Најави се за да продолжиш.</p>
        </div>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="login-stagger" style={{ animationDelay: '.3s' }}>
            <Field label="Е-маил">
              <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input type="email" autoComplete="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
            </Field>
          </div>
          <div className="login-stagger" style={{ animationDelay: '.38s' }}>
            <Field label="Лозинка">
              <div className="relative"><KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input type="password" autoComplete="current-password" className="pl-9" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
            </Field>
          </div>
          {err && <p className="text-sm text-bad bg-bad-soft rounded-xl px-3 py-2 anim-pop">{err}</p>}
          <div className="login-stagger" style={{ animationDelay: '.46s' }}>
            <Button type="submit" variant="primary" size="lg" className="w-full login-btn" loading={busy}><LogIn size={18} /> {done ? 'Добредојде!' : 'Најави се'}</Button>
          </div>
        </form>
        <button onClick={disconnect} className="mt-5 w-full text-xs text-ink-3 hover:text-ink inline-flex items-center justify-center gap-1 login-stagger" style={{ animationDelay: '.55s' }}><HardDrive size={12} /> Работи локално без облак</button>
      </div>
    </div>
  )
}

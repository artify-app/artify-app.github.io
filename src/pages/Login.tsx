import { useState } from 'react'
import { LogIn, HardDrive } from 'lucide-react'
import { useStore } from '../lib/store'
import { Button, Card, Field, Input } from '../components/ui'
import { Logo } from '../components/Layout'

export default function Login() {
  const signIn = useStore((s) => s.signIn)
  const disconnect = useStore((s) => s.disconnectSupabase)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null)
    const r = await signIn(email.trim(), pw)
    if (r) setErr(/invalid/i.test(r) ? 'Погрешен е-маил или лозинка.' : r)
    setBusy(false)
  }
  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_60%)]">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6"><Logo size={56} /><h1 className="text-2xl font-extrabold tracking-tight mt-3">Добредојде назад</h1><p className="text-sm text-ink-3">Најави се за да ги видиш нарачките.</p></div>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field label="Е-маил"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
          <Field label="Лозинка"><Input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
          {err && <p className="text-sm text-bad bg-bad-soft rounded-xl px-3 py-2">{err}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}><LogIn size={18} /> Најави се</Button>
        </form>
        <button onClick={disconnect} className="mt-5 w-full text-xs text-ink-3 hover:text-ink inline-flex items-center justify-center gap-1"><HardDrive size={12} /> Работи локално без облак</button>
      </Card>
    </div>
  )
}

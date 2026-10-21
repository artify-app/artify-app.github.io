import { useEffect, useState, type ReactNode } from 'react'
import { Lock, Delete } from 'lucide-react'
import { isLocked, verifyPin, touch, hasPin, LOCK_AFTER_MS } from '../lib/pin'
import { Logo } from './Layout'
import { cx } from './ui'

export default function PinLock({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(isLocked)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (!hasPin()) return
    const onActivity = () => { if (!isLocked()) touch(); else setLocked(true) }
    const iv = setInterval(() => { if (isLocked()) setLocked(true) }, 30_000)
    const onVis = () => { if (document.visibilityState === 'visible' && isLocked()) setLocked(true) }
    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(iv); window.removeEventListener('pointerdown', onActivity); window.removeEventListener('keydown', onActivity); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  useEffect(() => {
    if (!locked || pin.length < 4) return
    void verifyPin(pin).then((ok) => {
      if (ok) { setLocked(false); setPin('') }
      else { setShake(true); setTimeout(() => { setShake(false); setPin('') }, 400) }
    })
  }, [pin, locked])

  useEffect(() => {
    if (!locked) return
    const h = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < 6 ? p + e.key : p))
      if (e.key === 'Backspace') setPin((p) => p.slice(0, -1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [locked])

  if (!locked) return <>{children}</>
  return (
    <div className="fixed inset-0 z-[80] bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center">
        <div className="flex justify-center mb-4"><Logo size={56} /></div>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center justify-center gap-2"><Lock size={18} /> Заклучено</h1>
        <p className="text-sm text-ink-3 mt-1 mb-6">Внеси PIN за да продолжиш.</p>
        <div className={cx('flex justify-center gap-3 mb-6', shake && 'animate-[shake_.4s]')}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={cx('w-4 h-4 rounded-full border-2 border-accent transition', pin.length > i && 'bg-accent')} />)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} /> : (
            <button key={i} onClick={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : setPin((p) => (p.length < 6 ? p + k : p)))} className="h-14 rounded-2xl bg-surface border border-line text-xl font-bold hover:bg-surface-2 active:scale-95 transition flex items-center justify-center">
              {k === 'del' ? <Delete size={20} /> : k}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ink-3 mt-6">Автоматски се заклучува по {LOCK_AFTER_MS / 60000} минути неактивност.</p>
      </div>
    </div>
  )
}

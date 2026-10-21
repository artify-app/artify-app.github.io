import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, AlertOctagon, Info, X, CheckCircle2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { computeAlerts, alertsSignature, wasSeenToday, markSeen, type Alert } from '../lib/alerts'
import { Button, Modal, cx } from './ui'

const toneCls: Record<Alert['tone'], string> = { bad: 'bg-bad-soft text-bad', warn: 'bg-warn-soft text-warn', info: 'bg-accent-soft text-accent' }
const ToneIcon = ({ tone, size = 16 }: { tone: Alert['tone']; size?: number }) => tone === 'bad' ? <AlertOctagon size={size} /> : tone === 'warn' ? <AlertTriangle size={size} /> : <Info size={size} />

function AlertRow({ a, onGo }: { a: Alert; onGo: (link: string) => void }) {
  return (
    <li className="flex gap-3 py-3">
      <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', toneCls[a.tone])}><ToneIcon tone={a.tone} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm leading-tight">{a.title}</p>
        <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">{a.text}</p>
        <button onClick={() => onGo(a.link)} className="text-xs font-bold text-accent mt-1 hover:underline">{a.linkLabel} →</button>
      </div>
    </li>
  )
}

/** Bell in the top bar + centre-screen popup on open when something needs attention. */
export default function Notifications() {
  const data = useStore((s) => s.data)
  const nav = useNavigate()
  const alerts = useMemo(() => computeAlerts(data), [data])
  const important = alerts.filter((a) => a.tone !== 'info')
  const [open, setOpen] = useState(false)
  const [popup, setPopup] = useState(false)
  const checked = useRef(false)
  const sig = alertsSignature(alerts)

  useEffect(() => {
    if (checked.current) return
    checked.current = true
    if (data.settings.alerts_popup !== false && important.length && !wasSeenToday(sig)) setPopup(true)
  }, [important.length, sig, data.settings.alerts_popup])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-notif]')) setOpen(false) }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [open])

  const go = (link: string) => { setOpen(false); setPopup(false); markSeen(sig); nav(link) }
  const closePopup = () => { markSeen(sig); setPopup(false) }

  return (
    <>
      <div className="relative" data-notif>
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Известувања" title="Известувања">
          <Bell size={18} />
          {important.length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-bad text-white text-[10px] font-extrabold flex items-center justify-center">{important.length}</span>}
        </Button>
        {open && (
          <div className="absolute right-0 top-11 w-[min(92vw,380px)] bg-surface border border-line rounded-2xl shadow-pop anim-pop z-50">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <p className="font-bold">Известувања</p>
              <button onClick={() => setOpen(false)} className="text-ink-3 hover:text-ink"><X size={16} /></button>
            </div>
            {alerts.length === 0 ? (
              <div className="px-4 pb-5 pt-3 text-center text-sm text-ink-3"><CheckCircle2 size={22} className="mx-auto mb-2 text-ok" />Сè е во ред — нема ништо за внимание.</div>
            ) : (
              <ul className="px-4 pb-2 divide-y divide-line/70 max-h-[70vh] overflow-y-auto">{alerts.map((a) => <AlertRow key={a.id} a={a} onGo={go} />)}</ul>
            )}
          </div>
        )}
      </div>

      <Modal open={popup} onClose={closePopup} title={<span className="flex items-center gap-2"><Bell size={18} className="text-accent" /> Потребно е внимание</span>} footer={<><Button onClick={closePopup}>Затвори</Button><Button variant="primary" onClick={() => go(important[0]?.link ?? '/')}>{important[0]?.linkLabel ?? 'Во ред'}</Button></>}>
        <ul className="divide-y divide-line/70 -mt-2">{important.map((a) => <AlertRow key={a.id} a={a} onGo={go} />)}</ul>
        <p className="text-[11px] text-ink-3 mt-3">Се прикажува еднаш дневно додека има промена. Може да се исклучи во Подесувања.</p>
      </Modal>
    </>
  )
}

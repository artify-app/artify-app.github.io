import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, PlusCircle, Users, Package, Boxes, BarChart3, Receipt, Briefcase, CalendarDays, Settings, Sun, Moon, Monitor, Menu, X, LogOut, Search, Cloud, HardDrive, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import { useTheme, applyAccent } from '../lib/theme'
import { useBrand } from '../lib/brand'
import { cx, Button } from './ui'

const NAV = [
  { to: '/', label: 'Преглед', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Нарачки', icon: ShoppingBag },
  { to: '/orders/new', label: 'Нова нарачка', icon: PlusCircle },
  { to: '/clients', label: 'Клиенти', icon: Users },
  { to: '/products', label: 'Продукти и трошоци', icon: Package },
  { to: '/inventory', label: 'Залиха', icon: Boxes },
  { to: '/statistics', label: 'Статистика', icon: BarChart3 },
  { to: '/expenses', label: 'Трошоци', icon: Receipt },
  { to: '/freelance', label: 'Freelance', icon: Briefcase },
  { to: '/calendar', label: 'Календар', icon: CalendarDays },
]

export function Logo({ size = 36 }: { size?: number }) {
  const { logo, name } = useBrand()
  if (logo) return <img src={logo} alt={name} style={{ height: size, maxWidth: size * 3 }} className="object-contain rounded-lg" />
  return (
    <span className="inline-flex items-center justify-center rounded-xl bg-accent text-white shadow-sm shadow-accent/40" style={{ width: size, height: size }}>
      <Sparkles size={size * 0.52} strokeWidth={2.4} />
    </span>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const settings = useStore((s) => s.data.settings)
  const mode = useStore((s) => s.mode)
  const signOut = useStore((s) => s.signOut)
  const { pref, setPref } = useTheme()
  const nav = useNavigate()
  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => { applyAccent(settings.accent) }, [settings.accent])

  const themeIcon = pref === 'dark' ? Moon : pref === 'light' ? Sun : Monitor
  const ThemeIcon = themeIcon
  const cycleTheme = () => setPref(pref === 'light' ? 'dark' : pref === 'dark' ? 'system' : 'light')

  const sidebar = (
    <aside className="flex flex-col h-full w-64 bg-surface border-r border-line print:hidden">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-line">
        <Logo />
        <div className="min-w-0">
          <p className="font-extrabold tracking-tight truncate">{settings.business_name || 'Artify'}</p>
          <p className="text-[11px] text-ink-3 flex items-center gap-1">{mode === 'supabase' ? <><Cloud size={11} /> Облак</> : <><HardDrive size={11} /> Локално</>}</p>
        </div>
        <button className="ml-auto lg:hidden text-ink-3" onClick={() => setOpen(false)} aria-label="Затвори мени"><X size={20} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-semibold transition', isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>
            <Icon size={18} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-line space-y-0.5">
        <NavLink to="/settings" className={({ isActive }) => cx('flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-semibold transition', isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>
          <Settings size={18} strokeWidth={2.2} /> Подесувања
        </NavLink>
        {mode === 'supabase' && (
          <button onClick={() => void signOut()} className="w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink transition">
            <LogOut size={18} strokeWidth={2.2} /> Одјави се
          </button>
        )}
      </div>
    </aside>
  )

  return (
    <div className="min-h-full flex">
      <div className="hidden lg:block print:hidden fixed inset-y-0 left-0 z-30">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 anim-fade-up">{sidebar}</div>
        </div>
      )}
      <div className="flex-1 lg:pl-64 print:pl-0 min-w-0 flex flex-col">
        <header className="print:hidden sticky top-0 z-20 h-16 flex items-center gap-2 px-4 sm:px-6 bg-bg/80 backdrop-blur border-b border-line/60">
          <button className="lg:hidden p-2 -ml-2 text-ink-2" onClick={() => setOpen(true)} aria-label="Мени"><Menu size={22} /></button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={cycleTheme} title={`Тема: ${pref === 'light' ? 'светла' : pref === 'dark' ? 'темна' : 'системска'}`} aria-label="Смени тема"><ThemeIcon size={18} /></Button>
            <div className="hidden sm:block"><Button variant="primary" size="sm" onClick={() => nav('/orders/new')}><PlusCircle size={16} /> Нова нарачка</Button></div>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1400px] w-full mx-auto anim-fade-up" key={loc.pathname}>
          <Outlet />
        </main>
      </div>
      <Toasts />
    </div>
  )
}

function GlobalSearch() {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  return (
    <form className="relative w-full max-w-md hidden sm:block" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { nav('/orders?q=' + encodeURIComponent(q.trim())); setQ('') } }}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Барај нарачка, клиент, број…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface border border-line text-sm placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
    </form>
  )
}

function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-[min(92vw,360px)]">
      {toasts.map((t) => (
        <div key={t.id} className={cx('anim-pop flex items-start gap-3 px-4 py-3 rounded-2xl shadow-pop border text-sm', t.kind === 'err' ? 'bg-bad-soft border-bad/30 text-bad' : 'bg-surface border-line text-ink')}>
          <span className="flex-1">{t.text}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}

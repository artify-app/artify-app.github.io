import { useEffect, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X, Inbox, Loader2 } from 'lucide-react'
import { createPortal } from 'react-dom'

export function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
export function Button({ variant = 'secondary', size = 'md', className, loading, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' | 'icon'; loading?: boolean }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-accent/60'
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-base', icon: 'h-8 w-8 text-sm' }
  const variants: Record<Variant, string> = {
    primary: 'bg-accent text-white hover:bg-accent-2 shadow-sm shadow-accent/30',
    secondary: 'bg-surface border border-line text-ink hover:bg-surface-2',
    ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
    danger: 'bg-bad-soft text-bad hover:brightness-95',
    soft: 'bg-accent-soft text-accent hover:brightness-95',
  }
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...rest}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Card({ className, children, title, action, subtitle }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <section className={cx('bg-surface border border-line rounded-2xl shadow-card', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            {title && <h2 className="font-bold text-base tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-ink-3 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cx(title || action ? 'px-5 pb-5' : 'p-5')}>{children}</div>
    </section>
  )
}

export function Field({ label, children, hint, className }: { label?: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="block text-xs font-semibold text-ink-2 mb-1.5">{label}</span>}
      {children}
      {hint && <span className="block text-[11px] text-ink-3 mt-1">{hint}</span>}
    </label>
  )
}

const inputBase = 'w-full h-10 px-3 rounded-xl bg-surface border border-line text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputBase, className)} {...rest} />
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputBase, 'h-auto min-h-20 py-2 resize-y', className)} {...rest} />
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputBase, 'appearance-none pr-8 bg-[length:16px] bg-[right_10px_center] bg-no-repeat', className)} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238b8ba3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")" }} {...rest}>{children}</select>
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-3 group">
      <span className={cx('relative inline-block w-10 h-6 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line')}>
        <span className={cx('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </span>
      {label && <span className="text-sm text-ink-2 group-hover:text-ink">{label}</span>}
    </button>
  )
}

export function Badge({ tone = 'neutral', children, className }: { tone?: 'ok' | 'warn' | 'bad' | 'neutral' | 'accent'; children: ReactNode; className?: string }) {
  const t = {
    ok: 'bg-ok-soft text-ok', warn: 'bg-warn-soft text-warn', bad: 'bg-bad-soft text-bad', neutral: 'bg-surface-2 text-ink-2 border border-line', accent: 'bg-accent-soft text-accent',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-bold tracking-wide', t, className)}>{children}</span>
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg', footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; width?: string; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className={cx('relative w-full bg-surface border border-line rounded-t-3xl sm:rounded-3xl shadow-pop anim-pop max-h-[92vh] flex flex-col', width)}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h3 className="font-bold text-lg tracking-tight">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Затвори го прозорецот"><X size={18} /></Button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto min-h-0">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, text, confirmLabel = 'Избриши', danger = true }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text?: string; confirmLabel?: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm" footer={<><Button onClick={onClose}>Откажи</Button><Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button></>}>
      <p className="text-sm text-ink-2">{text}</p>
    </Modal>
  )
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-ink-3 mb-3">{icon ?? <Inbox size={22} />}</div>
      <p className="font-bold">{title}</p>
      {text && <p className="text-sm text-ink-3 mt-1 max-w-xs">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, icon, hint, tone = 'accent', onClick }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; tone?: 'accent' | 'ok' | 'warn' | 'bad' | 'neutral'; onClick?: () => void }) {
  const t = { accent: 'bg-accent-soft text-accent', ok: 'bg-ok-soft text-ok', warn: 'bg-warn-soft text-warn', bad: 'bg-bad-soft text-bad', neutral: 'bg-surface-2 text-ink-2' }[tone]
  return (
    <div onClick={onClick} className={cx('bg-surface border border-line rounded-2xl shadow-card p-4 flex items-center gap-4', onClick && 'cursor-pointer hover:border-accent/50 transition')}>
      {icon && <div className={cx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', t)}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink-3 leading-tight">{label}</p>
        <p className="text-lg sm:text-xl font-extrabold tracking-tight num break-words">{value}</p>
        {hint && <p className="text-[11px] text-ink-3 mt-0.5">{hint}</p>}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-3 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-16 h-16 text-xl' }[size]
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  return <span className={cx('inline-flex items-center justify-center rounded-full font-extrabold shrink-0', s)} style={{ background: `hsl(${hue} 70% 90%)`, color: `hsl(${hue} 55% 35%)` }}>{ini || '?'}</span>
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto -mx-5', className)}>
      <table className="w-full text-sm min-w-[640px]">{children}</table>
    </div>
  )
}
export function Th({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return <th className={cx('text-[11px] uppercase tracking-wider font-bold text-ink-3 px-2.5 first:pl-4 last:pr-4 py-2.5 border-b border-line', right ? 'text-right' : 'text-left', className)}>{children}</th>
}
export function Td({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return <td className={cx('px-2.5 first:pl-4 last:pr-4 py-3 border-b border-line/70 align-middle', right && 'text-right num', className)}>{children}</td>
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm">
      <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Претходна</Button>
      <span className="text-ink-3">Страна {page} од {pages}</span>
      <Button size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Следна</Button>
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 text-ink-3 py-16"><Loader2 className="animate-spin" size={18} />{label}</div>
}

export function SegmentedControl<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex flex-wrap p-1 rounded-xl bg-surface-2 border border-line max-w-full">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cx('px-3 h-8 rounded-lg text-xs font-bold transition', value === o.value ? 'bg-surface shadow-card text-ink' : 'text-ink-3 hover:text-ink')}>{o.label}</button>
      ))}
    </div>
  )
}

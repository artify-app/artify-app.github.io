import { format, parseISO, isValid } from 'date-fns'
import { mk } from 'date-fns/locale'

export function money(n: number | null | undefined, currency = 'ден.'): string {
  return num(Number(n ?? 0)) + ' ' + currency
}

export function num(n: number): string {
  const v = Math.round(n)
  const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (v < 0 ? '−' : '') + s
}

export function fmtDate(d: string | null | undefined, pattern = 'd MMM yyyy'): string {
  if (!d) return '—'
  const p = parseISO(d)
  if (!isValid(p)) return d
  return format(p, pattern, { locale: mk })
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function monthKey(d: string): string {
  return d.slice(0, 7)
}

export function monthLabel(key: string): string {
  const p = parseISO(key + '-01')
  return format(p, 'MMM yy', { locale: mk })
}

export function pct(part: number, total: number): string {
  if (!total) return '0%'
  return (Math.round((part / total) * 1000) / 10).toString().replace('.', ',') + '%'
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function normName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { AppData } from './types'
import { money, num } from './format'

export type AlertTone = 'bad' | 'warn' | 'info'
export interface Alert { id: string; tone: AlertTone; title: string; text: string; link: string; linkLabel: string }

export const UNPAID_AFTER_DAYS = 7
export const DRAFT_AFTER_DAYS = 3

export function computeAlerts(data: AppData, now = new Date()): Alert[] {
  const out: Alert[] = []
  const cur = data.settings.currency
  const days = (d: string) => differenceInCalendarDays(now, parseISO(d))

  const tracked = data.inventory.filter((i) => i.tracked !== false)
  const outOf = tracked.filter((i) => i.quantity <= 0 && i.low_stock_threshold > 0)
  const low = tracked.filter((i) => i.quantity > 0 && i.quantity <= i.low_stock_threshold)
  if (outOf.length) out.push({ id: 'stock-out', tone: 'bad', title: `Нема залиха: ${outOf.length} ${outOf.length === 1 ? 'ставка' : 'ставки'}`, text: outOf.map((i) => i.name).join(', '), link: '/inventory', linkLabel: 'Отвори залиха' })
  if (low.length) out.push({ id: 'stock-low', tone: 'warn', title: `При крај на залиха: ${low.length} ${low.length === 1 ? 'ставка' : 'ставки'}`, text: low.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', '), link: '/inventory', linkLabel: 'Отвори залиха' })

  const unpaidOld = data.orders.filter((o) => o.status === 'active' && !o.paid && days(o.order_date) >= UNPAID_AFTER_DAYS)
  if (unpaidOld.length) {
    const sum = unpaidOld.reduce((s, o) => s + o.total_price, 0)
    out.push({ id: 'unpaid', tone: 'warn', title: `${unpaidOld.length} неплатени нарачки постари од ${UNPAID_AFTER_DAYS} дена`, text: `Вкупно ${money(sum, cur)}: ` + unpaidOld.slice(0, 4).map((o) => `${o.customer_name} (${days(o.order_date)} д.)`).join(', ') + (unpaidOld.length > 4 ? '…' : ''), link: '/orders?paid=unpaid', linkLabel: 'Види неплатени' })
  }

  const drafts = data.orders.filter((o) => o.status === 'draft' && days(o.created_at.slice(0, 10)) >= DRAFT_AFTER_DAYS)
  if (drafts.length) out.push({ id: 'drafts', tone: 'info', title: `${drafts.length} ${drafts.length === 1 ? 'нацрт чека' : 'нацрти чекаат'} да се довршат`, text: drafts.slice(0, 4).map((o) => o.customer_name || o.order_no).join(', '), link: '/orders?status=draft', linkLabel: 'Види нацрти' })

  const starred = data.orders.filter((o) => o.highlighted && o.status === 'active')
  if (starred.length) out.push({ id: 'starred', tone: 'info', title: `${starred.length} ${starred.length === 1 ? 'истакната нарачка' : 'истакнати нарачки'}`, text: starred.slice(0, 4).map((o) => `${o.customer_name} · ${o.order_no}`).join(', '), link: '/orders', linkLabel: 'Види нарачки' })

  const pendingFr = data.freelance.filter((f) => f.status === 'pending')
  if (pendingFr.length) {
    const sum = pendingFr.reduce((s, f) => s + f.amount, 0)
    out.push({ id: 'freelance', tone: 'warn', title: `Freelance: ${num(pendingFr.length)} ${pendingFr.length === 1 ? 'проект чека' : 'проекти чекаат'} наплата`, text: `${money(sum, cur)} — ` + pendingFr.slice(0, 3).map((f) => `${f.project} (${f.client})`).join(', '), link: '/freelance', linkLabel: 'Отвори freelance' })
  }
  return out
}

const SEEN_KEY = 'artify:alerts-seen'
export function alertsSignature(alerts: Alert[]): string {
  return new Date().toISOString().slice(0, 10) + '|' + alerts.filter((a) => a.tone !== 'info').map((a) => a.id + ':' + a.text).join(';')
}
export function wasSeenToday(sig: string): boolean {
  try { return localStorage.getItem(SEEN_KEY) === sig } catch { return false }
}
export function markSeen(sig: string) {
  try { localStorage.setItem(SEEN_KEY, sig) } catch { /* ignore */ }
}

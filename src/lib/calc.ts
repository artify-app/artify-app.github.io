import { addMonths, format, parseISO, subDays, subMonths, startOfMonth, isValid } from 'date-fns'
import type { AppData, Order, Product, OrderItem, FreelanceProject, Expense } from './types'
import { normName, monthKey, num } from './format'

export interface ClientSummary {
  name: string
  key: string
  orders: number
  total_spent: number
  net: number
  favorite_product: string
  last_order: string
  first_order: string
  unpaid: number
}

export function activeOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === 'active')
}

export function buildClients(orders: Order[]): ClientSummary[] {
  const map = new Map<string, ClientSummary & { products: Map<string, number> }>()
  for (const o of orders) {
    if (o.status === 'canceled') continue
    const key = normName(o.customer_name)
    if (!key) continue
    let c = map.get(key)
    if (!c) {
      c = { name: o.customer_name.trim(), key, orders: 0, total_spent: 0, net: 0, favorite_product: '', last_order: '', first_order: '9999', unpaid: 0, products: new Map<string, number>() }
      map.set(key, c)
    }
    c.orders++
    c.total_spent += o.total_price
    c.net += o.net_earnings
    if (!o.paid) c.unpaid += o.total_price
    if (o.order_date > c.last_order) { c.last_order = o.order_date; c.name = o.customer_name.trim() }
    if (o.order_date < c.first_order) c.first_order = o.order_date
    for (const it of o.items) c.products.set(it.product_name, (c.products.get(it.product_name) ?? 0) + it.quantity)
  }
  const out: ClientSummary[] = []
  for (const c of map.values()) {
    let best = ''
    let bestN = -1
    for (const [p, n] of c.products) if (n > bestN) { best = p; bestN = n }
    const { products: _p, ...rest } = c
    void _p
    out.push({ ...rest, favorite_product: best })
  }
  return out.sort((a, b) => b.total_spent - a.total_spent)
}

export function clientOrders(orders: Order[], name: string): Order[] {
  const key = normName(name)
  return orders.filter((o) => normName(o.customer_name) === key).sort((a, b) => (a.order_date < b.order_date ? 1 : -1))
}

export interface MonthStat { key: string; label: string; revenue: number; net: number; expenses: number; orders: number; freelance: number }

export function monthlyStats(data: AppData, months: number | 'all'): MonthStat[] {
  const now = new Date()
  const start = months === 'all' ? null : format(startOfMonth(subMonths(now, months - 1)), 'yyyy-MM')
  const map = new Map<string, MonthStat>()
  const ensure = (k: string) => {
    let m = map.get(k)
    if (!m) { m = { key: k, label: k, revenue: 0, net: 0, expenses: 0, orders: 0, freelance: 0 }; map.set(k, m) }
    return m
  }
  if (start && months !== 'all') {
    let d = parseISO(start + '-01')
    for (let i = 0; i < months; i++) { ensure(format(d, 'yyyy-MM')); d = addMonths(d, 1) }
  }
  for (const o of activeOrders(data.orders)) {
    const k = monthKey(o.order_date)
    if (start && k < start) continue
    const m = ensure(k); m.revenue += o.total_price; m.net += o.net_earnings; m.orders++
  }
  for (const e of data.expenses) {
    const k = monthKey(e.date)
    if (start && k < start) continue
    ensure(k).expenses += e.amount
  }
  for (const f of data.freelance) {
    if (!f.due_date || f.status !== 'paid') continue
    const k = monthKey(f.due_date)
    if (start && k < start) continue
    ensure(k).freelance += f.amount
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1))
}

export interface ProductStat { name: string; orders: number; qty: number; revenue: number; net: number; share: number }

export function productStats(orders: Order[], sinceISO?: string): ProductStat[] {
  const map = new Map<string, ProductStat>()
  let total = 0
  for (const o of activeOrders(orders)) {
    if (sinceISO && o.order_date < sinceISO) continue
    for (const it of o.items) {
      let p = map.get(it.product_name)
      if (!p) { p = { name: it.product_name, orders: 0, qty: 0, revenue: 0, net: 0, share: 0 }; map.set(it.product_name, p) }
      p.orders++; p.qty += it.quantity; p.revenue += it.unit_price * it.quantity; p.net += (it.unit_price - it.unit_cost) * it.quantity
      total++
    }
  }
  const out = [...map.values()].sort((a, b) => b.orders - a.orders)
  for (const p of out) p.share = total ? p.orders / total : 0
  return out
}

export function nextOrderNo(orders: Order[], date: string): string {
  // continue the sequence of the most recent orders (ignores odd historical numbers)
  const recent = [...orders].sort((a, b) => (a.order_date < b.order_date ? 1 : -1)).slice(0, 30)
  let max = 0
  for (const o of recent) {
    const m = /(\d+)$/.exec(o.order_no)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  const taken = new Set(orders.map((o) => o.order_no))
  let n = max + 1
  const mk = (x: number) => `ART-${date.slice(0, 4)}-${String(x).padStart(4, '0')}`
  while (taken.has(mk(n))) n++
  return mk(n)
}

export function computeTotals(items: OrderItem[], extras: { amount: number }[]) {
  const total_price = items.reduce((s, it) => s + it.unit_price * it.quantity, 0)
  const itemCost = items.reduce((s, it) => s + it.unit_cost * it.quantity, 0)
  const extraCost = extras.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const total_cost = itemCost + extraCost
  return { total_price, total_cost, net_earnings: total_price - total_cost }
}

export function itemCostFor(product: Product | undefined, variant: string): number {
  if (!product) return 0
  const fo = product.frame_options.find((f) => f.label === variant)
  return (product.static_cost || 0) + (fo?.cost ?? 0)
}

export interface Insight { title: string; text: string; tone: 'good' | 'warn' | 'info' }

export function insights(data: AppData): Insight[] {
  const out: Insight[] = []
  const orders = activeOrders(data.orders)
  if (!orders.length) return [{ title: 'Нема податоци', text: 'Внеси ја првата нарачка за да добиеш увиди.', tone: 'info' }]
  const now = new Date()
  const d30 = format(subDays(now, 30), 'yyyy-MM-dd')
  const d60 = format(subDays(now, 60), 'yyyy-MM-dd')
  const last30 = orders.filter((o) => o.order_date >= d30)
  const prev30 = orders.filter((o) => o.order_date >= d60 && o.order_date < d30)
  const rev30 = last30.reduce((s, o) => s + o.total_price, 0)
  const revPrev = prev30.reduce((s, o) => s + o.total_price, 0)
  if (revPrev > 0) {
    const diff = Math.round(((rev30 - revPrev) / revPrev) * 100)
    out.push(diff >= 0
      ? { title: `Приходот расте ${diff}%`, text: `Последните 30 дена имаш ${last30.length} нарачки, за ${diff}% повеќе приход од претходните 30.`, tone: 'good' }
      : { title: `Приходот падна ${Math.abs(diff)}%`, text: `Последните 30 дена: ${last30.length} нарачки. Размисли за кампања или потсетник до старите клиенти.`, tone: 'warn' })
  }
  const unpaid = orders.filter((o) => !o.paid)
  if (unpaid.length) {
    const sum = unpaid.reduce((s, o) => s + o.total_price, 0)
    out.push({ title: `${unpaid.length} неплатени нарачки`, text: `Вкупно ${num(sum)} ден. чека наплата. Провери ги на листата со нарачки.`, tone: 'warn' })
  }
  const ps = productStats(orders, d30)
  if (ps.length) {
    const top = ps[0]
    out.push({ title: `${top.name} е најбаран`, text: `${Math.round(top.share * 100)}% од нарачките во последните 30 дена. Фокусирај ја рекламата на него.`, tone: 'info' })
  }
  const clients = buildClients(orders)
  const returning = clients.filter((c) => c.orders >= 2).length
  if (clients.length) out.push({ title: `${Math.round((returning / clients.length) * 100)}% клиенти се враќаат`, text: `${returning} од ${clients.length} клиенти нарачале повеќе од еднаш. Лојалните клиенти се најевтина реклама.`, tone: 'good' })
  // seasonality: best month historically
  const byMonth = new Map<string, number>()
  for (const o of orders) { const m = o.order_date.slice(5, 7); byMonth.set(m, (byMonth.get(m) ?? 0) + 1) }
  let bestM = '', bestN = 0
  for (const [m, n] of byMonth) if (n > bestN) { bestM = m; bestN = n }
  const nextM = String(((now.getMonth() + 1) % 12) + 1).padStart(2, '0')
  const names = ['јануари', 'февруари', 'март', 'април', 'мај', 'јуни', 'јули', 'август', 'септември', 'октомври', 'ноември', 'декември']
  if (bestM === nextM) out.push({ title: `Сезона наскоро`, text: `${names[parseInt(bestM, 10) - 1]} историски е најсилниот месец (${bestN} нарачки). Подготви материјали и реклами на време.`, tone: 'info' })
  const low = data.inventory.filter((i) => i.quantity <= i.low_stock_threshold)
  if (low.length) out.push({ title: `${low.length} ставки при крај на залиха`, text: low.map((i) => i.name).slice(0, 4).join(', ') + (low.length > 4 ? '…' : ''), tone: 'warn' })
  return out.slice(0, 5)
}

export function freelanceTotals(fr: FreelanceProject[]) {
  const paid = fr.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const pending = fr.filter((f) => f.status === 'pending').reduce((s, f) => s + f.amount, 0)
  return { paid, pending }
}

export function expenseTotal(ex: Expense[]) {
  return ex.reduce((s, e) => s + e.amount, 0)
}

export function safeDate(d: string | null | undefined): Date | null {
  if (!d) return null
  const p = parseISO(d)
  return isValid(p) ? p : null
}

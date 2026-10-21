import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ShoppingBag, Briefcase, Receipt } from 'lucide-react'
import { addMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { mk } from 'date-fns/locale'
import { useStore } from '../lib/store'
import { money, fmtDate, num } from '../lib/format'
import { Card, Button, PageHeader, StatCard, Badge, cx } from '../components/ui'

export default function CalendarPage() {
  const data = useStore((s) => s.data)
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [sel, setSel] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const hide = data.settings.hide_financials
  const cur = data.settings.currency
  const m = (v: number) => (hide ? '•••' : money(v, cur))
  const mk_ = format(cursor, 'yyyy-MM')
  const events = useMemo(() => {
    const map = new Map<string, { orders: typeof data.orders; freelance: typeof data.freelance; expenses: typeof data.expenses }>()
    const ens = (d: string) => { let e = map.get(d); if (!e) { e = { orders: [], freelance: [], expenses: [] }; map.set(d, e) } return e }
    for (const o of data.orders) if (o.status !== 'canceled') ens(o.order_date).orders.push(o)
    for (const f of data.freelance) if (f.due_date) ens(f.due_date).freelance.push(f)
    for (const e of data.expenses) ens(e.date).expenses.push(e)
    return map
  }, [data])
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) })
  const monthOrders = data.orders.filter((o) => o.status === 'active' && o.order_date.startsWith(mk_))
  const monthFr = data.freelance.filter((f) => f.due_date?.startsWith(mk_))
  const monthNet = monthOrders.reduce((s, o) => s + o.net_earnings, 0) + monthFr.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const day = events.get(sel)

  return (
    <div className="space-y-4">
      <PageHeader title="Календар" subtitle="Нарачки, freelance и трошоци по денови" />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Нарачки во месецот" value={num(monthOrders.length)} icon={<ShoppingBag size={20} />} />
        <StatCard label="Freelance проекти" value={num(monthFr.length)} icon={<Briefcase size={20} />} tone="warn" />
        <StatCard label="Нето во месецот" value={m(monthNet)} tone="ok" />
      </div>
      <div className="grid lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, -1))}><ChevronLeft size={18} /></Button>
            <h2 className="font-extrabold text-lg capitalize">{format(cursor, 'LLLL yyyy', { locale: mk })}</h2>
            <div className="flex gap-1"><Button size="sm" onClick={() => { setCursor(startOfMonth(new Date())); setSel(format(new Date(), 'yyyy-MM-dd')) }}>Денес</Button><Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight size={18} /></Button></div>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-ink-3 uppercase tracking-wider mb-1">{['Пон', 'Вто', 'Сре', 'Чет', 'Пет', 'Саб', 'Нед'].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd'); const ev = events.get(key); const inM = isSameMonth(d, cursor)
              return (
                <button key={key} onClick={() => setSel(key)} className={cx('aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 text-sm transition border', sel === key ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface-2', !inM && 'opacity-35', isToday(d) && 'font-extrabold text-accent')}>
                  {format(d, 'd')}
                  <span className="flex gap-0.5 mt-1">
                    {ev?.orders.length ? <span className="w-1.5 h-1.5 rounded-full bg-accent" /> : null}
                    {ev?.freelance.length ? <span className="w-1.5 h-1.5 rounded-full bg-warn" /> : null}
                    {ev?.expenses.length ? <span className="w-1.5 h-1.5 rounded-full bg-bad" /> : null}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[11px] text-ink-3"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> нарачки</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warn" /> freelance</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-bad" /> трошоци</span></div>
        </Card>
        <Card className="lg:col-span-2" title={fmtDate(sel, 'EEEE, d MMMM yyyy')}>
          {!day || (!day.orders.length && !day.freelance.length && !day.expenses.length) ? <p className="text-sm text-ink-3 py-8 text-center">Нема настани на овој ден.</p> : (
            <ul className="space-y-2">
              {day.orders.map((o) => <li key={o.id}><Link to={`/orders/${o.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-line hover:border-accent transition"><ShoppingBag size={16} className="text-accent shrink-0" /><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{o.customer_name}</p><p className="text-xs text-ink-3 truncate">{o.order_no} · {o.items.map((i) => i.product_name).join(', ')}</p></div><div className="text-right"><p className="font-bold text-sm num">{m(o.total_price)}</p><Badge tone={o.paid ? 'ok' : 'warn'}>{o.paid ? 'Платено' : 'Неплатено'}</Badge></div></Link></li>)}
              {day.freelance.map((f) => <li key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-line"><Briefcase size={16} className="text-warn shrink-0" /><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{f.project}</p><p className="text-xs text-ink-3">{f.client}</p></div><p className="font-bold text-sm num">{m(f.amount)}</p></li>)}
              {day.expenses.map((e) => <li key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-line"><Receipt size={16} className="text-bad shrink-0" /><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{e.description}</p><p className="text-xs text-ink-3">{e.category}</p></div><p className="font-bold text-sm num text-bad">− {m(e.amount)}</p></li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

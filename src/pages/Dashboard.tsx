import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Clock, CalendarDays, Eye, EyeOff, PlusCircle, ArrowRight, TrendingUp, AlertTriangle, Lightbulb, ThumbsUp, Wallet } from 'lucide-react'
import { useStore } from '../lib/store'
import { activeOrders, insights, productStats } from '../lib/calc'
import { money, fmtDate, pct, num } from '../lib/format'
import { Card, StatCard, Button, Badge, Avatar, SegmentedControl, EmptyState } from '../components/ui'
import { format, subDays, startOfMonth, subMonths, endOfMonth } from 'date-fns'

type Range = 'all' | '30' | '7' | 'month' | 'lastmonth'

export default function Dashboard() {
  const data = useStore((s) => s.data)
  const saveSettings = useStore((s) => s.saveSettings)
  const nav = useNavigate()
  const hide = data.settings.hide_financials
  const widgets = data.settings.dashboard_widgets
  const orders = useMemo(() => activeOrders(data.orders), [data.orders])
  const unpaid = orders.filter((o) => !o.paid)
  const thisMonth = format(new Date(), 'yyyy-MM')
  const monthOrders = orders.filter((o) => o.order_date.startsWith(thisMonth))
  const monthRevenue = monthOrders.reduce((s, o) => s + o.total_price, 0)
  const monthNet = monthOrders.reduce((s, o) => s + o.net_earnings, 0)
  const recent = useMemo(() => [...orders].sort((a, b) => (a.order_date < b.order_date ? 1 : a.order_date > b.order_date ? -1 : b.order_no.localeCompare(a.order_no))).slice(0, 6), [orders])
  const ins = useMemo(() => insights(data), [data])
  const [range, setRange] = useState<Range>('all')
  const prodStats = useMemo(() => {
    const now = new Date()
    const since = range === '30' ? format(subDays(now, 30), 'yyyy-MM-dd') : range === '7' ? format(subDays(now, 7), 'yyyy-MM-dd') : range === 'month' ? thisMonth + '-01' : range === 'lastmonth' ? format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd') : undefined
    let list = productStats(orders, since)
    if (range === 'lastmonth') {
      const end = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
      list = productStats(orders.filter((o) => o.order_date <= end), since)
    }
    return list
  }, [orders, range, thisMonth])
  const m = (v: number) => (hide ? '•••••' : money(v, data.settings.currency))
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Добро утро' : hour < 18 ? 'Добар ден' : 'Добра вечер'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{greet} 👋</h1>
          <p className="text-sm text-ink-3 mt-1">Преглед на {data.settings.business_name || 'бизнисот'} — {fmtDate(format(new Date(), 'yyyy-MM-dd'), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void saveSettings({ hide_financials: !hide })}>{hide ? <Eye size={16} /> : <EyeOff size={16} />}{hide ? 'Прикажи суми' : 'Сокриј суми'}</Button>
          <Button variant="primary" onClick={() => nav('/orders/new')}><PlusCircle size={16} /> Нова нарачка</Button>
        </div>
      </div>

      {widgets.includes('stats') && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard label="Активни нарачки" value={num(orders.length)} icon={<ShoppingBag size={20} />} onClick={() => nav('/orders')} />
          <StatCard label="Неплатени" value={num(unpaid.length)} hint={unpaid.length ? m(unpaid.reduce((s, o) => s + o.total_price, 0)) : 'сè е наплатено'} icon={<Clock size={20} />} tone={unpaid.length ? 'warn' : 'ok'} onClick={() => nav('/orders?paid=unpaid')} />
          <StatCard label="Нарачки овој месец" value={num(monthOrders.length)} hint={'приход ' + m(monthRevenue)} icon={<CalendarDays size={20} />} tone="accent" />
          <StatCard label="Нето овој месец" value={m(monthNet)} icon={<Wallet size={20} />} tone="ok" hint={monthRevenue ? `маржа ${pct(monthNet, monthRevenue)}` : undefined} />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        {widgets.includes('recent_orders') && (
          <Card className="lg:col-span-3" title="Последни нарачки" action={<Link to="/orders"><Button variant="ghost" size="sm">Сите <ArrowRight size={14} /></Button></Link>}>
            {recent.length === 0 ? <EmptyState title="Сè уште нема нарачки" action={<Button variant="primary" onClick={() => nav('/orders/new')}>Нова нарачка</Button>} /> : (
              <ul className="divide-y divide-line/70 -mx-5">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link to={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition">
                      <Avatar name={o.customer_name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{o.customer_name}</p>
                        <p className="text-xs text-ink-3 truncate">{o.items.map((i) => i.product_name + (i.variant ? ` · ${i.variant}` : '')).join(', ') || '—'} · {fmtDate(o.order_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold num">{m(o.total_price)}</p>
                        <Badge tone={o.paid ? 'ok' : 'warn'}>{o.paid ? 'Платено' : 'Неплатено'}</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {widgets.includes('insights') && (
          <Card className="lg:col-span-2" title="Увиди" subtitle="Автоматски заклучоци од твоите податоци">
            <ul className="space-y-3">
              {ins.map((i, idx) => {
                const Icon = i.tone === 'good' ? ThumbsUp : i.tone === 'warn' ? AlertTriangle : Lightbulb
                const tone = i.tone === 'good' ? 'bg-ok-soft text-ok' : i.tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent'
                return (
                  <li key={idx} className="flex gap-3">
                    <span className={'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ' + tone}><Icon size={16} /></span>
                    <div><p className="font-bold text-sm">{i.title}</p><p className="text-xs text-ink-2 leading-relaxed">{i.text}</p></div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>

      {widgets.includes('products') && (
        <Card title="Продукти" subtitle="Удел во нарачките" action={
          <SegmentedControl value={range} onChange={setRange} options={[{ value: 'all', label: 'Сè' }, { value: '30', label: '30 дена' }, { value: '7', label: '7 дена' }, { value: 'month', label: 'Овој месец' }, { value: 'lastmonth', label: 'Минат месец' }]} />
        }>
          {prodStats.length === 0 ? <p className="text-sm text-ink-3">Нема нарачки во периодот.</p> : (
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              {prodStats.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold truncate flex items-center gap-2"><TrendingUp size={14} className="text-ink-3" />{p.name}</span>
                    <span className="text-ink-3 text-xs num">{p.orders} нар. · {pct(p.share, 1)}{!hide && ` · ${money(p.revenue, data.settings.currency)}`}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, p.share * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

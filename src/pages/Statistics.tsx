import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Eye, EyeOff, Briefcase, TrendingUp, Wallet, Receipt } from 'lucide-react'
import { useStore } from '../lib/store'
import { monthlyStats, productStats, buildClients, activeOrders, freelanceTotals, expenseTotal } from '../lib/calc'
import { money, monthLabel, num, pct } from '../lib/format'
import { Card, Button, SegmentedControl, StatCard, Table, Th, Td, PageHeader } from '../components/ui'

type Period = '3' | '6' | '12' | 'year' | 'all'
const COLORS = ['var(--accent)', '#2cbfa9', '#f2a63a', '#f0605d', '#5d8dff', '#d6336c', '#8b8ba3', '#7cc06f']

export default function Statistics() {
  const data = useStore((s) => s.data)
  const saveSettings = useStore((s) => s.saveSettings)
  const [period, setPeriod] = useState<Period>('12')
  const hide = data.settings.hide_financials
  const cur = data.settings.currency
  const m = (v: number) => (hide ? '•••' : money(v, cur))
  const months = useMemo(() => {
    if (period === 'all') return monthlyStats(data, 'all')
    if (period === 'year') return monthlyStats(data, new Date().getMonth() + 1)
    return monthlyStats(data, parseInt(period, 10))
  }, [data, period])
  const since = months[0]?.key ? months[0].key + '-01' : undefined
  const orders = useMemo(() => activeOrders(data.orders).filter((o) => !since || o.order_date >= since), [data.orders, since])
  const prods = useMemo(() => productStats(orders), [orders])
  const totRev = months.reduce((s, x) => s + x.revenue, 0)
  const totNet = months.reduce((s, x) => s + x.net, 0)
  const totExp = months.reduce((s, x) => s + x.expenses, 0)
  const totOrders = months.reduce((s, x) => s + x.orders, 0)
  const chartData = months.map((x) => ({ ...x, label: monthLabel(x.key) }))
  const fr = freelanceTotals(data.freelance)
  const topClients = useMemo(() => buildClients(orders).slice(0, 8), [orders])
  const years = useMemo(() => {
    const map = new Map<string, { year: string; orders: number; revenue: number; net: number; expenses: number; freelance: number }>()
    const ens = (y: string) => { let r = map.get(y); if (!r) { r = { year: y, orders: 0, revenue: 0, net: 0, expenses: 0, freelance: 0 }; map.set(y, r) } return r }
    for (const o of activeOrders(data.orders)) { const r = ens(o.order_date.slice(0, 4)); r.orders++; r.revenue += o.total_price; r.net += o.net_earnings }
    for (const e of data.expenses) ens(e.date.slice(0, 4)).expenses += e.amount
    for (const f of data.freelance) if (f.due_date && f.status === 'paid') ens(f.due_date.slice(0, 4)).freelance += f.amount
    return [...map.values()].sort((a, b) => b.year.localeCompare(a.year))
  }, [data])
  const fmtAxis = (v: number) => (hide ? '' : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))
  const tip = (v: number | string | undefined) => (hide ? '•••' : money(Number(v ?? 0), cur))

  return (
    <div className="space-y-5">
      <PageHeader title="Статистика" subtitle="Приход, профит и трошоци низ време" actions={<>
        <SegmentedControl value={period} onChange={setPeriod} options={[{ value: '3', label: '3 мес.' }, { value: '6', label: '6 мес.' }, { value: '12', label: '12 мес.' }, { value: 'year', label: 'Оваа година' }, { value: 'all', label: 'Сè' }]} />
        <Button onClick={() => void saveSettings({ hide_financials: !hide })}>{hide ? <Eye size={16} /> : <EyeOff size={16} />}</Button>
      </>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Приход" value={m(totRev)} hint={`${num(totOrders)} нарачки`} icon={<TrendingUp size={20} />} />
        <StatCard label="Нето заработка" value={m(totNet)} hint={totRev ? `маржа ${pct(totNet, totRev)}` : undefined} icon={<Wallet size={20} />} tone="ok" />
        <StatCard label="Трошоци (реклама и др.)" value={m(totExp)} icon={<Receipt size={20} />} tone="bad" />
        <StatCard label="Профит после трошоци" value={m(totNet - totExp)} icon={<Wallet size={20} />} tone={totNet - totExp >= 0 ? 'ok' : 'bad'} hint="нето − трошоци" />
      </div>

      <Card title="Месечни резултати" subtitle="Приход, нето заработка и трошоци по месец">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chartData} barGap={2} barCategoryGap="28%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={40} />
              <Tooltip formatter={(v) => tip(v as number)} cursor={{ fill: 'var(--surface-2)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Приход" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="net" name="Нето" fill="#2cbfa9" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Трошоци" fill="#f0605d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Број на нарачки" subtitle="Тренд по месец">
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" name="Нарачки" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Приход по продукт" subtitle="За избраниот период">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={prods.slice(0, 8)} dataKey="revenue" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
                    {prods.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => tip(v as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 min-w-0 w-full space-y-1.5 text-sm">
              {prods.slice(0, 8).map((p, i) => (
                <li key={p.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="truncate flex-1">{p.name}</span>
                  <span className="text-ink-3 text-xs num">{p.orders} · {pct(p.revenue, totRev || 1)}</span>
                  <span className="font-bold num text-right whitespace-nowrap">{m(p.revenue)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Топ клиенти" subtitle="Во избраниот период">
          <ul className="divide-y divide-line/70">
            {topClients.map((c, i) => (
              <li key={c.key} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-surface-2 text-ink-3 text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <Link to={`/clients/${encodeURIComponent(c.name)}`} className="font-semibold truncate flex-1 hover:text-accent">{c.name}</Link>
                <span className="text-ink-3 text-xs num whitespace-nowrap">{c.orders} нар.</span>
                <span className="font-bold num whitespace-nowrap">{m(c.total_spent)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={<span className="flex items-center gap-2"><Briefcase size={16} className="text-accent" /> Freelance</span>} subtitle="Одвоено од продажбата на продукти">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Наплатено" value={m(fr.paid)} tone="ok" />
            <StatCard label="Во очекување" value={m(fr.pending)} tone="warn" />
          </div>
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={40} />
                <Tooltip formatter={(v) => tip(v as number)} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="freelance" name="Freelance" fill="#5d8dff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="По години" subtitle="Целосна слика откако работиш">
        <Table>
          <thead><tr><Th>Година</Th><Th right>Нарачки</Th><Th right>Приход</Th><Th right>Нето</Th><Th right>Трошоци</Th><Th right>Freelance</Th><Th right>Вкупно профит</Th></tr></thead>
          <tbody>{years.map((y) => <tr key={y.year}><Td className="font-bold">{y.year}</Td><Td right>{num(y.orders)}</Td><Td right>{m(y.revenue)}</Td><Td right className="text-ok font-semibold">{m(y.net)}</Td><Td right className="text-bad">{m(y.expenses)}</Td><Td right>{m(y.freelance)}</Td><Td right className="font-extrabold">{m(y.net - y.expenses + y.freelance)}</Td></tr>)}</tbody>
        </Table>
        <p className="text-[11px] text-ink-3 mt-2">Вкупно профит = нето од нарачки − трошоци + freelance. Збирно за цел период: {m(expenseTotal(data.expenses))} трошоци.</p>
      </Card>
    </div>
  )
}

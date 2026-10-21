import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Users, ShoppingBag, Repeat, ArrowUpDown } from 'lucide-react'
import { useStore } from '../lib/store'
import { buildClients } from '../lib/calc'
import { money, fmtDate, normName, num } from '../lib/format'
import { Card, Input, Table, Th, Td, Pagination, PageHeader, Avatar, StatCard, EmptyState, Select } from '../components/ui'

const PAGE = 25
type Sort = 'spent' | 'orders' | 'last' | 'name'

export default function Clients() {
  const data = useStore((s) => s.data)
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
  const [sort, setSort] = useState<Sort>('spent')
  const hide = data.settings.hide_financials
  const m = (v: number) => (hide ? '•••••' : money(v, data.settings.currency))
  const clients = useMemo(() => buildClients(data.orders), [data.orders])
  const filtered = useMemo(() => {
    const qq = normName(q)
    const list = clients.filter((c) => !qq || c.key.includes(qq))
    return list.sort((a, b) => sort === 'spent' ? b.total_spent - a.total_spent : sort === 'orders' ? b.orders - a.orders : sort === 'last' ? (a.last_order < b.last_order ? 1 : -1) : a.name.localeCompare(b.name, 'mk'))
  }, [clients, q, sort])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE)
  const returning = clients.filter((c) => c.orders > 1).length
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }) }

  return (
    <div>
      <PageHeader title="Клиенти" subtitle="Автоматски се градат од нарачките — ист клиент = исто име." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Вкупно клиенти" value={num(clients.length)} icon={<Users size={20} />} />
        <StatCard label="Вкупно нарачки" value={num(data.orders.filter((o) => o.status !== 'canceled').length)} icon={<ShoppingBag size={20} />} tone="ok" />
        <StatCard label="Се враќаат" value={num(returning)} hint={clients.length ? `${Math.round((returning / clients.length) * 100)}% од клиентите` : undefined} icon={<Repeat size={20} />} tone="warn" />
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <Input className="pl-9" placeholder="Барај клиент…" value={q} onChange={(e) => setParam('q', e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-sm text-ink-3"><ArrowUpDown size={14} />
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-44"><option value="spent">Најмногу потрошиле</option><option value="orders">Најмногу нарачки</option><option value="last">Последна нарачка</option><option value="name">По име</option></Select>
          </div>
        </div>
        {rows.length === 0 ? <EmptyState title="Нема клиенти" text="Клиентите се појавуваат штом ќе внесеш нарачка." /> : (
          <Table>
            <thead><tr><Th>Клиент</Th><Th right>Нарачки</Th><Th right>Потрошено</Th><Th right>Нето</Th><Th>Омилен продукт</Th><Th>Последна нарачка</Th><Th>Неплатено</Th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.key} className="hover:bg-surface-2/60 transition">
                  <Td><Link to={`/clients/${encodeURIComponent(c.name)}`} className="flex items-center gap-3 font-semibold hover:text-accent"><Avatar name={c.name} />{c.name}</Link></Td>
                  <Td right className="font-bold">{c.orders}</Td>
                  <Td right className="font-bold">{m(c.total_spent)}</Td>
                  <Td right className="text-ok">{m(c.net)}</Td>
                  <Td className="text-ink-2">{c.favorite_product}</Td>
                  <Td className="text-ink-2 whitespace-nowrap">{fmtDate(c.last_order)}</Td>
                  <Td>{c.unpaid ? <span className="text-warn font-bold num">{m(c.unpaid)}</span> : <span className="text-ink-3">—</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pages={pages} onChange={(p) => setParam('page', String(p))} />
      </Card>
    </div>
  )
}

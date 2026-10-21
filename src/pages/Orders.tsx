import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Upload, PlusCircle, Star, Pencil, Trash2, Search, CheckCircle2, XCircle, Filter } from 'lucide-react'
import { useStore } from '../lib/store'
import { money, fmtDate, normName } from '../lib/format'
import { ordersToCsv, parseOrdersCsv, downloadText, readFileText } from '../lib/csv'
import { Button, Card, Input, Select, Badge, Table, Th, Td, Pagination, PageHeader, ConfirmModal, EmptyState, Avatar, Modal, cx } from '../components/ui'
import type { Order } from '../lib/types'

const PAGE = 50

export default function Orders() {
  const { data, upsert, remove, bulkUpsert, toast } = useStore()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const product = sp.get('product') ?? ''
  const status = sp.get('status') ?? ''
  const paid = sp.get('paid') ?? ''
  const range = sp.get('range') ?? ''
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }) }
  const hide = data.settings.hide_financials
  const m = (v: number) => (hide ? '•••••' : money(v, data.settings.currency))

  const filtered = useMemo(() => {
    const now = new Date()
    let since = ''
    if (range === '7' || range === '30' || range === '90') { const d = new Date(now); d.setDate(d.getDate() - parseInt(range, 10)); since = d.toISOString().slice(0, 10) }
    if (range === 'month') since = now.toISOString().slice(0, 7) + '-01'
    if (range === 'year') since = now.getFullYear() + '-01-01'
    const qq = normName(q)
    return data.orders
      .filter((o) => (!qq || normName(o.customer_name).includes(qq) || o.order_no.toLowerCase().includes(qq) || o.items.some((i) => i.product_name.toLowerCase().includes(qq)) || o.notes.toLowerCase().includes(qq))
        && (!product || o.items.some((i) => i.product_name === product))
        && (!status || o.status === status)
        && (!paid || (paid === 'paid' ? o.paid : !o.paid))
        && (!since || o.order_date >= since))
      .sort((a, b) => (a.highlighted !== b.highlighted ? (a.highlighted ? -1 : 1) : a.order_date < b.order_date ? 1 : a.order_date > b.order_date ? -1 : b.order_no.localeCompare(a.order_no)))
  }, [data.orders, q, product, status, paid, range])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE)
  const productNames = useMemo(() => [...new Set(data.orders.flatMap((o) => o.items.map((i) => i.product_name)))].sort(), [data.orders])

  const [sel, setSel] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allSel = rows.length > 0 && rows.every((r) => sel.has(r.id))
  const [del, setDel] = useState<Order | null>(null)
  const [bulkDel, setBulkDel] = useState(false)
  const [importing, setImporting] = useState<{ orders: Order[]; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sumPrice = filtered.reduce((s, o) => s + (o.status === 'active' ? o.total_price : 0), 0)
  const sumNet = filtered.reduce((s, o) => s + (o.status === 'active' ? o.net_earnings : 0), 0)

  const bulkPaid = async (v: boolean) => {
    const list = data.orders.filter((o) => sel.has(o.id)).map((o) => ({ ...o, paid: v, updated_at: new Date().toISOString() }))
    await bulkUpsert('orders', list); setSel(new Set()); toast(`${list.length} нарачки означени како ${v ? 'платени' : 'неплатени'}`)
  }

  const onImportFile = async (f: File) => {
    try {
      const text = await readFileText(f)
      setImporting(parseOrdersCsv(text, data.products, data.orders))
    } catch (e) { toast('Не можам да го прочитам фајлот: ' + String(e), 'err') }
  }

  return (
    <div>
      <PageHeader title="Нарачки" subtitle={`${filtered.length} нарачки · приход ${m(sumPrice)} · нето ${m(sumNet)}`} actions={<>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); e.target.value = '' }} />
        <Button onClick={() => fileRef.current?.click()}><Upload size={16} /> Увези CSV</Button>
        <Button onClick={() => downloadText(`artify-naracki-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(filtered), 'text/csv')}><Download size={16} /> Извези CSV</Button>
        <Button variant="primary" onClick={() => nav('/orders/new')}><PlusCircle size={16} /> Нова нарачка</Button>
      </>} />

      <Card className="mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <Input className="pl-9" placeholder="Клиент, број на нарачка, продукт, белешка…" value={q} onChange={(e) => setParam('q', e.target.value)} />
          </div>
          <Select value={product} onChange={(e) => setParam('product', e.target.value)}><option value="">Сите продукти</option>{productNames.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
          <Select value={paid} onChange={(e) => setParam('paid', e.target.value)}><option value="">Платени и неплатени</option><option value="paid">Само платени</option><option value="unpaid">Само неплатени</option></Select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
            <Select value={status} onChange={(e) => setParam('status', e.target.value)}><option value="">Сите статуси</option><option value="active">Активни</option><option value="draft">Нацрти</option><option value="canceled">Откажани</option></Select>
            <Select value={range} onChange={(e) => setParam('range', e.target.value)}><option value="">Цел период</option><option value="7">7 дена</option><option value="30">30 дена</option><option value="90">90 дена</option><option value="month">Овој месец</option><option value="year">Оваа година</option></Select>
          </div>
        </div>
        {(q || product || paid || status || range) && <button className="mt-3 text-xs text-accent font-semibold inline-flex items-center gap-1" onClick={() => setSp({}, { replace: true })}><Filter size={12} /> Исчисти филтри</button>}
      </Card>

      {sel.size > 0 && (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent text-white shadow-pop anim-pop">
          <span className="text-sm font-bold">{sel.size} избрани</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" className="bg-white/15 border-white/20 text-white hover:bg-white/25" onClick={() => void bulkPaid(true)}><CheckCircle2 size={14} /> Платено</Button>
            <Button size="sm" className="bg-white/15 border-white/20 text-white hover:bg-white/25" onClick={() => void bulkPaid(false)}><XCircle size={14} /> Неплатено</Button>
            <Button size="sm" className="bg-white/15 border-white/20 text-white hover:bg-white/25" onClick={() => setBulkDel(true)}><Trash2 size={14} /> Избриши</Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={() => setSel(new Set())}>Откажи</Button>
          </div>
        </div>
      )}

      <Card>
        {rows.length === 0 ? <EmptyState title="Нема нарачки" text={q || product || paid || status || range ? 'Пробај со други филтри.' : 'Додај ја првата нарачка.'} action={<Button variant="primary" onClick={() => nav('/orders/new')}>Нова нарачка</Button>} /> : (
          <Table>
            <thead><tr>
              <Th className="w-8"><input type="checkbox" className="accent-accent" checked={allSel} onChange={() => setSel((s) => { const n = new Set(s); if (allSel) rows.forEach((r) => n.delete(r.id)); else rows.forEach((r) => n.add(r.id)); return n })} /></Th>
              <Th>Нарачка</Th><Th>Клиент</Th><Th>Датум</Th><Th>Продукт</Th><Th right>Цена</Th><Th right className="hidden xl:table-cell">Нето</Th><Th>Статус</Th><Th right>Акции</Th>
            </tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className={cx('hover:bg-surface-2/60 transition', o.highlighted && 'bg-warn-soft/40', o.status === 'canceled' && 'opacity-60')}>
                  <Td><input type="checkbox" className="accent-accent" checked={sel.has(o.id)} onChange={() => toggle(o.id)} /></Td>
                  <Td className="whitespace-nowrap"><Link to={`/orders/${o.id}`} className="font-mono text-xs font-bold text-ink-2 hover:text-accent">{o.order_no}</Link></Td>
                  <Td><Link to={`/clients/${encodeURIComponent(o.customer_name)}`} className="flex items-center gap-2 font-semibold hover:text-accent"><Avatar name={o.customer_name} size="sm" /><span className="truncate max-w-[150px]">{o.customer_name}</span></Link></Td>
                  <Td className="whitespace-nowrap text-ink-2 text-xs">{fmtDate(o.order_date)}</Td>
                  <Td><span className="block truncate max-w-[170px]">{o.items.map((i) => i.product_name + (i.variant ? ` (${i.variant})` : '') + (i.quantity > 1 ? ` ×${i.quantity}` : '')).join(', ') || '—'}</span></Td>
                  <Td right className="font-bold whitespace-nowrap">{m(o.total_price)}</Td>
                  <Td right className="text-ok font-semibold whitespace-nowrap hidden xl:table-cell">{m(o.net_earnings)}</Td>
                  <Td className="whitespace-nowrap"><button onClick={() => void upsert('orders', { ...o, paid: !o.paid, updated_at: new Date().toISOString() })} title="Кликни за промена"><Badge tone={o.paid ? 'ok' : 'warn'}>{o.paid ? 'Платено' : 'Неплатено'}</Badge></button>{o.status !== 'active' && <Badge className="ml-1" tone={o.status === 'draft' ? 'neutral' : 'bad'}>{o.status === 'draft' ? 'Нацрт' : 'Откажана'}</Badge>}</Td>
                  <Td right>
                    <div className="inline-flex items-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Истакни" onClick={() => void upsert('orders', { ...o, highlighted: !o.highlighted })}><Star size={16} className={o.highlighted ? 'fill-warn text-warn' : ''} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Уреди" onClick={() => nav(`/orders/${o.id}`)}><Pencil size={16} /></Button>
                      <Button variant="ghost" size="icon" title="Избриши" className="h-7 w-7 hover:text-bad" onClick={() => setDel(o)}><Trash2 size={16} /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pages={pages} onChange={(p) => setParam('page', String(p))} />
      </Card>

      <ConfirmModal open={!!del} onClose={() => setDel(null)} title="Избриши нарачка?" text={del ? `${del.order_no} · ${del.customer_name} · ${money(del.total_price)}` : ''} onConfirm={() => { if (del) { void remove('orders', del.id); toast('Нарачката е избришана') } }} />
      <ConfirmModal open={bulkDel} onClose={() => setBulkDel(false)} title={`Избриши ${sel.size} нарачки?`} text="Оваа акција не може да се врати." onConfirm={() => { for (const id of sel) void remove('orders', id); setSel(new Set()); toast('Нарачките се избришани') }} />

      <Modal open={!!importing} onClose={() => setImporting(null)} title="Увоз од CSV" footer={<><Button onClick={() => setImporting(null)}>Откажи</Button><Button variant="primary" disabled={!importing?.orders.length} onClick={async () => { if (!importing) return; await bulkUpsert('orders', importing.orders); toast(`Увезени ${importing.orders.length} нарачки`); setImporting(null) }}>Увези {importing?.orders.length ?? 0} нарачки</Button></>}>
        {importing && (
          <div className="text-sm space-y-2">
            <p>Пронајдени <b>{importing.orders.length}</b> нарачки{importing.skipped ? `, прескокнати ${importing.skipped} редови без име или датум` : ''}.</p>
            <p className="text-ink-3 text-xs">Поддржани се извозот од старата (base44) апликација и извозот од оваа. Нарачките добиваат нови броеви ако веќе постои ист број.</p>
            {importing.errors.length > 0 && <ul className="text-bad text-xs list-disc pl-4">{importing.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
          </div>
        )}
      </Modal>
    </div>
  )
}

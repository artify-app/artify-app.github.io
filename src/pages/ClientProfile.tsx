import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PlusCircle, Save, Pencil } from 'lucide-react'
import { useStore, uid } from '../lib/store'
import { clientOrders } from '../lib/calc'
import { money, fmtDate, normName, num } from '../lib/format'
import { Button, Card, Textarea, Badge, Table, Th, Td, StatCard, Avatar, Modal, Input, Field } from '../components/ui'

export default function ClientProfile() {
  const { name = '' } = useParams()
  const nav = useNavigate()
  const { data, upsert, bulkUpsert, toast } = useStore()
  const decoded = decodeURIComponent(name)
  const orders = useMemo(() => clientOrders(data.orders, decoded), [data.orders, decoded])
  const noteRow = data.client_notes.find((n) => normName(n.client_name) === normName(decoded))
  const [notes, setNotes] = useState(noteRow?.notes ?? '')
  useEffect(() => setNotes(noteRow?.notes ?? ''), [noteRow?.notes])
  const [rename, setRename] = useState<string | null>(null)
  const hide = data.settings.hide_financials
  const m = (v: number) => (hide ? '•••••' : money(v, data.settings.currency))
  const act = orders.filter((o) => o.status !== 'canceled')
  const spent = act.reduce((s, o) => s + o.total_price, 0)
  const net = act.reduce((s, o) => s + o.net_earnings, 0)
  const displayName = orders[0]?.customer_name ?? decoded

  const saveNotes = async () => {
    await upsert('client_notes', { id: noteRow?.id ?? uid(), client_name: displayName, notes })
    toast('Белешките се зачувани')
  }
  const doRename = async () => {
    const n = (rename ?? '').trim()
    if (!n || n === displayName) { setRename(null); return }
    await bulkUpsert('orders', orders.map((o) => ({ ...o, customer_name: n, updated_at: new Date().toISOString() })))
    if (noteRow) await upsert('client_notes', { ...noteRow, client_name: n })
    toast('Клиентот е преименуван'); setRename(null); nav(`/clients/${encodeURIComponent(n)}`, { replace: true })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft size={18} /></Button>
        <Avatar name={displayName} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">{displayName} <button className="text-ink-3 hover:text-accent" title="Преименувај" onClick={() => setRename(displayName)}><Pencil size={16} /></button></h1>
          <p className="text-sm text-ink-3">Клиент од {fmtDate(act.at(-1)?.order_date)} · {orders.length} нарачки</p>
        </div>
        <Button variant="primary" onClick={() => nav('/orders/new', { state: { customer: displayName } })}><PlusCircle size={16} /> Нова нарачка</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Нарачки" value={num(act.length)} />
        <StatCard label="Потрошено" value={m(spent)} tone="ok" />
        <StatCard label="Просечна нарачка" value={m(act.length ? spent / act.length : 0)} tone="neutral" />
        <StatCard label="Нето од клиентот" value={m(net)} tone="warn" />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" title={`Историја (${orders.length})`}>
          <Table>
            <thead><tr><Th>Нарачка</Th><Th>Датум</Th><Th>Продукт</Th><Th right>Цена</Th><Th>Плаќање</Th><Th>Статус</Th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-surface-2/60">
                  <Td><Link to={`/orders/${o.id}`} className="font-mono text-xs font-bold hover:text-accent">{o.order_no}</Link></Td>
                  <Td className="whitespace-nowrap text-ink-2">{fmtDate(o.order_date)}</Td>
                  <Td>{o.items.map((i) => i.product_name + (i.variant ? ` (${i.variant})` : '')).join(', ')}</Td>
                  <Td right className="font-bold">{m(o.total_price)}</Td>
                  <Td><Badge tone={o.paid ? 'ok' : 'warn'}>{o.paid ? 'Платено' : 'Неплатено'}</Badge></Td>
                  <Td><Badge tone={o.status === 'active' ? 'accent' : o.status === 'draft' ? 'neutral' : 'bad'}>{o.status === 'active' ? 'Активна' : o.status === 'draft' ? 'Нацрт' : 'Откажана'}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card title="Белешки за клиентот" subtitle="Телефон, адреса, преференции…">
          <Textarea className="min-h-40" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="пр. 070 123 456, сака брзо, плаќа при подигање…" />
          <Button variant="primary" className="mt-3 w-full" onClick={() => void saveNotes()}><Save size={16} /> Зачувај белешки</Button>
        </Card>
      </div>
      <Modal open={rename !== null} onClose={() => setRename(null)} title="Преименувај клиент" width="max-w-sm" footer={<><Button onClick={() => setRename(null)}>Откажи</Button><Button variant="primary" onClick={() => void doRename()}>Зачувај</Button></>}>
        <Field label="Ново име" hint={`Ќе се промени кај сите ${orders.length} нарачки. Корисно за спојување на „Ана Ј.“ и „Ана Јовановска“.`}><Input value={rename ?? ''} onChange={(e) => setRename(e.target.value)} autoFocus /></Field>
      </Modal>
    </div>
  )
}

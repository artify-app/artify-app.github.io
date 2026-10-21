import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react'
import { useStore, uid } from '../lib/store'
import { money, fmtDate, todayISO } from '../lib/format'
import { Button, Card, Input, Field, Modal, Table, Th, Td, PageHeader, ConfirmModal, EmptyState, Badge, StatCard, Select } from '../components/ui'
import type { Expense } from '../lib/types'

const CATS = ['Реклама', 'Опрема', 'Материјали', 'Софтвер', 'Друго']

export default function Expenses() {
  const { data, upsert, remove, toast } = useStore()
  const [edit, setEdit] = useState<Expense | null>(null)
  const [del, setDel] = useState<Expense | null>(null)
  const [year, setYear] = useState('')
  const cur = data.settings.currency
  const years = useMemo(() => [...new Set(data.expenses.map((e) => e.date.slice(0, 4)))].sort().reverse(), [data.expenses])
  const list = useMemo(() => data.expenses.filter((e) => !year || e.date.startsWith(year)).sort((a, b) => (a.date < b.date ? 1 : -1)), [data.expenses, year])
  const total = list.reduce((s, e) => s + e.amount, 0)
  const thisYear = data.expenses.filter((e) => e.date.startsWith(String(new Date().getFullYear()))).reduce((s, e) => s + e.amount, 0)
  const byCat = useMemo(() => { const m = new Map<string, number>(); for (const e of list) m.set(e.category || 'Друго', (m.get(e.category || 'Друго') ?? 0) + e.amount); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [list])

  return (
    <div className="space-y-4">
      <PageHeader title="Трошоци" subtitle="Реклами, опрема и други расходи на бизнисот" actions={<>
        <Select value={year} onChange={(e) => setYear(e.target.value)} className="w-36"><option value="">Сите години</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</Select>
        <Button variant="primary" onClick={() => setEdit({ id: uid(), date: todayISO(), amount: 0, description: '', category: 'Реклама' })}><Plus size={16} /> Нов трошок</Button>
      </>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={year ? `Вкупно ${year}` : 'Вкупно трошоци'} value={money(total, cur)} icon={<Receipt size={20} />} tone="bad" />
        <StatCard label="Оваа година" value={money(thisYear, cur)} tone="warn" />
        {byCat.slice(0, 2).map(([c, v]) => <StatCard key={c} label={c} value={money(v, cur)} tone="neutral" />)}
      </div>
      <Card>
        {list.length === 0 ? <EmptyState title="Нема трошоци" /> : (
          <Table>
            <thead><tr><Th>Датум</Th><Th>Опис</Th><Th>Категорија</Th><Th right>Износ</Th><Th right>Акции</Th></tr></thead>
            <tbody>{list.map((e) => (
              <tr key={e.id} className="hover:bg-surface-2/60">
                <Td className="whitespace-nowrap text-ink-2">{fmtDate(e.date)}</Td>
                <Td className="font-semibold">{e.description}</Td>
                <Td><Badge tone="neutral">{e.category || 'Друго'}</Badge></Td>
                <Td right className="font-bold">{money(e.amount, cur)}</Td>
                <Td right><div className="inline-flex gap-0.5"><Button variant="ghost" size="icon" onClick={() => setEdit({ ...e })}><Pencil size={16} /></Button><Button variant="ghost" size="icon" className="hover:text-bad" onClick={() => setDel(e)}><Trash2 size={16} /></Button></div></Td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Трошок" width="max-w-sm" footer={<><Button onClick={() => setEdit(null)}>Откажи</Button><Button variant="primary" onClick={async () => { if (!edit?.description.trim()) { toast('Внеси опис', 'err'); return } await upsert('expenses', { ...edit, description: edit.description.trim() }); setEdit(null) }}>Зачувај</Button></>}>
        {edit && <div className="space-y-4">
          <Field label="Датум"><Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
          <Field label={`Износ (${cur})`}><Input type="number" min={0} value={edit.amount || ''} onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value) || 0 })} autoFocus /></Field>
          <Field label="Опис"><Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="пр. FB реклама (8 Март)" /></Field>
          <Field label="Категорија"><Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        </div>}
      </Modal>
      <ConfirmModal open={!!del} onClose={() => setDel(null)} title="Избриши трошок?" text={del ? `${del.description} · ${money(del.amount, cur)}` : ''} onConfirm={() => { if (del) void remove('expenses', del.id) }} />
    </div>
  )
}

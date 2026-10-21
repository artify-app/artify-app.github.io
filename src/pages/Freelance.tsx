import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Briefcase, Search } from 'lucide-react'
import { useStore, uid } from '../lib/store'
import { freelanceTotals } from '../lib/calc'
import { money, fmtDate, todayISO, normName } from '../lib/format'
import { Button, Card, Input, Field, Modal, Table, Th, Td, PageHeader, ConfirmModal, EmptyState, Badge, StatCard, Select, Textarea, Pagination } from '../components/ui'
import type { FreelanceProject } from '../lib/types'

const PAGE = 30

export default function Freelance() {
  const { data, upsert, remove, toast } = useStore()
  const [edit, setEdit] = useState<FreelanceProject | null>(null)
  const [del, setDel] = useState<FreelanceProject | null>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const cur = data.settings.currency
  const list = useMemo(() => data.freelance.filter((f) => !q || normName(f.project + ' ' + f.client).includes(normName(q))).sort((a, b) => ((a.due_date ?? '') < (b.due_date ?? '') ? 1 : -1)), [data.freelance, q])
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const rows = list.slice((page - 1) * PAGE, page * PAGE)
  const t = freelanceTotals(data.freelance)
  const clients = useMemo(() => [...new Set(data.freelance.map((f) => f.client).filter(Boolean))].sort(), [data.freelance])
  const byClient = useMemo(() => { const m = new Map<string, number>(); for (const f of data.freelance) if (f.status === 'paid') m.set(f.client, (m.get(f.client) ?? 0) + f.amount); return [...m.entries()].sort((a, b) => b[1] - a[1])[0] }, [data.freelance])

  return (
    <div className="space-y-4">
      <PageHeader title="Freelance" subtitle="Странични проекти: инсталации, сервис, дизајн…" actions={<Button variant="primary" onClick={() => setEdit({ id: uid(), project: '', client: '', amount: 0, net_earnings: 0, status: 'paid', due_date: todayISO(), notes: '' })}><Plus size={16} /> Нов проект</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Наплатено вкупно" value={money(t.paid, cur)} icon={<Briefcase size={20} />} tone="ok" />
        <StatCard label="Во очекување" value={money(t.pending, cur)} tone="warn" />
        <StatCard label="Проекти" value={String(data.freelance.length)} tone="neutral" />
        {byClient && <StatCard label="Најголем клиент" value={byClient[0]} hint={money(byClient[1], cur)} tone="accent" />}
      </div>
      <Card>
        <div className="relative max-w-sm mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="pl-9" placeholder="Барај проект или клиент…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>
        {rows.length === 0 ? <EmptyState title="Нема проекти" /> : (
          <Table>
            <thead><tr><Th>Проект</Th><Th>Клиент</Th><Th right>Износ</Th><Th right>Нето</Th><Th>Статус</Th><Th>Датум</Th><Th right>Акции</Th></tr></thead>
            <tbody>{rows.map((f) => (
              <tr key={f.id} className="hover:bg-surface-2/60">
                <Td className="font-semibold">{f.project}{f.notes && <span className="block text-xs text-ink-3 font-normal truncate max-w-[240px]">{f.notes}</span>}</Td>
                <Td className="text-ink-2">{f.client}</Td>
                <Td right className="font-bold">{money(f.amount, cur)}</Td>
                <Td right className="text-ok">{money(f.net_earnings, cur)}</Td>
                <Td><button onClick={() => void upsert('freelance', { ...f, status: f.status === 'paid' ? 'pending' : 'paid' })}><Badge tone={f.status === 'paid' ? 'ok' : 'warn'}>{f.status === 'paid' ? 'Платено' : 'Чека'}</Badge></button></Td>
                <Td className="whitespace-nowrap text-ink-2">{fmtDate(f.due_date)}</Td>
                <Td right><div className="inline-flex gap-0.5"><Button variant="ghost" size="icon" onClick={() => setEdit({ ...f })}><Pencil size={16} /></Button><Button variant="ghost" size="icon" className="hover:text-bad" onClick={() => setDel(f)}><Trash2 size={16} /></Button></div></Td>
              </tr>
            ))}</tbody>
          </Table>
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Freelance проект" footer={<><Button onClick={() => setEdit(null)}>Откажи</Button><Button variant="primary" onClick={async () => { if (!edit?.project.trim()) { toast('Внеси име на проект', 'err'); return } await upsert('freelance', { ...edit, project: edit.project.trim(), client: edit.client.trim() }); setEdit(null) }}>Зачувај</Button></>}>
        {edit && <div className="grid grid-cols-2 gap-4">
          <Field label="Проект" className="col-span-2"><Input value={edit.project} onChange={(e) => setEdit({ ...edit, project: e.target.value })} placeholder="пр. Инсталација Windows" autoFocus /></Field>
          <Field label="Клиент" className="col-span-2"><Input list="fr-clients" value={edit.client} onChange={(e) => setEdit({ ...edit, client: e.target.value })} /><datalist id="fr-clients">{clients.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label={`Износ (${cur})`}><Input type="number" min={0} value={edit.amount || ''} onChange={(e) => { const a = Number(e.target.value) || 0; setEdit({ ...edit, amount: a, net_earnings: edit.net_earnings === edit.amount ? a : edit.net_earnings }) }} /></Field>
          <Field label="Нето (по трошоци)"><Input type="number" min={0} value={edit.net_earnings || ''} onChange={(e) => setEdit({ ...edit, net_earnings: Number(e.target.value) || 0 })} /></Field>
          <Field label="Статус"><Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as 'paid' | 'pending' })}><option value="paid">Платено</option><option value="pending">Чека плаќање</option></Select></Field>
          <Field label="Датум"><Input type="date" value={edit.due_date ?? ''} onChange={(e) => setEdit({ ...edit, due_date: e.target.value || null })} /></Field>
          <Field label="Белешки" className="col-span-2"><Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
        </div>}
      </Modal>
      <ConfirmModal open={!!del} onClose={() => setDel(null)} title="Избриши проект?" text={del ? `${del.project} · ${del.client}` : ''} onConfirm={() => { if (del) void remove('freelance', del.id) }} />
    </div>
  )
}

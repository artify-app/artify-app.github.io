import { useMemo, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Download, Upload, Minus, Search } from 'lucide-react'
import Papa from 'papaparse'
import { useStore, uid } from '../lib/store'
import { downloadText, readFileText } from '../lib/csv'
import { Button, Card, Input, Field, Modal, Table, Th, Td, PageHeader, ConfirmModal, EmptyState, Badge, Textarea, cx } from '../components/ui'
import type { InventoryItem } from '../lib/types'

export default function Inventory() {
  const { data, upsert, remove, toast, bulkUpsert } = useStore()
  const [q, setQ] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const importCsv = async (f: File) => {
    try {
      const res = Papa.parse<Record<string, string>>(await readFileText(f), { header: true, skipEmptyLines: true })
      const byName = new Map(data.inventory.map((i) => [i.name.trim().toLowerCase(), i]))
      const rows: InventoryItem[] = []
      for (const r of res.data) {
        const name = (r.name ?? r.item ?? '').trim(); if (!name) continue
        const ex = byName.get(name.toLowerCase())
        const notes = (r.notes ?? '').trim().replace(/^Auto-created from product$/, '')
        rows.push({ id: ex?.id ?? uid(), name, quantity: Number(r.quantity) || 0, unit: (r.unit || ex?.unit || 'пар.').replace(/^pcs$/, 'пар.'), low_stock_threshold: Number(r.low_stock_threshold ?? r.threshold) || ex?.low_stock_threshold || 0, notes: notes || ex?.notes || '' })
      }
      if (!rows.length) { toast('Не најдов ставки во фајлот (треба колона name)', 'err'); return }
      await bulkUpsert('inventory', rows); toast(`Увезени ${rows.length} ставки`)
    } catch (e) { toast('Не можам да го прочитам фајлот: ' + String(e), 'err') }
  }
  const [edit, setEdit] = useState<InventoryItem | null>(null)
  const [del, setDel] = useState<InventoryItem | null>(null)
  const items = useMemo(() => data.inventory.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name, 'mk')), [data.inventory, q])
  const low = data.inventory.filter((i) => i.quantity <= i.low_stock_threshold)
  const adjust = (i: InventoryItem, d: number) => void upsert('inventory', { ...i, quantity: Math.max(0, i.quantity + d) })

  return (
    <div className="space-y-4">
      <PageHeader title="Залиха" subtitle="Материјали и рамки — се одземаат автоматски кога ќе ги додадеш во нарачка." actions={<>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = '' }} />
        <Button onClick={() => fileRef.current?.click()}><Upload size={16} /> Увези CSV</Button>
        <Button onClick={() => downloadText('artify-zaliha.csv', Papa.unparse(data.inventory.map(({ name, quantity, unit, low_stock_threshold, notes }) => ({ name, quantity, unit, low_stock_threshold, notes }))), 'text/csv')}><Download size={16} /> Извези CSV</Button>
        <Button variant="primary" onClick={() => setEdit({ id: uid(), name: '', quantity: 0, unit: 'пар.', low_stock_threshold: 3, notes: '' })}><Plus size={16} /> Нова ставка</Button>
      </>} />
      {low.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-warn-soft border border-warn/30 text-sm">
          <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
          <div><p className="font-bold text-warn">{low.length} ставки при крај</p><p className="text-ink-2">{low.map((i) => `${i.name} (${i.quantity})`).join(', ')}</p></div>
        </div>
      )}
      <Card>
        <div className="relative max-w-sm mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="pl-9" placeholder="Барај…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {items.length === 0 ? <EmptyState title="Нема ставки" text="Додај рамки, хартија, кутии…" /> : (
          <Table>
            <thead><tr><Th>Ставка</Th><Th right>Количина</Th><Th>Единица</Th><Th right>Аларм под</Th><Th>Белешки</Th><Th right>Акции</Th></tr></thead>
            <tbody>
              {items.map((i) => {
                const isLow = i.quantity <= i.low_stock_threshold
                return (
                  <tr key={i.id} className="hover:bg-surface-2/60">
                    <Td className="font-semibold">{i.name} {isLow && <Badge tone={i.quantity === 0 ? 'bad' : 'warn'} className="ml-2">{i.quantity === 0 ? 'Нема' : 'Малку'}</Badge>}</Td>
                    <Td right>
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust(i, -1)}><Minus size={14} /></Button>
                        <span className={cx('w-10 text-center font-extrabold num', isLow && 'text-warn')}>{i.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust(i, 1)}><Plus size={14} /></Button>
                      </div>
                    </Td>
                    <Td className="text-ink-2">{i.unit}</Td>
                    <Td right className="text-ink-2">{i.low_stock_threshold}</Td>
                    <Td className="text-ink-3 text-xs max-w-[240px] truncate">{i.notes}</Td>
                    <Td right><div className="inline-flex gap-0.5"><Button variant="ghost" size="icon" onClick={() => setEdit({ ...i })}><Pencil size={16} /></Button><Button variant="ghost" size="icon" className="hover:text-bad" onClick={() => setDel(i)}><Trash2 size={16} /></Button></div></Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && data.inventory.some((x) => x.id === edit.id) ? 'Уреди ставка' : 'Нова ставка'} footer={<><Button onClick={() => setEdit(null)}>Откажи</Button><Button variant="primary" onClick={async () => { if (!edit?.name.trim()) { toast('Внеси име', 'err'); return } await upsert('inventory', { ...edit, name: edit.name.trim() }); setEdit(null) }}>Зачувај</Button></>}>
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Име" className="col-span-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="пр. Рамка 30x40 црна" autoFocus /></Field>
            <Field label="Количина"><Input type="number" min={0} value={edit.quantity} onChange={(e) => setEdit({ ...edit, quantity: Number(e.target.value) || 0 })} /></Field>
            <Field label="Единица"><Input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></Field>
            <Field label="Аларм кога ќе падне под" className="col-span-2"><Input type="number" min={0} value={edit.low_stock_threshold} onChange={(e) => setEdit({ ...edit, low_stock_threshold: Number(e.target.value) || 0 })} /></Field>
            <Field label="Белешки" className="col-span-2"><Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="добавувач, цена…" /></Field>
          </div>
        )}
      </Modal>
      <ConfirmModal open={!!del} onClose={() => setDel(null)} title="Избриши ставка?" text={del?.name} onConfirm={() => { if (del) void remove('inventory', del.id) }} />
    </div>
  )
}

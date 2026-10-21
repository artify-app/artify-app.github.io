import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Package, Coins, GripVertical } from 'lucide-react'
import { useStore, uid } from '../lib/store'
import { productStats } from '../lib/calc'
import { money } from '../lib/format'
import { Button, Card, Input, Field, Modal, Toggle, Badge, Table, Th, Td, PageHeader, ConfirmModal, EmptyState, cx } from '../components/ui'
import type { Product, AdditionalCostPreset } from '../lib/types'

export default function Products() {
  const { data, upsert, remove, toast } = useStore()
  const products = useMemo(() => [...data.products].sort((a, b) => a.sort - b.sort), [data.products])
  const stats = useMemo(() => new Map(productStats(data.orders).map((p) => [p.name, p])), [data.orders])
  const [edit, setEdit] = useState<Product | null>(null)
  const [del, setDel] = useState<Product | null>(null)
  const [editCost, setEditCost] = useState<AdditionalCostPreset | null>(null)
  const [delCost, setDelCost] = useState<AdditionalCostPreset | null>(null)
  const cur = data.settings.currency

  const newProduct = (): Product => ({ id: uid(), name: '', has_frame_options: false, frame_options: [], static_cost: 0, active: true, sort: products.length })
  const saveProduct = async () => {
    if (!edit) return
    if (!edit.name.trim()) { toast('Внеси име', 'err'); return }
    await upsert('products', { ...edit, name: edit.name.trim(), frame_options: edit.frame_options.filter((f) => f.label.trim()) })
    toast('Продуктот е зачуван'); setEdit(null)
  }
  const move = async (p: Product, dir: -1 | 1) => {
    const i = products.findIndex((x) => x.id === p.id); const j = i + dir
    if (j < 0 || j >= products.length) return
    const a = products[i], b = products[j]
    await upsert('products', { ...a, sort: b.sort }); await upsert('products', { ...b, sort: a.sort })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Продукти и трошоци" subtitle="Што продаваш, со кои опции и колку те чини — ова ја пресметува нето заработката." actions={<Button variant="primary" onClick={() => setEdit(newProduct())}><Plus size={16} /> Нов продукт</Button>} />

      <Card title={<span className="flex items-center gap-2"><Package size={16} className="text-accent" /> Продукти</span>}>
        {products.length === 0 ? <EmptyState title="Нема продукти" action={<Button variant="primary" onClick={() => setEdit(newProduct())}>Додај продукт</Button>} /> : (
          <Table>
            <thead><tr><Th className="w-8" /><Th>Продукт</Th><Th>Опции (трошок)</Th><Th right>Фиксен трошок</Th><Th right>Нарачки</Th><Th>Статус</Th><Th right>Акции</Th></tr></thead>
            <tbody>
              {products.map((p) => {
                const s = stats.get(p.name)
                return (
                  <tr key={p.id} className={cx('hover:bg-surface-2/60', !p.active && 'opacity-50')}>
                    <Td><div className="flex flex-col text-ink-3"><button onClick={() => void move(p, -1)} className="hover:text-ink leading-none">▲</button><button onClick={() => void move(p, 1)} className="hover:text-ink leading-none">▼</button></div></Td>
                    <Td className="font-semibold">{p.name}</Td>
                    <Td>{p.has_frame_options ? (p.frame_options.length ? <div className="flex flex-wrap gap-1">{p.frame_options.map((f) => <Badge key={f.label} tone="neutral">{f.label} · {f.cost}</Badge>)}</div> : <span className="text-ink-3 text-xs">со рамка, без дефинирани опции</span>) : <span className="text-ink-3">—</span>}</Td>
                    <Td right>{p.static_cost ? money(p.static_cost, cur) : <span className="text-ink-3">—</span>}</Td>
                    <Td right className="text-ink-2">{s ? s.orders : 0}</Td>
                    <Td><Badge tone={p.active ? 'ok' : 'neutral'}>{p.active ? 'Активен' : 'Скриен'}</Badge></Td>
                    <Td right><div className="inline-flex gap-0.5"><Button variant="ghost" size="icon" onClick={() => setEdit({ ...p, frame_options: p.frame_options.map((f) => ({ ...f })) })}><Pencil size={16} /></Button><Button variant="ghost" size="icon" className="hover:text-bad" onClick={() => setDel(p)}><Trash2 size={16} /></Button></div></Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title={<span className="flex items-center gap-2"><Coins size={16} className="text-accent" /> Дополнителни трошоци</span>} subtitle="Брзи копчиња при внес на нарачка (поштарина, пакување…)" action={<Button size="sm" variant="soft" onClick={() => setEditCost({ id: uid(), name: '', amount: 0 })}><Plus size={14} /> Додај</Button>}>
        {data.additional_costs.length === 0 ? <p className="text-sm text-ink-3">Нема дефинирани трошоци.</p> : (
          <div className="flex flex-wrap gap-2">
            {data.additional_costs.map((c) => (
              <div key={c.id} className="flex items-center gap-2 pl-3 pr-1 h-10 rounded-xl border border-line bg-surface-2/60">
                <GripVertical size={14} className="text-ink-3" />
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-sm text-ink-3 num">{money(c.amount, cur)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditCost({ ...c })}><Pencil size={14} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-bad" onClick={() => setDelCost(c)}><Trash2 size={14} /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && data.products.some((p) => p.id === edit.id) ? 'Уреди продукт' : 'Нов продукт'} footer={<><Button onClick={() => setEdit(null)}>Откажи</Button><Button variant="primary" onClick={() => void saveProduct()}>Зачувај</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="Име на продукт"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="пр. Карикатура" autoFocus /></Field>
            <Field label={`Фиксен трошок по парче (${cur})`} hint="Материјал, печатење… се одзема од цената за нето заработка."><Input type="number" min={0} value={edit.static_cost || ''} onChange={(e) => setEdit({ ...edit, static_cost: Number(e.target.value) || 0 })} placeholder="0" /></Field>
            <Toggle checked={edit.has_frame_options} onChange={(v) => setEdit({ ...edit, has_frame_options: v })} label="Има опции за рамка / големина" />
            {edit.has_frame_options && (
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-ink-2">Опции и трошок на опцијата</span>
                {edit.frame_options.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={f.label} placeholder="пр. A4" onChange={(e) => setEdit({ ...edit, frame_options: edit.frame_options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <Input type="number" className="w-32" value={f.cost || ''} placeholder="трошок" onChange={(e) => setEdit({ ...edit, frame_options: edit.frame_options.map((x, j) => (j === i ? { ...x, cost: Number(e.target.value) || 0 } : x)) })} />
                    <Button variant="ghost" size="icon" className="hover:text-bad shrink-0" onClick={() => setEdit({ ...edit, frame_options: edit.frame_options.filter((_, j) => j !== i) })}><Trash2 size={16} /></Button>
                  </div>
                ))}
                <Button size="sm" onClick={() => setEdit({ ...edit, frame_options: [...edit.frame_options, { label: '', cost: 0 }] })}><Plus size={14} /> Додај опција</Button>
              </div>
            )}
            <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Активен (се нуди при нова нарачка)" />
          </div>
        )}
      </Modal>

      <Modal open={!!editCost} onClose={() => setEditCost(null)} title="Дополнителен трошок" width="max-w-sm" footer={<><Button onClick={() => setEditCost(null)}>Откажи</Button><Button variant="primary" onClick={async () => { if (!editCost?.name.trim()) { toast('Внеси име', 'err'); return } await upsert('additional_costs', { ...editCost, name: editCost.name.trim() }); setEditCost(null) }}>Зачувај</Button></>}>
        {editCost && <div className="space-y-4"><Field label="Име"><Input value={editCost.name} onChange={(e) => setEditCost({ ...editCost, name: e.target.value })} autoFocus /></Field><Field label={`Износ (${cur})`}><Input type="number" value={editCost.amount || ''} onChange={(e) => setEditCost({ ...editCost, amount: Number(e.target.value) || 0 })} /></Field></div>}
      </Modal>

      <ConfirmModal open={!!del} onClose={() => setDel(null)} title="Избриши продукт?" text={`${del?.name} — постоечките нарачки остануваат непроменети.`} onConfirm={() => { if (del) void remove('products', del.id) }} />
      <ConfirmModal open={!!delCost} onClose={() => setDelCost(null)} title="Избриши трошок?" text={delCost?.name} onConfirm={() => { if (delCost) void remove('additional_costs', delCost.id) }} />
    </div>
  )
}

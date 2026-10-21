import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, ImagePlus, X, Save, User, ShoppingCart, Coins, Boxes, Settings2, Printer } from 'lucide-react'
import { useStore, uid } from '../lib/store'
import { buildClients, computeTotals, itemCostFor, nextOrderNo } from '../lib/calc'
import { money, todayISO, fmtDate } from '../lib/format'
import { imageToDataUrl } from '../lib/csv'
import { Button, Card, Field, Input, Select, Textarea, Badge, Toggle, ConfirmModal, Avatar, cx } from '../components/ui'
import { Logo } from '../components/Layout'
import { useBrand } from '../lib/brand'
import type { Order, OrderItem, OrderStatus } from '../lib/types'

function blank(orderNo: string): Order {
  const now = new Date().toISOString()
  return { id: uid(), order_no: orderNo, customer_name: '', order_date: todayISO(), items: [], additional_costs: [], materials: [], total_price: 0, total_cost: 0, net_earnings: 0, paid: false, status: 'active', delivery_address: '', notes: '', reference_image: null, highlighted: false, created_at: now, updated_at: now }
}

export default function OrderEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, upsert, remove, toast } = useStore()
  const loc = useLocation()
  const existing = id ? data.orders.find((o) => o.id === id) : undefined
  const [o, setO] = useState<Order>(() => existing ?? { ...blank(nextOrderNo(data.orders, todayISO())), customer_name: (loc.state as { customer?: string } | null)?.customer ?? '' })
  const [del, setDel] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (id && existing) setO(existing) }, [id, existing])
  const clients = useMemo(() => buildClients(data.orders), [data.orders])
  const products = data.products.filter((p) => p.active).sort((a, b) => a.sort - b.sort)
  const totals = computeTotals(o.items, o.additional_costs)
  const set = (patch: Partial<Order>) => setO((s) => ({ ...s, ...patch }))
  const clientMatch = clients.find((c) => c.key === o.customer_name.trim().toLowerCase().replace(/\s+/g, ' '))

  const addItem = () => {
    const p = products[0]
    const variant = p?.has_frame_options && p.frame_options[0] ? p.frame_options[0].label : ''
    const it: OrderItem = { id: uid(), product_id: p?.id ?? null, product_name: p?.name ?? '', variant, quantity: 1, unit_price: 0, unit_cost: itemCostFor(p, variant) }
    set({ items: [...o.items, it] })
  }
  const updItem = (iid: string, patch: Partial<OrderItem>) => set({ items: o.items.map((i) => (i.id === iid ? { ...i, ...patch } : i)) })
  const changeProduct = (iid: string, pid: string) => {
    const p = products.find((x) => x.id === pid)
    const variant = p?.has_frame_options && p.frame_options[0] ? p.frame_options[0].label : ''
    updItem(iid, { product_id: p?.id ?? null, product_name: p?.name ?? '', variant, unit_cost: itemCostFor(p, variant) })
  }
  const changeVariant = (iid: string, variant: string) => {
    const it = o.items.find((i) => i.id === iid)
    const p = products.find((x) => x.id === it?.product_id)
    updItem(iid, { variant, unit_cost: itemCostFor(p, variant) })
  }

  const save = async (status?: OrderStatus) => {
    if (!o.customer_name.trim()) { toast('Внеси име на клиент', 'err'); return }
    if (!o.order_date) { toast('Внеси датум', 'err'); return }
    setSaving(true)
    const final: Order = { ...o, customer_name: o.customer_name.trim(), status: status ?? o.status, ...totals, updated_at: new Date().toISOString() }
    await upsert('orders', final)
    // adjust inventory for materials (difference vs. previously saved order)
    const prev = new Map((existing?.materials ?? []).map((m) => [m.inventory_id, m.quantity]))
    for (const m of final.materials) {
      if (!m.inventory_id) continue
      const diff = m.quantity - (prev.get(m.inventory_id) ?? 0)
      prev.delete(m.inventory_id)
      const inv = data.inventory.find((i) => i.id === m.inventory_id)
      if (inv && diff !== 0) {
        const q = Math.max(0, inv.quantity - diff)
        await upsert('inventory', { ...inv, quantity: q })
        if (q <= inv.low_stock_threshold) toast(q === 0 ? `⚠️ ${inv.name}: залихата е на 0!` : `⚠️ ${inv.name}: остануваат уште ${q} ${inv.unit}`, 'err')
      }
    }
    for (const [iid, q] of prev) { const inv = data.inventory.find((i) => i.id === iid); if (inv && iid) await upsert('inventory', { ...inv, quantity: inv.quantity + q }) }
    setSaving(false)
    toast(existing ? 'Нарачката е зачувана' : `Нарачка ${final.order_no} е креирана`)
    nav('/orders')
  }

  const onImage = async (f: File) => {
    try { set({ reference_image: await imageToDataUrl(f) }) } catch { toast('Сликата не може да се вчита', 'err') }
  }

  const cur = data.settings.currency
  const brand = useBrand()

  return (
    <div className="max-w-5xl mx-auto">
      <div className="hidden print:flex items-center justify-between border-b border-line pb-4 mb-6">
        <div className="flex items-center gap-3"><Logo size={44} /><div><p className="text-xl font-extrabold">{brand.name}</p><p className="text-xs text-ink-3">Потврда за нарачка</p></div></div>
        <div className="text-right"><p className="font-mono font-bold">{o.order_no}</p><p className="text-xs text-ink-3">{fmtDate(o.order_date, 'd MMMM yyyy')}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-5 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft size={18} /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{existing ? 'Уреди нарачка' : 'Нова нарачка'} <span className="font-mono text-base text-ink-3 font-semibold ml-2">{o.order_no}</span></h1>
          {existing && <p className="text-xs text-ink-3">Креирана {fmtDate(existing.created_at.slice(0, 10))} · последна промена {fmtDate(existing.updated_at.slice(0, 10))}</p>}
        </div>
        {existing && <Button onClick={() => window.print()}><Printer size={16} /> Печати</Button>}
        {existing && <Button variant="danger" onClick={() => setDel(true)}><Trash2 size={16} /> Избриши</Button>}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 print:block">
        <div className="lg:col-span-2 space-y-5">
          <Card title={<span className="flex items-center gap-2"><User size={16} className="text-accent" /> Клиент</span>}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Име и презиме *">
                <Input list="clients-list" value={o.customer_name} onChange={(e) => set({ customer_name: e.target.value })} placeholder="пр. Ана Јовановска" autoFocus={!existing} />
                <datalist id="clients-list">{clients.slice(0, 400).map((c) => <option key={c.key} value={c.name} />)}</datalist>
                {clientMatch && <Link to={`/clients/${encodeURIComponent(clientMatch.name)}`} className="mt-1.5 inline-flex items-center gap-2 text-xs text-accent font-semibold"><Avatar name={clientMatch.name} size="sm" /> Постоечки клиент · {clientMatch.orders} нарачки · {money(clientMatch.total_spent, cur)}</Link>}
              </Field>
              <Field label="Датум на нарачка *"><Input type="date" value={o.order_date} onChange={(e) => set({ order_date: e.target.value })} /></Field>
              <Field label="Адреса за достава" className="sm:col-span-2"><Input value={o.delivery_address} onChange={(e) => set({ delivery_address: e.target.value })} placeholder="опционално" /></Field>
              <Field label="Белешки" className="sm:col-span-2"><Textarea value={o.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Посебни барања, текст за карикатурата, рок…" /></Field>
              <div className="sm:col-span-2">
                <span className="block text-xs font-semibold text-ink-2 mb-1.5">Референтна слика</span>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImage(f); e.target.value = '' }} />
                {o.reference_image ? (
                  <div className="relative inline-block">
                    <img src={o.reference_image} alt="" className="h-36 rounded-xl border border-line object-cover" />
                    <button className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bad text-white flex items-center justify-center shadow" onClick={() => set({ reference_image: null })}><X size={12} /></button>
                  </div>
                ) : <Button onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Прикачи слика</Button>}
              </div>
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><ShoppingCart size={16} className="text-accent" /> Продукти</span>} action={<Button size="sm" variant="soft" onClick={addItem}><Plus size={14} /> Додај продукт</Button>}>
            {o.items.length === 0 ? (
              <button onClick={addItem} className="w-full border-2 border-dashed border-line rounded-2xl py-10 text-center text-ink-3 hover:border-accent hover:text-accent transition">
                <ShoppingCart size={24} className="mx-auto mb-2" /><p className="font-semibold text-sm">Нема додадени продукти</p><p className="text-xs">Кликни за да додадеш</p>
              </button>
            ) : (
              <div className="space-y-3">
                {o.items.map((it) => {
                  const p = products.find((x) => x.id === it.product_id)
                  return (
                    <div key={it.id} className="rounded-2xl border border-line bg-surface-2/50 p-3 grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
                      <Field label="Продукт" className="col-span-2 sm:col-span-4">
                        <Select value={it.product_id ?? ''} onChange={(e) => changeProduct(it.id, e.target.value)}>
                          {!p && it.product_name && <option value="">{it.product_name}</option>}
                          {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </Select>
                      </Field>
                      <Field label="Варијанта / рамка" className="sm:col-span-3">
                        {p?.has_frame_options && p.frame_options.length ? (
                          <Select value={it.variant} onChange={(e) => changeVariant(it.id, e.target.value)}>
                            {!p.frame_options.some((f) => f.label === it.variant) && <option value={it.variant}>{it.variant || '—'}</option>}
                            {p.frame_options.map((f) => <option key={f.label} value={f.label}>{f.label} (трошок {f.cost})</option>)}
                          </Select>
                        ) : <Input value={it.variant} onChange={(e) => updItem(it.id, { variant: e.target.value })} placeholder="пр. 6x9 / 25" />}
                      </Field>
                      <Field label="Кол." className="sm:col-span-1"><Input type="number" min={1} value={it.quantity} onChange={(e) => updItem(it.id, { quantity: Math.max(1, Number(e.target.value) || 1) })} /></Field>
                      <Field label={`Цена (${cur})`} className="sm:col-span-2"><Input type="number" min={0} value={it.unit_price || ''} onChange={(e) => updItem(it.id, { unit_price: Number(e.target.value) || 0 })} placeholder="0" /></Field>
                      <Field label="Трошок" className="sm:col-span-1"><Input type="number" min={0} value={it.unit_cost || ''} onChange={(e) => updItem(it.id, { unit_cost: Number(e.target.value) || 0 })} placeholder="0" /></Field>
                      <div className="sm:col-span-1 flex justify-end"><Button variant="ghost" size="icon" className="hover:text-bad" onClick={() => set({ items: o.items.filter((x) => x.id !== it.id) })}><Trash2 size={16} /></Button></div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card title={<span className="flex items-center gap-2"><Coins size={16} className="text-accent" /> Дополнителни трошоци</span>}>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.additional_costs.map((c) => (
                <button key={c.id} onClick={() => set({ additional_costs: [...o.additional_costs, { name: c.name, amount: c.amount }] })} className="h-8 px-3 rounded-full border border-line bg-surface text-xs font-bold hover:border-accent hover:text-accent transition inline-flex items-center gap-1"><Plus size={12} /> {c.name} · {c.amount}</button>
              ))}
              <button onClick={() => set({ additional_costs: [...o.additional_costs, { name: '', amount: 0 }] })} className="h-8 px-3 rounded-full border border-dashed border-line text-xs font-bold text-ink-3 hover:border-accent hover:text-accent transition inline-flex items-center gap-1"><Plus size={12} /> Друго</button>
            </div>
            {o.additional_costs.length > 0 && (
              <div className="space-y-2">
                {o.additional_costs.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input value={c.name} placeholder="Опис" onChange={(e) => set({ additional_costs: o.additional_costs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                    <Input type="number" className="w-32" value={c.amount || ''} placeholder="0" onChange={(e) => set({ additional_costs: o.additional_costs.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)) })} />
                    <Button variant="ghost" size="icon" className="hover:text-bad shrink-0" onClick={() => set({ additional_costs: o.additional_costs.filter((_, j) => j !== i) })}><Trash2 size={16} /></Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={<span className="flex items-center gap-2"><Boxes size={16} className="text-accent" /> Искористени материјали</span>} subtitle="Се одземаат од залихата при зачувување" action={<Button size="sm" variant="soft" disabled={!data.inventory.length} onClick={() => set({ materials: [...o.materials, { inventory_id: data.inventory[0]?.id ?? null, name: data.inventory[0]?.name ?? '', quantity: 1 }] })}><Plus size={14} /> Додај</Button>}>
            {o.materials.length === 0 ? <p className="text-sm text-ink-3">{data.inventory.length ? 'Нема материјали.' : 'Прво додај ставки во Залиха.'}</p> : (
              <div className="space-y-2">
                {o.materials.map((mt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Select value={mt.inventory_id ?? ''} onChange={(e) => { const inv = data.inventory.find((x) => x.id === e.target.value); set({ materials: o.materials.map((x, j) => (j === i ? { ...x, inventory_id: inv?.id ?? null, name: inv?.name ?? '' } : x)) }) }}>
                      {data.inventory.map((inv) => <option key={inv.id} value={inv.id}>{inv.name} (има {inv.quantity} {inv.unit})</option>)}
                    </Select>
                    <Input type="number" min={1} className="w-24" value={mt.quantity} onChange={(e) => set({ materials: o.materials.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)) })} />
                    <Button variant="ghost" size="icon" className="hover:text-bad shrink-0" onClick={() => set({ materials: o.materials.filter((_, j) => j !== i) })}><Trash2 size={16} /></Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-20 self-start">
          <Card title="Финансии">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">Вкупна цена</dt><dd className="font-bold num">{money(totals.total_price, cur)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">Интерен трошок</dt><dd className="num text-ink-2">− {money(totals.total_cost, cur)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 mt-2"><dt className="font-bold">Нето заработка</dt><dd className={cx('font-extrabold text-lg num', totals.net_earnings >= 0 ? 'text-ok' : 'text-bad')}>{money(totals.net_earnings, cur)}</dd></div>
            </dl>
            {totals.total_price > 0 && <p className="text-[11px] text-ink-3 mt-2">Маржа {Math.round((totals.net_earnings / totals.total_price) * 100)}%</p>}
          </Card>
          <Card title={<span className="flex items-center gap-2"><Settings2 size={16} className="text-accent" /> Статус</span>}>
            <div className="space-y-4">
              <Field label="Статус на нарачка">
                <Select value={o.status} onChange={(e) => set({ status: e.target.value as OrderStatus })}><option value="active">Активна</option><option value="draft">Нацрт</option><option value="canceled">Откажана</option></Select>
              </Field>
              <Toggle checked={o.paid} onChange={(v) => set({ paid: v })} label={<span className="flex items-center gap-2">Плаќањето е примено <Badge tone={o.paid ? 'ok' : 'warn'}>{o.paid ? 'Платено' : 'Неплатено'}</Badge></span>} />
              <Toggle checked={o.highlighted} onChange={(v) => set({ highlighted: v })} label="Истакни ја нарачката" />
            </div>
          </Card>
          <div className="flex flex-col gap-2">
            <Button variant="primary" size="lg" loading={saving} onClick={() => void save()}><Save size={18} /> {existing ? 'Зачувај промени' : 'Креирај нарачка'}</Button>
            {!existing && <Button onClick={() => void save('draft')}>Зачувај како нацрт</Button>}
          </div>
        </div>
      </div>
      <ConfirmModal open={del} onClose={() => setDel(false)} title="Избриши нарачка?" text={`${o.order_no} · ${o.customer_name}`} onConfirm={() => { void remove('orders', o.id); toast('Нарачката е избришана'); nav('/orders') }} />
    </div>
  )
}

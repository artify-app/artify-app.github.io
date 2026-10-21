import Papa from 'papaparse'
import type { Order, Product } from './types'
import { uid } from './store'
import { itemCostFor, computeTotals, nextOrderNo } from './calc'

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const blob = new Blob(['﻿' + text], { type: type + ';charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function ordersToCsv(orders: Order[]): string {
  const rows = orders.map((o) => ({
    order_no: o.order_no,
    customer_name: o.customer_name,
    order_date: o.order_date,
    product_type: o.items.map((i) => i.product_name).join(' + '),
    variant: o.items.map((i) => i.variant).filter(Boolean).join(' + '),
    quantity: o.items.reduce((s, i) => s + i.quantity, 0),
    total_price: o.total_price,
    total_cost: o.total_cost,
    net_earnings: o.net_earnings,
    paid: o.paid ? 'true' : 'false',
    status: o.status,
    delivery_address: o.delivery_address,
    notes: o.notes,
  }))
  return Papa.unparse(rows)
}

export interface CsvImportResult { orders: Order[]; skipped: number; errors: string[] }

/** Accepts both the old base44 export and this app's own export. */
export function parseOrdersCsv(text: string, products: Product[], existing: Order[]): CsvImportResult {
  const res = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
  const errors: string[] = res.errors.slice(0, 5).map((e) => `Ред ${e.row}: ${e.message}`)
  const orders: Order[] = []
  let skipped = 0
  const existingNos = new Set(existing.map((o) => o.order_no))
  let next = parseInt(nextOrderNo(existing, '2000').split('-')[2], 10)
  const now = new Date().toISOString()
  for (const r of res.data) {
    const name = (r.customer_name ?? r.customer ?? '').trim()
    const date = (r.order_date ?? r.date ?? '').trim().slice(0, 10)
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { skipped++; continue }
    const productName = (r.product_type ?? r.product ?? '').trim()
    const product = products.find((p) => p.name.toLowerCase() === productName.toLowerCase())
    const variant = (r.variant ?? r.caricature_size ?? '').trim().replace(/^null$/, '')
    const qty = Math.max(1, parseInt(r.quantity || '1', 10) || 1)
    const price = Number(r.total_price || 0)
    let orderNo = (r.order_no ?? r.order_id ?? '').trim()
    if (!orderNo || existingNos.has(orderNo)) { orderNo = `ART-${date.slice(0, 4)}-${String(next++).padStart(4, '0')}` }
    existingNos.add(orderNo)
    const unitCostDefault = itemCostFor(product, variant)
    const totalCost = r.total_cost !== undefined && r.total_cost !== '' ? Number(r.total_cost) : r.net_earnings ? price - Number(r.net_earnings) : unitCostDefault * qty
    const items = [{ id: uid(), product_id: product?.id ?? null, product_name: productName || 'Производ', variant, quantity: qty, unit_price: price / qty, unit_cost: totalCost / qty }]
    const t = computeTotals(items, [])
    const paidRaw = (r.paid ?? r.cash_received ?? 'true').toString().toLowerCase()
    const statusRaw = (r.status ?? r.order_status ?? 'active').toLowerCase()
    orders.push({
      id: uid(), order_no: orderNo, customer_name: name, order_date: date, items, additional_costs: [], materials: [],
      ...t, paid: paidRaw === 'true' || paidRaw === 'paid' || paidRaw === '1',
      status: statusRaw === 'canceled' || statusRaw === 'cancelled' ? 'canceled' : statusRaw === 'draft' ? 'draft' : 'active',
      delivery_address: (r.delivery_address ?? '').trim(), notes: (r.notes ?? '').trim(), reference_image: null, highlighted: false,
      created_at: now, updated_at: now,
    })
  }
  return { orders, skipped, errors }
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsText(file, 'utf-8')
  })
}

export function readFileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(file)
  })
}

/** Downscale an image file to a data URL (keeps backups small). */
export async function imageToDataUrl(file: File, maxSide = 1200, quality = 0.85): Promise<string> {
  const url = await readFileDataUrl(file)
  if (file.type === 'image/svg+xml') return url
  const img = new Image()
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('bad image')); img.src = url })
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  if (scale === 1 && file.size < 400_000) return url
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality)
}

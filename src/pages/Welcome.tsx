import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, PlusCircle, Package, Sparkles } from 'lucide-react'
import { useStore, uid } from '../lib/store'
import { readFileText } from '../lib/csv'
import { Button, Card } from '../components/ui'
import type { Backup } from '../lib/types'

const STARTER_PRODUCTS = [
  { name: 'Карикатура', has_frame_options: true, frame_options: [{ label: 'A4', cost: 300 }, { label: 'A3', cost: 400 }], static_cost: 0 },
  { name: 'Мини фото албум', has_frame_options: false, frame_options: [], static_cost: 200 },
  { name: 'Приврзок', has_frame_options: false, frame_options: [], static_cost: 0 },
  { name: 'Персонализиран дизајн во рамка', has_frame_options: true, frame_options: [], static_cost: 0 },
]

export default function Welcome() {
  const { importBackup, bulkUpsert, toast } = useStore()
  const nav = useNavigate()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const onFile = async (f: File) => {
    setBusy(true)
    try {
      const b = JSON.parse(await readFileText(f)) as Backup
      if (b.app !== 'artify') throw new Error('Ова не е Artify backup фајл')
      await importBackup(b, 'replace'); toast(`Увезени ${b.orders.length} нарачки`)
    } catch (e) { toast(String((e as Error).message ?? e), 'err') }
    setBusy(false)
  }
  const start = async () => {
    await bulkUpsert('products', STARTER_PRODUCTS.map((p, i) => ({ id: uid(), active: true, sort: i, ...p })))
    await bulkUpsert('additional_costs', [{ id: uid(), name: 'Поштарина', amount: 150 }, { id: uid(), name: 'Украсно пакување', amount: 40 }])
    nav('/orders/new')
  }
  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="text-center mb-8">
        <span className="inline-flex w-16 h-16 rounded-2xl bg-accent text-white items-center justify-center shadow-lg shadow-accent/30 mb-4"><Sparkles size={30} /></span>
        <h1 className="text-3xl font-extrabold tracking-tight">Добредојде во Artify</h1>
        <p className="text-ink-3 mt-2">Твоја сопствена апликација за нарачки, клиенти и финансии. Нема месечни трошоци, податоците се твои.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <Upload size={22} className="text-accent mb-3" />
          <h2 className="font-bold text-lg">Увези backup</h2>
          <p className="text-sm text-ink-3 mt-1 mb-4">Ако имаш <code>artify-backup.json</code> (пр. пренос од старата апликација), вчитај го тука — сите нарачки, клиенти и трошоци ќе бидат внатре.</p>
          <input ref={ref} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = '' }} />
          <Button variant="primary" loading={busy} onClick={() => ref.current?.click()}><Upload size={16} /> Избери фајл</Button>
        </Card>
        <Card>
          <Package size={22} className="text-accent mb-3" />
          <h2 className="font-bold text-lg">Почни од нула</h2>
          <p className="text-sm text-ink-3 mt-1 mb-4">Ќе додадеме неколку основни продукти што потоа можеш да ги смениш, и одиме на првата нарачка.</p>
          <Button onClick={() => void start()}><PlusCircle size={16} /> Почни</Button>
        </Card>
      </div>
    </div>
  )
}

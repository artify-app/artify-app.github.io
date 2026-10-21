import { useRef, useState } from 'react'
import { Upload, Download, Trash2, Cloud, HardDrive, Palette, Image as ImageIcon, LayoutDashboard, ShieldCheck, Sun, Moon, Monitor, CloudUpload, Info, Lock } from 'lucide-react'
import { hasPin, setPin as savePin, clearPin, verifyPin } from '../lib/pin'
import { useStore } from '../lib/store'
import { useTheme } from '../lib/theme'
import { getSupabaseConfig } from '../lib/storage/supabase'
import { LocalAdapter } from '../lib/storage/local'
import { readFileText, imageToDataUrl, downloadText } from '../lib/csv'
import { Button, Card, Input, Field, Toggle, PageHeader, ConfirmModal, Modal, SegmentedControl, Badge, cx } from '../components/ui'
import { Logo } from '../components/Layout'
import type { Backup, DashboardWidget } from '../lib/types'
import { EMPTY_DATA } from '../lib/types'

const ACCENTS = [['violet', '#6d5dfc'], ['blue', '#2b6ff3'], ['teal', '#0e9f8a'], ['coral', '#f0605d'], ['rose', '#d6336c'], ['amber', '#d9870f']]
const WIDGETS: { key: DashboardWidget; label: string }[] = [{ key: 'stats', label: 'Бројки на врв' }, { key: 'recent_orders', label: 'Последни нарачки' }, { key: 'insights', label: 'Увиди' }, { key: 'products', label: 'Удел на продукти' }]

export default function SettingsPage() {
  const { data, saveSettings, importBackup, exportBackup, toast, mode, connectSupabase, disconnectSupabase, migrateLocalToSupabase, session } = useStore()
  const s = data.settings
  const { pref, setPref } = useTheme()
  const logoRef = useRef<HTMLInputElement>(null)
  const bkRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [wipe, setWipe] = useState(false)
  const cfg = getSupabaseConfig()
  const [url, setUrl] = useState(cfg?.url ?? '')
  const [key, setKey] = useState(cfg?.anonKey ?? '')
  const [migrating, setMigrating] = useState(false)
  const [name, setName] = useState(s.business_name)
  const [pinOn, setPinOn] = useState(hasPin)
  const [pin1, setPin1] = useState(''); const [pin2, setPin2] = useState(''); const [oldPin, setOldPin] = useState('')
  const applyPin = async () => {
    if (!/^\d{4,6}$/.test(pin1)) { toast('PIN-от треба да има 4–6 цифри', 'err'); return }
    if (pin1 !== pin2) { toast('PIN-овите не се исти', 'err'); return }
    if (pinOn && !(await verifyPin(oldPin))) { toast('Стариот PIN не е точен', 'err'); return }
    await savePin(pin1); setPinOn(true); setPin1(''); setPin2(''); setOldPin(''); toast('PIN е поставен')
  }
  const removePin = async () => {
    if (!(await verifyPin(oldPin))) { toast('PIN-от не е точен', 'err'); return }
    clearPin(); setPinOn(false); setOldPin(''); toast('PIN е отстранет')
  }

  const onLogo = async (f: File) => { try { await saveSettings({ logo: await imageToDataUrl(f, 400) }); toast('Логото е поставено') } catch { toast('Сликата не може да се вчита', 'err') } }
  const onBackupFile = async (f: File) => {
    try {
      const b = JSON.parse(await readFileText(f)) as Backup
      if (b.app !== 'artify' || !Array.isArray(b.orders)) throw new Error('Ова не е Artify backup фајл')
      setPending(b)
    } catch (e) { toast(String((e as Error).message ?? e), 'err') }
  }
  const doImport = async (how: 'replace' | 'merge') => {
    if (!pending) return
    await importBackup(pending, how); toast(`Увезени ${pending.orders.length} нарачки`); setPending(null)
  }
  const exportNow = () => { const b = exportBackup(); downloadText(`artify-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b), 'application/json'); toast('Backup е симнат') }

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader title="Подесувања" subtitle="Изглед, податоци и поврзување со облак" />

      <Card title={<span className="flex items-center gap-2"><ImageIcon size={16} className="text-accent" /> Бренд</span>}>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl border border-line bg-surface-2 flex items-center justify-center overflow-hidden"><Logo size={s.logo ? 80 : 44} /></div>
            <div className="flex flex-col gap-2">
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onLogo(f); e.target.value = '' }} />
              <Button onClick={() => logoRef.current?.click()}><Upload size={16} /> Прикачи лого</Button>
              {s.logo && <Button variant="ghost" size="sm" onClick={() => void saveSettings({ logo: null })}><Trash2 size={14} /> Отстрани</Button>}
              <p className="text-[11px] text-ink-3">PNG/SVG со провидна позадина изгледа најдобро.</p>
            </div>
          </div>
          <div className="flex-1 grid gap-4">
            <Field label="Име на бизнисот"><Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() !== s.business_name && void saveSettings({ business_name: name.trim() || 'Artify' })} /></Field>
            <Field label="Валута (ознака)"><Input value={s.currency} onChange={(e) => void saveSettings({ currency: e.target.value })} className="w-32" /></Field>
          </div>
        </div>
      </Card>

      <Card title={<span className="flex items-center gap-2"><Palette size={16} className="text-accent" /> Изглед</span>}>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <span className="block text-xs font-semibold text-ink-2 mb-2">Тема</span>
            <SegmentedControl value={pref} onChange={setPref} options={[{ value: 'light', label: 'Светла' }, { value: 'dark', label: 'Темна' }, { value: 'system', label: 'Системска' }]} />
            <p className="text-[11px] text-ink-3 mt-2 flex items-center gap-1">{pref === 'light' ? <Sun size={12} /> : pref === 'dark' ? <Moon size={12} /> : <Monitor size={12} />} Копчето горе десно ја менува темата брзо.</p>
          </div>
          <div>
            <span className="block text-xs font-semibold text-ink-2 mb-2">Боја на акцент</span>
            <div className="flex gap-2 flex-wrap">
              {ACCENTS.map(([k, c]) => <button key={k} onClick={() => void saveSettings({ accent: k })} className={cx('w-9 h-9 rounded-full border-4 transition', (s.accent ?? 'violet') === k ? 'border-ink scale-110' : 'border-transparent hover:scale-105')} style={{ background: c }} title={k} />)}
            </div>
          </div>
        </div>
      </Card>

      <Card title={<span className="flex items-center gap-2"><LayoutDashboard size={16} className="text-accent" /> Преглед (почетна)</span>} subtitle="Кои делови да се прикажуваат">
        <div className="grid sm:grid-cols-2 gap-3">
          {WIDGETS.map((w) => <Toggle key={w.key} checked={s.dashboard_widgets.includes(w.key)} onChange={(v) => void saveSettings({ dashboard_widgets: v ? [...s.dashboard_widgets, w.key] : s.dashboard_widgets.filter((x) => x !== w.key) })} label={w.label} />)}
        </div>
      </Card>

      <Card title={<span className="flex items-center gap-2"><Lock size={16} className="text-accent" /> PIN заклучување</span>} subtitle="Заштита ако некој друг го користи овој компјутер. Бара PIN при отворање и по 15 минути неактивност.">
        <div className="flex items-center gap-2 mb-4"><Badge tone={pinOn ? 'ok' : 'neutral'}>{pinOn ? 'Вклучено' : 'Исклучено'}</Badge></div>
        <div className="grid sm:grid-cols-3 gap-3 max-w-xl">
          {pinOn && <Field label="Тековен PIN"><Input type="password" inputMode="numeric" value={oldPin} onChange={(e) => setOldPin(e.target.value)} /></Field>}
          <Field label={pinOn ? 'Нов PIN' : 'PIN (4–6 цифри)'}><Input type="password" inputMode="numeric" value={pin1} onChange={(e) => setPin1(e.target.value)} /></Field>
          <Field label="Повтори"><Input type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value)} /></Field>
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="primary" onClick={() => void applyPin()}><Lock size={16} /> {pinOn ? 'Промени PIN' : 'Вклучи PIN'}</Button>
          {pinOn && <Button variant="ghost" onClick={() => void removePin()}>Исклучи PIN</Button>}
        </div>
        <p className="text-[11px] text-ink-3 mt-3">PIN-от важи само за овој прелистувач. Ако го заборавиш: избриши ги податоците на сајтот од прелистувачот и увези backup.</p>
      </Card>

      <Card title={<span className="flex items-center gap-2"><ShieldCheck size={16} className="text-accent" /> Backup и податоци</span>} subtitle="Целата база во еден JSON фајл — чувај копија на Google Drive од време на време.">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportNow}><Download size={16} /> Симни backup</Button>
          <input ref={bkRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onBackupFile(f); e.target.value = '' }} />
          <Button onClick={() => bkRef.current?.click()}><Upload size={16} /> Увези backup</Button>
          <Button variant="danger" onClick={() => setWipe(true)}><Trash2 size={16} /> Избриши сè</Button>
        </div>
        <p className="text-xs text-ink-3 mt-3">{data.orders.length} нарачки · {data.products.length} продукти · {data.inventory.length} ставки залиха · {data.expenses.length} трошоци · {data.freelance.length} freelance проекти</p>
      </Card>

      <Card title={<span className="flex items-center gap-2">{mode === 'supabase' ? <Cloud size={16} className="text-accent" /> : <HardDrive size={16} className="text-accent" />} Каде се чуваат податоците</span>}>
        <div className="flex items-center gap-2 mb-3">
          <Badge tone={mode === 'supabase' ? 'ok' : 'neutral'}>{mode === 'supabase' ? 'Облак (Supabase)' : 'Локално во овој прелистувач'}</Badge>
          {session?.user.email && <span className="text-xs text-ink-3">најавен како {session.user.email}</span>}
        </div>
        {mode === 'local' && (
          <div className="text-sm text-ink-2 space-y-3">
            <p className="flex gap-2"><Info size={16} className="shrink-0 text-accent mt-0.5" /> Сега податоците живеат само на овој уред. За пристап од телефон и компјутер и за сигурност, поврзи бесплатен Supabase проект — тоа е твоја сопствена база.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Project URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" /></Field>
              <Field label="anon public key"><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi…" /></Field>
            </div>
            <p className="text-xs text-ink-3">Пред поврзување, во Supabase SQL Editor изврши го <code className="bg-surface-2 px-1 rounded">supabase/schema.sql</code> од репозиториумот (ги креира табелите и заштитата). Потоа кликни „Поврзи“, најави се и кликни „Пренеси ги локалните податоци во облак“.</p>
            <Button variant="primary" disabled={!/^https:\/\/.+supabase\.co\/?$/.test(url.trim()) || key.trim().length < 20} onClick={() => void connectSupabase({ url: url.trim().replace(/\/$/, ''), anonKey: key.trim() })}><Cloud size={16} /> Поврзи Supabase</Button>
          </div>
        )}
        {mode === 'supabase' && (
          <div className="text-sm text-ink-2 space-y-3">
            <p>Податоците се во твојот Supabase проект и се достапни од секој уред по најава.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" loading={migrating} onClick={async () => { setMigrating(true); try { const r = await migrateLocalToSupabase(); toast(`Пренесени ${r.orders} нарачки во облак`) } catch (e) { toast(String((e as Error).message), 'err') } setMigrating(false) }}><CloudUpload size={16} /> Пренеси ги локалните податоци во облак</Button>
              <Button variant="ghost" onClick={disconnectSupabase}>Исклучи облак (работи локално)</Button>
            </div>
            <p className="text-xs text-ink-3">Преносот ги додава/ажурира записите од локалната база во облакот (не брише ништо во облакот).</p>
          </div>
        )}
      </Card>

      <Modal open={!!pending} onClose={() => setPending(null)} title="Увези backup" footer={<><Button onClick={() => setPending(null)}>Откажи</Button><Button onClick={() => void doImport('merge')}>Спои со постоечките</Button><Button variant="primary" onClick={() => void doImport('replace')}>Замени сè</Button></>}>
        {pending && <div className="text-sm space-y-2">
          <p>Фајлот содржи <b>{pending.orders.length}</b> нарачки, {pending.products?.length ?? 0} продукти, {pending.inventory?.length ?? 0} ставки залиха, {pending.expenses?.length ?? 0} трошоци и {pending.freelance?.length ?? 0} freelance проекти (извезен {pending.exported_at?.slice(0, 10)}).</p>
          <p className="text-ink-3 text-xs"><b>Замени сè</b> ги брише тековните податоци и ги става овие. <b>Спои</b> додава/ажурира по ID без бришење.</p>
        </div>}
      </Modal>
      <ConfirmModal open={wipe} onClose={() => setWipe(false)} title="Избриши ги сите податоци?" text="Сите нарачки, клиенти, продукти и трошоци ќе бидат избришани. Прво симни backup!" confirmLabel="Да, избриши сè" onConfirm={async () => { await importBackup({ app: 'artify', version: 1, exported_at: '', ...EMPTY_DATA, settings: data.settings }, 'replace'); await new LocalAdapter().replaceAll({ ...EMPTY_DATA, settings: data.settings }); toast('Сите податоци се избришани') }} />
    </div>
  )
}

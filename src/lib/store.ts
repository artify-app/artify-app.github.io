import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { COLLECTIONS, EMPTY_DATA, type AppData, type Backup, type Collection, type Row, type Settings } from './types'
import type { StorageAdapter } from './storage/types'
import { LocalAdapter } from './storage/local'
import { SupabaseAdapter, getSupabaseClient, getSupabaseConfig, setSupabaseConfig, type SupabaseConfig } from './storage/supabase'

export type Mode = 'local' | 'supabase'

interface ToastMsg { id: number; text: string; kind: 'ok' | 'err' }

interface State {
  data: AppData
  loaded: boolean
  loading: boolean
  mode: Mode
  session: Session | null
  authReady: boolean
  error: string | null
  toasts: ToastMsg[]
  adapter: StorageAdapter

  init: () => Promise<void>
  upsert: <C extends Collection>(c: C, row: Row<C>) => Promise<void>
  bulkUpsert: <C extends Collection>(c: C, rows: Row<C>[]) => Promise<void>
  remove: (c: Collection, id: string) => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
  importBackup: (b: Backup, mode: 'replace' | 'merge') => Promise<void>
  exportBackup: () => Backup
  toast: (text: string, kind?: 'ok' | 'err') => void
  dismissToast: (id: number) => void

  connectSupabase: (cfg: SupabaseConfig) => Promise<void>
  disconnectSupabase: () => void
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  migrateLocalToSupabase: () => Promise<{ orders: number }>
}

let toastSeq = 0

export const useStore = create<State>((set, get) => ({
  data: EMPTY_DATA,
  loaded: false,
  loading: false,
  mode: getSupabaseConfig() ? 'supabase' : 'local',
  session: null,
  authReady: false,
  error: null,
  toasts: [],
  adapter: new LocalAdapter(),

  async init() {
    const sb = getSupabaseClient()
    if (sb) {
      const { data: { session } } = await sb.auth.getSession()
      set({ mode: 'supabase', session, authReady: true, adapter: new SupabaseAdapter(sb) })
      sb.auth.onAuthStateChange((_e, s) => {
        const had = !!get().session
        set({ session: s })
        if (s && !had) void get().init()
        if (!s) set({ data: EMPTY_DATA, loaded: false })
      })
      if (!session) return
    } else {
      set({ mode: 'local', authReady: true, adapter: new LocalAdapter() })
    }
    set({ loading: true, error: null })
    try {
      const data = await get().adapter.load()
      set({ data, loaded: true, loading: false })
    } catch (e) {
      set({ error: describeError(e), loading: false })
    }
  },

  async upsert(c, row) {
    const { data, adapter } = get()
    const rows = [...(data[c] as { id: string }[])]
    const i = rows.findIndex((r) => r.id === row.id)
    if (i >= 0) rows[i] = row
    else rows.unshift(row)
    set({ data: { ...data, [c]: rows } })
    try { await adapter.upsert(c, row) } catch (e) { get().toast('Грешка при зачувување: ' + describeError(e), 'err') }
  },

  async bulkUpsert(c, incoming) {
    const { data, adapter } = get()
    const rows = [...(data[c] as { id: string }[])]
    const idx = new Map(rows.map((r, i) => [r.id, i]))
    for (const row of incoming as { id: string }[]) {
      const i = idx.get(row.id)
      if (i !== undefined) rows[i] = row
      else { idx.set(row.id, rows.length); rows.push(row) }
    }
    set({ data: { ...data, [c]: rows } })
    try { await adapter.bulkUpsert(c, incoming) } catch (e) { get().toast('Грешка при зачувување: ' + describeError(e), 'err') }
  },

  async remove(c, id) {
    const { data, adapter } = get()
    set({ data: { ...data, [c]: (data[c] as { id: string }[]).filter((r) => r.id !== id) } })
    try { await adapter.remove(c, id) } catch (e) { get().toast('Грешка при бришење: ' + describeError(e), 'err') }
  },

  async saveSettings(patch) {
    const { data, adapter } = get()
    const settings = { ...data.settings, ...patch }
    set({ data: { ...data, settings } })
    try { await adapter.saveSettings(settings) } catch (e) { get().toast('Грешка при зачувување: ' + describeError(e), 'err') }
  },

  async importBackup(b, mode) {
    const { data, adapter } = get()
    if (mode === 'replace') {
      const next: AppData = { settings: { ...data.settings, ...b.settings }, ...pickCollections(b) }
      set({ data: next })
      await adapter.replaceAll(next)
    } else {
      for (const c of COLLECTIONS) await get().bulkUpsert(c, (b[c] ?? []) as Row<typeof c>[])
    }
  },

  exportBackup() {
    const { data } = get()
    return { app: 'artify', version: 1, exported_at: new Date().toISOString(), ...data }
  },

  toast(text, kind = 'ok') {
    const id = ++toastSeq
    set({ toasts: [...get().toasts, { id, text, kind }] })
    setTimeout(() => get().dismissToast(id), kind === 'err' ? 7000 : 3500)
  },
  dismissToast(id) { set({ toasts: get().toasts.filter((t) => t.id !== id) }) },

  async connectSupabase(cfg) {
    setSupabaseConfig(cfg)
    window.location.reload()
  },
  disconnectSupabase() {
    setSupabaseConfig(null)
    window.location.reload()
  },
  async signIn(email, password) {
    const sb = getSupabaseClient()
    if (!sb) return 'Supabase не е поврзан.'
    const { error } = await sb.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  },
  async signOut() {
    const sb = getSupabaseClient()
    if (sb) await sb.auth.signOut()
  },
  async migrateLocalToSupabase() {
    const local = await new LocalAdapter().load()
    const { adapter } = get()
    if (adapter.kind !== 'supabase') throw new Error('Не е поврзан Supabase')
    for (const c of COLLECTIONS) await adapter.bulkUpsert(c, local[c] as Row<typeof c>[])
    await adapter.saveSettings(local.settings)
    const data = await adapter.load()
    set({ data })
    return { orders: local.orders.length }
  },
}))

function pickCollections(b: Backup): Omit<AppData, 'settings'> {
  return {
    products: b.products ?? [],
    additional_costs: b.additional_costs ?? [],
    orders: b.orders ?? [],
    client_notes: b.client_notes ?? [],
    inventory: b.inventory ?? [],
    expenses: b.expenses ?? [],
    freelance: b.freelance ?? [],
  }
}

export function describeError(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

export function uid(): string {
  return crypto.randomUUID()
}

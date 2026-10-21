import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { COLLECTIONS, DEFAULT_SETTINGS, type AppData, type Collection, type Row, type Settings } from '../types'
import type { StorageAdapter } from './types'

export interface SupabaseConfig { url: string; anonKey: string }

const CONFIG_KEY = 'artify:supabase'

export function getSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw) as SupabaseConfig
  } catch { /* ignore */ }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (url && anonKey) return { url, anonKey }
  return null
}

export function setSupabaseConfig(cfg: SupabaseConfig | null) {
  if (cfg) localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
  else localStorage.removeItem(CONFIG_KEY)
}

let client: SupabaseClient | null = null
export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client
  const cfg = getSupabaseConfig()
  if (!cfg) return null
  client = createClient(cfg.url, cfg.anonKey)
  return client
}

/** Every table has the same shape: id text PK, user_id uuid, data jsonb, updated_at. */
export class SupabaseAdapter implements StorageAdapter {
  kind = 'supabase' as const
  private sb: SupabaseClient
  constructor(sb: SupabaseClient) { this.sb = sb }

  async load(): Promise<AppData> {
    const data = { settings: DEFAULT_SETTINGS } as AppData
    const { data: s, error: se } = await this.sb.from('settings').select('data').eq('id', 'settings').maybeSingle()
    if (se) throw se
    if (s?.data) data.settings = { ...DEFAULT_SETTINGS, ...(s.data as Settings) }
    for (const c of COLLECTIONS) {
      const rows: unknown[] = []
      let from = 0
      const page = 1000
      // paginate: the default API limit is 1000 rows
      for (;;) {
        const { data: chunk, error } = await this.sb.from(c).select('data').range(from, from + page - 1)
        if (error) throw error
        rows.push(...(chunk ?? []).map((r) => r.data))
        if (!chunk || chunk.length < page) break
        from += page
      }
      ;(data as unknown as Record<string, unknown>)[c] = rows
    }
    return data
  }

  async upsert<C extends Collection>(c: C, row: Row<C>) {
    const { error } = await this.sb.from(c).upsert({ id: row.id, data: row, updated_at: new Date().toISOString() })
    if (error) throw error
  }

  async bulkUpsert<C extends Collection>(c: C, rows: Row<C>[]) {
    const now = new Date().toISOString()
    for (let i = 0; i < rows.length; i += 300) {
      const chunk = rows.slice(i, i + 300).map((r) => ({ id: r.id, data: r, updated_at: now }))
      const { error } = await this.sb.from(c).upsert(chunk)
      if (error) throw error
    }
  }

  async remove(c: Collection, id: string) {
    const { error } = await this.sb.from(c).delete().eq('id', id)
    if (error) throw error
  }

  async replaceAll(data: AppData) {
    for (const c of COLLECTIONS) {
      const { error } = await this.sb.from(c).delete().neq('id', '')
      if (error) throw error
      await this.bulkUpsert(c, data[c] as Row<typeof c>[])
    }
    await this.saveSettings(data.settings)
  }

  async saveSettings(s: Settings) {
    const { error } = await this.sb.from('settings').upsert({ id: 'settings', data: s, updated_at: new Date().toISOString() })
    if (error) throw error
    // јавна копија само на логото и името — за екранот за најава пред да има сесија
    await this.sb.from('brand').upsert({ id: 'brand', logo: s.logo, name: s.business_name || 'Artify', updated_at: new Date().toISOString() }).then(() => undefined, () => undefined)
  }
}

/** Reads the public brand (logo + name) without a session; null if the table is missing. */
export async function fetchPublicBrand(): Promise<{ logo: string | null; name: string } | null> {
  const sb = getSupabaseClient()
  if (!sb) return null
  const { data, error } = await sb.from('brand').select('logo,name').eq('id', 'brand').maybeSingle()
  if (error || !data) return null
  return { logo: (data.logo as string | null) ?? null, name: (data.name as string) || 'Artify' }
}

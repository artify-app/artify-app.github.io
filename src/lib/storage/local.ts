import { get, set, createStore } from 'idb-keyval'
import { COLLECTIONS, DEFAULT_SETTINGS, type AppData, type Collection, type Row, type Settings } from '../types'
import type { StorageAdapter } from './types'

const store = createStore('artify-db', 'artify')

async function readCollection<C extends Collection>(c: C): Promise<Row<C>[]> {
  return ((await get(c, store)) as Row<C>[] | undefined) ?? []
}

export class LocalAdapter implements StorageAdapter {
  kind = 'local' as const
  private cache: Partial<Record<Collection, unknown[]>> = {}

  async load(): Promise<AppData> {
    const settings = ((await get('settings', store)) as Settings | undefined) ?? DEFAULT_SETTINGS
    const data = { settings: { ...DEFAULT_SETTINGS, ...settings } } as AppData
    for (const c of COLLECTIONS) {
      const rows = await readCollection(c)
      this.cache[c] = rows
      ;(data as unknown as Record<string, unknown>)[c] = rows
    }
    return data
  }

  private async write<C extends Collection>(c: C, rows: Row<C>[]) {
    this.cache[c] = rows
    await set(c, rows, store)
  }

  async upsert<C extends Collection>(c: C, row: Row<C>) {
    const rows = [...((this.cache[c] as Row<C>[] | undefined) ?? (await readCollection(c)))]
    const i = rows.findIndex((r) => r.id === row.id)
    if (i >= 0) rows[i] = row
    else rows.push(row)
    await this.write(c, rows)
  }

  async bulkUpsert<C extends Collection>(c: C, incoming: Row<C>[]) {
    const rows = [...((this.cache[c] as Row<C>[] | undefined) ?? (await readCollection(c)))]
    const idx = new Map(rows.map((r, i) => [r.id, i]))
    for (const row of incoming) {
      const i = idx.get(row.id)
      if (i !== undefined) rows[i] = row
      else { idx.set(row.id, rows.length); rows.push(row) }
    }
    await this.write(c, rows)
  }

  async remove(c: Collection, id: string) {
    const rows = ((this.cache[c] as { id: string }[] | undefined) ?? (await readCollection(c))).filter((r) => r.id !== id)
    await this.write(c, rows as Row<typeof c>[])
  }

  async replaceAll(data: AppData) {
    for (const c of COLLECTIONS) await this.write(c, data[c] as Row<typeof c>[])
    await this.saveSettings(data.settings)
  }

  async saveSettings(s: Settings) {
    await set('settings', s, store)
  }
}

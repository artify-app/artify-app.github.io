import type { AppData, Collection, Row, Settings } from '../types'

export interface StorageAdapter {
  kind: 'local' | 'supabase'
  load(): Promise<AppData>
  upsert<C extends Collection>(c: C, row: Row<C>): Promise<void>
  bulkUpsert<C extends Collection>(c: C, rows: Row<C>[]): Promise<void>
  remove(c: Collection, id: string): Promise<void>
  replaceAll(data: AppData): Promise<void>
  saveSettings(s: Settings): Promise<void>
}

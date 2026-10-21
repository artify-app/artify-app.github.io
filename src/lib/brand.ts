// Единствен извор за лого и име: ги чита од подесувањата, а ги кешира во localStorage
// за да се прикажат и пред вчитување на податоците (екран за најава, PIN) и во tab иконата.
import { useSyncExternalStore } from 'react'
import { useStore } from './store'

const KEY = 'artify:brand'
export interface Brand { logo: string | null; name: string }

let cached: Brand = readCache()
const listeners = new Set<() => void>()

function readCache(): Brand {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r) as Brand } catch { /* ignore */ }
  return { logo: null, name: 'Artify' }
}

export function setBrand(b: Brand) {
  if (b.logo === cached.logo && b.name === cached.name) return
  cached = b
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* ignore */ }
  applyBrandToDocument(b)
  listeners.forEach((l) => l())
}

export function applyBrandToDocument(b: Brand) {
  document.title = b.name || 'Artify'
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
  if (b.logo) { link.href = b.logo; link.type = b.logo.startsWith('data:image/svg') ? 'image/svg+xml' : '' }
  else { link.href = import.meta.env.BASE_URL + 'favicon.svg'; link.type = 'image/svg+xml' }
}

/** Brand from settings when loaded, otherwise the cached copy. */
export function useBrand(): Brand {
  const settings = useStore((s) => (s.loaded ? s.data.settings : null))
  const c = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => cached)
  if (settings) {
    const b = { logo: settings.logo, name: settings.business_name || 'Artify' }
    if (b.logo !== c.logo || b.name !== c.name) queueMicrotask(() => setBrand(b))
    return b
  }
  return c
}

export function initBrand() { applyBrandToDocument(cached) }

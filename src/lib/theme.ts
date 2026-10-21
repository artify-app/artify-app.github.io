import { useEffect, useState } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'artify:theme'

function read(): ThemePref {
  try { return (localStorage.getItem(KEY) as ThemePref) || 'system' } catch { return 'system' }
}

export function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read)
  useEffect(() => {
    applyTheme(pref)
    try { localStorage.setItem(KEY, pref) } catch { /* ignore */ }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => applyTheme(read())
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [pref])
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  return { pref, setPref, isDark }
}

export function applyAccent(accent: string | undefined) {
  document.documentElement.dataset.accent = accent && accent !== 'violet' ? accent : ''
}

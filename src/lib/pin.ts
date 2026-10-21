// PIN заклучување за локалниот режим — PIN-от се чува само како hash во овој прелистувач.
const KEY = 'artify:pin'
const UNLOCK_KEY = 'artify:unlocked_at'
export const LOCK_AFTER_MS = 15 * 60 * 1000

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('artify|' + s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function hasPin(): boolean {
  try { return !!localStorage.getItem(KEY) } catch { return false }
}
export async function setPin(pin: string) {
  localStorage.setItem(KEY, await sha(pin))
  touch()
}
export function clearPin() {
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(UNLOCK_KEY)
}
export async function verifyPin(pin: string): Promise<boolean> {
  const ok = localStorage.getItem(KEY) === (await sha(pin))
  if (ok) touch()
  return ok
}
export function touch() {
  try { sessionStorage.setItem(UNLOCK_KEY, String(Date.now())) } catch { /* ignore */ }
}
export function isLocked(): boolean {
  if (!hasPin()) return false
  const t = Number(sessionStorage.getItem(UNLOCK_KEY) || 0)
  return Date.now() - t > LOCK_AFTER_MS
}

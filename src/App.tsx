import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useStore } from './lib/store'
import { Spinner, Button, Card } from './components/ui'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import OrderEditor from './pages/OrderEditor'
import Clients from './pages/Clients'
import ClientProfile from './pages/ClientProfile'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Statistics from './pages/Statistics'
import Expenses from './pages/Expenses'
import Freelance from './pages/Freelance'
import CalendarPage from './pages/Calendar'
import SettingsPage from './pages/Settings'
import Login from './pages/Login'
import Welcome from './pages/Welcome'
import PinLock from './components/PinLock'

export default function App() {
  const init = useStore((s) => s.init)
  const { loaded, loading, error, mode, session, authReady, data } = useStore()
  useEffect(() => { void init() }, [init])

  if (!authReady || loading) return <div className="min-h-full flex items-center justify-center"><Spinner label="Се вчитува…" /></div>
  if (mode === 'supabase' && !session) return <Login />
  if (error) return <ErrorScreen error={error} />
  if (!loaded) return <div className="min-h-full flex items-center justify-center"><Spinner label="Се вчитува…" /></div>
  const empty = data.orders.length === 0 && data.products.length === 0

  return (
    <PinLock>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={empty ? <Welcome /> : <Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/new" element={<OrderEditor />} />
          <Route path="orders/:id" element={<OrderEditor />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:name" element={<ClientProfile />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="freelance" element={<Freelance />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
    </PinLock>
  )
}

function ErrorScreen({ error }: { error: string }) {
  const paused = /fetch|network|failed|paused|503|522/i.test(error)
  const disconnect = useStore((s) => s.disconnectSupabase)
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <Card className="max-w-md w-full" title={paused ? 'Базата не е достапна' : 'Грешка'}>
        <p className="text-sm text-ink-2">
          {paused
            ? 'Supabase проектот најверојатно е паузиран поради неактивност. Отвори го Supabase панелот, кликни „Restore project“, почекај 1–2 минути и освежи ја страницава.'
            : error}
        </p>
        <div className="flex gap-2 mt-4">
          <Button variant="primary" onClick={() => window.location.reload()}>Освежи</Button>
          <a className="inline-flex" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"><Button>Отвори Supabase</Button></a>
          <Button variant="ghost" onClick={disconnect}>Работи локално</Button>
        </div>
      </Card>
    </div>
  )
}

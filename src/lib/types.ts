export type ID = string

export interface FrameOption { label: string; cost: number }

export interface Product {
  id: ID
  name: string
  has_frame_options: boolean
  frame_options: FrameOption[]
  static_cost: number
  active: boolean
  sort: number
}

export interface AdditionalCostPreset { id: ID; name: string; amount: number }

export interface OrderItem {
  id: ID
  product_id: ID | null
  product_name: string
  variant: string
  quantity: number
  unit_price: number
  unit_cost: number
}

export interface OrderExtraCost { name: string; amount: number }
export interface OrderMaterial { inventory_id: ID | null; name: string; quantity: number }

export type OrderStatus = 'active' | 'canceled' | 'draft'

export interface Order {
  id: ID
  order_no: string
  customer_name: string
  order_date: string // YYYY-MM-DD
  items: OrderItem[]
  additional_costs: OrderExtraCost[]
  materials: OrderMaterial[]
  total_price: number
  total_cost: number
  net_earnings: number
  paid: boolean
  status: OrderStatus
  delivery_address: string
  notes: string
  reference_image: string | null
  highlighted: boolean
  created_at: string
  updated_at: string
}

export interface ClientNote { id: ID; client_name: string; notes: string }

export interface InventoryItem {
  id: ID
  name: string
  quantity: number
  unit: string
  low_stock_threshold: number
  notes: string
  tracked?: boolean // false = не се следи залиха, нема известувања
}

export interface Expense { id: ID; date: string; amount: number; description: string; category: string }

export type FreelanceStatus = 'paid' | 'pending'
export interface FreelanceProject {
  id: ID
  project: string
  client: string
  amount: number
  net_earnings: number
  status: FreelanceStatus
  due_date: string | null
  notes: string
}

export type DashboardWidget = 'stats' | 'recent_orders' | 'insights' | 'products'

export interface Settings {
  business_name: string
  logo: string | null // data URL
  currency: string
  dashboard_widgets: DashboardWidget[]
  hide_financials: boolean
  accent?: string
  alerts_popup?: boolean
}

export interface AppData {
  settings: Settings
  products: Product[]
  additional_costs: AdditionalCostPreset[]
  orders: Order[]
  client_notes: ClientNote[]
  inventory: InventoryItem[]
  expenses: Expense[]
  freelance: FreelanceProject[]
}

export type Collection = Exclude<keyof AppData, 'settings'>
export type Row<C extends Collection> = AppData[C][number]

export interface Backup extends AppData { app: 'artify'; version: 1; exported_at: string }

export const DEFAULT_SETTINGS: Settings = {
  business_name: 'Artify',
  logo: null,
  currency: 'ден.',
  dashboard_widgets: ['stats', 'recent_orders', 'insights', 'products'],
  hide_financials: false,
  accent: 'violet',
}

export const EMPTY_DATA: AppData = {
  settings: DEFAULT_SETTINGS,
  products: [],
  additional_costs: [],
  orders: [],
  client_notes: [],
  inventory: [],
  expenses: [],
  freelance: [],
}

export const COLLECTIONS: Collection[] = [
  'products', 'additional_costs', 'orders', 'client_notes', 'inventory', 'expenses', 'freelance',
]

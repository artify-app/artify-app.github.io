import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyTheme } from './lib/theme'
import { initBrand } from './lib/brand'

initBrand()
applyTheme((localStorage.getItem('artify:theme') as 'light' | 'dark' | 'system') || 'system')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

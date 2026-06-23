import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        expand
        visibleToasts={3}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-surface-raised)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '16px',
            boxShadow: '0 8px 32px -4px rgba(0,0,0,0.3)',
          },
        }}
      />
      <App />
    </BrowserRouter>
  </StrictMode>,
)

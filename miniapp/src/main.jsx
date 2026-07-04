import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nContext'
import './index.css'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import ErrorBoundary from './components/ErrorBoundary'

const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <I18nProvider>
          <App />
        </I18nProvider>
      </TonConnectUIProvider>
    </ErrorBoundary>
  </StrictMode>,
)

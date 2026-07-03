import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n/I18nContext'
import './index.css'
import { TonConnectUIProvider } from '@tonconnect/ui-react'

// When running on localhost, standard path /tonconnect-manifest.json works if served from public directory
const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </TonConnectUIProvider>
  </React.StrictMode>
)

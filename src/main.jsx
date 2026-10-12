import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { IdiomaProvider } from './i18n/LanguageContext.jsx'
import { TemaProvider } from './theme/ThemeContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TemaProvider>
      <IdiomaProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </IdiomaProvider>
    </TemaProvider>
  </React.StrictMode>
)

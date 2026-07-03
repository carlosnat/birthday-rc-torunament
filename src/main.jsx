// src/main.jsx — punto de entrada. El rol se elige por la URL (?rol=harness|publico).
// Navegación sin react-router: se lee el query param una vez al montar.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TournamentProvider } from './context/TournamentContext.jsx'
import Harness from './views/harness/Harness.jsx'
import PublicoEspejo from './views/publico/PublicoEspejo.jsx'

import './styles/tokens.css'
import './styles/layout.css'
import './styles/components.css'

const rol = new URLSearchParams(window.location.search).get('rol') || 'harness'

const VISTAS = {
  harness: Harness,
  publico: PublicoEspejo,
}

const Vista = VISTAS[rol] || Harness

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TournamentProvider>
      <Vista />
    </TournamentProvider>
  </StrictMode>,
)

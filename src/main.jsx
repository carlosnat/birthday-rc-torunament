// src/main.jsx — punto de entrada. Rol y torneo por URL (?t=uuid&rol=...).
// Navegación sin react-router: se lee el query param una vez al montar.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TournamentProvider } from './context/TournamentContext.jsx'
import { TORNEO_ID, ROL } from './currentTorneo.js'
import Landing from './views/landing/Landing.jsx'
import Harness from './views/harness/Harness.jsx'
import PublicoEspejo from './views/publico/PublicoEspejo.jsx'
import Registro from './views/registro/Registro.jsx'

import './styles/tokens.css'
import './styles/layout.css'
import './styles/components.css'

const VISTAS = {
  harness: Harness,
  publico: PublicoEspejo,
  registro: Registro,
}

const Vista = !TORNEO_ID ? Landing : VISTAS[ROL] || Harness

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TournamentProvider>
      <Vista />
    </TournamentProvider>
  </StrictMode>,
)

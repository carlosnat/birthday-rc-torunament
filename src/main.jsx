// src/main.jsx — punto de entrada. Rol y torneo por URL (?t=uuid&rol=...).
// Navegación sin react-router: se lee el query param una vez al montar.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TournamentProvider } from './context/TournamentContext.jsx'
import { TORNEO_ID, ROL } from './currentTorneo.js'
import Landing from './views/landing/Landing.jsx'
import Harness from './views/harness/Harness.jsx'
import Publico from './views/publico/Publico.jsx'
import PublicoEspejo from './views/publico/PublicoEspejo.jsx'
import Registro from './views/registro/Registro.jsx'
import Sensor from './views/sensor/Sensor.jsx'
import Comisario from './views/comisario/Comisario.jsx'
import Equipo from './views/equipo/Equipo.jsx'

import './styles/tokens.css'
import './styles/layout.css'
import './styles/components.css'

const VISTAS = {
  harness: Harness,
  publico: Publico,
  espejo: PublicoEspejo,
  registro: Registro,
  sensor: Sensor,
  comisario: Comisario,
  equipo: Equipo,
}

// El sensor (Hito 3a) funciona sin ?t (aún no escribe en RTDB); el resto necesita torneo.
const Vista = ROL === 'sensor' ? Sensor : !TORNEO_ID ? Landing : VISTAS[ROL] || Harness

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TournamentProvider>
      <Vista />
    </TournamentProvider>
  </StrictMode>,
)

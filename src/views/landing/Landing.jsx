// src/views/landing/Landing.jsx
// Pantalla inicial cuando la URL no trae ?t. Permite crear un torneo (uuid) y entrar.

import { useState } from 'react'
import { nuevoTorneoId, irA } from '../../currentTorneo.js'
import { crearTorneo, seedTorneoDemo } from '../../firebase/tournamentDb.js'

export default function Landing() {
  const [creando, setCreando] = useState(false)

  async function crear(demo) {
    setCreando(true)
    const t = nuevoTorneoId()
    if (demo) await seedTorneoDemo(t)
    else await crearTorneo(t)
    irA(demo ? 'harness' : 'publico', t)
  }

  return (
    <div className="app stack">
      <h1>RC RACE TIMING</h1>
      <div className="panel stack">
        <h2>NUEVO TORNEO</h2>
        <button className="btn btn--primary" disabled={creando} onClick={() => crear(false)}>
          CREAR TORNEO (REGISTRO POR QR)
        </button>
        <button className="btn" disabled={creando} onClick={() => crear(true)}>
          TORNEO DEMO (EQUIPOS DE PRUEBA)
        </button>
      </div>
      <div className="panel text-dim">
        ABRÍ UN TORNEO EXISTENTE CON ?t=UUID&rol=harness|publico|registro EN LA URL.
      </div>
    </div>
  )
}

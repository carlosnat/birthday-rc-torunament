// src/views/landing/Landing.jsx
// Pantalla inicial cuando la URL no trae ?t. Muestra una grilla de torneos creados
// y una tarjeta '+' para abrir el formulario de alta.

import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../../firebase/firebase.js'
import * as P from '../../firebase/paths.js'
import { nuevoTorneoId, irA } from '../../currentTorneo.js'
import { crearTorneo, seedTorneoDemo } from '../../firebase/tournamentDb.js'
import CreateTournamentForm from './CreateTournamentForm.jsx'
import './landing.css'

export default function Landing() {
  const [creando, setCreando] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [torneosIndex, setTorneosIndex] = useState({})

  useEffect(() => {
    const r = ref(db, P.torneosIndex())
    const unsub = onValue(r, (snap) => {
      setTorneosIndex(snap.val() || {})
    })
    return () => unsub()
  }, [])

  const torneosOrdenados = useMemo(
    () =>
      Object.entries(torneosIndex)
        .map(([id, torneo]) => ({ id, ...torneo }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [torneosIndex],
  )

  async function crear(demo, config) {
    setCreando(true)
    try {
      const t = nuevoTorneoId()
      if (demo) {
        await seedTorneoDemo(t)
        irA('harness', t)
        return
      }
      await crearTorneo(t, config)
      irA('comisario', t)
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="app stack landing">
      <h1>RC RACE TIMING</h1>

      <div className="landing-grid">
        <button
          type="button"
          className="landing-tile landing-tile--create"
          onClick={() => setMostrarFormulario(true)}
        >
          <span className="landing-plus">+</span>
          <span className="landing-tile-text">CREAR TORNEO</span>
        </button>

        {torneosOrdenados.length === 0 ? (
          <div className="landing-empty panel">
            <h2>TORNEOS CREADOS</h2>
            <p className="text-dim">AÚN NO HAY TORNEOS REGISTRADOS.</p>
          </div>
        ) : (
          torneosOrdenados.map((torneo) => (
            <article key={torneo.id} className="landing-tile landing-tile--torneo">
              <div className="landing-tile-top">
                <h3>{torneo.nombre}</h3>
                <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                  {torneo.demo && <span className="landing-badge">DEMO</span>}
                  {torneo.reiniciado && <span className="landing-badge landing-badge--reiniciado">REINICIADO</span>}
                </div>
              </div>
              <div className="landing-tile-meta">{torneo.circuitoCount} CIRCUITOS · {torneo.sesionesCount} SESIONES</div>
              {torneo.reiniciado && torneo.origenTorneoId && (
                <div className="landing-tile-meta text-dim">DESDE {torneo.origenTorneoId}</div>
              )}
              <div className="landing-tile-meta text-dim">{torneo.estado}</div>
              <div className="landing-open">
                <span className="landing-open-label">ABRIR</span>
                <div className="row landing-open-actions">
                  <button className="btn btn--ghost" onClick={() => irA('comisario', torneo.id)}>
                    COMISARIO
                  </button>
                  <button className="btn btn--ghost" onClick={() => irA('publico', torneo.id)}>
                    PUBLICO
                  </button>
                  <button className="btn btn--ghost" onClick={() => irA('equipo', torneo.id)}>
                    EQUIPO
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {mostrarFormulario && (
        <CreateTournamentForm
          creating={creando}
          onCancel={() => setMostrarFormulario(false)}
          onCreate={async (config) => {
            await crear(false, config)
          }}
        />
      )}

      <div className="row landing-actions">
        <button
          className="btn"
          disabled={creando}
          onClick={() => crear(true)}
        >
          TORNEO DEMO (EQUIPOS DE PRUEBA)
        </button>
      </div>

      <div className="panel text-dim">
        ABRÍ UN TORNEO EXISTENTE CON ?t=UUID&rol=harness|publico|registro|comisario|equipo|sensor EN LA URL.
      </div>
    </div>
  )
}

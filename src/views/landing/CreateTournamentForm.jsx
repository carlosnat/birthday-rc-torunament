// src/views/landing/CreateTournamentForm.jsx
// Formulario separado para construir la config del torneo antes de crear el uuid.

import { useState } from 'react'
import { DEFAULT_CONFIG } from '../../firebase/seed.js'
import { TIPO_SESION } from '../../domain/constants.js'
import { nuevoTorneoId } from '../../currentTorneo.js'

const DEFAULT_RACE_LAPS = 3
const DEFAULT_QUALY_LAPS = 2
const DEFAULT_TIME_MIN = 3000

function nuevoCircuito(index) {
  return {
    id: nuevoTorneoId(),
    nombre: `CIRCUITO ${index + 1}`,
    vueltasCarrera: DEFAULT_RACE_LAPS,
    practica: true,
    qualy: true,
    tiempoMinimoVuelta: DEFAULT_TIME_MIN,
  }
}

function construirConfig(nombreTorneo, circuitos) {
  return {
    ...DEFAULT_CONFIG,
    nombre: nombreTorneo.trim() || DEFAULT_CONFIG.nombre,
    circuitos: circuitos.map((circuito, index) => {
      const circuitoId = `c${index + 1}`
      const sesiones = []

      if (circuito.practica) {
        sesiones.push({ id: `${circuitoId}-practica`, tipo: TIPO_SESION.PRACTICA, vueltas: 0 })
      }

      if (circuito.qualy) {
        sesiones.push({ id: `${circuitoId}-qualy`, tipo: TIPO_SESION.QUALY, vueltas: DEFAULT_QUALY_LAPS })
      }

      sesiones.push({
        id: `${circuitoId}-carrera`,
        tipo: TIPO_SESION.CARRERA,
        vueltas: Math.max(1, Number(circuito.vueltasCarrera) || DEFAULT_RACE_LAPS),
      })

      return {
        id: circuitoId,
        nombre: circuito.nombre.trim() || `CIRCUITO ${index + 1}`,
        tiempoMinimoVuelta: Math.max(500, Number(circuito.tiempoMinimoVuelta) || DEFAULT_TIME_MIN),
        sesiones,
      }
    }),
  }
}

export default function CreateTournamentForm({ onCreate, onCancel, creating }) {
  const [nombreTorneo, setNombreTorneo] = useState(DEFAULT_CONFIG.nombre)
  const [circuitos, setCircuitos] = useState(() => [nuevoCircuito(0), nuevoCircuito(1)])

  function agregarCircuito() {
    setCircuitos((prev) => [...prev, nuevoCircuito(prev.length)])
  }

  function borrarCircuito(id) {
    setCircuitos((prev) => (prev.length <= 1 ? prev : prev.filter((circuito) => circuito.id !== id)))
  }

  function actualizarCircuito(index, key, value) {
    setCircuitos((prev) => prev.map((circuito, circuitoIndex) => (
      circuitoIndex === index ? { ...circuito, [key]: value } : circuito
    )))
  }

  function submit(e) {
    e.preventDefault()
    onCreate(construirConfig(nombreTorneo, circuitos))
  }

  return (
    <form className="panel stack landing-card" onSubmit={submit}>
      <h2>NUEVO TORNEO</h2>

      <div className="form-section">
        <label className="landing-label" htmlFor="torneo-nombre">NOMBRE DEL TORNEO</label>
        <input
          id="torneo-nombre"
          className="input"
          value={nombreTorneo}
          onChange={(e) => setNombreTorneo(e.target.value)}
          placeholder="GP CUMPLE RC"
        />
      </div>

      <div className="form-section">
        <div className="row circuit-header">
          <label className="landing-label">CIRCUITOS</label>
          <button className="btn btn--ghost" type="button" onClick={agregarCircuito} disabled={creating}>
            + AGREGAR CIRCUITO
          </button>
        </div>
      </div>

      <div className="stack">
        {circuitos.map((circuito, index) => (
          <div key={circuito.id} className="card-circuit">
            <div className="row circuit-header">
              <h3>CIRCUITO {index + 1}</h3>
              <div className="row circuit-actions">
                <span className="text-dim">CONFIGURABLE</span>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => borrarCircuito(circuito.id)}
                  disabled={creating || circuitos.length <= 1}
                >
                  BORRAR
                </button>
              </div>
            </div>

            <div className="form-section">
              <label className="landing-label">NOMBRE</label>
              <input
                className="input"
                value={circuito.nombre}
                onChange={(e) => actualizarCircuito(index, 'nombre', e.target.value)}
                placeholder={`CIRCUITO ${index + 1}`}
              />
            </div>

            <div className="form-section">
              <label className="landing-label">VUELTAS DE CARRERA</label>
              <input
                className="input input--sm"
                type="number"
                min="1"
                value={circuito.vueltasCarrera}
                onChange={(e) => actualizarCircuito(index, 'vueltasCarrera', Number(e.target.value))}
              />
            </div>

            <div className="row toggles">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={circuito.practica}
                  onChange={(e) => actualizarCircuito(index, 'practica', e.target.checked)}
                />
                <span>PRACTICA LIBRE</span>
              </label>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={circuito.qualy}
                  onChange={(e) => actualizarCircuito(index, 'qualy', e.target.checked)}
                />
                <span>QUALY</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="row landing-actions">
        <button className="btn btn--primary" type="submit" disabled={creating}>CREAR TORNEO CONFIGURADO</button>
        <button className="btn" type="button" disabled={creating} onClick={onCancel}>CANCELAR</button>
      </div>
    </form>
  )
}
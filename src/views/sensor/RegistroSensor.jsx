// src/views/sensor/RegistroSensor.jsx
// Alta de sensor desde la pantalla de sensor.

import { useState } from 'react'
import * as R from '../../firebase/registroActions.js'

export default function RegistroSensor({ onListo }) {
  const [nombre, setNombre] = useState('')
  const [msg, setMsg] = useState(null)

  async function registrar() {
    const res = await R.registrarSensor(nombre)
    setMsg(res.ok ? '¡SENSOR REGISTRADO! EL COMISARIO LO ORDENARÁ EN PISTA.' : res.motivo)
    if (res.ok) {
      setNombre('')
      onListo?.(res.sensorId)
    }
  }

  return (
    <div className="panel stack">
      <h2>REGISTRAR SENSOR</h2>
      <input className="input" placeholder='NOMBRE (EJ: "META")' value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <button className="btn btn--primary" disabled={!nombre} onClick={registrar}>REGISTRAR</button>
      {msg && <div className="text-dim">{msg}</div>}
    </div>
  )
}
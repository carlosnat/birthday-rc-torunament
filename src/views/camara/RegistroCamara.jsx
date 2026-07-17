// src/views/camara/RegistroCamara.jsx
// Alta de la cámara. Espeja RegistroSensor.jsx: el componente no persiste nada, avisa por
// onListo y el padre decide. La diferencia es que acá el alta puede fallar por ocupada.

import { useState } from 'react'
import { reclamarCamara } from '../../webrtc/camaraActions.js'

const MOTIVOS = {
  CAMARA_OCUPADA: 'YA HAY UNA CÁMARA TRANSMITIENDO. SI SE CAE, ESTA PANTALLA SE HABILITA SOLA.',
  DATOS_INCOMPLETOS: 'PONELE UN NOMBRE.',
}

export default function RegistroCamara({ idPrevio, onListo }) {
  const [nombre, setNombre] = useState('')
  const [msg, setMsg] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function reclamar() {
    setEnviando(true)
    const res = await reclamarCamara(nombre, idPrevio)
    setEnviando(false)
    if (res.ok) {
      setNombre('')
      onListo?.(res.camId)
    } else {
      setMsg(MOTIVOS[res.motivo] || res.motivo)
    }
  }

  return (
    <div className="panel stack">
      <h2>TRANSMITIR</h2>
      <div className="text-dim">
        SUMÁ TU CELULAR COMO CÁMARA. LO QUE FILMES SE VE EN LA PANTALLA GRANDE.
      </div>
      <input
        className="input"
        placeholder='NOMBRE (EJ: "CURVA 1")'
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <button className="btn btn--primary" disabled={!nombre || enviando} onClick={reclamar}>
        {enviando ? 'TOMANDO…' : 'TOMAR LA CÁMARA'}
      </button>
      {msg && <div className="text-dim">{msg}</div>}
    </div>
  )
}

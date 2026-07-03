// src/components/SemaforoF1.jsx
// Semáforo de largada estilo F1: las 5 luces rojas se encienden de a una durante
// LARGADA; al pasar a EN_CURSO se apagan ("lights out and away we go!").

import { useEffect, useRef, useState } from 'react'
import { SESION } from '../domain/constants.js'
import { beepLuz, beepVerde } from '../utils/audio.js'

const COLUMNAS = [0, 1, 2, 3, 4]

export default function SemaforoF1({ estado, sonido }) {
  const [luces, setLuces] = useState(0)
  const prevEstado = useRef(estado)

  // Encendido secuencial durante LARGADA.
  useEffect(() => {
    if (estado !== SESION.LARGADA) return
    setLuces(0)
    let n = 0
    const id = setInterval(() => {
      n += 1
      setLuces(n)
      if (sonido) beepLuz()
      if (n >= 5) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [estado, sonido])

  // Transición LARGADA -> EN_CURSO = luces apagadas + sonido de largada.
  useEffect(() => {
    if (prevEstado.current === SESION.LARGADA && estado === SESION.EN_CURSO) {
      setLuces(0)
      if (sonido) beepVerde()
    }
    prevEstado.current = estado
  }, [estado, sonido])

  const verde = estado === SESION.EN_CURSO

  return (
    <div className="semaforo-wrap">
      <div className="semaforo">
        {COLUMNAS.map((i) => (
          <div key={i} className="semaforo-col">
            <div className={`luz ${luces > i ? 'luz--on' : ''}`} />
            <div className={`luz ${luces > i ? 'luz--on' : ''}`} />
          </div>
        ))}
      </div>
      {verde ? (
        <div className="semaforo-msg verde">¡LARGARON!</div>
      ) : estado === SESION.LARGADA ? (
        <div className="semaforo-msg">{luces < 5 ? 'PREPARADOS…' : 'ESPERANDO LARGADA…'}</div>
      ) : null}
    </div>
  )
}

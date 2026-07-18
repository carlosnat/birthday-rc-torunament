// src/views/publico/paneles/Cabecera.jsx
// Fila 1: identidad del torneo e info de la sesión en curso.

import { esSesionTemporizada, formatCountdown, tiempoRestanteEn } from '../../../domain/sessionTimer.js'
import { nombreTipo } from '../../../domain/constants.js'
import './cabecera.css'

export default function Cabecera({ torneo, sesion, orden, now }) {
  const lider = orden?.[0]
  const temporizada = esSesionTemporizada(sesion)
  const restanteMs = temporizada ? tiempoRestanteEn(sesion, now) : null

  return (
    <header className="cab">
      <h1 className="cab-titulo">{torneo.config?.nombre}</h1>

      <div className="cab-meta">
        {torneo.circuitoActivo && <span>{torneo.circuitoActivo}</span>}
        {sesion && <span className="cab-tipo">{nombreTipo(sesion.tipo)}</span>}
        {sesion?.vueltasObjetivo > 0 && lider && (
          <span className="cab-vuelta">
            VUELTA {Math.min(lider.vueltas, sesion.vueltasObjetivo)}/{sesion.vueltasObjetivo}
          </span>
        )}
        {temporizada && <span className="cab-countdown">{formatCountdown(restanteMs)}</span>}
        <span className="cab-estado">{sesion ? sesion.estado : torneo.estado}</span>
      </div>
    </header>
  )
}

// src/components/TablaPuntos.jsx
// Campeonato: puntos acumulados del torneo (suma de las carreras finalizadas).

import { getColor } from '../domain/colors.js'
import ColorBadge from './ColorBadge.jsx'
import { avatarDeEquipo } from '../domain/participants.js'

export default function TablaPuntos({ standings, equipos, pilotosSesion }) {
  return (
    <div className="puntos">
      <div className="puntos-titulo">CAMPEONATO</div>
      {standings.map((s, i) => {
        const eq = equipos?.[s.eqId]
        const color = getColor(eq?.color)
        const avatarId = avatarDeEquipo(eq, pilotosSesion?.[s.eqId])
        return (
          <div key={s.eqId} className="puntos-row">
            <span className="puntos-pos">{i + 1}</span>
            <span className="tower-color" style={{ background: color?.hex }} />
            <span className="puntos-nombre"><ColorBadge colorId={eq?.color} nombre={eq?.nombre || s.eqId} avatarId={avatarId} /></span>
            <span className="puntos-val">{s.puntos}</span>
          </div>
        )
      })}
    </div>
  )
}

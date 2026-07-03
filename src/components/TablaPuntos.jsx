// src/components/TablaPuntos.jsx
// Campeonato: puntos acumulados del torneo (suma de las carreras finalizadas).

import { getColor } from '../domain/colors.js'

export default function TablaPuntos({ standings, equipos }) {
  return (
    <div className="puntos">
      <div className="puntos-titulo">CAMPEONATO</div>
      {standings.map((s, i) => {
        const eq = equipos?.[s.eqId]
        const color = getColor(eq?.color)
        return (
          <div key={s.eqId} className="puntos-row">
            <span className="puntos-pos">{i + 1}</span>
            <span className="tower-color" style={{ background: color?.hex }} />
            <span className="puntos-nombre">{eq?.nombre || s.eqId}</span>
            <span className="puntos-val">{s.puntos}</span>
          </div>
        )
      })}
    </div>
  )
}

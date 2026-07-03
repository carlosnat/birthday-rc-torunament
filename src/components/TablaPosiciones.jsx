// src/components/TablaPosiciones.jsx
// Posiciones en vivo estilo timing tower F1: posición, color, equipo, vueltas, gap.

import { getColor } from '../domain/colors.js'
import { CARRITO } from '../domain/constants.js'

function fmt(ms) {
  if (ms == null) return '—'
  return `${(ms / 1000).toFixed(2)}s`
}

export default function TablaPosiciones({ orden, gaps, equipos, vueltaRapidaEq }) {
  return (
    <div className="tower">
      {orden.map((r, i) => {
        const eq = equipos?.[r.eqId]
        const color = getColor(eq?.color)
        const dnf = r.estado === CARRITO.DNF
        const esRapida = r.eqId === vueltaRapidaEq
        return (
          <div key={r.eqId} className={`tower-row ${dnf ? 'dnf' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
            <div className="tower-pos">{r.posicion}</div>
            <div className="tower-color" style={{ background: color?.hex }} />
            <div className="tower-name">{eq?.nombre || r.eqId}</div>
            <div className="tower-laps">V{r.vueltas}</div>
            <div className={`tower-last ${esRapida ? 'rapida' : ''}`}>{fmt(r.ultimaVuelta)}</div>
            <div className="tower-gap">{dnf ? 'DNF' : gaps[r.eqId] || '—'}</div>
          </div>
        )
      })}
    </div>
  )
}

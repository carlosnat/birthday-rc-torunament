// src/components/Podio.jsx
// Podio F1: 2º - 1º - 3º con alturas. Recibe la clasificación ya ordenada.

import { getColor } from '../domain/colors.js'
import ColorBadge from './ColorBadge.jsx'
import { avatarDeEquipo } from '../domain/participants.js'

function Caja({ r, equipos, alto, clase, pilotosSesion }) {
  if (!r) return <div className="podio-caja vacia" />
  const eq = equipos?.[r.eqId]
  const color = getColor(eq?.color)
  const pilotoNombre = pilotosSesion?.[r.eqId]
  const avatarId = avatarDeEquipo(eq, pilotoNombre)
  return (
    <div className={`podio-caja ${clase}`}>
      <div className="podio-carro" style={{ background: color?.hex }} />
      <div className="podio-nombre">
        <ColorBadge colorId={eq?.color} nombre={eq?.nombre || r.eqId} avatarId={avatarId} />
      </div>
      {pilotoNombre ? <div className="text-dim">{pilotoNombre}</div> : null}
      <div className="podio-bloque" style={{ height: alto }}>
        <span className="podio-pos">{r.posicion}</span>
        {r.puntos ? <span className="podio-pts">{r.puntos} PT</span> : null}
      </div>
    </div>
  )
}

export default function Podio({ orden, equipos, pilotosSesion }) {
  const [p1, p2, p3] = orden
  return (
    <div className="podio">
      <Caja r={p2} equipos={equipos} alto={120} clase="plata" pilotosSesion={pilotosSesion} />
      <Caja r={p1} equipos={equipos} alto={170} clase="oro" pilotosSesion={pilotosSesion} />
      <Caja r={p3} equipos={equipos} alto={90} clase="bronce" pilotosSesion={pilotosSesion} />
    </div>
  )
}

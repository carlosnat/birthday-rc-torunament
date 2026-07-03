// src/components/Podio.jsx
// Podio F1: 2º - 1º - 3º con alturas. Recibe la clasificación ya ordenada.

import { getColor } from '../domain/colors.js'

function Caja({ r, equipos, alto, clase }) {
  if (!r) return <div className="podio-caja vacia" />
  const eq = equipos?.[r.eqId]
  const color = getColor(eq?.color)
  return (
    <div className={`podio-caja ${clase}`}>
      <div className="podio-carro" style={{ background: color?.hex }} />
      <div className="podio-nombre">{eq?.nombre || r.eqId}</div>
      <div className="podio-bloque" style={{ height: alto }}>
        <span className="podio-pos">{r.posicion}</span>
        {r.puntos ? <span className="podio-pts">{r.puntos} PT</span> : null}
      </div>
    </div>
  )
}

export default function Podio({ orden, equipos }) {
  const [p1, p2, p3] = orden
  return (
    <div className="podio">
      <Caja r={p2} equipos={equipos} alto={120} clase="plata" />
      <Caja r={p1} equipos={equipos} alto={170} clase="oro" />
      <Caja r={p3} equipos={equipos} alto={90} clase="bronce" />
    </div>
  )
}

// src/components/ColorBadge.jsx
// Muestra el color (identidad) de un equipo: punto + nombre.

import { getColor } from '../domain/colors.js'

export default function ColorBadge({ colorId, nombre }) {
  const color = getColor(colorId)
  return (
    <span className="badge">
      <span className="dot" style={{ background: color?.hex || '#888' }} />
      {nombre || color?.nombre || colorId}
    </span>
  )
}

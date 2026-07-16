// src/components/ColorBadge.jsx
// Muestra el color (identidad) de un equipo: punto + nombre.

import { getColor } from '../domain/colors.js'
import AvatarSprite from './AvatarSprite.jsx'

export default function ColorBadge({ colorId, nombre, avatarId }) {
  const color = getColor(colorId)
  return (
    <span className="badge">
      {avatarId ? <AvatarSprite avatarId={avatarId} size={22} alt={nombre || 'avatar'} /> : null}
      <span className="dot" style={{ background: color?.hex || '#888' }} />
      {nombre || color?.nombre || colorId}
    </span>
  )
}

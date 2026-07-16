// src/components/AvatarSprite.jsx
// Renderiza una celda de la matriz 4x4 de avatares usando el sprite original.

import { getAvatar } from '../domain/avatars.js'

export default function AvatarSprite({ avatarId, size = 40, className = '', alt = 'avatar' }) {
  const avatar = getAvatar(avatarId)
  if (!avatar) {
    return <span className={`avatar-sprite avatar-sprite--fallback ${className}`} style={{ width: size, height: size }} aria-label={alt}>?</span>
  }

  return (
    <span
      className={`avatar-sprite ${className}`}
      style={{ width: size, height: size }}
      title={avatar.nombre}
      aria-label={alt}
    >
      <img
        src={avatar.sheetSrc}
        alt={alt}
        draggable={false}
        style={{
          width: '400%',
          height: '400%',
          left: `-${avatar.col * 100}%`,
          top: `-${avatar.row * 100}%`,
        }}
      />
    </span>
  )
}

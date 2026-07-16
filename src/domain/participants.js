// src/domain/participants.js
// Utilidades para soportar participantes legacy (string) y nuevos (objeto con avatar).

import { DEFAULT_AVATAR_ID } from './avatars.js'

function participantId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function cleanName(value) {
  return (value || '').trim()
}

function sameName(a, b) {
  return cleanName(a).toUpperCase() === cleanName(b).toUpperCase()
}

export function crearParticipante(nombre, avatarId = DEFAULT_AVATAR_ID) {
  return {
    id: participantId(),
    nombre: cleanName(nombre),
    avatarId: avatarId || DEFAULT_AVATAR_ID,
  }
}

export function nombreParticipante(participante) {
  if (typeof participante === 'string') return cleanName(participante)
  return cleanName(participante?.nombre)
}

export function avatarParticipante(participante, fallback = DEFAULT_AVATAR_ID) {
  if (participante && typeof participante === 'object') {
    return participante.avatarId || fallback
  }
  return fallback
}

export function participantesNormalizados(equipo) {
  return (equipo?.participantes || [])
    .map((participante, index) => {
      const nombre = nombreParticipante(participante)
      if (!nombre) return null

      if (typeof participante === 'string') {
        return {
          id: `legacy_${cleanName(nombre).toUpperCase().replace(/\s+/g, '_')}_${index}`,
          nombre,
          avatarId: DEFAULT_AVATAR_ID,
        }
      }

      return {
        id: participante.id || `legacy_obj_${cleanName(nombre).toUpperCase().replace(/\s+/g, '_')}_${index}`,
        nombre,
        avatarId: participante.avatarId || DEFAULT_AVATAR_ID,
      }
    })
    .filter(Boolean)
}

export function participantePorNombre(equipo, nombre) {
  const buscado = cleanName(nombre)
  if (!buscado) return null
  return participantesNormalizados(equipo).find((p) => sameName(p.nombre, buscado)) || null
}

export function avatarDeEquipo(equipo, pilotoNombre) {
  if (pilotoNombre) {
    const piloto = participantePorNombre(equipo, pilotoNombre)
    if (piloto?.avatarId) return piloto.avatarId
  }

  const participantes = participantesNormalizados(equipo)
  return participantes[participantes.length - 1]?.avatarId || DEFAULT_AVATAR_ID
}

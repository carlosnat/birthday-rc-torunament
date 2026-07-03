// src/domain/scoring.js
// Puntuación estilo F1. Solo se asignan puntos en sesiones de tipo CARRERA.

import { PUNTUACION_F1 } from './constants.js'

/**
 * Devuelve los puntos para una posición (1-indexada) según la tabla de puntuación.
 * Fuera de la tabla => 0 puntos.
 */
export function puntosPorPosicion(posicion, puntuacion = PUNTUACION_F1) {
  const idx = posicion - 1
  if (idx < 0 || idx >= puntuacion.length) return 0
  return puntuacion[idx]
}

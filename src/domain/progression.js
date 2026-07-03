// src/domain/progression.js
// Recorre la config del torneo para decidir qué viene después de una sesión.
// Secuencia: sesión -> siguiente sesión del circuito -> siguiente circuito -> torneo FINALIZADO.

/**
 * @param {object} config config del torneo (con circuitos[].sesiones[])
 * @param {string} circuitoId circuito activo
 * @param {string} sesionId sesión activa (recién finalizada)
 * @returns {object} descriptor de lo que sigue:
 *   { tipo: 'SIGUIENTE_SESION', circuitoId, sesionId }
 *   { tipo: 'SIGUIENTE_CIRCUITO', circuitoCompletadoId, circuitoId, sesionId }
 *   { tipo: 'TORNEO_FINALIZADO', circuitoCompletadoId }
 */
export function siguientePaso(config, circuitoId, sesionId) {
  const circuitos = config?.circuitos || []
  const ci = circuitos.findIndex((c) => c.id === circuitoId)
  if (ci < 0) throw new Error(`Circuito no encontrado: ${circuitoId}`)

  const circuito = circuitos[ci]
  const sesiones = circuito.sesiones || []
  const si = sesiones.findIndex((s) => s.id === sesionId)
  if (si < 0) throw new Error(`Sesión no encontrada: ${sesionId}`)

  // ¿Hay otra sesión en este circuito?
  if (si + 1 < sesiones.length) {
    return {
      tipo: 'SIGUIENTE_SESION',
      circuitoId,
      sesionId: sesiones[si + 1].id,
    }
  }

  // ¿Hay otro circuito?
  if (ci + 1 < circuitos.length) {
    const siguiente = circuitos[ci + 1]
    return {
      tipo: 'SIGUIENTE_CIRCUITO',
      circuitoCompletadoId: circuitoId,
      circuitoId: siguiente.id,
      sesionId: (siguiente.sesiones || [])[0]?.id ?? null,
    }
  }

  // No hay más: torneo terminado.
  return { tipo: 'TORNEO_FINALIZADO', circuitoCompletadoId: circuitoId }
}

/** Devuelve la definición de una sesión desde la config (tipo, vueltas). */
export function defSesion(config, sesionId) {
  for (const c of config?.circuitos || []) {
    for (const s of c.sesiones || []) {
      if (s.id === sesionId) return { ...s, circuitoId: c.id, tiempoMinimoVuelta: c.tiempoMinimoVuelta }
    }
  }
  return null
}

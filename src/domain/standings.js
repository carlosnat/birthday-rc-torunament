// src/domain/standings.js
// Cálculos derivados para la pantalla pública: puntos acumulados del torneo y gaps.

import { TIPO_SESION } from './constants.js'

/**
 * Suma los puntos de todas las sesiones de tipo CARRERA ya finalizadas.
 * @returns {Array} [{ eqId, puntos }] ordenado desc por puntos.
 */
export function puntosAcumulados(torneo) {
  const acc = {}
  for (const eqId of Object.keys(torneo?.equipos || {})) acc[eqId] = 0

  for (const s of Object.values(torneo?.sesiones || {})) {
    if (s.tipo !== TIPO_SESION.CARRERA) continue
    for (const r of s.resultados || []) {
      acc[r.eqId] = (acc[r.eqId] || 0) + (r.puntos || 0)
    }
  }

  return Object.entries(acc)
    .map(([eqId, puntos]) => ({ eqId, puntos }))
    .sort((a, b) => b.puntos - a.puntos)
}

/**
 * Diferencia entre dos carritos, del que va adelante al que va atrás.
 * Se mide sobre el cruce de meta: dos autos en la misma vuelta están separados por la
 * diferencia entre sus últimas pasadas. Si el de atrás tiene menos vueltas, va abajo.
 * @returns {object|null} { vueltas } | { ms } | null si falta info
 */
function diferencia(adelante, atras) {
  const dv = (adelante?.vueltas ?? 0) - (atras?.vueltas ?? 0)
  if (dv > 0) return { vueltas: dv }
  const ta = adelante?.tsFinal ?? adelante?.ultimaPasada
  const tb = atras?.tsFinal ?? atras?.ultimaPasada
  if (ta == null || tb == null) return null
  return { ms: Math.max(0, tb - ta) }
}

/**
 * Intervalos estilo torre de tiempos F1 para una clasificación en vivo.
 * - `interval`: contra el auto de adelante.
 * - `lider`: contra el primero.
 * A diferencia de calcularGaps(), no depende de tsFinal, así que funciona durante la
 * carrera y no sólo cuando los carritos ya terminaron.
 * @param {Array} orden salida de clasificar() (ya ordenada)
 * @returns {Object} { eqId: { esLider, interval, lider } }
 */
export function calcularIntervalos(orden) {
  const out = {}
  if (!orden || orden.length === 0) return out

  const lider = orden[0]
  out[lider.eqId] = { esLider: true, interval: null, lider: null }

  for (let i = 1; i < orden.length; i++) {
    const c = orden[i]
    out[c.eqId] = {
      esLider: false,
      interval: diferencia(orden[i - 1], c),
      lider: diferencia(lider, c),
    }
  }
  return out
}

/**
 * Gap de cada carrito respecto al líder (posición 1) para mostrar en vivo.
 * - Menos vueltas => "+N V" (vueltas abajo).
 * - Misma vuelta => diferencia de tiempo desde que el líder cruzó (aprox).
 * @param {Array} orden salida de clasificar() (ya ordenada)
 * @returns {Object} { eqId: textoGap }
 */
export function calcularGaps(orden) {
  const out = {}
  if (!orden || orden.length === 0) return out
  const lider = orden[0]
  out[lider.eqId] = 'LÍDER'

  for (let i = 1; i < orden.length; i++) {
    const c = orden[i]
    const dv = lider.vueltas - c.vueltas
    if (dv > 0) {
      out[c.eqId] = `+${dv} V`
    } else if (lider.tsFinal != null && c.tsFinal != null) {
      const dt = Math.max(0, c.tsFinal - lider.tsFinal)
      out[c.eqId] = `+${(dt / 1000).toFixed(1)}s`
    } else {
      out[c.eqId] = '—'
    }
  }
  return out
}

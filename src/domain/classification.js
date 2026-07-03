// src/domain/classification.js
// Clasificación final de una sesión. Ordena carritos y (en carrera) asigna puntos F1.

import { CARRITO, TIPO_SESION } from './constants.js'
import { puntosPorPosicion } from './scoring.js'

/**
 * Ordena los carritos de una sesión y construye la tabla de resultados.
 * Criterio F1:
 *   1) más vueltas completadas
 *   2) los que TERMINARON antes que los DNF (a igualdad de vueltas)
 *   3) menor tsFinal (quien cruzó/llegó primero)
 * DNF clasifican por vueltas y reciben puntos si corresponde.
 *
 * @param {object} carritosMap { eqId: carrito }
 * @param {string} tipoSesion TIPO_SESION.*
 * @param {number[]} puntuacion tabla de puntos
 * @returns {Array} [{ posicion, eqId, vueltas, ultimaVuelta, mejorVuelta, tsFinal, estado, puntos }]
 */
export function clasificar(carritosMap, tipoSesion, puntuacion) {
  const entradas = Object.entries(carritosMap || {}).map(([eqId, c]) => ({
    eqId,
    ...c,
  }))

  entradas.sort((a, b) => {
    if (b.vueltas !== a.vueltas) return b.vueltas - a.vueltas
    const aDnf = a.estado === CARRITO.DNF ? 1 : 0
    const bDnf = b.estado === CARRITO.DNF ? 1 : 0
    if (aDnf !== bDnf) return aDnf - bDnf // TERMINÓ (0) antes que DNF (1)
    const aFin = a.tsFinal ?? a.ultimaPasada ?? Infinity
    const bFin = b.tsFinal ?? b.ultimaPasada ?? Infinity
    return aFin - bFin
  })

  const esCarrera = tipoSesion === TIPO_SESION.CARRERA

  return entradas.map((c, i) => {
    const posicion = i + 1
    return {
      posicion,
      eqId: c.eqId,
      vueltas: c.vueltas,
      ultimaVuelta: c.ultimaVuelta ?? null,
      mejorVuelta: c.mejorVuelta ?? null,
      tsFinal: c.tsFinal ?? null,
      estado: c.estado,
      puntos: esCarrera ? puntosPorPosicion(posicion, puntuacion) : 0,
    }
  })
}

/** Vuelta rápida (menor mejorVuelta) de la sesión: { eqId, ms } o null. */
export function vueltaRapida(carritosMap) {
  let mejor = null
  for (const [eqId, c] of Object.entries(carritosMap || {})) {
    if (c.mejorVuelta == null) continue
    if (mejor == null || c.mejorVuelta < mejor.ms) {
      mejor = { eqId, ms: c.mejorVuelta }
    }
  }
  return mejor
}

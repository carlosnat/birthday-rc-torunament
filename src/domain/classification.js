// src/domain/classification.js
// Clasificación final de una sesión. Ordena carritos y (donde corresponde) asigna puntos F1.

import { CARRITO, ordenaPorMejorVuelta, tipoPuntua } from './constants.js'
import { puntosPorPosicion } from './scoring.js'

/**
 * Orden por distancia (carrera/práctica):
 *   1) más vueltas completadas
 *   2) los que TERMINARON antes que los DNF (a igualdad de vueltas)
 *   3) menor tsFinal (quien cruzó/llegó primero)
 */
function comparaPorVueltas(a, b) {
  if (b.vueltas !== a.vueltas) return b.vueltas - a.vueltas
  const aDnf = a.estado === CARRITO.DNF ? 1 : 0
  const bDnf = b.estado === CARRITO.DNF ? 1 : 0
  if (aDnf !== bDnf) return aDnf - bDnf // TERMINÓ (0) antes que DNF (1)
  const aFin = a.tsFinal ?? a.ultimaPasada ?? Infinity
  const bFin = b.tsFinal ?? b.ultimaPasada ?? Infinity
  return aFin - bFin
}

/**
 * Orden por mejor vuelta (qualy/time attack): gana la vuelta más rápida, sin importar cuántas
 * dio. Los que no completaron ninguna vuelta válida (mejorVuelta null) van al fondo. El estado
 * DNF no altera este orden: si hiciste la vuelta, cuenta.
 */
function comparaPorMejorVuelta(a, b) {
  const am = a.mejorVuelta ?? Infinity
  const bm = b.mejorVuelta ?? Infinity
  return am - bm
}

/**
 * Ordena los carritos de una sesión y construye la tabla de resultados.
 *
 * @param {object} carritosMap { eqId: carrito }
 * @param {string} tipoSesion TIPO_SESION.*
 * @param {number[]} puntuacion tabla de puntos
 * @returns {Array} [{ posicion, eqId, vueltas, ultimaVuelta, mejorVuelta, ultimaPasada, tsFinal, estado, puntos }]
 */
export function clasificar(carritosMap, tipoSesion, puntuacion) {
  const entradas = Object.entries(carritosMap || {}).map(([eqId, c]) => ({
    eqId,
    ...c,
  }))

  const comparador = ordenaPorMejorVuelta(tipoSesion) ? comparaPorMejorVuelta : comparaPorVueltas
  entradas.sort(comparador)

  const puntua = tipoPuntua(tipoSesion)

  return entradas.map((c, i) => {
    const posicion = i + 1
    return {
      posicion,
      eqId: c.eqId,
      vueltas: c.vueltas,
      ultimaVuelta: c.ultimaVuelta ?? null,
      mejorVuelta: c.mejorVuelta ?? null,
      // Se expone porque es lo que permite calcular gaps en vivo: dos autos en la misma
      // vuelta están separados por la diferencia entre sus cruces de meta.
      ultimaPasada: c.ultimaPasada ?? null,
      tsFinal: c.tsFinal ?? null,
      estado: c.estado,
      puntos: puntua ? puntosPorPosicion(posicion, puntuacion) : 0,
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

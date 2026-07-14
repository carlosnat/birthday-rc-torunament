// src/domain/lapTiming.js
// Cronometraje puro por carrito. Modela el "timing loop" de la F1:
// - Primera pasada = vuelta 0 (arranca el crono, NO cuenta como vuelta).
// - Vuelta N = ts(pasada N+1) - ts(pasada N).
// - Anti-rebote: delta < tiempoMinimoVuelta => se ignora (aplica también entre pasada 1 y 2).
// - Bandera a cuadros: el líder (primero en llegar a vueltasObjetivo) dispara el fin de carrera.

import { CARRITO, SESION, TIPO_SESION } from './constants.js'
import { sesionAceptaPasadas, carritoActivo } from './stateMachine.js'

/** Estado inicial de un carrito en la grilla. */
export function carritoInicial() {
  return {
    estado: CARRITO.EN_GRILLA,
    vueltas: 0,
    cronoInicio: null, // ts de la primera pasada
    ultimaPasada: null, // ts de la última pasada válida
    ultimaVuelta: null, // ms de la última vuelta completada
    mejorVuelta: null, // ms de la mejor vuelta
    lapHistory: [], // vueltas válidas [{ vuelta, tiempoMs, ts }]
    tsFinal: null, // ts al que TERMINÓ o abandonó
  }
}

export const MOTIVO = Object.freeze({
  SESION_NO_ACEPTA: 'SESION_NO_ACEPTA',
  CARRITO_INACTIVO: 'CARRITO_INACTIVO',
  REBOTE: 'REBOTE',
})

/**
 * Procesa una pasada por meta para un carrito.
 * @param {object} carrito estado actual del carrito
 * @param {number} ts timestamp de la pasada (performance.now / Date.now)
 * @param {object} ctx { tiempoMinimoVuelta, sesionEstado, tipoSesion, vueltasObjetivo }
 * @returns {object} resultado inmutable (no muta el carrito de entrada)
 */
export function registrarPasada(carrito, ts, ctx) {
  const { tiempoMinimoVuelta, sesionEstado, tipoSesion, vueltasObjetivo } = ctx

  if (!sesionAceptaPasadas(sesionEstado)) {
    return { aceptada: false, motivo: MOTIVO.SESION_NO_ACEPTA }
  }
  if (!carritoActivo(carrito.estado)) {
    return { aceptada: false, motivo: MOTIVO.CARRITO_INACTIVO }
  }

  // Primera pasada: arranca el crono (vuelta 0), no cuenta vuelta.
  if (carrito.cronoInicio == null) {
    const next = {
      ...carrito,
      estado: CARRITO.EN_CARRERA,
      cronoInicio: ts,
      ultimaPasada: ts,
    }
    return { aceptada: true, tipo: 'CRONO_INICIADO', carrito: next, vueltaNro: 0 }
  }

  // Anti-rebote.
  const delta = ts - carrito.ultimaPasada
  if (delta < tiempoMinimoVuelta) {
    return { aceptada: false, motivo: MOTIVO.REBOTE, deltaMs: delta }
  }

  // Vuelta válida.
  const vueltas = carrito.vueltas + 1
  const mejorVuelta =
    carrito.mejorVuelta == null ? delta : Math.min(carrito.mejorVuelta, delta)
  const lapHistory = [
    ...((carrito.lapHistory || [])),
    { vuelta: vueltas, tiempoMs: delta, ts },
  ]

  let next = {
    ...carrito,
    vueltas,
    ultimaPasada: ts,
    ultimaVuelta: delta,
    mejorVuelta,
    lapHistory,
  }

  let disparaBandera = false

  if (tipoSesion === TIPO_SESION.CARRERA) {
    const completoObjetivo = vueltas >= vueltasObjetivo
    if (sesionEstado === SESION.EN_CURSO && completoObjetivo) {
      // Líder: primero en completar la distancia => termina y dispara bandera.
      next = { ...next, estado: CARRITO.TERMINO, tsFinal: ts }
      disparaBandera = true
    } else if (sesionEstado === SESION.BANDERA) {
      // Bandera desplegada: al cruzar meta cierra su vuelta en curso y termina.
      next = { ...next, estado: CARRITO.TERMINO, tsFinal: ts }
    }
  }

  return {
    aceptada: true,
    tipo: 'VUELTA',
    carrito: next,
    vueltaNro: vueltas,
    deltaMs: delta,
    disparaBandera,
  }
}

/** ¿Todos los carritos de la sesión ya terminaron o abandonaron? (fin de carrera) */
export function todosCerrados(carritosMap) {
  const carritos = Object.values(carritosMap || {})
  if (carritos.length === 0) return false
  return carritos.every(
    (c) => c.estado === CARRITO.TERMINO || c.estado === CARRITO.DNF,
  )
}

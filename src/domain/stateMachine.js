// src/domain/stateMachine.js
// Transiciones puras de las 4 máquinas de estado. Sin efectos secundarios, sin Firebase.
// Solo valida si una transición es legal. La persistencia vive en firebase/tournamentDb.js.

import { TORNEO, CIRCUITO, SESION, CARRITO, TIPO_SESION } from './constants.js'

// --- Mapas de transiciones permitidas ---------------------------------------

const TORNEO_TRANSICIONES = {
  [TORNEO.BORRADOR]: [TORNEO.REGISTRO],
  [TORNEO.REGISTRO]: [TORNEO.EN_CURSO],
  [TORNEO.EN_CURSO]: [TORNEO.FINALIZADO],
  [TORNEO.FINALIZADO]: [],
}

const CIRCUITO_TRANSICIONES = {
  [CIRCUITO.PENDIENTE]: [CIRCUITO.ACTIVO],
  [CIRCUITO.ACTIVO]: [CIRCUITO.COMPLETADO],
  [CIRCUITO.COMPLETADO]: [],
}

// Transiciones de sesión que dependen del tipo se validan aparte (ver puedeSesion).
const SESION_TRANSICIONES = {
  [SESION.ESPERANDO]: [SESION.LARGADA],
  [SESION.LARGADA]: [SESION.EN_CURSO],
  [SESION.EN_CURSO]: [SESION.PAUSADA, SESION.BANDERA, SESION.FINALIZADA],
  [SESION.PAUSADA]: [SESION.EN_CURSO, SESION.FINALIZADA],
  [SESION.BANDERA]: [SESION.FINALIZADA],
  [SESION.FINALIZADA]: [],
}

const CARRITO_TRANSICIONES = {
  [CARRITO.EN_GRILLA]: [CARRITO.EN_CARRERA, CARRITO.DNF],
  [CARRITO.EN_CARRERA]: [CARRITO.TERMINO, CARRITO.DNF],
  [CARRITO.TERMINO]: [],
  [CARRITO.DNF]: [],
}

function permite(mapa, desde, hacia) {
  const salidas = mapa[desde]
  return Array.isArray(salidas) && salidas.includes(hacia)
}

// --- Validadores públicos ----------------------------------------------------

export function puedeTorneo(desde, hacia) {
  return permite(TORNEO_TRANSICIONES, desde, hacia)
}

export function puedeCircuito(desde, hacia) {
  return permite(CIRCUITO_TRANSICIONES, desde, hacia)
}

export function puedeCarrito(desde, hacia) {
  return permite(CARRITO_TRANSICIONES, desde, hacia)
}

/**
 * Valida una transición de sesión considerando el tipo.
 * Regla F1: una CARRERA solo puede FINALIZAR pasando por BANDERA.
 * Práctica y qualy pueden finalizar manualmente desde EN_CURSO o PAUSADA.
 */
export function puedeSesion(desde, hacia, tipo) {
  if (!permite(SESION_TRANSICIONES, desde, hacia)) return false

  const finalizaSinBandera =
    hacia === SESION.FINALIZADA &&
    (desde === SESION.EN_CURSO || desde === SESION.PAUSADA)

  if (finalizaSinBandera && tipo === TIPO_SESION.CARRERA) {
    // La carrera solo termina por bandera a cuadros.
    return false
  }
  return true
}

/** ¿La sesión acepta detecciones de pasada? Solo EN_CURSO o BANDERA. */
export function sesionAceptaPasadas(estadoSesion) {
  return estadoSesion === SESION.EN_CURSO || estadoSesion === SESION.BANDERA
}

/** ¿El carrito puede sumar pasadas? No si ya terminó o abandonó. */
export function carritoActivo(estadoCarrito) {
  return estadoCarrito === CARRITO.EN_GRILLA || estadoCarrito === CARRITO.EN_CARRERA
}

// src/domain/lapTiming.js
// Cronometraje puro por carrito. Modela el "timing loop" de la F1:
// - Primera pasada = vuelta 0 (arranca el crono, NO cuenta como vuelta).
// - Vuelta N = ts(pasada N+1) - ts(pasada N).
// - Anti-rebote: delta < tiempoMinimoVuelta => se ignora (aplica también entre pasada 1 y 2).
// - Bandera a cuadros: el líder (primero en llegar a vueltasObjetivo) dispara el fin de carrera.

import { CARRITO, SESION, TIPO_SESION, SECTOR, COOLDOWN_SECTOR, TIEMPO_MINIMO_SECTOR } from './constants.js'
import { sesionAceptaPasadas, carritoActivo } from './stateMachine.js'
import { sesionExpiradaEn } from './sessionTimer.js'

/** Estado inicial de un carrito en la grilla. */
export function carritoInicial() {
  return {
    estado: CARRITO.EN_GRILLA,
    vueltas: 0,
    cronoInicio: null, // ts de la primera pasada
    ultimaPasada: null, // ts de la última pasada válida
    ultimaVuelta: null, // ms de la última vuelta completada
    mejorVuelta: null, // ms de la mejor vuelta
    lapHistory: [], // vueltas válidas [{ vuelta, tiempoMs, ts, sectorTimes }]
    tsFinal: null, // ts al que TERMINÓ o abandonó
    vaultaActualInicio: null, // ts cuando pasó META para vuelta actual
    sectorTimesActuales: {}, // {sectorId: {ts, tiempoMs}} - en banda viva
    detecciones: {}, // {sensorId: {ts}} - registro de paso por cada sensor
  }
}

export const MOTIVO = Object.freeze({
  SESION_NO_ACEPTA: 'SESION_NO_ACEPTA',
  SESION_EXPIRADA: 'SESION_EXPIRADA',
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
  if (sesionExpiradaEn({
    tipo: tipoSesion,
    estado: sesionEstado,
    duracionMs: ctx.duracionMs,
    msConsumidos: ctx.msConsumidos,
    tsInicioCrono: ctx.tsInicioCrono,
  }, ts)) {
    return { aceptada: false, motivo: MOTIVO.SESION_EXPIRADA }
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
      vaultaActualInicio: ts,
      sectorTimesActuales: {},
      detecciones: {},
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

  // La meta cierra el último sector: del sensor más avanzado que cruzó hasta acá. Así
  // N sensores dan N sectores y la suma de los sectores es el tiempo de vuelta.
  // No aplicamos tiempoMinimoVuelta acá: la pasada ya lo validó arriba.
  const sectorTimes = { ...carrito.sectorTimesActuales }
  const ultimoOrden = ultimoOrdenDetectado(carrito.detecciones)
  if (ultimoOrden != null) {
    const desde = carrito.detecciones[claveOrden(ultimoOrden)].ts
    if (ts > desde) {
      sectorTimes[`sector_${ultimoOrden}`] = { ts, tiempoMs: ts - desde }
    }
  }

  const lapEntry = { vuelta: vueltas, tiempoMs: delta, ts, sectorTimes }

  const lapHistory = [...((carrito.lapHistory || [])), lapEntry]

  let next = {
    ...carrito,
    vueltas,
    ultimaPasada: ts,
    ultimaVuelta: delta,
    mejorVuelta,
    lapHistory,
    vaultaActualInicio: ts,
    sectorTimesActuales: {},
    detecciones: {},
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

/** Clave de detección por orden de sensor. String para que RTDB no la convierta en array. */
function claveOrden(orden) {
  return `s${orden}`
}

/** Orden más alto detectado en la vuelta en curso, o null si no cruzó ningún sensor de sector. */
function ultimoOrdenDetectado(detecciones) {
  let max = null
  for (const clave of Object.keys(detecciones || {})) {
    const orden = Number(clave.slice(1))
    if (Number.isFinite(orden) && (max == null || orden > max)) max = orden
  }
  return max
}

/**
 * Procesa una detección de un sensor de sector (orden >= 1).
 *
 * El sector N va del sensor de orden N al sensor de orden N+1, así que el sensor de
 * orden K cierra el sector K-1. El punto de partida del sector 0 es la pasada por meta
 * (vaultaActualInicio), que es lo que registra el sensor de orden 0.
 *
 * No hace lookup de sensores: recibe el orden ya resuelto por quien detecta.
 *
 * @param {object} carrito estado actual del carrito
 * @param {number} sensorOrden orden del sensor que detectó (>= 1)
 * @param {number} ts timestamp de la detección
 * @param {object} ctx { sesionEstado }
 * @returns {object} resultado inmutable (no muta el carrito de entrada)
 */
export function registrarDeteccionSector(carrito, sensorOrden, ts, ctx) {
  const { sesionEstado } = ctx

  if (!sesionAceptaPasadas(sesionEstado)) {
    return { aceptada: false, motivo: MOTIVO.SESION_NO_ACEPTA }
  }
  if (!carritoActivo(carrito.estado)) {
    return { aceptada: false, motivo: MOTIVO.CARRITO_INACTIVO }
  }
  if (!(sensorOrden >= 1)) {
    return { aceptada: false, motivo: 'ORDEN_INVALIDO' }
  }
  if (carrito.vaultaActualInicio == null) {
    return { aceptada: false, motivo: 'VUELTA_NO_ABIERTA' }
  }

  // Anti-rebote: mismo sensor dos veces seguidas.
  const propia = carrito.detecciones?.[claveOrden(sensorOrden)]?.ts
  if (propia != null && ts - propia < COOLDOWN_SECTOR) {
    return { aceptada: false, motivo: MOTIVO.REBOTE, deltaMs: ts - propia }
  }

  // Punto de partida del sector: el sensor anterior, o la meta si es el primer sector.
  const ordenAnterior = sensorOrden - 1
  const desde = ordenAnterior === 0
    ? carrito.vaultaActualInicio
    : carrito.detecciones?.[claveOrden(ordenAnterior)]?.ts

  const detecciones = {
    ...carrito.detecciones,
    [claveOrden(sensorOrden)]: { ts },
  }

  // Sin referencia previa (se salteó un sensor): registramos el paso para no romper la
  // cadena, pero el sector queda sin tiempo.
  if (desde == null) {
    return {
      aceptada: true,
      tipo: 'DETECCION_SIN_REFERENCIA',
      carrito: { ...carrito, detecciones },
      sectorId: `sector_${ordenAnterior}`,
      tiempoMs: null,
    }
  }

  const tiempoSector = ts - desde
  if (tiempoSector < TIEMPO_MINIMO_SECTOR) {
    return { aceptada: false, motivo: 'TIEMPO_SECTOR_INVALIDO', deltaMs: tiempoSector }
  }

  const sectorId = `sector_${ordenAnterior}`

  return {
    aceptada: true,
    tipo: 'DETECCION_SECTOR',
    carrito: {
      ...carrito,
      sectorTimesActuales: {
        ...carrito.sectorTimesActuales,
        [sectorId]: { ts, tiempoMs: tiempoSector },
      },
      detecciones,
    },
    sectorId,
    tiempoMs: tiempoSector,
  }
}

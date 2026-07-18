// src/domain/lapTiming.test.js
// Tests del cronometraje: el corazón del producto. Si esto cuenta mal una vuelta o pierde un
// sector, el podio queda mal y nadie se entera. Corre con `npm test` (node:test, sin deps).
//
// Cubre registrarPasada (vueltas, anti-rebote, mejor vuelta, bandera de carrera) y
// registrarDeteccionSector (sectores por orden de sensor, el invariante suma=vuelta, y los
// bugs que ya debuggeamos en pista).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  carritoInicial,
  registrarPasada,
  registrarDeteccionSector,
  todosCerrados,
  MOTIVO,
} from './lapTiming.js'
import { CARRITO, SESION, TIPO_SESION } from './constants.js'

// --- helpers ---------------------------------------------------------------

const MIN_VUELTA = 3000

// ctx de una carrera EN_CURSO por defecto; se puede pisar campo por campo.
const pasada = (carrito, ts, over = {}) =>
  registrarPasada(carrito, ts, {
    tiempoMinimoVuelta: MIN_VUELTA,
    sesionEstado: SESION.EN_CURSO,
    tipoSesion: TIPO_SESION.CARRERA,
    vueltasObjetivo: 3,
    ...over,
  })

const sector = (carrito, orden, ts, over = {}) =>
  registrarDeteccionSector(carrito, orden, ts, { sesionEstado: SESION.EN_CURSO, ...over })

/** Corre una vuelta completa (meta -> N pasadas de sector -> meta) y devuelve el carrito. */
function correrVuelta(carrito, metaEn, sectores, metaFin, over = {}) {
  let c = pasada(carrito, metaEn, over).carrito
  for (const [orden, ts] of sectores) c = sector(c, orden, ts).carrito
  return pasada(c, metaFin, over)
}

// --- registrarPasada: vueltas ----------------------------------------------

test('primera pasada arranca el crono como vuelta 0, no cuenta vuelta', () => {
  const r = pasada(carritoInicial(), 1000)
  assert.equal(r.aceptada, true)
  assert.equal(r.tipo, 'CRONO_INICIADO')
  assert.equal(r.vueltaNro, 0)
  assert.equal(r.carrito.estado, CARRITO.EN_CARRERA)
  assert.equal(r.carrito.vueltas, 0)
  assert.equal(r.carrito.cronoInicio, 1000)
})

test('segunda pasada válida es la vuelta 1 y su tiempo es el delta', () => {
  const c0 = pasada(carritoInicial(), 1000).carrito
  const r = pasada(c0, 8000)
  assert.equal(r.tipo, 'VUELTA')
  assert.equal(r.vueltaNro, 1)
  assert.equal(r.deltaMs, 7000)
  assert.equal(r.carrito.ultimaVuelta, 7000)
  assert.equal(r.carrito.mejorVuelta, 7000)
  assert.equal(r.carrito.lapHistory.length, 1)
})

test('anti-rebote: una pasada antes del tiempo mínimo se ignora', () => {
  const c0 = pasada(carritoInicial(), 1000).carrito
  const r = pasada(c0, 1000 + MIN_VUELTA - 1) // 1ms por debajo del mínimo
  assert.equal(r.aceptada, false)
  assert.equal(r.motivo, MOTIVO.REBOTE)
})

test('mejorVuelta baja sólo cuando de verdad se mejora', () => {
  let c = pasada(carritoInicial(), 0).carrito
  c = pasada(c, 7000).carrito // vuelta 1: 7000
  assert.equal(c.mejorVuelta, 7000)
  c = pasada(c, 21000).carrito // vuelta 2: 14000 (más lenta) — no debe empeorar el récord
  assert.equal(c.mejorVuelta, 7000)
  c = pasada(c, 26000).carrito // vuelta 3: 5000 (más rápida) — nuevo récord
  assert.equal(c.mejorVuelta, 5000)
})

// --- registrarPasada: gates ------------------------------------------------

test('sesión que no acepta pasadas (ESPERANDO) rechaza', () => {
  const r = pasada(carritoInicial(), 1000, { sesionEstado: SESION.ESPERANDO })
  assert.equal(r.aceptada, false)
  assert.equal(r.motivo, MOTIVO.SESION_NO_ACEPTA)
})

test('carrito ya terminado no suma pasadas', () => {
  const terminado = { ...carritoInicial(), estado: CARRITO.TERMINO, cronoInicio: 0, ultimaPasada: 0 }
  const r = pasada(terminado, 9000)
  assert.equal(r.aceptada, false)
  assert.equal(r.motivo, MOTIVO.CARRITO_INACTIVO)
})

test('sesión temporizada expirada rechaza la pasada', () => {
  const c0 = pasada(carritoInicial(), 0, { tipoSesion: TIPO_SESION.TIME_ATTACK }).carrito
  const r = registrarPasada(c0, 9000, {
    tiempoMinimoVuelta: MIN_VUELTA,
    sesionEstado: SESION.EN_CURSO,
    tipoSesion: TIPO_SESION.TIME_ATTACK,
    vueltasObjetivo: 0,
    duracionMs: 300000,
    msConsumidos: 300000, // ya consumió todo el tiempo
    tsInicioCrono: null,
  })
  assert.equal(r.aceptada, false)
  assert.equal(r.motivo, MOTIVO.SESION_EXPIRADA)
})

// --- registrarPasada: bandera de carrera -----------------------------------

test('carrera: completar vueltasObjetivo dispara bandera y termina el carrito', () => {
  let c = pasada(carritoInicial(), 0).carrito
  c = pasada(c, 7000).carrito // v1
  c = pasada(c, 14000).carrito // v2
  const r = pasada(c, 21000) // v3 = objetivo (3)
  assert.equal(r.vueltaNro, 3)
  assert.equal(r.disparaBandera, true)
  assert.equal(r.carrito.estado, CARRITO.TERMINO)
  assert.equal(r.carrito.tsFinal, 21000)
})

test('time attack: nunca termina por vueltas ni dispara bandera', () => {
  const ctx = { tipoSesion: TIPO_SESION.TIME_ATTACK, vueltasObjetivo: 0 }
  let c = pasada(carritoInicial(), 0, ctx).carrito
  for (let i = 1; i <= 5; i++) {
    const r = pasada(c, i * 7000, ctx)
    assert.equal(r.disparaBandera, false)
    assert.equal(r.carrito.estado, CARRITO.EN_CARRERA) // sigue corriendo
    c = r.carrito
  }
  assert.equal(c.vueltas, 5)
})

test('registrarPasada no muta el carrito de entrada', () => {
  const c0 = pasada(carritoInicial(), 0).carrito
  const antes = JSON.parse(JSON.stringify(c0))
  pasada(c0, 7000)
  assert.deepEqual(c0, antes)
})

// --- sectores --------------------------------------------------------------

test('un sensor de sector cierra el sector anterior', () => {
  const c0 = pasada(carritoInicial(), 0).carrito // meta abre la vuelta en ts 0
  const r = sector(c0, 1, 5000) // sensor orden 1 cierra sector_0
  assert.equal(r.aceptada, true)
  assert.equal(r.sectorId, 'sector_0')
  assert.equal(r.tiempoMs, 5000)
  assert.equal(r.carrito.sectorTimesActuales.sector_0.tiempoMs, 5000)
})

test('INVARIANTE: la meta cierra el último sector y la suma de sectores es la vuelta', () => {
  // 3 sensores (meta + 2 de sector) => 3 sectores.
  const r = correrVuelta(carritoInicial(), 0, [[1, 5000], [2, 12000]], 20000)
  const lap = r.carrito.lapHistory[0]
  const suma = Object.values(lap.sectorTimes).reduce((a, s) => a + s.tiempoMs, 0)
  assert.equal(lap.tiempoMs, 20000)
  assert.equal(suma, lap.tiempoMs) // 5000 + 7000 + 8000 = 20000
  assert.deepEqual(
    Object.fromEntries(Object.entries(lap.sectorTimes).map(([k, v]) => [k, v.tiempoMs])),
    { sector_0: 5000, sector_1: 7000, sector_2: 8000 },
  )
})

test('anti-rebote de sector: mismo sensor dos veces seguidas se ignora', () => {
  let c = pasada(carritoInicial(), 0).carrito
  c = sector(c, 1, 5000).carrito
  const r = sector(c, 1, 5050) // 50ms después, por debajo del cooldown
  assert.equal(r.aceptada, false)
  assert.equal(r.motivo, MOTIVO.REBOTE)
})

test('sensor salteado no rompe la cadena: DETECCION_SIN_REFERENCIA', () => {
  const c0 = pasada(carritoInicial(), 0).carrito
  const r = sector(c0, 2, 9000) // llega el sensor 2 sin haber pasado el 1
  assert.equal(r.aceptada, true)
  assert.equal(r.tipo, 'DETECCION_SIN_REFERENCIA')
  assert.equal(r.tiempoMs, null)
})

test('sector con orden 0 es inválido (esa es la meta, va por registrarPasada)', () => {
  const c0 = pasada(carritoInicial(), 0).carrito
  const r = sector(c0, 0, 5000)
  assert.equal(r.aceptada, false)
  assert.equal(r.motivo, 'ORDEN_INVALIDO')
})

test('sin vuelta abierta, una detección de sector se rechaza', () => {
  const r = sector(carritoInicial(), 1, 5000) // nunca pasó por meta
  assert.equal(r.aceptada, false)
  assert.equal(r.motivo, 'VUELTA_NO_ABIERTA')
})

// --- todosCerrados ---------------------------------------------------------

test('todosCerrados: true sólo si todos TERMINARON o abandonaron', () => {
  assert.equal(todosCerrados({}), false) // sesión vacía
  assert.equal(todosCerrados({ a: { estado: CARRITO.TERMINO }, b: { estado: CARRITO.EN_CARRERA } }), false)
  assert.equal(todosCerrados({ a: { estado: CARRITO.TERMINO }, b: { estado: CARRITO.DNF } }), true)
})

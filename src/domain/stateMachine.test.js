// src/domain/stateMachine.test.js
// Tests de las transiciones de estado. Si una transición inválida pasa, el torneo queda en un
// estado corrupto del que no hay vuelta. Puro, así que se prueba directo.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  puedeTorneo,
  puedeCircuito,
  puedeCarrito,
  puedeSesion,
  sesionAceptaPasadas,
  carritoActivo,
} from './stateMachine.js'
import { TORNEO, CIRCUITO, SESION, CARRITO, TIPO_SESION } from './constants.js'

// --- torneo / circuito / carrito: avanzan en un solo sentido ---------------

test('torneo avanza BORRADOR -> REGISTRO -> EN_CURSO -> FINALIZADO, sin saltos ni retrocesos', () => {
  assert.ok(puedeTorneo(TORNEO.BORRADOR, TORNEO.REGISTRO))
  assert.ok(puedeTorneo(TORNEO.REGISTRO, TORNEO.EN_CURSO))
  assert.ok(puedeTorneo(TORNEO.EN_CURSO, TORNEO.FINALIZADO))
  // saltos y retrocesos prohibidos
  assert.ok(!puedeTorneo(TORNEO.BORRADOR, TORNEO.EN_CURSO))
  assert.ok(!puedeTorneo(TORNEO.EN_CURSO, TORNEO.REGISTRO))
  assert.ok(!puedeTorneo(TORNEO.FINALIZADO, TORNEO.EN_CURSO)) // terminal
})

test('circuito: PENDIENTE -> ACTIVO -> COMPLETADO, terminal en COMPLETADO', () => {
  assert.ok(puedeCircuito(CIRCUITO.PENDIENTE, CIRCUITO.ACTIVO))
  assert.ok(puedeCircuito(CIRCUITO.ACTIVO, CIRCUITO.COMPLETADO))
  assert.ok(!puedeCircuito(CIRCUITO.COMPLETADO, CIRCUITO.ACTIVO))
  assert.ok(!puedeCircuito(CIRCUITO.PENDIENTE, CIRCUITO.COMPLETADO)) // no saltea ACTIVO
})

test('carrito: puede TERMINAR o abandonar; DNF y TERMINO son terminales', () => {
  assert.ok(puedeCarrito(CARRITO.EN_GRILLA, CARRITO.EN_CARRERA))
  assert.ok(puedeCarrito(CARRITO.EN_CARRERA, CARRITO.TERMINO))
  assert.ok(puedeCarrito(CARRITO.EN_CARRERA, CARRITO.DNF))
  assert.ok(puedeCarrito(CARRITO.EN_GRILLA, CARRITO.DNF)) // abandona sin largar
  assert.ok(!puedeCarrito(CARRITO.TERMINO, CARRITO.EN_CARRERA)) // no revive
  assert.ok(!puedeCarrito(CARRITO.DNF, CARRITO.EN_CARRERA))
})

// --- sesión: la regla que depende del tipo ---------------------------------

test('sesión: recorrido normal ESPERANDO -> LARGADA -> EN_CURSO', () => {
  assert.ok(puedeSesion(SESION.ESPERANDO, SESION.LARGADA, TIPO_SESION.QUALY))
  assert.ok(puedeSesion(SESION.LARGADA, SESION.EN_CURSO, TIPO_SESION.QUALY))
  assert.ok(puedeSesion(SESION.EN_CURSO, SESION.PAUSADA, TIPO_SESION.QUALY))
  assert.ok(puedeSesion(SESION.PAUSADA, SESION.EN_CURSO, TIPO_SESION.QUALY))
  assert.ok(!puedeSesion(SESION.ESPERANDO, SESION.EN_CURSO, TIPO_SESION.QUALY)) // no saltea LARGADA
})

test('LA CARRERA sólo finaliza por bandera, no manualmente', () => {
  // qualy/practica/time attack SÍ pueden finalizar directo desde EN_CURSO o PAUSADA
  for (const tipo of [TIPO_SESION.QUALY, TIPO_SESION.PRACTICA, TIPO_SESION.TIME_ATTACK]) {
    assert.ok(puedeSesion(SESION.EN_CURSO, SESION.FINALIZADA, tipo), `${tipo} finaliza desde EN_CURSO`)
    assert.ok(puedeSesion(SESION.PAUSADA, SESION.FINALIZADA, tipo), `${tipo} finaliza desde PAUSADA`)
  }
  // la carrera NO: tiene que pasar por bandera primero
  assert.ok(!puedeSesion(SESION.EN_CURSO, SESION.FINALIZADA, TIPO_SESION.CARRERA))
  assert.ok(!puedeSesion(SESION.PAUSADA, SESION.FINALIZADA, TIPO_SESION.CARRERA))
  // pero desde BANDERA sí, para todos
  assert.ok(puedeSesion(SESION.BANDERA, SESION.FINALIZADA, TIPO_SESION.CARRERA))
})

// --- gates de pasada -------------------------------------------------------

test('sólo EN_CURSO y BANDERA aceptan pasadas', () => {
  assert.ok(sesionAceptaPasadas(SESION.EN_CURSO))
  assert.ok(sesionAceptaPasadas(SESION.BANDERA)) // la vuelta en curso puede cerrarse bajo bandera
  assert.ok(!sesionAceptaPasadas(SESION.LARGADA))
  assert.ok(!sesionAceptaPasadas(SESION.PAUSADA))
  assert.ok(!sesionAceptaPasadas(SESION.FINALIZADA))
})

test('carritoActivo: sólo en grilla o en carrera suma; terminado/DNF no', () => {
  assert.ok(carritoActivo(CARRITO.EN_GRILLA))
  assert.ok(carritoActivo(CARRITO.EN_CARRERA))
  assert.ok(!carritoActivo(CARRITO.TERMINO))
  assert.ok(!carritoActivo(CARRITO.DNF))
})

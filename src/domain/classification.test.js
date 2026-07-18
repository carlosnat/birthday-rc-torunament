// src/domain/classification.test.js
// Tests del criterio de clasificación por tipo de sesión. Corren con `npm test` (node:test,
// sin dependencias). El dominio es puro, así que se prueba sin Firebase ni navegador.
//
// El caso que motivó todo: la qualy debe ordenar por MEJOR VUELTA, no por más vueltas.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { clasificar } from './classification.js'
import { calcularIntervalos, puntosAcumulados } from './standings.js'
import { esSesionTemporizada } from './sessionTimer.js'
import {
  TIPO_SESION,
  PUNTUACION_F1,
  tipoPuntua,
  ordenaPorMejorVuelta,
  nombreTipo,
} from './constants.js'

// A dio más vueltas pero es más lento; B dio menos y es el más rápido; C nunca completó vuelta.
const CARRITOS = {
  A: { vueltas: 8, mejorVuelta: 7891, ultimaPasada: 100 },
  B: { vueltas: 3, mejorVuelta: 7312, ultimaPasada: 200 },
  C: { vueltas: 5, mejorVuelta: null, ultimaPasada: 300 },
}

const posiciones = (orden) => orden.map((r) => r.eqId)

test('QUALY ordena por mejor vuelta (el caso que estaba roto)', () => {
  const orden = clasificar(CARRITOS, TIPO_SESION.QUALY, PUNTUACION_F1)
  // B más rápido, A segundo, C (sin vuelta) al fondo — sin importar cuántas vueltas dieron.
  assert.deepEqual(posiciones(orden), ['B', 'A', 'C'])
})

test('QUALY no reparte puntos (arma parrilla, no campeonato)', () => {
  const orden = clasificar(CARRITOS, TIPO_SESION.QUALY, PUNTUACION_F1)
  assert.ok(orden.every((r) => r.puntos === 0))
})

test('TIME_ATTACK ordena igual que qualy pero SÍ puntúa', () => {
  const orden = clasificar(CARRITOS, TIPO_SESION.TIME_ATTACK, PUNTUACION_F1)
  assert.deepEqual(posiciones(orden), ['B', 'A', 'C'])
  assert.equal(orden[0].puntos, 25)
  assert.equal(orden[1].puntos, 18)
})

test('CARRERA sigue ordenando por vueltas (no romper lo existente)', () => {
  const orden = clasificar(CARRITOS, TIPO_SESION.CARRERA, PUNTUACION_F1)
  assert.deepEqual(posiciones(orden), ['A', 'C', 'B']) // 8 > 5 > 3 vueltas
  assert.equal(orden[0].puntos, 25)
})

test('predicados de tipo', () => {
  assert.ok(tipoPuntua(TIPO_SESION.CARRERA))
  assert.ok(tipoPuntua(TIPO_SESION.TIME_ATTACK))
  assert.ok(!tipoPuntua(TIPO_SESION.QUALY))
  assert.ok(!tipoPuntua(TIPO_SESION.PRACTICA))

  assert.ok(ordenaPorMejorVuelta(TIPO_SESION.QUALY))
  assert.ok(ordenaPorMejorVuelta(TIPO_SESION.TIME_ATTACK))
  assert.ok(!ordenaPorMejorVuelta(TIPO_SESION.CARRERA))

  assert.equal(nombreTipo(TIPO_SESION.TIME_ATTACK), 'TIME ATTACK')
})

test('gap por mejor vuelta = diferencia de tiempo', () => {
  const orden = clasificar(CARRITOS, TIPO_SESION.TIME_ATTACK, PUNTUACION_F1)
  const iv = calcularIntervalos(orden, true)
  assert.ok(iv.B.esLider)
  assert.equal(iv.A.lider.ms, 579) // 7891 - 7312
  assert.equal(iv.C.lider, null) // sin vuelta válida
})

test('TIME_ATTACK es sesión temporizada; sin duración no', () => {
  assert.ok(esSesionTemporizada({ tipo: TIPO_SESION.TIME_ATTACK, duracionMs: 300000 }))
  assert.ok(!esSesionTemporizada({ tipo: TIPO_SESION.TIME_ATTACK, duracionMs: 0 }))
})

test('el campeonato suma time attack pero no qualy', () => {
  const torneo = {
    equipos: { A: {}, B: {} },
    sesiones: {
      ta: { tipo: TIPO_SESION.TIME_ATTACK, resultados: [{ eqId: 'B', puntos: 25 }, { eqId: 'A', puntos: 18 }] },
      q: { tipo: TIPO_SESION.QUALY, resultados: [{ eqId: 'A', puntos: 25 }] }, // no debe contar
    },
  }
  const camp = puntosAcumulados(torneo)
  const pts = Object.fromEntries(camp.map((x) => [x.eqId, x.puntos]))
  assert.equal(pts.B, 25)
  assert.equal(pts.A, 18) // 18 del time attack, 0 de la qualy
})

test('sesión vacía o carritos nulos no rompen', () => {
  assert.deepEqual(clasificar({}, TIPO_SESION.QUALY, PUNTUACION_F1), [])
  assert.deepEqual(clasificar(null, TIPO_SESION.TIME_ATTACK, PUNTUACION_F1), [])
  assert.deepEqual(calcularIntervalos([], true), {})
})

// src/domain/sessionTimer.test.js
// Tests del reloj de sesión temporizada. Lo sutil es el modelo de pausa: msConsumidos es el
// tiempo ya acumulado, y sólo se suma "now - tsInicioCrono" mientras corre. Un error acá y el
// countdown miente — la sesión corta antes o sigue de largo.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  esSesionTemporizada,
  msConsumidosEn,
  tiempoRestanteEn,
  sesionExpiradaEn,
  snapshotCronometro,
  formatCountdown,
} from './sessionTimer.js'
import { SESION, TIPO_SESION } from './constants.js'

const DUR = 300000 // 5 min
// Base realista tipo Date.now(). No usar 0 como timestamp: en producción tsInicioCrono
// siempre es un reloj real, y probar con 0 modelaría un caso que no ocurre.
const T0 = 1_700_000_000_000

// Sesión corriendo: arrancó en `inicio`, con `previo` ms ya acumulados de tramos anteriores.
const corriendo = (inicio, previo = 0, tipo = TIPO_SESION.QUALY) => ({
  tipo,
  estado: SESION.EN_CURSO,
  duracionMs: DUR,
  msConsumidos: previo,
  tsInicioCrono: inicio,
})

// Sesión pausada: el tiempo quedó congelado en msConsumidos, sin tramo activo.
const pausada = (consumido, tipo = TIPO_SESION.QUALY) => ({
  tipo,
  estado: SESION.PAUSADA,
  duracionMs: DUR,
  msConsumidos: consumido,
  tsInicioCrono: null,
})

// --- esSesionTemporizada ---------------------------------------------------

test('esSesionTemporizada exige tipo con reloj Y duración > 0', () => {
  assert.ok(esSesionTemporizada({ tipo: TIPO_SESION.QUALY, duracionMs: DUR }))
  assert.ok(esSesionTemporizada({ tipo: TIPO_SESION.PRACTICA, duracionMs: DUR }))
  assert.ok(esSesionTemporizada({ tipo: TIPO_SESION.TIME_ATTACK, duracionMs: DUR }))
  // La carrera nunca es temporizada: termina por vueltas.
  assert.ok(!esSesionTemporizada({ tipo: TIPO_SESION.CARRERA, duracionMs: DUR }))
  // Tipo con reloj pero sin duración tampoco.
  assert.ok(!esSesionTemporizada({ tipo: TIPO_SESION.QUALY, duracionMs: 0 }))
  assert.ok(!esSesionTemporizada({ tipo: TIPO_SESION.QUALY }))
})

// --- msConsumidosEn: el modelo de pausa ------------------------------------

test('corriendo: suma el tramo vivo (now - tsInicioCrono) a lo ya acumulado', () => {
  // arrancó en T0, ya tenía 60s previos; "ahora" son T0 + 30s
  assert.equal(msConsumidosEn(corriendo(T0, 60000), T0 + 30000), 90000)
})

test('pausada: el tiempo queda congelado, no avanza con now', () => {
  const s = pausada(90000)
  assert.equal(msConsumidosEn(s, T0 + 999999), 90000) // "ahora" no importa: no corre
})

test('pausar y reanudar acumula bien (no pierde ni duplica tiempo)', () => {
  // Tramo 1: corre 40s. Se pausa -> quedan 40s consumidos.
  const consumidoAlPausar = msConsumidosEn(corriendo(T0), T0 + 40000)
  assert.equal(consumidoAlPausar, 40000)

  // Tramo 2: reanuda con 40s previos; a los 25s del tramo van 65s totales.
  const s2 = corriendo(T0 + 100000, consumidoAlPausar)
  assert.equal(msConsumidosEn(s2, T0 + 100000 + 25000), 65000)
})

// --- tiempoRestanteEn / expiración -----------------------------------------

test('tiempoRestante es null si no es temporizada, y nunca negativo', () => {
  assert.equal(tiempoRestanteEn({ tipo: TIPO_SESION.CARRERA }, T0), null)
  assert.equal(tiempoRestanteEn(corriendo(T0), T0 + 60000), DUR - 60000)
  // Pasado el final, se satura en 0 en vez de irse a negativo.
  assert.equal(tiempoRestanteEn(corriendo(T0), T0 + DUR + 10000), 0)
})

test('expira exactamente al llegar a duracionMs', () => {
  assert.equal(sesionExpiradaEn(corriendo(T0), T0 + DUR - 1), false) // 1ms antes
  assert.equal(sesionExpiradaEn(corriendo(T0), T0 + DUR), true) // justo en el límite
  // Una no-temporizada nunca expira por reloj.
  assert.equal(sesionExpiradaEn({ tipo: TIPO_SESION.CARRERA }, T0 + 999999), false)
})

// --- snapshotCronometro: congelar al pausar/finalizar ----------------------

test('snapshot congela el consumido y limpia el tramo vivo', () => {
  const snap = snapshotCronometro(corriendo(T0, 20000), T0 + 10000)
  assert.equal(snap.msConsumidos, 30000) // 20s previos + 10s del tramo
  assert.equal(snap.tsInicioCrono, T0 + 10000) // reancla al now (sigue corriendo)
  assert.equal(snap.duracionMs, DUR)
})

test('snapshot no deja pasar el consumido por encima de la duración', () => {
  const snap = snapshotCronometro(corriendo(T0), T0 + DUR + 50000) // se pasó del final
  assert.equal(snap.msConsumidos, DUR) // capado en la duración
})

test('snapshot de una sesión no temporizada es null', () => {
  assert.equal(snapshotCronometro({ tipo: TIPO_SESION.CARRERA }, 0), null)
})

// --- formatCountdown -------------------------------------------------------

test('formatCountdown a MM:SS, redondea hacia arriba y no baja de 00:00', () => {
  assert.equal(formatCountdown(0), '00:00')
  assert.equal(formatCountdown(65000), '01:05')
  assert.equal(formatCountdown(-5000), '00:00') // nunca negativo
  assert.equal(formatCountdown(1), '00:01') // 1ms redondea a 1s, no a 0
})

// src/domain/progression.test.js
// Tests de la secuencia del torneo: qué viene después de finalizar una sesión, y cómo se
// materializa la definición de una sesión desde la config. Puro: recorre arrays de config.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { siguientePaso, defSesion } from './progression.js'
import { TIPO_SESION } from './constants.js'

// Dos circuitos: c1 con práctica+carrera, c2 con una sola carrera.
const CONFIG = {
  circuitos: [
    {
      id: 'c1',
      tiempoMinimoVuelta: 3000,
      sesiones: [
        { id: 'c1-practica', tipo: TIPO_SESION.PRACTICA, vueltas: 0, duracionMs: 300000 },
        { id: 'c1-carrera', tipo: TIPO_SESION.CARRERA, vueltas: 3 },
      ],
    },
    {
      id: 'c2',
      tiempoMinimoVuelta: 2500,
      sesiones: [{ id: 'c2-carrera', tipo: TIPO_SESION.CARRERA, vueltas: 5 }],
    },
  ],
}

// --- siguientePaso ---------------------------------------------------------

test('dentro de un circuito, avanza a la siguiente sesión', () => {
  assert.deepEqual(siguientePaso(CONFIG, 'c1', 'c1-practica'), {
    tipo: 'SIGUIENTE_SESION',
    circuitoId: 'c1',
    sesionId: 'c1-carrera',
  })
})

test('al terminar la última sesión de un circuito, salta al siguiente circuito', () => {
  assert.deepEqual(siguientePaso(CONFIG, 'c1', 'c1-carrera'), {
    tipo: 'SIGUIENTE_CIRCUITO',
    circuitoCompletadoId: 'c1',
    circuitoId: 'c2',
    sesionId: 'c2-carrera', // la primera del circuito siguiente
  })
})

test('al terminar la última sesión del último circuito, el torneo finaliza', () => {
  assert.deepEqual(siguientePaso(CONFIG, 'c2', 'c2-carrera'), {
    tipo: 'TORNEO_FINALIZADO',
    circuitoCompletadoId: 'c2',
  })
})

test('circuito o sesión inexistentes lanzan (estado corrupto, no silencioso)', () => {
  assert.throws(() => siguientePaso(CONFIG, 'cX', 'c1-practica'), /Circuito no encontrado/)
  assert.throws(() => siguientePaso(CONFIG, 'c1', 'no-existe'), /Sesión no encontrada/)
})

// --- defSesion -------------------------------------------------------------

test('defSesion materializa la sesión con circuito y tiempoMinimoVuelta heredados', () => {
  assert.deepEqual(defSesion(CONFIG, 'c1-practica'), {
    id: 'c1-practica',
    tipo: TIPO_SESION.PRACTICA,
    vueltas: 0,
    duracionMs: 300000,
    circuitoId: 'c1',
    tiempoMinimoVuelta: 3000, // heredado del circuito
  })
})

test('defSesion: una carrera sin duracionMs la materializa como null', () => {
  const s = defSesion(CONFIG, 'c2-carrera')
  assert.equal(s.duracionMs, null)
  assert.equal(s.tiempoMinimoVuelta, 2500)
  assert.equal(s.circuitoId, 'c2')
})

test('defSesion de una sesión inexistente devuelve null', () => {
  assert.equal(defSesion(CONFIG, 'no-existe'), null)
})

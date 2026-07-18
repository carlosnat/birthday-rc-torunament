// src/webrtc/lease.test.js
// Tests de la política del lease de cámara: quién puede tomar la cámara y a quién mira el
// público. La regla es sutil (staleness a 15s, "soy yo reanudo", el race de doble-claim) y ya
// tuvo bugs — este test la congela. Verificado antes en un script descartable; ahora vive acá.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { viva, titularVivo, camaraActiva } from './lease.js'
import { STALE_MS } from './rtcConfig.js'

const T0 = 1_700_000_000_000
const conectada = (lastHeartbeat) => ({ estado: 'CONECTADA', lastHeartbeat })

// El gate de reclamarCamara: un candidato gana si no hay OTRO titular vivo.
const puedeReclamar = (camaras, miId, now) => {
  const t = titularVivo(camaras, now)
  return !(t && t.id !== miId)
}

// El predicado de Camara.jsx "tengo el lease": existe mi nodo y ningún otro vivo me lo quitó.
const tengoLease = (camaras, miId, now) => {
  const t = titularVivo(camaras, now)
  return !!camaras?.[miId] && !(t && t.id !== miId)
}

// --- viva: staleness -------------------------------------------------------

test('una cámara está viva sólo si latió hace <= STALE_MS y no está desconectada', () => {
  assert.ok(viva(conectada(T0), T0)) // latió justo ahora
  assert.ok(viva(conectada(T0 - STALE_MS), T0)) // en el límite exacto
  assert.ok(!viva(conectada(T0 - STALE_MS - 1), T0)) // 1ms pasada de stale
  assert.ok(!viva({ estado: 'DESCONECTADA', lastHeartbeat: T0 }, T0)) // cerró la pestaña
  assert.ok(!viva(null, T0))
})

// --- reclamar: el gate de la transacción -----------------------------------

test('reclamar: sin cámara, o si la actual está caída, se puede tomar', () => {
  assert.ok(puedeReclamar(null, 'A', T0)) // no hay nadie
  assert.ok(puedeReclamar({}, 'A', T0)) // nodo vacío
  assert.ok(puedeReclamar({ B: { estado: 'DESCONECTADA', lastHeartbeat: T0 } }, 'A', T0)) // B cerró
  assert.ok(puedeReclamar({ B: conectada(T0 - STALE_MS - 1) }, 'A', T0)) // B stale
})

test('reclamar: NO se puede si hay otra cámara viva (el race de doble-claim)', () => {
  assert.ok(!puedeReclamar({ B: conectada(T0) }, 'A', T0)) // B viva y no soy yo
})

test('reclamar: soy yo -> reanudo con mi mismo id, no duplico', () => {
  assert.ok(puedeReclamar({ A: conectada(T0) }, 'A', T0))
  assert.ok(puedeReclamar({ A: { estado: 'DESCONECTADA', lastHeartbeat: T0 } }, 'A', T0))
})

// --- el lease en Camara.jsx: el bug del parpadeo de wifi -------------------

test('parpadeo de wifi: onDisconnect me marca DESCONECTADA pero NO me echa', () => {
  // El latido re-afirma el lease; mientras nadie más lo tomó, sigo transmitiendo.
  assert.ok(tengoLease({ A: { estado: 'DESCONECTADA', lastHeartbeat: T0 } }, 'A', T0))
})

test('si me caí (>15s) y otro tomó la cámara, cedo', () => {
  const camaras = { A: { estado: 'DESCONECTADA', lastHeartbeat: T0 - 20000 }, B: conectada(T0) }
  assert.ok(!tengoLease(camaras, 'A', T0)) // B está vivo y es el titular
})

test('nunca reclamé / sin id -> no tengo lease', () => {
  assert.ok(!tengoLease({ B: conectada(T0) }, 'A', T0))
  assert.ok(!tengoLease(null, null, T0))
})

// --- a quién mira el público -----------------------------------------------

test('camaraActiva: la viva, o null si sólo hay muertas', () => {
  assert.equal(camaraActiva({ camaras: { A: conectada(T0) } }, T0)?.id, 'A')
  assert.equal(camaraActiva({ camaras: { A: { estado: 'DESCONECTADA', lastHeartbeat: T0 } } }, T0), null)
  // una stale + una viva -> mira la viva
  assert.equal(
    camaraActiva({ camaras: { A: conectada(T0 - 99999), B: conectada(T0) } }, T0)?.id,
    'B',
  )
  assert.equal(camaraActiva(null, T0), null)
})

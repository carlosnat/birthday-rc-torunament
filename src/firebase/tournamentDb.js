// src/firebase/tournamentDb.js
// Operaciones de lectura/escritura sobre la RTDB. Primitivas + seed.
// La lógica de negocio (transiciones, cronometraje) vive en domain/ y se orquesta
// en raceActions.js. Aquí solo se persiste.

import { ref, set, update, get, push, remove, serverTimestamp } from 'firebase/database'
import { db } from './firebase.js'
import * as P from './paths.js'
import { TORNEO, CIRCUITO, SESION } from '../domain/constants.js'
import { carritoInicial } from '../domain/lapTiming.js'
import { defSesion } from '../domain/progression.js'
import { TORNEO_ID, CONFIG_DEMO, EQUIPOS_DEMO } from './seed.js'

// --- primitivas --------------------------------------------------------------

export function writePath(path, value) {
  return set(ref(db, path), value)
}

export function updatePath(path, value) {
  return update(ref(db, path), value)
}

export async function readPath(path) {
  const snap = await get(ref(db, path))
  return snap.val()
}

/** Log append-only (caja negra / auditoría). */
export function logEvento(t, tipo, detalle = {}) {
  return push(ref(db, P.eventos(t)), {
    ts: Date.now(),
    serverTs: serverTimestamp(),
    tipo,
    detalle,
  })
}

// --- seed --------------------------------------------------------------------

/** Construye una sesión inicial (ESPERANDO) con un carrito EN_GRILLA por equipo. */
function sesionInicial(config, equiposMap, def) {
  const carritos = {}
  for (const eqId of Object.keys(equiposMap)) {
    carritos[eqId] = carritoInicial()
  }
  return {
    estado: SESION.ESPERANDO,
    tipo: def.tipo,
    vueltasObjetivo: def.vueltas,
    circuitoId: def.circuitoId,
    tiempoMinimoVuelta: def.tiempoMinimoVuelta,
    pilotos: {},
    carritos,
    resultados: [],
  }
}

/** Crea el torneo de prueba completo en BORRADOR. Sobrescribe lo anterior. */
export async function seedTorneo() {
  const t = TORNEO_ID
  const circuitos = {}
  const sesiones = {}

  for (const c of CONFIG_DEMO.circuitos) {
    circuitos[c.id] = { estado: CIRCUITO.PENDIENTE, nombre: c.nombre }
    for (const s of c.sesiones) {
      const def = defSesion(CONFIG_DEMO, s.id)
      sesiones[s.id] = sesionInicial(CONFIG_DEMO, EQUIPOS_DEMO, def)
    }
  }

  const arbol = {
    config: CONFIG_DEMO,
    estado: TORNEO.BORRADOR,
    circuitoActivo: null,
    sesionActiva: null,
    circuitos,
    equipos: EQUIPOS_DEMO,
    sesiones,
    eventos: null,
  }

  await writePath(P.torneo(t), arbol)
  await logEvento(t, 'SEED', { nombre: CONFIG_DEMO.nombre })
  return t
}

/** Borra el torneo de prueba por completo. */
export function resetTorneo() {
  return remove(ref(db, P.torneo(TORNEO_ID)))
}

// src/firebase/tournamentDb.js
// Operaciones de lectura/escritura sobre la RTDB. Primitivas + creación de torneos.
// La lógica de negocio vive en domain/ y se orquesta en raceActions.js / registroActions.js.

import { ref, set, update, get, push, remove, serverTimestamp } from 'firebase/database'
import { db } from './firebase.js'
import * as P from './paths.js'
import { TORNEO, CIRCUITO, SESION } from '../domain/constants.js'
import { defSesion } from '../domain/progression.js'
import { TORNEO_ID } from '../currentTorneo.js'
import { DEFAULT_CONFIG, EQUIPOS_DEMO } from './seed.js'

// --- primitivas --------------------------------------------------------------

export function writePath(path, value) {
  return set(ref(db, path), value)
}

export function updatePath(path, value) {
  return update(ref(db, path), value)
}

/** Push a una lista; devuelve la referencia (tiene .key con el id generado). */
export function pushPath(path, value) {
  return push(ref(db, path), value)
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

// --- construcción de torneo --------------------------------------------------

/** Sesión inicial (ESPERANDO). Los carritos se crean al comenzar el torneo, desde los equipos registrados. */
function sesionInicial(config, def) {
  return {
    estado: SESION.ESPERANDO,
    tipo: def.tipo,
    vueltasObjetivo: def.vueltas,
    circuitoId: def.circuitoId,
    tiempoMinimoVuelta: def.tiempoMinimoVuelta,
    pilotos: {},
    resultados: [],
  }
}

function construirArbol(config, equipos) {
  const circuitos = {}
  const sesiones = {}
  for (const c of config.circuitos) {
    circuitos[c.id] = { estado: CIRCUITO.PENDIENTE, nombre: c.nombre }
    for (const s of c.sesiones) {
      sesiones[s.id] = sesionInicial(config, defSesion(config, s.id))
    }
  }
  return {
    config,
    estado: TORNEO.BORRADOR,
    circuitoActivo: null,
    sesionActiva: null,
    circuitos,
    equipos: equipos || null,
    sensores: null,
    sesiones,
    eventos: null,
  }
}

/** Crea un torneo VACÍO (sin equipos) listo para registro por QR, directamente en REGISTRO. */
export async function crearTorneo(t = TORNEO_ID, config = DEFAULT_CONFIG) {
  const arbol = construirArbol(config, null)
  arbol.estado = TORNEO.REGISTRO
  await writePath(P.torneo(t), arbol)
  await logEvento(t, 'TORNEO_CREADO', { nombre: config.nombre })
  return t
}

/** Crea un torneo DEMO con equipos hardcodeados (prueba rápida de la máquina de estados). */
export async function seedTorneoDemo(t = TORNEO_ID, config = DEFAULT_CONFIG) {
  const arbol = construirArbol(config, EQUIPOS_DEMO)
  await writePath(P.torneo(t), arbol)
  await logEvento(t, 'SEED_DEMO', { nombre: config.nombre })
  return t
}

/** Borra el torneo por completo. */
export function resetTorneo(t = TORNEO_ID) {
  return remove(ref(db, P.torneo(t)))
}

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
    duracionMs: def.duracionMs ?? null,
    msConsumidos: 0,
    tsInicioCrono: null,
    pilotos: {},
    resultados: [],
  }
}

function construirArbol(config, equipos, sensores) {
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
    sensores: sensores || null,
    sesiones,
    eventos: null,
  }
}

function resumenTorneo(t = TORNEO_ID, config, extra = {}) {
  return {
    nombre: config.nombre,
    estado: extra.estado || TORNEO.BORRADOR,
    circuitoCount: config.circuitos.length,
    sesionesCount: config.circuitos.reduce((total, circuito) => total + (circuito.sesiones?.length || 0), 0),
    createdAt: extra.createdAt || Date.now(),
    updatedAt: extra.updatedAt || Date.now(),
    demo: Boolean(extra.demo),
    reiniciado: Boolean(extra.reiniciado),
    origenTorneoId: extra.origenTorneoId || null,
    url: `${window.location.origin}/?t=${t}&rol=publico`,
  }
}

async function writeIndex(t, config, extra = {}) {
  await writePath(`${P.torneosIndex()}/${t}`, resumenTorneo(t, config, extra))
}

/** Crea un torneo listo para registro por QR, directamente en REGISTRO. */
export async function crearTorneo(t = TORNEO_ID, config = DEFAULT_CONFIG, { equipos = null, sensores = null, estado = TORNEO.REGISTRO } = {}) {
  const arbol = construirArbol(config, equipos, sensores)
  arbol.estado = estado
  await writePath(P.torneo(t), arbol)
  await writeIndex(t, config, { estado })
  await logEvento(t, 'TORNEO_CREADO', { nombre: config.nombre })
  return t
}

/** Crea un torneo DEMO con equipos hardcodeados (prueba rápida de la máquina de estados). */
export async function seedTorneoDemo(t = TORNEO_ID, config = DEFAULT_CONFIG) {
  const arbol = construirArbol(config, EQUIPOS_DEMO, null)
  await writePath(P.torneo(t), arbol)
  await writeIndex(t, config, { estado: TORNEO.BORRADOR, demo: true })
  await logEvento(t, 'SEED_DEMO', { nombre: config.nombre })
  return t
}

/** Borra el torneo por completo. */
export function resetTorneo(t = TORNEO_ID) {
  return Promise.all([
    remove(ref(db, P.torneo(t))),
    remove(ref(db, `${P.torneosIndex()}/${t}`)),
  ])
}

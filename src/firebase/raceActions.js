// src/firebase/raceActions.js
// Orquestación: combina las reglas puras de domain/ con la persistencia de tournamentDb.js.
// Cada acción recibe el snapshot vivo del torneo (desde el hook) para validar contra
// el estado real, y escribe en RTDB. Los componentes NO reimplementan reglas.

import * as P from './paths.js'
import { TORNEO_ID } from '../currentTorneo.js'
import { nuevoTorneoId } from '../currentTorneo.js'
import { writePath, updatePath, logEvento } from './tournamentDb.js'
import { crearTorneo } from './tournamentDb.js'
import { TORNEO, CIRCUITO, SESION, CARRITO } from '../domain/constants.js'
import { puedeTorneo, puedeSesion, puedeCircuito } from '../domain/stateMachine.js'
import { registrarPasada, carritoInicial } from '../domain/lapTiming.js'
import { clasificar } from '../domain/classification.js'
import { siguientePaso } from '../domain/progression.js'

const T = TORNEO_ID

// --- helpers -----------------------------------------------------------------

function sesionActivaDe(torneo) {
  const sid = torneo?.sesionActiva
  if (!sid) return null
  return { id: sid, ...(torneo.sesiones?.[sid] || {}) }
}

function equiposIds(torneo) {
  return Object.keys(torneo?.equipos || {})
}

// --- TORNEO ------------------------------------------------------------------

export async function irARegistro(torneo) {
  if (!puedeTorneo(torneo.estado, TORNEO.REGISTRO)) return rechazo('TORNEO_TRANSICION', { desde: torneo.estado })
  await writePath(P.estado(T), TORNEO.REGISTRO)
  await logEvento(T, 'TORNEO_REGISTRO')
}

/** Clona un torneo finalizado en uno nuevo con UUID nuevo, reutilizando config/equipos/sensores. */
export async function reiniciarTorneo(torneo) {
  if (!torneo || torneo.estado !== TORNEO.FINALIZADO) {
    return rechazo('TORNEO_TRANSICION', { desde: torneo?.estado })
  }

  const nuevoId = nuevoTorneoId()
  await crearTorneo(nuevoId, torneo.config, {
    equipos: torneo.equipos || null,
    sensores: torneo.sensores || null,
    estado: TORNEO.REGISTRO,
  })
  await writePath(`${P.torneosIndex()}/${nuevoId}`, {
    nombre: torneo.config?.nombre,
    estado: TORNEO.REGISTRO,
    circuitoCount: torneo.config?.circuitos?.length || 0,
    sesionesCount: torneo.config?.circuitos?.reduce((total, circuito) => total + (circuito.sesiones?.length || 0), 0) || 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    demo: false,
    reiniciado: true,
    origenTorneoId: T,
    url: `${window.location.origin}/?t=${nuevoId}&rol=publico`,
  })
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.setItem('f1tournament.reinicio', JSON.stringify({
      torneoId: nuevoId,
      nombre: torneo.config?.nombre || '',
    }))
  }
  await logEvento(nuevoId, 'TORNEO_REINICIADO', { desde: T, nombre: torneo.config?.nombre })
  return { ok: true, nuevoId }
}

/** REGISTRO -> EN_CURSO. Cierra el registro, arma las grillas y activa el primer circuito/sesión. */
export async function comenzarTorneo(torneo) {
  if (!puedeTorneo(torneo.estado, TORNEO.EN_CURSO)) return rechazo('TORNEO_TRANSICION', { desde: torneo.estado })

  const equiposIds = Object.keys(torneo.equipos || {})
  if (equiposIds.length < 2) return rechazo('POCOS_EQUIPOS', { registrados: equiposIds.length })

  const primerCircuito = torneo.config.circuitos[0]
  const primeraSesion = primerCircuito.sesiones[0]

  // Arma la grilla (carritos EN_GRILLA) de cada sesión con los equipos registrados.
  const grilla = {}
  equiposIds.forEach((eq) => { grilla[eq] = carritoInicial() })
  for (const c of torneo.config.circuitos) {
    for (const s of c.sesiones) {
      await writePath(P.carritos(T, s.id), grilla)
    }
  }

  await updatePath(P.torneo(T), {
    estado: TORNEO.EN_CURSO,
    circuitoActivo: primerCircuito.id,
    sesionActiva: primeraSesion.id,
  })
  await writePath(P.circuitoEstado(T, primerCircuito.id), CIRCUITO.ACTIVO)
  await logEvento(T, 'TORNEO_EN_CURSO', { circuito: primerCircuito.id, sesion: primeraSesion.id, equipos: equiposIds.length })
}

// --- SESIÓN ------------------------------------------------------------------

/** ESPERANDO -> LARGADA. Bloquea si falta asignar piloto en algún equipo. */
export async function largar(torneo) {
  const s = sesionActivaDe(torneo)
  if (!s) return rechazo('SIN_SESION_ACTIVA')
  if (!puedeSesion(s.estado, SESION.LARGADA, s.tipo)) return rechazo('SESION_TRANSICION', { desde: s.estado })

  const faltantes = equiposIds(torneo).filter((eq) => !s.pilotos?.[eq])
  if (faltantes.length > 0) {
    return rechazo('SIN_PILOTO', { equipos: faltantes })
  }

  await writePath(P.sesionEstado(T, s.id), SESION.LARGADA)
  await logEvento(T, 'LARGADA', { sesion: s.id })
}

/** LARGADA -> EN_CURSO (luz verde del semáforo). */
export async function luzVerde(torneo) {
  const s = sesionActivaDe(torneo)
  if (!s) return rechazo('SIN_SESION_ACTIVA')
  if (!puedeSesion(s.estado, SESION.EN_CURSO, s.tipo)) return rechazo('SESION_TRANSICION', { desde: s.estado })
  await writePath(P.sesionEstado(T, s.id), SESION.EN_CURSO)
  await logEvento(T, 'LUZ_VERDE', { sesion: s.id })
}

export async function pausar(torneo) {
  const s = sesionActivaDe(torneo)
  if (!s || !puedeSesion(s.estado, SESION.PAUSADA, s.tipo)) return rechazo('SESION_TRANSICION', { desde: s?.estado })
  await writePath(P.sesionEstado(T, s.id), SESION.PAUSADA)
  await logEvento(T, 'PAUSA', { sesion: s.id })
}

export async function reanudar(torneo) {
  const s = sesionActivaDe(torneo)
  if (!s || !puedeSesion(s.estado, SESION.EN_CURSO, s.tipo)) return rechazo('SESION_TRANSICION', { desde: s?.estado })
  await writePath(P.sesionEstado(T, s.id), SESION.EN_CURSO)
  await logEvento(T, 'REANUDA', { sesion: s.id })
}

export async function setTiempoMinimo(torneo, ms) {
  const s = sesionActivaDe(torneo)
  if (!s) return rechazo('SIN_SESION_ACTIVA')
  await writePath(`${P.sesion(T, s.id)}/tiempoMinimoVuelta`, ms)
  await logEvento(T, 'TIEMPO_MINIMO', { sesion: s.id, ms })
}

export async function asignarPiloto(torneo, eqId, nombre) {
  const s = sesionActivaDe(torneo)
  if (!s) return rechazo('SIN_SESION_ACTIVA')
  await writePath(P.piloto(T, s.id, eqId), nombre)
  await logEvento(T, 'PILOTO', { sesion: s.id, equipo: eqId, nombre })
}

// --- CARRITOS / PASADAS ------------------------------------------------------

/** Busca el equipo dueño de un color (identidad). */
function equipoPorColor(torneo, colorId) {
  const entrada = Object.entries(torneo?.equipos || {}).find(([, eq]) => eq.color === colorId)
  return entrada ? entrada[0] : null
}

/** Pasada detectada por el sensor de meta: mapea color -> equipo y delega en pasada(). */
export async function pasadaPorColor(torneo, colorId, ts = Date.now()) {
  const eqId = equipoPorColor(torneo, colorId)
  if (!eqId) return { aceptada: false, motivo: 'COLOR_SIN_EQUIPO', colorId }
  return pasada(torneo, eqId, ts)
}

/** Procesa una pasada por meta para un equipo/color. */
export async function pasada(torneo, eqId, ts = Date.now()) {
  const s = sesionActivaDe(torneo)
  if (!s) return rechazo('SIN_SESION_ACTIVA')
  const carrito = s.carritos?.[eqId]
  if (!carrito) return rechazo('SIN_CARRITO', { equipo: eqId })

  const res = registrarPasada(carrito, ts, {
    tiempoMinimoVuelta: s.tiempoMinimoVuelta,
    sesionEstado: s.estado,
    tipoSesion: s.tipo,
    vueltasObjetivo: s.vueltasObjetivo,
  })

  if (!res.aceptada) {
    await logEvento(T, 'PASADA_RECHAZADA', { sesion: s.id, equipo: eqId, motivo: res.motivo, deltaMs: res.deltaMs ?? null })
    return res
  }

  await writePath(P.carrito(T, s.id, eqId), res.carrito)

  if (res.disparaBandera) {
    await writePath(P.sesionEstado(T, s.id), SESION.BANDERA)
    await logEvento(T, 'BANDERA', { sesion: s.id, lider: eqId })
  }

  await logEvento(T, 'PASADA', {
    sesion: s.id,
    equipo: eqId,
    tipo: res.tipo,
    vuelta: res.vueltaNro,
    deltaMs: res.deltaMs ?? null,
  })
  return res
}

/** Marca DNF a un carrito (comisario). */
export async function marcarDNF(torneo, eqId, ts = Date.now()) {
  const s = sesionActivaDe(torneo)
  if (!s) return rechazo('SIN_SESION_ACTIVA')
  const carrito = s.carritos?.[eqId]
  if (!carrito) return rechazo('SIN_CARRITO', { equipo: eqId })
  await writePath(P.carrito(T, s.id, eqId), { ...carrito, estado: CARRITO.DNF, tsFinal: ts })
  await logEvento(T, 'DNF', { sesion: s.id, equipo: eqId })
}

/** Corrección manual de vueltas (+1 / -1), sin bajar de 0. */
export async function corregirVuelta(torneo, eqId, delta) {
  const s = sesionActivaDe(torneo)
  if (!s) return rechazo('SIN_SESION_ACTIVA')
  const carrito = s.carritos?.[eqId]
  if (!carrito) return rechazo('SIN_CARRITO', { equipo: eqId })
  const vueltas = Math.max(0, (carrito.vueltas || 0) + delta)
  await writePath(P.carrito(T, s.id, eqId), { ...carrito, vueltas })
  await logEvento(T, 'CORRECCION_VUELTA', { sesion: s.id, equipo: eqId, delta, vueltas })
}

// --- FINALIZACIÓN + PROGRESIÓN ----------------------------------------------

/**
 * Finaliza la sesión activa: calcula resultados/puntos y avanza la secuencia
 * sesión -> circuito -> torneo.
 */
export async function finalizarSesion(torneo) {
  const s = sesionActivaDe(torneo)
  if (!s) return rechazo('SIN_SESION_ACTIVA')
  if (!puedeSesion(s.estado, SESION.FINALIZADA, s.tipo)) {
    return rechazo('SESION_TRANSICION', { desde: s.estado, tipo: s.tipo, nota: 'La carrera solo finaliza por bandera' })
  }

  const resultados = clasificar(s.carritos, s.tipo, torneo.config.puntuacion)
  await updatePath(P.sesion(T, s.id), { estado: SESION.FINALIZADA, resultados })
  await logEvento(T, 'SESION_FINALIZADA', { sesion: s.id, tipo: s.tipo, resultados })

  await avanzar(torneo)
}

/** Avanza a la siguiente sesión/circuito o finaliza el torneo. */
async function avanzar(torneo) {
  const paso = siguientePaso(torneo.config, torneo.circuitoActivo, torneo.sesionActiva)

  if (paso.tipo === 'SIGUIENTE_SESION') {
    await writePath(P.sesionActiva(T), paso.sesionId)
    await logEvento(T, 'AVANCE_SESION', { sesion: paso.sesionId })
    return
  }

  if (paso.tipo === 'SIGUIENTE_CIRCUITO') {
    if (!puedeCircuito(CIRCUITO.ACTIVO, CIRCUITO.COMPLETADO)) return
    await writePath(P.circuitoEstado(T, paso.circuitoCompletadoId), CIRCUITO.COMPLETADO)
    await writePath(P.circuitoEstado(T, paso.circuitoId), CIRCUITO.ACTIVO)
    await updatePath(P.torneo(T), {
      circuitoActivo: paso.circuitoId,
      sesionActiva: paso.sesionId,
    })
    await logEvento(T, 'AVANCE_CIRCUITO', { circuito: paso.circuitoId, sesion: paso.sesionId })
    return
  }

  // TORNEO_FINALIZADO
  await writePath(P.circuitoEstado(T, paso.circuitoCompletadoId), CIRCUITO.COMPLETADO)
  await updatePath(P.torneo(T), {
    estado: TORNEO.FINALIZADO,
    circuitoActivo: null,
    sesionActiva: null,
  })
  await logEvento(T, 'TORNEO_FINALIZADO')
}

// --- util --------------------------------------------------------------------

function rechazo(motivo, detalle = {}) {
  // También se registra en RTDB para la caja negra.
  logEvento(T, 'RECHAZO', { motivo, ...detalle })
  return { aceptada: false, motivo, ...detalle }
}

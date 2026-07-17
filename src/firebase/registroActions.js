// src/firebase/registroActions.js
// Alta autoservicio por QR (Hito 2): equipos, participantes y sensores.
// Solo válido mientras el torneo está en REGISTRO.

import * as P from './paths.js'
import { TORNEO_ID } from '../currentTorneo.js'
import { pushPath, writePath, readPath, updatePath, logEvento } from './tournamentDb.js'
import { TORNEO } from '../domain/constants.js'
import { coloresDisponibles, getColor } from '../domain/colors.js'
import { getAvatar, DEFAULT_AVATAR_ID } from '../domain/avatars.js'
import { crearParticipante, participantesNormalizados } from '../domain/participants.js'

const T = TORNEO_ID

function enRegistro(torneo) {
  return torneo?.estado === TORNEO.REGISTRO
}

function validarEquipoNuevo(torneo, { nombre, colorId }) {
  if (!enRegistro(torneo)) return { ok: false, motivo: 'REGISTRO_CERRADO' }
  if (!nombre?.trim()) return { ok: false, motivo: 'DATOS_INCOMPLETOS' }
  if (!getColor(colorId)) return { ok: false, motivo: 'COLOR_INVALIDO' }

  const libres = coloresDisponibles(torneo.equipos).map((c) => c.id)
  if (!libres.includes(colorId)) return { ok: false, motivo: 'COLOR_TOMADO' }

  return { ok: true }
}

/** Crea un equipo nuevo con su color (identidad), sin participantes iniciales. */
export async function crearEquipoBase(torneo, { nombre, colorId }) {
  const validacion = validarEquipoNuevo(torneo, { nombre, colorId })
  if (!validacion.ok) return validacion

  const equipo = {
    nombre: nombre.trim().toUpperCase(),
    color: colorId,
    participantes: [],
  }
  const refEq = await pushPath(P.equipos(T), equipo)
  await logEvento(T, 'EQUIPO_CREADO', { equipo: refEq.key, nombre: equipo.nombre, color: colorId })
  return { ok: true, eqId: refEq.key }
}

/** Crea un equipo nuevo con su color (identidad) y su primer participante. */
export async function crearEquipo(torneo, { nombre, colorId, participante, avatarId }) {
  const validacion = validarEquipoNuevo(torneo, { nombre, colorId })
  if (!validacion.ok) return validacion
  if (!participante?.trim()) return { ok: false, motivo: 'DATOS_INCOMPLETOS' }

  const avatarValido = getAvatar(avatarId) ? avatarId : DEFAULT_AVATAR_ID

  const equipo = {
    nombre: nombre.trim().toUpperCase(),
    color: colorId,
    participantes: [crearParticipante(participante, avatarValido)],
  }
  const refEq = await pushPath(P.equipos(T), equipo)
  await logEvento(T, 'EQUIPO_CREADO', { equipo: refEq.key, nombre: equipo.nombre, color: colorId })
  return { ok: true, eqId: refEq.key }
}

/** Suma un participante a un equipo existente. */
export async function unirseEquipo(torneo, eqId, participante, avatarId) {
  if (!enRegistro(torneo)) return { ok: false, motivo: 'REGISTRO_CERRADO' }
  if (!participante?.trim()) return { ok: false, motivo: 'DATOS_INCOMPLETOS' }

  const eq = torneo.equipos?.[eqId] || (await readPath(P.equipo(T, eqId)))
  if (!eq) return { ok: false, motivo: 'EQUIPO_INEXISTENTE' }

  const avatarValido = getAvatar(avatarId) ? avatarId : DEFAULT_AVATAR_ID
  const participantes = [...participantesNormalizados(eq), crearParticipante(participante, avatarValido)]
  await writePath(`${P.equipo(T, eqId)}/participantes`, participantes)
  await logEvento(T, 'PARTICIPANTE', { equipo: eqId, nombre: participante.trim() })
  return { ok: true, eqId }
}

/** Registra un sensor en la pista. Queda al final de la lista (orden = posición). */
export async function registrarSensor(nombre) {
  if (!nombre?.trim()) return { ok: false, motivo: 'DATOS_INCOMPLETOS' }
  const actuales = (await readPath(P.sensores(T))) || {}
  const orden = Object.keys(actuales).length
  const sensor = {
    nombre: nombre.trim(),
    orden,
    estado: 'CONECTADO',
    lastHeartbeat: Date.now(),
  }
  const refS = await pushPath(P.sensores(T), sensor)
  await logEvento(T, 'SENSOR_REGISTRADO', { sensor: refS.key, nombre: sensor.nombre, orden })
  return { ok: true, sensorId: refS.key }
}

/** Latido del sensor: actualiza estado/fps/batería para el monitor de salud del comisario. */
export function heartbeat(sensorId, { fps = null, bateria = null } = {}) {
  return updatePath(P.sensor(T, sensorId), {
    estado: 'CONECTADO',
    lastHeartbeat: Date.now(),
    fps,
    bateria,
  })
}

/** Reordena un sensor intercambiando su `orden` con el vecino (dir: -1 sube, +1 baja). */
export async function moverSensor(sensoresMap, sensorId, dir) {
  const ordenados = Object.entries(sensoresMap || {})
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const i = ordenados.findIndex((s) => s.id === sensorId)
  const j = i + dir
  if (i < 0 || j < 0 || j >= ordenados.length) return { ok: false, motivo: 'FUERA_DE_RANGO' }

  const a = ordenados[i]
  const b = ordenados[j]
  await updatePath(P.sensor(T, a.id), { orden: b.orden })
  await updatePath(P.sensor(T, b.id), { orden: a.orden })
  await logEvento(T, 'SENSOR_REORDENADO', { sensor: a.id, orden: b.orden })
  return { ok: true }
}

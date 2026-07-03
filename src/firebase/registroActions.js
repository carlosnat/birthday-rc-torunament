// src/firebase/registroActions.js
// Alta autoservicio por QR (Hito 2): equipos, participantes y sensores.
// Solo válido mientras el torneo está en REGISTRO.

import * as P from './paths.js'
import { TORNEO_ID } from '../currentTorneo.js'
import { pushPath, writePath, readPath, updatePath, logEvento } from './tournamentDb.js'
import { TORNEO } from '../domain/constants.js'
import { coloresDisponibles, getColor } from '../domain/colors.js'

const T = TORNEO_ID

function enRegistro(torneo) {
  return torneo?.estado === TORNEO.REGISTRO
}

/** Crea un equipo nuevo con su color (identidad) y su primer participante. */
export async function crearEquipo(torneo, { nombre, colorId, participante }) {
  if (!enRegistro(torneo)) return { ok: false, motivo: 'REGISTRO_CERRADO' }
  if (!nombre?.trim() || !participante?.trim()) return { ok: false, motivo: 'DATOS_INCOMPLETOS' }
  if (!getColor(colorId)) return { ok: false, motivo: 'COLOR_INVALIDO' }

  const libres = coloresDisponibles(torneo.equipos).map((c) => c.id)
  if (!libres.includes(colorId)) return { ok: false, motivo: 'COLOR_TOMADO' }

  const equipo = {
    nombre: nombre.trim().toUpperCase(),
    color: colorId,
    participantes: [participante.trim()],
  }
  const refEq = await pushPath(P.equipos(T), equipo)
  await logEvento(T, 'EQUIPO_CREADO', { equipo: refEq.key, nombre: equipo.nombre, color: colorId })
  return { ok: true, eqId: refEq.key }
}

/** Suma un participante a un equipo existente. */
export async function unirseEquipo(torneo, eqId, participante) {
  if (!enRegistro(torneo)) return { ok: false, motivo: 'REGISTRO_CERRADO' }
  if (!participante?.trim()) return { ok: false, motivo: 'DATOS_INCOMPLETOS' }

  const eq = torneo.equipos?.[eqId]
  if (!eq) return { ok: false, motivo: 'EQUIPO_INEXISTENTE' }

  const participantes = [...(eq.participantes || []), participante.trim()]
  await writePath(`${P.equipo(T, eqId)}/participantes`, participantes)
  await logEvento(T, 'PARTICIPANTE', { equipo: eqId, nombre: participante.trim() })
  return { ok: true }
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

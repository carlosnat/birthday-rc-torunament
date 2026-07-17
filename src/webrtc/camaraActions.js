// src/webrtc/camaraActions.js
// La cámara es un LEASE, no un registro: hay una sola y es exclusiva.
//
// registrarSensor() usa read-then-write, y para sensores da igual (dos altas concurrentes sólo
// colisionan el `orden`, que el comisario reordena). Acá no: dos invitados escaneando el QR a
// la vez ganarían los dos. Sin servidor, la única primitiva atómica es runTransaction.

import { ref, onDisconnect } from 'firebase/database'
import { db } from '../firebase/firebase.js'
import * as P from '../firebase/paths.js'
import { TORNEO_ID } from '../currentTorneo.js'
import { transactPath, updatePath, nuevaKey, logEvento } from '../firebase/tournamentDb.js'
import { limpiarCamara } from './signaling.js'
import { STALE_MS } from './rtcConfig.js'

const T = TORNEO_ID

/** ¿Sigue viva? Desconectada explícita o sin latido reciente => se puede tomar. */
function viva(cam, now) {
  if (!cam || cam.estado === 'DESCONECTADA') return false
  return cam.lastHeartbeat != null && now - cam.lastHeartbeat <= STALE_MS
}

/** El titular vivo del lease, o null. `{ id, ...cam }` para que el id viaje con el objeto. */
export function titularVivo(camaras, now = Date.now()) {
  const entrada = Object.entries(camaras || {}).find(([, cam]) => viva(cam, now))
  return entrada ? { id: entrada[0], ...entrada[1] } : null
}

/** La cámara que el público debería mirar. Null si no hay ninguna viva. */
export function camaraActiva(torneo, now = Date.now()) {
  return titularVivo(torneo?.camaras, now)
}

/**
 * Toma el lease. Gana si: no hay titular, el titular está caído, o el titular soy yo
 * (reanudo con el mismo id en vez de duplicar).
 * @param {string} nombre
 * @param {string|null} idPrevio id guardado en localStorage, si esta pestaña ya tenía la cámara
 * @returns {Promise<{ok: true, camId} | {ok: false, motivo, titular?}>}
 */
export async function reclamarCamara(nombre, idPrevio = null) {
  if (!nombre?.trim()) return { ok: false, motivo: 'DATOS_INCOMPLETOS' }

  // La key se genera del lado del cliente sin escribir: la necesitamos ANTES de la
  // transacción, porque adentro no se puede hacer push.
  const camId = idPrevio || nuevaKey(P.camaras(T))
  const ahora = Date.now()

  const { committed } = await transactPath(P.camaras(T), (actual) => {
    const titular = titularVivo(actual, ahora)
    // Abortar: hay alguien vivo y no soy yo.
    if (titular && titular.id !== camId) return undefined
    return {
      ...(actual || {}),
      [camId]: {
        nombre: nombre.trim().toUpperCase(),
        estado: 'CONECTADA',
        lastHeartbeat: ahora,
        createdAt: actual?.[camId]?.createdAt ?? ahora,
      },
    }
  })

  if (!committed) {
    return { ok: false, motivo: 'CAMARA_OCUPADA' }
  }

  armarLiberacion(camId)

  // Salas viejas de un lease anterior con este mismo id: arrancar en limpio.
  await limpiarCamara(T, camId)
  await logEvento(T, 'CAMARA_REGISTRADA', { camara: camId, nombre: nombre.trim() })
  return { ok: true, camId }
}

/**
 * Latido: mantiene el lease y avisa al público que sigue viva.
 *
 * Re-afirma `CONECTADA` a propósito: ante un parpadeo de red el servidor dispara el
 * onDisconnect y marca DESCONECTADA, y sin esto el invitado quedaría afuera hasta volver a
 * tocar el botón. Como sólo late quien tiene el lease, esto no puede pisar a otro titular.
 */
export function heartbeatCamara(camId, { bateria = null } = {}) {
  // Re-armar: el onDisconnect se consume al dispararse, y sin esto la próxima caída ya no
  // liberaría el lease.
  armarLiberacion(camId)
  return updatePath(P.camara(T, camId), {
    estado: 'CONECTADA',
    lastHeartbeat: Date.now(),
    bateria,
  })
}

/** Que el servidor libere el lease apenas se caiga el socket, sin esperar los 15s. */
export function armarLiberacion(camId) {
  return onDisconnect(ref(db, P.camara(T, camId))).update({ estado: 'DESCONECTADA' })
}

/** Suelta el lease a propósito (el invitado toca "dejar de transmitir"). */
export function soltarCamara(camId) {
  return updatePath(P.camara(T, camId), { estado: 'DESCONECTADA' })
}

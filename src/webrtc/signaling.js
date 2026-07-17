// src/webrtc/signaling.js
// Señalización WebRTC sobre RTDB. Único módulo que conoce este árbol.
//
// POR QUÉ VIVE FUERA DE torneos/{t}:
// useTournament hace UN onValue sobre torneos/{t} completo y en cada cambio ejecuta
// snap.val(), que materializa el árbol entero en un objeto nuevo => re-render de todos los
// consumidores de useTorneo(). Una ráfaga ICE son 10-30 escrituras en ~2s: adentro del
// torneo, eso serían 30 deserializaciones del árbol + 30 reconciliaciones de React en TODOS
// los clientes, incluidos los teléfonos-sensor corriendo el hot-loop de detección a 30fps.
// Acá afuera nadie lo escucha salvo los dos peers que están negociando.
//
// Estructura:
//   webrtc/{t}/{camId}/viewers/{viewerId}
//     offer  { type, sdp }        <- escribe el viewer
//     answer { type, sdp }        <- escribe la cámara
//     ice/viewer/{pushId}         <- escribe el viewer
//     ice/camara/{pushId}         <- escribe la cámara
//
// La sala se nombra por camId: cámara nueva = sala nueva = cero estado zombi.
// El ICE va separado por emisor para que cada lado escuche sólo la rama del otro y no
// reciba sus propios candidatos de vuelta.

import { ref, set, push, remove, onValue, onChildAdded, onChildRemoved, onDisconnect } from 'firebase/database'
import { db } from '../firebase/firebase.js'

export const raizWebrtc = (t) => `webrtc/${t}`
const viewers = (t, camId) => `${raizWebrtc(t)}/${camId}/viewers`
const sala = (t, camId, viewerId) => `${viewers(t, camId)}/${viewerId}`
const offerPath = (t, camId, viewerId) => `${sala(t, camId, viewerId)}/offer`
const answerPath = (t, camId, viewerId) => `${sala(t, camId, viewerId)}/answer`
const icePath = (t, camId, viewerId, emisor) => `${sala(t, camId, viewerId)}/ice/${emisor}`

/** Un RTCSessionDescription no es serializable tal cual: RTDB sólo acepta datos planos. */
const plano = (desc) => ({ type: desc.type, sdp: desc.sdp })

// --- viewer -----------------------------------------------------------------

/** Abre la sala con la offer. Se escribe entera de una para que la cámara la vea completa. */
export async function abrirSala(t, camId, viewerId, offer) {
  await set(ref(db, sala(t, camId, viewerId)), { offer: plano(offer), createdAt: Date.now() })
  // Que el servidor limpie la sala si esta pestaña muere: no depende de que corra código acá.
  onDisconnect(ref(db, sala(t, camId, viewerId))).remove()
}

export function escucharAnswer(t, camId, viewerId, cb) {
  return onValue(ref(db, answerPath(t, camId, viewerId)), (snap) => {
    const val = snap.val()
    if (val) cb(val)
  })
}

export function cerrarSala(t, camId, viewerId) {
  return remove(ref(db, sala(t, camId, viewerId)))
}

// --- cámara -----------------------------------------------------------------

/**
 * Fan-out: un solo listener sobre viewers/ y una PC por cada viewer que llega.
 * Ignora las salas sin offer (una ráfaga ICE podría crear el nodo antes; el viewer bufferea
 * sus candidatos justamente para que eso no pase, esto es cinturón y tiradores).
 */
export function escucharViewers(t, camId, cb) {
  return onChildAdded(ref(db, viewers(t, camId)), (snap) => {
    const val = snap.val()
    if (val?.offer) cb(snap.key, val.offer)
  })
}

/**
 * El viewer se fue: cerró la pestaña (lo limpia el onDisconnect del servidor) o está
 * reintentando con una sala nueva. Sin esto el teléfono acumula RTCPeerConnection muertas.
 */
export function escucharViewerIdo(t, camId, cb) {
  return onChildRemoved(ref(db, viewers(t, camId)), (snap) => cb(snap.key))
}

export function publicarAnswer(t, camId, viewerId, answer) {
  return set(ref(db, answerPath(t, camId, viewerId)), plano(answer))
}

/** Borra todas las salas de una cámara. Se usa al reclamarla, para arrancar en limpio. */
export function limpiarCamara(t, camId) {
  return remove(ref(db, `${raizWebrtc(t)}/${camId}`))
}

// --- ICE (los dos lados) ----------------------------------------------------

export function publicarCandidato(t, camId, viewerId, emisor, candidato) {
  return push(ref(db, icePath(t, camId, viewerId, emisor)), candidato.toJSON())
}

/** `emisor` es de quién querés escuchar candidatos, no quién sos vos. */
export function escucharCandidatos(t, camId, viewerId, emisor, cb) {
  return onChildAdded(ref(db, icePath(t, camId, viewerId, emisor)), (snap) => {
    const val = snap.val()
    if (val) cb(val)
  })
}

// src/webrtc/lease.js
// Política pura del lease de cámara: quién es el titular vivo, sin tocar Firebase ni la URL.
// Vive aparte de camaraActions.js (que arrastra firebase y window) para poder testearla sola.

import { STALE_MS } from './rtcConfig.js'

/** ¿Sigue viva? Desconectada explícita o sin latido reciente => se puede tomar. */
export function viva(cam, now) {
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

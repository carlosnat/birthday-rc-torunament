// src/currentTorneo.js
// Identidad del torneo y del rol tomada de la URL (?t=uuid&rol=...).
// Un tab = un torneo. Sin react-router: se lee una vez al cargar.

const params = new URLSearchParams(window.location.search)

/** torneoId activo (uuid) o null si la URL no lo trae. */
export const TORNEO_ID = params.get('t') || null

/** rol de la pantalla: harness | publico | registro | comisario | equipo | sensor. */
export const ROL = params.get('rol') || 'harness'

/** Genera un uuid nuevo para un torneo. */
export function nuevoTorneoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Origin público para los QR/enlaces. Prioridad:
 *  1) ?host= en la URL (override manual)
 *  2) VITE_PUBLIC_HOST del entorno (.env.local, ej: 192.168.3.41:5173)
 *  3) el host actual (window.location.host)
 * Si el host resultante es localhost/127.0.0.1, el QR no será alcanzable desde el celular.
 */
export function publicOrigin() {
  const override = params.get('host') || import.meta.env.VITE_PUBLIC_HOST
  const host = override || window.location.host
  return `${window.location.protocol}//${host}`
}

/** Construye una URL absoluta para un rol/torneo (para QR y navegación). */
export function urlRol(rol, t = TORNEO_ID) {
  const p = new URLSearchParams()
  if (t) p.set('t', t)
  if (rol) p.set('rol', rol)
  return `${publicOrigin()}/?${p.toString()}`
}

/** Construye una URL absoluta para el registro por QR, separando equipo y sensor. */
export function urlRegistro(kind, t = TORNEO_ID) {
  const p = new URLSearchParams()
  if (t) p.set('t', t)
  p.set('rol', 'registro')
  if (kind) p.set('kind', kind)
  return `${publicOrigin()}/?${p.toString()}`
}

/** Navega (recarga) a un rol/torneo dado. */
export function irA(rol, t = TORNEO_ID) {
  window.location.search = new URLSearchParams({ ...(t ? { t } : {}), rol }).toString()
}

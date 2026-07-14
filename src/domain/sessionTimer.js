import { SESION, TIPO_SESION } from './constants.js'

export function esSesionTemporizada(sesion) {
  const duracionMs = Number(sesion?.duracionMs)
  return (
    (sesion?.tipo === TIPO_SESION.PRACTICA || sesion?.tipo === TIPO_SESION.QUALY) &&
    Number.isFinite(duracionMs) &&
    duracionMs > 0
  )
}

export function msConsumidosEn(sesion, now = Date.now()) {
  const msConsumidos = Math.max(0, Number(sesion?.msConsumidos) || 0)
  const tsInicioCrono = Number(sesion?.tsInicioCrono) || null
  const estaCorriendo = sesion?.estado === SESION.EN_CURSO && tsInicioCrono != null

  if (!estaCorriendo) return msConsumidos
  return msConsumidos + Math.max(0, now - tsInicioCrono)
}

export function tiempoRestanteEn(sesion, now = Date.now()) {
  if (!esSesionTemporizada(sesion)) return null
  return Math.max(0, sesion.duracionMs - msConsumidosEn(sesion, now))
}

export function formatCountdown(ms) {
  const totalSegundos = Math.max(0, Math.ceil((Number(ms) || 0) / 1000))
  const minutos = Math.floor(totalSegundos / 60)
  const segundos = totalSegundos % 60
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
}

export function sesionExpiradaEn(sesion, now = Date.now()) {
  if (!esSesionTemporizada(sesion)) return false
  return msConsumidosEn(sesion, now) >= sesion.duracionMs
}

export function snapshotCronometro(sesion, now = Date.now()) {
  if (!esSesionTemporizada(sesion)) return null

  const corriendo = sesion?.estado === SESION.EN_CURSO && sesion?.tsInicioCrono != null
  const msConsumidos = Math.min(sesion.duracionMs, msConsumidosEn(sesion, now))

  return {
    duracionMs: sesion.duracionMs,
    msConsumidos,
    tsInicioCrono: corriendo ? now : null,
  }
}
// src/utils/audio.js
// Sonidos sintetizados con Web Audio (sin archivos). Requiere un gesto del usuario
// para desbloquear el AudioContext (política de autoplay de los navegadores).

let ctx = null

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) ctx = new AC()
  }
  return ctx
}

/** Desbloquea el audio tras un gesto del usuario (click/tap). */
export function unlockAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') c.resume()
  return !!c
}

export function audioListo() {
  return !!ctx && ctx.state === 'running'
}

/** Reproduce un beep. freq en Hz, dur en segundos. */
export function beep(freq = 440, dur = 0.15, tipo = 'square', gain = 0.2) {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = tipo
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(c.destination)
  const t = c.currentTime
  osc.start(t)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.stop(t + dur)
}

/** Tono grave de cada luz roja del semáforo. */
export function beepLuz() {
  beep(320, 0.18, 'square', 0.25)
}

/** Acorde ascendente de "¡luces apagadas, a correr!". */
export function beepVerde() {
  beep(660, 0.15, 'sawtooth', 0.25)
  setTimeout(() => beep(880, 0.25, 'sawtooth', 0.25), 120)
}

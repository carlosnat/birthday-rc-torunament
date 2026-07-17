import { useState, useEffect, useMemo } from 'react'
import './vuelta-en-ejecucion.css'

/** Recorre todos los tiempos de sector de un carrito: vueltas cerradas + la vuelta en curso. */
function recorrerSectores(carrito, fn) {
  for (const lap of carrito?.lapHistory || []) {
    for (const [sectorId, st] of Object.entries(lap.sectorTimes || {})) fn(sectorId, st?.tiempoMs)
  }
  for (const [sectorId, st] of Object.entries(carrito?.sectorTimesActuales || {})) fn(sectorId, st?.tiempoMs)
}

function acumularMejor(mapa, sectorId, tiempoMs) {
  if (tiempoMs == null) return
  if (mapa[sectorId] == null || tiempoMs < mapa[sectorId]) mapa[sectorId] = tiempoMs
}

/** N sensores producen N sectores (el último lo cierra la meta). Con solo meta, ninguno. */
function sectoresEsperados(sensores) {
  const n = Object.keys(sensores || {}).length
  return n >= 2 ? Array.from({ length: n }, (_, i) => `sector_${i}`) : []
}

function ordenSector(sectorId) {
  return Number(sectorId.replace('sector_', ''))
}

// Formato F1. Milisegundos siempre a 3 dígitos.
const ms3 = (ms) => String(ms % 1000).padStart(3, '0')

/** Tiempo de vuelta / cronómetro: M:SS.mmm (ej. 1:23.456). */
function formatLap(ms) {
  if (ms == null) return '--:--.---'
  const totalSecs = Math.floor(ms / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${String(secs).padStart(2, '0')}.${ms3(ms)}`
}

/** Tiempo de sector: SS.mmm (ej. 28.451). Muestra minutos solo si supera el minuto. */
function formatSector(ms) {
  if (ms == null) return '--.---'
  if (ms >= 60000) return formatLap(ms)
  return `${Math.floor(ms / 1000)}.${ms3(ms)}`
}

/** Delta con signo en segundos: -1.234 más rápido, +0.780 más lento. */
function formatDelta(deltaMs) {
  const signo = deltaMs < 0 ? '-' : '+'
  return `${signo}${formatSector(Math.abs(deltaMs))}`
}

export default function VueltaEnEjecucion({ carrito, sesion, sensores }) {
  const [tiempoActualMs, setTiempoActualMs] = useState(0)

  const vaultaAbierta = carrito?.vaultaActualInicio != null
  const ahora = Date.now()

  // Cronómetro por frame: mostramos milésimas, así que un setInterval de 50ms haría saltar
  // el último dígito de a ~50. rAF además se frena solo si la pestaña no está visible.
  const inicio = carrito?.vaultaActualInicio
  useEffect(() => {
    if (!vaultaAbierta) return
    let raf
    const tick = () => {
      setTiempoActualMs(Date.now() - inicio)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [vaultaAbierta, inicio])

  // Obtener vuelta anterior para comparar
  const vaultaAnterior = useMemo(() => {
    if (!carrito?.lapHistory || carrito.lapHistory.length === 0) return null
    return carrito.lapHistory[carrito.lapHistory.length - 1]
  }, [carrito?.lapHistory])

  // Mejores por sector, incluyendo la vuelta en curso: un sector cuenta apenas se cruza,
  // aunque la vuelta después no cierre. Sin los tiempos vivos, el morado nunca se dispara.
  // `mejorPersonalPrevio` sale solo de vueltas cerradas: es la referencia del delta, y el
  // tiempo actual no puede compararse contra sí mismo.
  const { mejorSesion, mejorPersonal, mejorPersonalPrevio } = useMemo(() => {
    const sesionMap = {}
    const personalMap = {}
    const previoMap = {}
    for (const otro of Object.values(sesion?.carritos || {})) {
      recorrerSectores(otro, (sectorId, t) => acumularMejor(sesionMap, sectorId, t))
    }
    recorrerSectores(carrito, (sectorId, t) => acumularMejor(personalMap, sectorId, t))
    for (const lap of carrito?.lapHistory || []) {
      for (const [sectorId, st] of Object.entries(lap.sectorTimes || {})) {
        acumularMejor(previoMap, sectorId, st?.tiempoMs)
      }
    }
    return { mejorSesion: sesionMap, mejorPersonal: personalMap, mejorPersonalPrevio: previoMap }
  }, [sesion?.carritos, carrito])

  // Convención F1: morado = mejor de la sesión, verde = tu récord personal, amarillo = el resto.
  // El propio tiempo está en los pools, así que el mínimo siempre es <=; la igualdad significa
  // "el mínimo soy yo". Eso hace que el primer tiempo de un sector salga morado sin caso especial.
  const getColorSector = (sectorId, tiempoMs) => {
    if (tiempoMs == null) return 'sector-vacio'
    const sesionBest = mejorSesion[sectorId]
    if (sesionBest != null && tiempoMs <= sesionBest) return 'sector-morado'
    const personalBest = mejorPersonal[sectorId]
    if (personalBest != null && tiempoMs <= personalBest) return 'sector-verde'
    return 'sector-amarillo'
  }

  // La grilla sale de los sensores registrados, así ves los sectores en gris esperando
  // desde el arranque en vez de que aparezcan recién al cruzarlos. Unimos con lo que haya
  // en los datos por si se agregó o quitó un sensor con la sesión ya empezada.
  const sectores = useMemo(() => {
    const set = new Set(sectoresEsperados(sensores))
    Object.keys(carrito?.sectorTimesActuales || {}).forEach((s) => set.add(s))
    Object.keys(vaultaAnterior?.sectorTimes || {}).forEach((s) => set.add(s))
    return Array.from(set).sort((a, b) => ordenSector(a) - ordenSector(b))
  }, [sensores, carrito?.sectorTimesActuales, vaultaAnterior?.sectorTimes])

  if (!vaultaAbierta) {
    return (
      <div className="vuelta-en-ejecucion">
        <div className="text-dim">Sin vuelta activa</div>
      </div>
    )
  }

  return (
    <div className="vuelta-en-ejecucion">
      <div className="crono-grande">
        {formatLap(tiempoActualMs)}
      </div>

      <div className="sectores-grid">
        {sectores.map((sectorId) => {
          const tiempoActual = carrito.sectorTimesActuales?.[sectorId]?.tiempoMs
          const referencia = mejorPersonalPrevio[sectorId]
          const delta = tiempoActual != null && referencia != null ? tiempoActual - referencia : null

          return (
            <div key={sectorId} className={`sector-card ${getColorSector(sectorId, tiempoActual)}`}>
              <div className="sector-nombre">{sectorId.replace('sector_', 'S')}</div>
              <div className="sector-tiempo">{formatSector(tiempoActual)}</div>
              {delta != null && (
                <div className={`sector-delta ${delta < 0 ? 'delta-mejor' : 'delta-peor'}`}>
                  {formatDelta(delta)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

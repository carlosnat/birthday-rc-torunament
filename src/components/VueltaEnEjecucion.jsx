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

export default function VueltaEnEjecucion({ carrito, sesion, sensores }) {
  const [tiempoActualMs, setTiempoActualMs] = useState(0)

  const vaultaAbierta = carrito?.vaultaActualInicio != null
  const ahora = Date.now()

  // Actualizar cronómetro cada 50ms
  useEffect(() => {
    if (!vaultaAbierta) return

    const tick = () => {
      const elapsed = Date.now() - carrito.vaultaActualInicio
      setTiempoActualMs(elapsed)
    }

    const interval = setInterval(tick, 50)
    return () => clearInterval(interval)
  }, [vaultaAbierta, carrito?.vaultaActualInicio])

  // Obtener vuelta anterior para comparar
  const vaultaAnterior = useMemo(() => {
    if (!carrito?.lapHistory || carrito.lapHistory.length === 0) return null
    return carrito.lapHistory[carrito.lapHistory.length - 1]
  }, [carrito?.lapHistory])

  // Mejores por sector, incluyendo la vuelta en curso: un sector cuenta apenas se cruza,
  // aunque la vuelta después no cierre. Sin los tiempos vivos, el morado nunca se dispara.
  const { mejorSesion, mejorPersonal } = useMemo(() => {
    const sesionMap = {}
    const personalMap = {}
    for (const otro of Object.values(sesion?.carritos || {})) {
      recorrerSectores(otro, (sectorId, t) => acumularMejor(sesionMap, sectorId, t))
    }
    recorrerSectores(carrito, (sectorId, t) => acumularMejor(personalMap, sectorId, t))
    return { mejorSesion: sesionMap, mejorPersonal: personalMap }
  }, [sesion?.carritos, carrito])

  // Formatear tiempo mm:ss.ms
  const formatearTiempo = (ms) => {
    if (ms == null) return '--:--'
    const totalSecs = Math.floor(ms / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    const milisecs = Math.floor((ms % 1000) / 10)
    return `${mins}:${secs.toString().padStart(2, '0')}.${milisecs.toString().padStart(2, '0')}`
  }

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
        {formatearTiempo(tiempoActualMs)}
      </div>

      <div className="sectores-grid">
        {sectores.map((sectorId) => {
          const tiempoActual = carrito.sectorTimesActuales?.[sectorId]?.tiempoMs
          const tiempoAnterior = vaultaAnterior?.sectorTimes?.[sectorId]?.tiempoMs
          const colorClass = getColorSector(sectorId, tiempoActual)

          return (
            <div key={sectorId} className={`sector-card ${colorClass}`}>
              <div className="sector-nombre">{sectorId.replace('sector_', 'S')}</div>
              <div className="sector-tiempo">
                {tiempoActual != null ? formatearTiempo(tiempoActual) : '--:--'}
              </div>
              {tiempoAnterior != null && tiempoActual != null && (
                <div className="sector-delta">
                  {tiempoActual < tiempoAnterior ? '↓' : '↑'}{Math.abs(tiempoActual - tiempoAnterior).toFixed(0)}ms
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

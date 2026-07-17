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

/** sector_0 es el primer sector: para el público es "S1". */
function nombreSector(sectorId) {
  return `S${ordenSector(sectorId) + 1}`
}

/** Mejor tiempo por sector sobre un conjunto de vueltas cerradas. */
function mejoresDeVueltas(laps) {
  const mapa = {}
  for (const lap of laps || []) {
    for (const [sectorId, st] of Object.entries(lap.sectorTimes || {})) {
      acumularMejor(mapa, sectorId, st?.tiempoMs)
    }
  }
  return mapa
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

/**
 * @param {boolean} compacta Variante "tira" para la TV: el widget del broadcast de F1 es una
 *   franja horizontal, no una pila de tarjetas. Misma lógica, sólo cambia la forma.
 */
export default function VueltaEnEjecucion({ carrito, sesion, sensores, compacta }) {
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

  // Última vuelta cerrada: se muestra completa en su propia fila.
  const ultimaVuelta = useMemo(() => {
    const laps = carrito?.lapHistory || []
    return laps.length ? laps[laps.length - 1] : null
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

  // Referencias del delta. Cada fila se compara contra su propio pasado, nunca contra sí
  // misma: la vuelta en curso mira todas las cerradas, y la última cerrada mira las que
  // vinieron antes que ella. Si no, un récord daría delta 0 contra sí mismo.
  const { refActual, refUltima } = useMemo(() => {
    const laps = carrito?.lapHistory || []
    return {
      refActual: mejoresDeVueltas(laps),
      refUltima: mejoresDeVueltas(laps.slice(0, -1)),
    }
  }, [carrito?.lapHistory])

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
    Object.keys(ultimaVuelta?.sectorTimes || {}).forEach((s) => set.add(s))
    return Array.from(set).sort((a, b) => ordenSector(a) - ordenSector(b))
  }, [sensores, carrito?.sectorTimesActuales, ultimaVuelta?.sectorTimes])

  if (!vaultaAbierta) {
    return (
      <div className="vuelta-en-ejecucion">
        <div className="text-dim">Sin vuelta activa</div>
      </div>
    )
  }

  // Variante TV: dos tiras horizontales (actual / última) en vez de tarjetas apiladas.
  if (compacta) {
    return (
      <div className="vuelta-en-ejecucion vuelta-en-ejecucion--tira">
        <TiraVuelta
          rotulo="ACT"
          tiempo={formatLap(tiempoActualMs)}
          vivo
          sectores={sectores}
          tiempos={carrito.sectorTimesActuales}
          color={getColorSector}
        />
        {ultimaVuelta && (
          <TiraVuelta
            rotulo={`V${ultimaVuelta.vuelta}`}
            tiempo={formatLap(ultimaVuelta.tiempoMs)}
            sectores={sectores}
            tiempos={ultimaVuelta.sectorTimes}
            color={getColorSector}
          />
        )}
      </div>
    )
  }

  return (
    <div className="vuelta-en-ejecucion">
      <div className="vuelta-bloque">
        <div className="vuelta-encabezado">
          <span className="vuelta-rotulo">ACTUAL</span>
          <span className="crono-grande">{formatLap(tiempoActualMs)}</span>
        </div>
        <SectoresGrid
          sectores={sectores}
          tiempos={carrito.sectorTimesActuales}
          referencia={refActual}
          color={getColorSector}
        />
      </div>

      {/* El último sector lo cierra la meta, así que nace y muere en el mismo instante y
          nunca llega a verse en la fila de arriba. Acá sí queda visible toda la vuelta. */}
      {ultimaVuelta && (
        <div className="vuelta-bloque vuelta-bloque--ultima">
          <div className="vuelta-encabezado">
            <span className="vuelta-rotulo">ÚLTIMA · V{ultimaVuelta.vuelta}</span>
            <span className="crono-ultima">{formatLap(ultimaVuelta.tiempoMs)}</span>
          </div>
          <SectoresGrid
            sectores={sectores}
            tiempos={ultimaVuelta.sectorTimes}
            referencia={refUltima}
            color={getColorSector}
            compacta
          />
        </div>
      )}
    </div>
  )
}

/**
 * Una vuelta como franja horizontal: rótulo · tiempo · tira de sectores.
 * Los segmentos llevan el mismo código de color que las tarjetas; el delta se omite porque
 * a este tamaño no se lee y el color ya dice lo mismo.
 */
function TiraVuelta({ rotulo, tiempo, vivo, sectores, tiempos, color }) {
  return (
    <div className={`tira ${vivo ? 'tira--viva' : ''}`}>
      <span className="tira-rotulo">{rotulo}</span>
      <span className="tira-tiempo">{tiempo}</span>
      <div className="tira-segs">
        {sectores.map((sectorId) => {
          const t = tiempos?.[sectorId]?.tiempoMs
          return (
            <span key={sectorId} className={`tira-seg ${color(sectorId, t)}`} title={nombreSector(sectorId)}>
              <b>{nombreSector(sectorId)}</b>
              <i>{formatSector(t)}</i>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function SectoresGrid({ sectores, tiempos, referencia, color, compacta }) {
  return (
    <div className={`sectores-grid ${compacta ? 'sectores-grid--compacta' : ''}`}>
      {sectores.map((sectorId) => {
        const t = tiempos?.[sectorId]?.tiempoMs
        const ref = referencia[sectorId]
        const delta = t != null && ref != null ? t - ref : null
        return (
          <div key={sectorId} className={`sector-card ${color(sectorId, t)}`}>
            <div className="sector-nombre">{nombreSector(sectorId)}</div>
            <div className="sector-tiempo">{formatSector(t)}</div>
            {delta != null && <div className="sector-delta">{formatDelta(delta)}</div>}
          </div>
        )
      })}
    </div>
  )
}

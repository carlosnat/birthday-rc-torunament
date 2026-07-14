// src/views/equipo/Equipo.jsx
// Hito 7: pantalla de EQUIPO (celular del ingeniero de pista).
// El dispositivo elige su equipo una vez (se guarda en localStorage) y ve su tablero:
// posición, vueltas, última/mejor vuelta, gap y puntos. Cualquier miembro puede marcar
// el piloto de la sesión (rotación).

import { useEffect, useState } from 'react'
import { useTorneo } from '../../context/TournamentContext.jsx'
import ColorBadge from '../../components/ColorBadge.jsx'
import { clasificar } from '../../domain/classification.js'
import { calcularGaps, puntosAcumulados } from '../../domain/standings.js'
import { getColor } from '../../domain/colors.js'
import { SESION, CARRITO } from '../../domain/constants.js'
import { TORNEO_ID } from '../../currentTorneo.js'
import * as A from '../../firebase/raceActions.js'
import RegistroEquipo from './RegistroEquipo.jsx'
import './equipo.css'

const LS_KEY = TORNEO_ID ? `equipo:${TORNEO_ID}` : null

function fmt(ms) {
  return ms == null ? '—' : `${(ms / 1000).toFixed(2)}s`
}

function sesionesDelCircuito(torneo, circuitoId) {
  const circuito = torneo?.config?.circuitos?.find((item) => item.id === circuitoId)
  if (!circuito) return []

  return (circuito.sesiones || [])
    .map((def) => torneo?.sesiones?.[def.id])
    .filter(Boolean)
}

function vueltasDeEquipo(sesion, eqId) {
  return sesion?.carritos?.[eqId]?.lapHistory || []
}

export default function Equipo() {
  const { torneo, loading } = useTorneo()
  const [eqId, setEqId] = useState(() => (LS_KEY ? localStorage.getItem(LS_KEY) : null))

  if (loading) return <div className="app eq">CARGANDO…</div>
  if (!torneo) return <div className="app eq">TORNEO NO ENCONTRADO</div>

  const equipos = torneo.equipos || {}
  const miEquipo = eqId ? equipos[eqId] : null

  if (!miEquipo) {
    return (
      <RegistroEquipo
        torneo={torneo}
        onListo={(id) => {
          if (LS_KEY) localStorage.setItem(LS_KEY, id)
          setEqId(id)
        }}
      />
    )
  }

  const color = getColor(miEquipo.color)
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  const orden = s ? clasificar(s.carritos, s.tipo, torneo.config.puntuacion) : []
  const gaps = calcularGaps(orden)
  const miPos = orden.find((r) => r.eqId === eqId)
  const carrito = s?.carritos?.[eqId]
  const standings = puntosAcumulados(torneo)
  const misPuntos = standings.find((x) => x.eqId === eqId)?.puntos ?? 0
  const sesionesCircuito = s ? sesionesDelCircuito(torneo, s.circuitoId) : []

  const enCarrera = carrito?.estado === CARRITO.EN_CARRERA
  const vueltaActual = enCarrera ? (carrito.vueltas || 0) + 1 : carrito?.vueltas || 0

  return (
    <div className="app eq" style={{ '--eq-color': color?.hex }}>
      <div className="eq-top">
        <ColorBadge colorId={miEquipo.color} nombre={miEquipo.nombre} />
        <button className="btn btn--ghost" onClick={() => { if (LS_KEY) localStorage.removeItem(LS_KEY); setEqId(null) }}>CAMBIAR</button>
      </div>

      {s ? (
        <>
          <div className="eq-sesion">{torneo.circuitoActivo} · {s.tipo} · <b>{s.estado}</b></div>

          <div className="eq-pos-box">
            <div className="eq-pos-label">POSICIÓN</div>
            <div className="eq-pos">{miPos ? miPos.posicion : '—'}</div>
            <div className="eq-gap">{miPos ? (carrito?.estado === CARRITO.DNF ? 'DNF' : gaps[eqId]) : ''}</div>
          </div>

          <div className="eq-grid">
            <Metric label="VUELTA" value={s.vueltasObjetivo > 0 ? `${vueltaActual}/${s.vueltasObjetivo}` : vueltaActual} />
            <Metric label="ÚLTIMA" value={fmt(carrito?.ultimaVuelta)} />
            <Metric label="MEJOR" value={fmt(carrito?.mejorVuelta)} morado />
            <Metric label="PUNTOS" value={misPuntos} />
          </div>

          <div className="eq-laps-panel">
            <div className="eq-laps-header">
              <div className="eq-laps-title">TIEMPOS POR SESIÓN</div>
              <div className="eq-laps-subtitle">Vuelta por vuelta del circuito actual</div>
            </div>

            <div className="eq-laps-groups">
              {sesionesCircuito.map((sesion) => (
                <SesionVueltas
                  key={sesion.id}
                  sesion={sesion}
                  eqId={eqId}
                  activa={sesion.id === s.id}
                />
              ))}
            </div>
          </div>

          <Piloto torneo={torneo} eqId={eqId} equipo={miEquipo} sesion={s} />
        </>
      ) : (
        <div className="eq-espera">
          <div className="eq-sesion">SIN SESIÓN ACTIVA</div>
          <Metric label="PUNTOS DEL CAMPEONATO" value={misPuntos} />
        </div>
      )}
    </div>
  )
}

function SesionVueltas({ sesion, eqId, activa }) {
  const [abierta, setAbierta] = useState(() => activa)
  const vueltas = vueltasDeEquipo(sesion, eqId)
  const mejorVuelta = sesion?.carritos?.[eqId]?.mejorVuelta
  const totalVueltas = sesion?.carritos?.[eqId]?.vueltas || 0
  const sinVueltas = vueltas.length === 0

  useEffect(() => {
    if (activa) setAbierta(true)
  }, [activa])

  return (
    <section className={`eq-laps-session ${activa ? 'is-active' : ''}`}>
      <div className="eq-laps-session-top">
        <div>
          <div className="eq-laps-session-title">{sesion.tipo}</div>
          <div className="eq-laps-session-state">{sesion.estado}</div>
        </div>
        <div className="eq-laps-actions">
          {activa && <span className="eq-laps-live">EN VIVO</span>}
          <button
            className="btn btn--ghost eq-laps-toggle"
            type="button"
            onClick={() => setAbierta((prev) => !prev)}
            aria-expanded={abierta}
          >
            {abierta ? 'OCULTAR' : 'VER'}
          </button>
        </div>
      </div>

      {abierta && (
        sinVueltas ? (
          <div className="eq-laps-empty">Sin vueltas válidas todavía.</div>
        ) : (
          <div className="eq-laps-list">
            {vueltas.map((vuelta) => {
              const esMejor = mejorVuelta != null && vuelta.tiempoMs === mejorVuelta
              return (
                <div key={`${sesion.id}-${vuelta.vuelta}-${vuelta.ts}`} className={`eq-lap-row ${esMejor ? 'is-best' : ''}`}>
                  <div className="eq-lap-index">V{vuelta.vuelta}</div>
                  <div className="eq-lap-time">{fmt(vuelta.tiempoMs)}</div>
                  <div className="eq-lap-flag">{esMejor ? 'BEST' : ''}</div>
                </div>
              )
            })}
          </div>
        )
      )}

      {!abierta && (
        <div className="eq-laps-collapsed-summary">
          <span>{totalVueltas} vueltas</span>
          <span>best {fmt(mejorVuelta)}</span>
        </div>
      )}
    </section>
  )
}

function Metric({ label, value, morado }) {
  return (
    <div className="eq-metric">
      <div className="eq-metric-label">{label}</div>
      <div className={`eq-metric-value ${morado ? 'text-morado' : ''}`}>{value}</div>
    </div>
  )
}

function Piloto({ torneo, eqId, equipo, sesion }) {
  const piloto = sesion.pilotos?.[eqId]
  const puedeMarcar = sesion.estado === SESION.ESPERANDO || sesion.estado === SESION.LARGADA
  return (
    <div className="eq-piloto">
      <div className="eq-metric-label">PILOTO DE ESTA SESIÓN</div>
      <div className={`eq-piloto-actual ${piloto ? '' : 'text-rojo'}`}>{piloto || 'SIN ASIGNAR'}</div>
      {puedeMarcar && (
        <div className="eq-piloto-btns">
          {(equipo.participantes || []).map((p) => (
            <button
              key={p}
              className={`btn ${piloto === p ? 'btn--verde' : ''}`}
              onClick={() => A.asignarPiloto(torneo, eqId, p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


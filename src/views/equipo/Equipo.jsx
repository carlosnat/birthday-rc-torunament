// src/views/equipo/Equipo.jsx
// Hito 7: pantalla de EQUIPO (celular del ingeniero de pista).
// El dispositivo elige su equipo una vez (se guarda en localStorage) y ve su tablero:
// posición, vueltas, última/mejor vuelta, gap y puntos. Cualquier miembro puede marcar
// el piloto de la sesión (rotación).

import { useState } from 'react'
import { useTorneo } from '../../context/TournamentContext.jsx'
import ColorBadge from '../../components/ColorBadge.jsx'
import { clasificar } from '../../domain/classification.js'
import { calcularGaps, puntosAcumulados } from '../../domain/standings.js'
import { getColor } from '../../domain/colors.js'
import { SESION, CARRITO } from '../../domain/constants.js'
import { TORNEO_ID } from '../../currentTorneo.js'
import * as A from '../../firebase/raceActions.js'
import './equipo.css'

const LS_KEY = TORNEO_ID ? `equipo:${TORNEO_ID}` : null

function fmt(ms) {
  return ms == null ? '—' : `${(ms / 1000).toFixed(2)}s`
}

export default function Equipo() {
  const { torneo, loading } = useTorneo()
  const [eqId, setEqId] = useState(() => (LS_KEY ? localStorage.getItem(LS_KEY) : null))

  if (loading) return <div className="app eq">CARGANDO…</div>
  if (!torneo) return <div className="app eq">TORNEO NO ENCONTRADO</div>

  const equipos = torneo.equipos || {}
  const miEquipo = eqId ? equipos[eqId] : null

  if (!miEquipo) {
    return <SelectorEquipo equipos={equipos} onElegir={(id) => { if (LS_KEY) localStorage.setItem(LS_KEY, id); setEqId(id) }} />
  }

  const color = getColor(miEquipo.color)
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  const orden = s ? clasificar(s.carritos, s.tipo, torneo.config.puntuacion) : []
  const gaps = calcularGaps(orden)
  const miPos = orden.find((r) => r.eqId === eqId)
  const carrito = s?.carritos?.[eqId]
  const standings = puntosAcumulados(torneo)
  const misPuntos = standings.find((x) => x.eqId === eqId)?.puntos ?? 0

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

function SelectorEquipo({ equipos, onElegir }) {
  const lista = Object.entries(equipos)
  return (
    <div className="app eq stack">
      <h1>ELEGÍ TU EQUIPO</h1>
      {lista.length === 0 && <div className="text-dim">NO HAY EQUIPOS REGISTRADOS TODAVÍA.</div>}
      {lista.map(([id, eq]) => (
        <button key={id} className="eq-elegir" onClick={() => onElegir(id)}>
          <ColorBadge colorId={eq.color} nombre={eq.nombre} />
        </button>
      ))}
    </div>
  )
}

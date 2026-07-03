// src/views/harness/Harness.jsx
// Superficie de control del Hito 1: ejercita TODAS las transiciones + simula pasadas.
// No es una pantalla de producción; es el banco de pruebas de la máquina de estados.

import { useState } from 'react'
import { useTorneo } from '../../context/TournamentContext.jsx'
import { useEventos } from '../../hooks/useEventos.js'
import ColorBadge from '../../components/ColorBadge.jsx'
import QRRegistro from '../../components/QRRegistro.jsx'
import { seedTorneoDemo, crearTorneo, resetTorneo } from '../../firebase/tournamentDb.js'
import * as A from '../../firebase/raceActions.js'
import { TORNEO, SESION, CARRITO } from '../../domain/constants.js'
import { urlRegistro } from '../../currentTorneo.js'
import './harness.css'

export default function Harness() {
  const { torneo, loading } = useTorneo()

  if (loading) return <div className="app">CARGANDO…</div>

  if (!torneo) {
    return (
      <div className="app stack">
        <h1>RC RACE TIMING — HARNESS</h1>
        <p className="text-dim">NO HAY TORNEO EN ESTA URL.</p>
        <div className="row">
          <button className="btn btn--primary" onClick={() => crearTorneo()}>CREAR (REGISTRO POR QR)</button>
          <button className="btn" onClick={() => seedTorneoDemo()}>SEED DEMO (EQUIPOS DE PRUEBA)</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{torneo.config?.nombre} — HARNESS</h1>
        <div className="row">
          <button className="btn btn--ghost" onClick={() => seedTorneoDemo()}>RE-SEED DEMO</button>
          <button className="btn btn--ghost" onClick={() => resetTorneo()}>RESET</button>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="stack">
          <Cabecera torneo={torneo} />
          <TorneoControles torneo={torneo} />
          {torneo.estado === TORNEO.REGISTRO && <RegistroPanel torneo={torneo} />}
          <SesionControles torneo={torneo} />
          <Pilotos torneo={torneo} />
          <Carritos torneo={torneo} />
          <Resultados torneo={torneo} />
          <Circuitos torneo={torneo} />
        </div>
        <LogEventos />
      </div>
    </div>
  )
}

function RegistroPanel({ torneo }) {
  const equipos = Object.entries(torneo.equipos || {})
  const sensores = Object.entries(torneo.sensores || {})
  return (
    <div className="panel">
      <h2>REGISTRO POR QR</h2>
      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div className="stack" style={{ gap: 10 }}>
          <div>
            <div className="text-dim">EQUIPO</div>
            <QRRegistro url={urlRegistro('equipo')} size={160} />
          </div>
          <div>
            <div className="text-dim">SENSOR</div>
            <QRRegistro url={urlRegistro('sensor')} size={160} />
          </div>
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <div className="text-dim">EQUIPOS ({equipos.length})</div>
          {equipos.map(([id, eq]) => (
            <ColorBadge key={id} colorId={eq.color} nombre={`${eq.nombre} · ${(eq.participantes || []).length}`} />
          ))}
          <div className="text-dim" style={{ marginTop: 8 }}>SENSORES ({sensores.length})</div>
          {sensores.map(([id, s]) => (
            <span key={id} className="chip-estado">{s.orden}· {s.nombre}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Cabecera({ torneo }) {
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  return (
    <div className="panel row" style={{ justifyContent: 'space-between' }}>
      <div>
        <span className="text-dim">TORNEO </span>
        <span className="chip-estado">{torneo.estado}</span>
      </div>
      <div>
        <span className="text-dim">CIRCUITO </span>
        <span className="chip-estado">{torneo.circuitoActivo || '—'}</span>
      </div>
      <div>
        <span className="text-dim">SESIÓN </span>
        <span className="chip-estado">{torneo.sesionActiva || '—'}</span>
        {s && <span className="chip-estado" style={{ marginLeft: 6 }}>{s.tipo} · {s.estado}</span>}
      </div>
    </div>
  )
}

function TorneoControles({ torneo }) {
  return (
    <div className="panel">
      <h2>TORNEO</h2>
      <div className="row">
        <button className="btn" disabled={torneo.estado !== TORNEO.BORRADOR} onClick={() => A.irARegistro(torneo)}>
          → REGISTRO
        </button>
        <button className="btn btn--primary" disabled={torneo.estado !== TORNEO.REGISTRO} onClick={() => A.comenzarTorneo(torneo)}>
          → EN CURSO (LARGAR TORNEO)
        </button>
      </div>
    </div>
  )
}

function SesionControles({ torneo }) {
  const [ms, setMs] = useState('')
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  const disabled = torneo.estado !== TORNEO.EN_CURSO || !s
  const est = s?.estado

  return (
    <div className="panel">
      <h2>SESIÓN ACTIVA {s ? `· ${s.tipo}` : ''}</h2>
      <div className="row">
        <button className="btn" disabled={disabled || est !== SESION.ESPERANDO} onClick={() => A.largar(torneo)}>LARGAR</button>
        <button className="btn btn--verde" disabled={disabled || est !== SESION.LARGADA} onClick={() => A.luzVerde(torneo)}>LUZ VERDE</button>
        <button className="btn" disabled={disabled || est !== SESION.EN_CURSO} onClick={() => A.pausar(torneo)}>PAUSAR</button>
        <button className="btn" disabled={disabled || est !== SESION.PAUSADA} onClick={() => A.reanudar(torneo)}>REANUDAR</button>
        <button className="btn btn--primary" disabled={disabled || (est !== SESION.EN_CURSO && est !== SESION.PAUSADA && est !== SESION.BANDERA)} onClick={() => A.finalizarSesion(torneo)}>FINALIZAR</button>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="text-dim">TIEMPO MÍN. VUELTA: {s?.tiempoMinimoVuelta ?? '—'} ms</span>
        <input className="input" type="number" placeholder="ms" value={ms} onChange={(e) => setMs(e.target.value)} style={{ width: 90 }} />
        <button className="btn" disabled={disabled || !ms} onClick={() => { A.setTiempoMinimo(torneo, Number(ms)); setMs('') }}>AJUSTAR</button>
      </div>
    </div>
  )
}

function Pilotos({ torneo }) {
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  if (!s) return null
  return (
    <div className="panel">
      <h2>PILOTOS DE LA SESIÓN</h2>
      <div className="stack" style={{ gap: 6 }}>
        {Object.entries(torneo.equipos || {}).map(([eqId, eq]) => {
          const piloto = s.pilotos?.[eqId]
          return (
            <div key={eqId} className="row" style={{ justifyContent: 'space-between' }}>
              <ColorBadge colorId={eq.color} nombre={eq.nombre} />
              <div className="row">
                <span className={piloto ? '' : 'text-rojo'}>{piloto || 'SIN PILOTO'}</span>
                {(eq.participantes || []).map((p) => (
                  <button key={p} className="btn btn--ghost" onClick={() => A.asignarPiloto(torneo, eqId, p)}>{p}</button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Carritos({ torneo }) {
  const [clock, setClock] = useState(0)
  const [step, setStep] = useState(3500)
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  if (!s) return null

  const usarReloj = clock > 0
  const ts = () => (usarReloj ? clock : Date.now())

  return (
    <div className="panel">
      <h2>CARRITOS / PASADAS</h2>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="text-dim">RELOJ SIM: {clock} ms</span>
        <input className="input" type="number" value={step} onChange={(e) => setStep(Number(e.target.value))} style={{ width: 90 }} />
        <button className="btn" onClick={() => setClock((c) => c + step)}>+Δ AVANZAR RELOJ</button>
        <button className="btn btn--ghost" onClick={() => setClock(0)}>RELOJ → REAL</button>
      </div>
      <table className="tabla">
        <thead>
          <tr><th>EQUIPO</th><th>ESTADO</th><th>V</th><th>ÚLT.</th><th>MEJOR</th><th>ACCIONES</th></tr>
        </thead>
        <tbody>
          {Object.entries(torneo.equipos || {}).map(([eqId, eq]) => {
            const c = s.carritos?.[eqId] || {}
            return (
              <tr key={eqId}>
                <td><ColorBadge colorId={eq.color} nombre={eq.color.toUpperCase()} /></td>
                <td><span className="chip-estado">{c.estado}</span></td>
                <td>{c.vueltas ?? 0}</td>
                <td>{c.ultimaVuelta ?? '—'}</td>
                <td className={c.mejorVuelta != null ? 'text-morado' : ''}>{c.mejorVuelta ?? '—'}</td>
                <td className="row">
                  <button className="btn" onClick={() => A.pasada(torneo, eqId, ts())}>PASADA</button>
                  <button className="btn btn--ghost" onClick={() => A.corregirVuelta(torneo, eqId, +1)}>+1</button>
                  <button className="btn btn--ghost" onClick={() => A.corregirVuelta(torneo, eqId, -1)}>-1</button>
                  <button className="btn btn--ghost" disabled={c.estado === CARRITO.DNF || c.estado === CARRITO.TERMINO} onClick={() => A.marcarDNF(torneo, eqId, ts())}>DNF</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Resultados({ torneo }) {
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  // Muestra resultados de cualquier sesión finalizada seleccionada; aquí, la activa si los tiene.
  const finalizadas = Object.entries(torneo.sesiones || {}).filter(([, x]) => x.resultados && x.resultados.length)
  if (finalizadas.length === 0) return null
  return (
    <div className="panel">
      <h2>RESULTADOS</h2>
      {finalizadas.map(([sid, ses]) => (
        <div key={sid} style={{ marginBottom: 12 }}>
          <div className="text-dim">{sid} · {ses.tipo}</div>
          <table className="tabla">
            <thead><tr><th>POS</th><th>EQUIPO</th><th>V</th><th>ESTADO</th><th>PTS</th></tr></thead>
            <tbody>
              {ses.resultados.map((r) => {
                const eq = torneo.equipos?.[r.eqId]
                return (
                  <tr key={r.eqId}>
                    <td>{r.posicion}</td>
                    <td><ColorBadge colorId={eq?.color} nombre={eq?.nombre} /></td>
                    <td>{r.vueltas}</td>
                    <td>{r.estado}</td>
                    <td>{r.puntos}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function Circuitos({ torneo }) {
  return (
    <div className="panel">
      <h2>CIRCUITOS</h2>
      <div className="row">
        {Object.entries(torneo.circuitos || {}).map(([cid, c]) => (
          <span key={cid} className="chip-estado">{cid}: {c.estado}</span>
        ))}
      </div>
    </div>
  )
}

function LogEventos() {
  const eventos = useEventos(50)
  return (
    <div className="panel">
      <h2>LOG DE EVENTOS (RTDB)</h2>
      <div className="log">
        {eventos.map((e) => {
          const esRechazo = e.tipo === 'RECHAZO' || e.tipo === 'PASADA_RECHAZADA'
          const hora = new Date(e.ts).toLocaleTimeString()
          return (
            <div key={e.id} className={`log-item ${esRechazo ? 'log-item--rechazo' : ''}`}>
              <span className="log-time">{hora}</span> <b>{e.tipo}</b>{' '}
              {e.detalle && Object.keys(e.detalle).length > 0 ? JSON.stringify(e.detalle) : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

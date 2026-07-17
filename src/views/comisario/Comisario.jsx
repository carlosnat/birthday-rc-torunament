// src/views/comisario/Comisario.jsx
// Hito 4: pantalla del comisario (laptop). Control total de la carrera.
// Reusa raceActions (misma fuente de verdad que el harness/dominio).

import { useEffect, useState } from 'react'
import { useTorneo } from '../../context/TournamentContext.jsx'
import { useEventos } from '../../hooks/useEventos.js'
import { useNow } from '../../hooks/useNow.js'
import ColorBadge from '../../components/ColorBadge.jsx'
import QRRegistro from '../../components/QRRegistro.jsx'
import SensorHealth from '../../components/SensorHealth.jsx'
import * as A from '../../firebase/raceActions.js'
import { moverSensor } from '../../firebase/registroActions.js'
import { TORNEO, SESION, CARRITO } from '../../domain/constants.js'
import { avatarDeEquipo, participantesNormalizados } from '../../domain/participants.js'
import { esSesionTemporizada, formatCountdown, tiempoRestanteEn } from '../../domain/sessionTimer.js'
import { TORNEO_ID, irA, urlRol } from '../../currentTorneo.js'
import './comisario.css'

export default function Comisario() {
  const { torneo, loading } = useTorneo()
  const [reinicioNotice, setReinicioNotice] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.sessionStorage || !TORNEO_ID) return
    const raw = window.sessionStorage.getItem('f1tournament.reinicio')
    if (!raw) return
    try {
      const notice = JSON.parse(raw)
      if (notice?.torneoId === TORNEO_ID) {
        setReinicioNotice(notice)
      }
    } catch {
      // ignore malformed sessionStorage payloads
    } finally {
      window.sessionStorage.removeItem('f1tournament.reinicio')
    }
  }, [TORNEO_ID])

  if (loading) return <div className="app">CARGANDO…</div>
  if (!torneo) return <div className="app">TORNEO NO ENCONTRADO</div>

  return (
    <div className="app">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{torneo.config?.nombre} — COMISARIO</h1>
        <Cabecera torneo={torneo} />
      </div>

      {reinicioNotice && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h2>NUEVO TORNEO CREADO</h2>
          <div className="text-dim">
            SE REUTILIZÓ LA CONFIGURACIÓN DEL TORNEO ANTERIOR Y SE ABRIÓ UN UUID NUEVO PARA EMPEZAR DE CERO.
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="stack">
          {torneo.estado === TORNEO.REGISTRO && <RegistroPanel torneo={torneo} />}
          {torneo.estado === TORNEO.EN_CURSO && (
            <>
              <SesionControles torneo={torneo} />
              <Pilotos torneo={torneo} />
              <Monitor torneo={torneo} />
            </>
          )}
          {torneo.estado === TORNEO.FINALIZADO && <Finalizado torneo={torneo} />}
          <Resultados torneo={torneo} />
          <Sensores torneo={torneo} />
        </div>
        <LogEventos />
      </div>
    </div>
  )
}

function Finalizado({ torneo }) {
  async function reiniciar() {
    const ok = window.confirm('¿REINICIAR EL TORNEO Y CREAR UNO NUEVO CON LA MISMA CONFIGURACIÓN?')
    if (!ok) return
    const res = await A.reiniciarTorneo(torneo)
    if (res?.ok && res.nuevoId) {
      irA('comisario', res.nuevoId)
    }
  }

  return (
    <div className="panel stack">
      <h2>🏁 TORNEO FINALIZADO</h2>
      <div className="text-dim">CONFIG, EQUIPOS Y SENSORES SE REUTILIZAN EN UN TORNEO NUEVO.</div>
      <button className="btn btn--primary" onClick={reiniciar}>REINICIAR TORNEO</button>
    </div>
  )
}

function Cabecera({ torneo }) {
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  return (
    <div className="row">
      <span className="chip-estado">{torneo.estado}</span>
      {torneo.circuitoActivo && <span className="chip-estado">{torneo.circuitoActivo}</span>}
      {s && <span className="chip-estado">{s.tipo} · {s.estado}</span>}
    </div>
  )
}

function RegistroPanel({ torneo }) {
  const equipos = Object.entries(torneo.equipos || {})
  const sensores = Object.keys(torneo.sensores || {})
  return (
    <div className="panel">
      <h2>REGISTRO ABIERTO</h2>
      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div className="stack" style={{ gap: 10 }}>
          <div>
            <div className="text-dim">EQUIPO</div>
            <QRRegistro url={urlRol('equipo')} size={160} />
          </div>
          <div>
            <div className="text-dim">SENSOR</div>
            <QRRegistro url={urlRol('sensor')} size={160} />
          </div>
        </div>
        <div className="stack" style={{ gap: 6, flex: 1 }}>
          <div className="text-dim">EQUIPOS ({equipos.length})</div>
          {equipos.map(([id, eq]) => (
            <ColorBadge key={id} colorId={eq.color} nombre={`${eq.nombre} · ${(eq.participantes || []).length}`} />
          ))}
          <div className="text-dim">SENSORES: {sensores.length}</div>
          <button
            className="btn btn--primary"
            disabled={equipos.length < 2}
            onClick={() => A.comenzarTorneo(torneo)}
          >
            CERRAR REGISTRO Y LARGAR TORNEO
          </button>
          {equipos.length < 2 && <span className="text-dim">HACEN FALTA AL MENOS 2 EQUIPOS.</span>}
        </div>
      </div>
    </div>
  )
}

function SesionControles({ torneo }) {
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  const now = useNow(250)
  const [autoFinalizando, setAutoFinalizando] = useState(false)
  const est = s?.estado ?? null
  const temporizada = esSesionTemporizada(s)
  const restanteMs = temporizada ? tiempoRestanteEn(s, now) : null

  useEffect(() => {
    setAutoFinalizando(false)
  }, [torneo.sesionActiva, s?.estado])

  useEffect(() => {
    if (!temporizada || est !== SESION.EN_CURSO || restanteMs == null || restanteMs > 0 || autoFinalizando) return

    let cancelado = false
    setAutoFinalizando(true)
    A.finalizarSesion(torneo).finally(() => {
      if (!cancelado) setAutoFinalizando(false)
    })

    return () => {
      cancelado = true
    }
  }, [autoFinalizando, est, restanteMs, temporizada, torneo])

  if (!s) return null

  return (
    <div className="panel">
      <h2>SESIÓN · {s.tipo}</h2>
      {temporizada && (
        <div className="row" style={{ marginBottom: 8, justifyContent: 'space-between' }}>
          <span className="chip-estado">CRONO {est === SESION.PAUSADA ? 'PAUSADO' : 'ACTIVO'}</span>
          <span className="text-dim">TIEMPO RESTANTE: {formatCountdown(restanteMs ?? 0)}</span>
        </div>
      )}
      <div className="row">
        <button className="btn btn--primary" disabled={est !== SESION.ESPERANDO} onClick={() => A.largar(torneo)}>LARGAR</button>
        <button className="btn btn--verde" disabled={est !== SESION.LARGADA} onClick={() => A.luzVerde(torneo)}>🟢 LUZ VERDE</button>
        <button className="btn" disabled={est !== SESION.EN_CURSO} onClick={() => A.pausar(torneo)}>PAUSAR</button>
        <button className="btn" disabled={est !== SESION.PAUSADA} onClick={() => A.reanudar(torneo)}>REANUDAR</button>
        <button className="btn btn--primary" disabled={(est !== SESION.EN_CURSO && est !== SESION.PAUSADA && est !== SESION.BANDERA) || autoFinalizando} onClick={() => A.finalizarSesion(torneo)}>FINALIZAR</button>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="text-dim">TIEMPO MÍN. VUELTA: {s.tiempoMinimoVuelta} ms</span>
        <button className="btn btn--ghost" onClick={() => A.setTiempoMinimo(torneo, Math.max(500, s.tiempoMinimoVuelta - 500))}>−500</button>
        <button className="btn btn--ghost" onClick={() => A.setTiempoMinimo(torneo, s.tiempoMinimoVuelta + 500)}>+500</button>
      </div>
    </div>
  )
}

function Pilotos({ torneo }) {
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  if (!s) return null
  return (
    <div className="panel">
      <h2>PILOTOS (ASIGNACIÓN DEL COMISARIO)</h2>
      <div className="stack" style={{ gap: 6 }}>
        {Object.entries(torneo.equipos || {}).map(([eqId, eq]) => {
          const piloto = s.pilotos?.[eqId]
          const participantes = participantesNormalizados(eq)
          const avatarId = avatarDeEquipo(eq, piloto)
          return (
            <div key={eqId} className="row" style={{ justifyContent: 'space-between' }}>
              <ColorBadge colorId={eq.color} nombre={eq.nombre} avatarId={avatarId} />
              <select className="input" value={piloto || ''} onChange={(e) => A.asignarPiloto(torneo, eqId, e.target.value)}>
                <option value="">— SIN PILOTO —</option>
                {participantes.map((p) => (
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Monitor({ torneo }) {
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  if (!s) return null
  return (
    <div className="panel">
      <h2>MONITOR / CONTEO MANUAL DE EMERGENCIA</h2>
      <table className="tabla">
        <thead><tr><th>EQUIPO</th><th>EST.</th><th>V</th><th>ÚLT.</th><th>MEJOR</th><th>ACCIONES</th></tr></thead>
        <tbody>
          {Object.entries(torneo.equipos || {}).map(([eqId, eq]) => {
            const c = s.carritos?.[eqId] || {}
            const cerrado = c.estado === CARRITO.DNF || c.estado === CARRITO.TERMINO
            return (
              <tr key={eqId}>
                <td><ColorBadge colorId={eq.color} nombre={eq.color.toUpperCase()} /></td>
                <td><span className="chip-estado">{c.estado || '—'}</span></td>
                <td>{c.vueltas ?? 0}</td>
                <td>{c.ultimaVuelta ?? '—'}</td>
                <td className={c.mejorVuelta != null ? 'text-morado' : ''}>{c.mejorVuelta ?? '—'}</td>
                <td className="row">
                  <button className="btn btn--primary" disabled={cerrado} onClick={() => A.pasada(torneo, eqId, Date.now())}>+VUELTA</button>
                  <button className="btn btn--ghost" onClick={() => A.corregirVuelta(torneo, eqId, +1)}>+1</button>
                  <button className="btn btn--ghost" onClick={() => A.corregirVuelta(torneo, eqId, -1)}>-1</button>
                  <button className="btn btn--ghost" disabled={cerrado} onClick={() => A.marcarDNF(torneo, eqId, Date.now())}>DNF</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="text-dim" style={{ marginTop: 6 }}>
        +VUELTA = PASADA MANUAL (PLAN B SI MUERE EL SENSOR DE META). +1/-1 = CORRECCIÓN.
      </div>
    </div>
  )
}

function Resultados({ torneo }) {
  const finalizadas = Object.entries(torneo.sesiones || {}).filter(([, x]) => x.resultados && x.resultados.length)
  if (finalizadas.length === 0) return null
  return (
    <div className="panel">
      <h2>RESULTADOS</h2>
      {finalizadas.map(([sid, ses]) => (
        <div key={sid} style={{ marginBottom: 12 }}>
          <div className="text-dim">{sid} · {ses.tipo}</div>
          <table className="tabla">
            <thead><tr><th>POS</th><th>EQUIPO</th><th>V</th><th>EST.</th><th>PTS</th></tr></thead>
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

function Sensores({ torneo }) {
  const now = useNow(1000)
  const sensores = Object.entries(torneo.sensores || {})
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  return (
    <div className="panel">
      <h2>SENSORES ({sensores.length})</h2>
      {sensores.length === 0 && <span className="text-dim">NINGUNO REGISTRADO.</span>}
      <div className="stack" style={{ gap: 8 }}>
        {sensores.map((s) => (
          <SensorHealth
            key={s.id}
            sensor={s}
            now={now}
            esMeta={s.orden === 0}
            onSubir={() => moverSensor(torneo.sensores, s.id, -1)}
            onBajar={() => moverSensor(torneo.sensores, s.id, +1)}
          />
        ))}
      </div>
    </div>
  )
}

function LogEventos() {
  const { torneo } = useTorneo()
  const eventos = useEventos(100)
  const [filtroSensores, setFiltroSensores] = useState(true)

  const sensoresMap = torneo?.sensores || {}
  const sensores = Object.entries(sensoresMap)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  // Filtrar eventos de sensores
  const eventosFiltrados = filtroSensores
    ? eventos.filter(e => e.tipo.startsWith('DETECCION') || e.tipo === 'SENSOR_REGISTRADO')
    : eventos

  return (
    <div className="panel">
      <h2>SENSORES Y DETECCIONES</h2>

      {/* Panel de sensores registrados */}
      <div style={{ marginBottom: 16, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
        <div className="text-dim" style={{ marginBottom: 6 }}>SENSORES REGISTRADOS ({sensores.length})</div>
        {sensores.length === 0 ? (
          <span className="text-dim">NINGUNO</span>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {sensores.map(s => (
              <div key={s.id} style={{ fontSize: '12px', padding: '6px 8px', background: '#fff', borderRadius: 3, border: '1px solid #ddd' }}>
                <div><b>{s.nombre}</b> (orden {s.orden})</div>
                <div className="text-dim" style={{ wordBreak: 'break-all', fontSize: '10px' }}>{s.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={filtroSensores} onChange={(e) => setFiltroSensores(e.target.checked)} />
          {' '}Mostrar solo eventos de sensores
        </label>
      </div>

      <h2>LOG DE EVENTOS</h2>
      <div className="log">
        {eventosFiltrados.map((e) => {
          const esRechazo = e.tipo === 'RECHAZO' || e.tipo.includes('RECHAZADA')
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

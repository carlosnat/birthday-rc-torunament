// src/views/publico/PublicoEspejo.jsx
// Espejo read-only del estado (Hito 1): sin lógica de negocio, solo refleja la RTDB.
// Sirve para validar el pub/sub: abrir en otra pestaña y ver los cambios del harness.

import { useTorneo } from '../../context/TournamentContext.jsx'
import { useNow } from '../../hooks/useNow.js'
import ColorBadge from '../../components/ColorBadge.jsx'
import QRRegistro from '../../components/QRRegistro.jsx'
import { clasificar } from '../../domain/classification.js'
import { CARRITO, TORNEO } from '../../domain/constants.js'
import { avatarDeEquipo } from '../../domain/participants.js'
import { esSesionTemporizada, formatCountdown, tiempoRestanteEn } from '../../domain/sessionTimer.js'
import { urlRol } from '../../currentTorneo.js'

export default function PublicoEspejo() {
  const { torneo, loading } = useTorneo()
  const now = useNow(1000)
  if (loading) return <div className="app">CARGANDO…</div>
  if (!torneo) return <div className="app">SIN TORNEO</div>

  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  const orden = s ? clasificar(s.carritos, s.tipo, torneo.config.puntuacion) : []
  const equipos = Object.entries(torneo.equipos || {})
  const temporizada = esSesionTemporizada(s)
  const restanteMs = temporizada ? tiempoRestanteEn(s, now) : null

  return (
    <div className="app stack">
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <h1>{torneo.config?.nombre}</h1>
        <span className="chip-estado">{torneo.estado}</span>
      </div>

      {torneo.estado === TORNEO.REGISTRO && (
        <div className="grid-2">
          <div className="panel">
            <h2>EQUIPOS</h2>
            <QRRegistro url={urlRol('equipo')} size={260} />
          </div>
          <div className="panel">
            <h2>SENSORES</h2>
            <QRRegistro url={urlRol('sensor')} size={260} />
          </div>
          <div className="panel" style={{ gridColumn: '1 / -1' }}>
            <h2>EQUIPOS ANOTADOS ({equipos.length})</h2>
            <div className="stack" style={{ gap: 6 }}>
              {equipos.length === 0 && <span className="text-dim">TODAVÍA NADIE…</span>}
              {equipos.map(([id, eq]) => (
                <div key={id} className="row" style={{ justifyContent: 'space-between' }}>
                  <ColorBadge colorId={eq.color} nombre={eq.nombre} avatarId={avatarDeEquipo(eq)} />
                  <span className="text-dim">{(eq.participantes || []).length} INT.</span>
                </div>
              ))}
            </div>
            <div className="text-dim" style={{ marginTop: 8 }}>
              SENSORES: {Object.keys(torneo.sensores || {}).length}
            </div>
          </div>
        </div>
      )}

      {s && (
        <div className="panel">
          <h2>{torneo.circuitoActivo} · {s.tipo} · {s.estado}</h2>
          {temporizada && <div className="text-dim" style={{ marginBottom: 8 }}>TIEMPO RESTANTE: {formatCountdown(restanteMs)}</div>}
          <table className="tabla">
            <thead><tr><th>POS</th><th>EQUIPO</th><th>VUELTAS</th><th>ÚLT.</th><th>MEJOR</th></tr></thead>
            <tbody>
              {orden.map((r) => {
                const eq = torneo.equipos?.[r.eqId]
                const dnf = r.estado === CARRITO.DNF
                return (
                  <tr key={r.eqId} style={{ opacity: dnf ? 0.5 : 1 }}>
                    <td>{r.posicion}</td>
                    <td><ColorBadge colorId={eq?.color} nombre={eq?.nombre} avatarId={avatarDeEquipo(eq, s.pilotos?.[r.eqId])} /></td>
                    <td>{r.vueltas}{dnf ? ' (DNF)' : ''}</td>
                    <td>{r.ultimaVuelta ?? '—'}</td>
                    <td className="text-morado">{r.mejorVuelta ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {torneo.estado === 'FINALIZADO' && (
        <div className="panel"><h2>🏁 TORNEO FINALIZADO</h2></div>
      )}
    </div>
  )
}

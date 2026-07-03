// src/views/publico/PublicoEspejo.jsx
// Espejo read-only del estado (Hito 1): sin lógica de negocio, solo refleja la RTDB.
// Sirve para validar el pub/sub: abrir en otra pestaña y ver los cambios del harness.

import { useTorneo } from '../../context/TournamentContext.jsx'
import ColorBadge from '../../components/ColorBadge.jsx'
import { clasificar } from '../../domain/classification.js'
import { CARRITO } from '../../domain/constants.js'

export default function PublicoEspejo() {
  const { torneo, loading } = useTorneo()
  if (loading) return <div className="app">CARGANDO…</div>
  if (!torneo) return <div className="app">SIN TORNEO</div>

  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  const orden = s ? clasificar(s.carritos, s.tipo, torneo.config.puntuacion) : []

  return (
    <div className="app stack">
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <h1>{torneo.config?.nombre}</h1>
        <span className="chip-estado">{torneo.estado}</span>
      </div>

      {s && (
        <div className="panel">
          <h2>{torneo.circuitoActivo} · {s.tipo} · {s.estado}</h2>
          <table className="tabla">
            <thead><tr><th>POS</th><th>EQUIPO</th><th>VUELTAS</th><th>ÚLT.</th><th>MEJOR</th></tr></thead>
            <tbody>
              {orden.map((r) => {
                const eq = torneo.equipos?.[r.eqId]
                const dnf = r.estado === CARRITO.DNF
                return (
                  <tr key={r.eqId} style={{ opacity: dnf ? 0.5 : 1 }}>
                    <td>{r.posicion}</td>
                    <td><ColorBadge colorId={eq?.color} nombre={eq?.nombre} /></td>
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

// src/components/TimingTower.jsx
// Torre de tiempos estilo F1: posición, equipo, INTERVAL (al de adelante) y GAP (al líder).
// No calcula reglas: recibe la clasificación y los intervalos ya resueltos por domain/.

import { getColor } from '../domain/colors.js'
import { CARRITO } from '../domain/constants.js'
import './timing-tower.css'

/** +1.234 / +2 V / — . El líder no muestra número: muestra su rol. */
function fmtGap(gap) {
  if (gap == null) return '—'
  if (gap.vueltas != null) return `+${gap.vueltas} V`
  return `+${Math.floor(gap.ms / 1000)}.${String(gap.ms % 1000).padStart(3, '0')}`
}

export default function TimingTower({ orden, intervalos, equipos, vueltaRapidaEq }) {
  if (!orden || orden.length === 0) {
    return (
      <div className="tower">
        <div className="tower-titulo">POSICIONES</div>
        <div className="tower-vacio">SIN DATOS</div>
      </div>
    )
  }

  return (
    <div className="tower">
      <div className="tower-titulo">POSICIONES</div>

      <div className="tower-encabezado">
        <span className="tower-col-pos">P</span>
        <span className="tower-col-eq">EQUIPO</span>
        <span className="tower-col-num">INTERVAL</span>
        <span className="tower-col-num">GAP</span>
      </div>

      <div className="tower-filas">
        {orden.map((r) => {
          const eq = equipos?.[r.eqId]
          const iv = intervalos?.[r.eqId]
          const dnf = r.estado === CARRITO.DNF
          const rapida = r.eqId === vueltaRapidaEq

          return (
            <div key={r.eqId} className={`tower-fila ${dnf ? 'is-dnf' : ''} ${iv?.esLider ? 'is-lider' : ''}`}>
              <span className="tower-col-pos">{r.posicion}</span>

              <span className="tower-col-eq">
                <i className="tower-color" style={{ background: getColor(eq?.color)?.hex }} />
                <b className="tower-nombre">{eq?.nombre || '—'}</b>
                {rapida && <i className="tower-fastest" title="Vuelta rápida" />}
              </span>

              {/* DNF y líder no tienen intervalo que mostrar: ocupan las dos columnas
                  numéricas con su rol, igual que la torre de F1. */}
              {dnf || iv?.esLider ? (
                <span className="tower-col-rol">{dnf ? 'DNF' : 'LÍDER'}</span>
              ) : (
                <>
                  <span className="tower-col-num">{fmtGap(iv?.interval)}</span>
                  <span className="tower-col-num">{fmtGap(iv?.lider)}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

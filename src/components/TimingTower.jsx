// src/components/TimingTower.jsx
// Torre de tiempos estilo F1: posición, equipo y una única columna de diferencia que
// alterna entre INTERVAL (contra el de adelante) y GAP (contra el líder), como la torre del
// broadcast. Mostrar las dos a la vez es redundante: para P2 son siempre el mismo número.
// No calcula reglas: recibe la clasificación y los intervalos ya resueltos por domain/.

import { useEffect, useState } from 'react'
import { getColor } from '../domain/colors.js'
import { CARRITO } from '../domain/constants.js'
import './timing-tower.css'

const MODOS = [
  { id: 'interval', titulo: 'INTERVAL' },
  { id: 'lider', titulo: 'GAP' },
]

const ALTERNANCIA_MS = 5000

/** Rota entre INTERVAL y GAP. Devuelve el índice para que el encabezado marque el activo. */
function useModoAlternado(ms) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!(ms > 0)) return
    const id = setInterval(() => setI((x) => (x + 1) % MODOS.length), ms)
    return () => clearInterval(id)
  }, [ms])
  return i
}

/** +1.234 / +2 V / — */
function fmtGap(gap) {
  if (gap == null) return '—'
  if (gap.vueltas != null) return `+${gap.vueltas} V`
  return `+${Math.floor(gap.ms / 1000)}.${String(gap.ms % 1000).padStart(3, '0')}`
}

export default function TimingTower({ orden, intervalos, equipos, vueltaRapidaEq, alternanciaMs = ALTERNANCIA_MS }) {
  const idx = useModoAlternado(alternanciaMs)
  const modo = MODOS[idx]

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
        <span className="tower-modos">
          {MODOS.map((m) => (
            <b key={m.id} className={m.id === modo.id ? 'is-activo' : ''}>{m.titulo}</b>
          ))}
        </span>
      </div>

      <div className="tower-filas">
        {orden.map((r) => {
          const eq = equipos?.[r.eqId]
          const iv = intervalos?.[r.eqId]
          const dnf = r.estado === CARRITO.DNF

          return (
            <div key={r.eqId} className={`tower-fila ${dnf ? 'is-dnf' : ''} ${iv?.esLider ? 'is-lider' : ''}`}>
              <span className="tower-col-pos">{r.posicion}</span>

              <span className="tower-col-eq">
                <i className="tower-color" style={{ background: getColor(eq?.color)?.hex }} />
                <b className="tower-nombre">{eq?.nombre || '—'}</b>
                {r.eqId === vueltaRapidaEq && <i className="tower-fastest" title="Vuelta rápida" />}
              </span>

              {/* DNF y líder no tienen diferencia que mostrar: va su rol. */}
              {dnf || iv?.esLider ? (
                <span className="tower-col-rol">{dnf ? 'DNF' : 'LÍDER'}</span>
              ) : (
                // La key fuerza el remount al cambiar de modo, y con eso la animación que
                // avisa que el número que estás mirando ya no significa lo mismo.
                <span key={modo.id} className="tower-col-num">{fmtGap(iv?.[modo.id])}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

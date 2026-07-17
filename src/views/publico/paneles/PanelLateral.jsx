// src/views/publico/paneles/PanelLateral.jsx
// Celda 1/4 de la fila 2. Es la misma columna en las dos fases del torneo:
//   REGISTRO -> quiénes se están anotando (equipos + sensores)
//   EN CURSO -> torre de tiempos con INTERVAL y GAP
// Cuando no hay sesión ni registro, cae al listado de inscriptos.

import TimingTower from '../../../components/TimingTower.jsx'
import { getColor } from '../../../domain/colors.js'
import { TORNEO } from '../../../domain/constants.js'
import { participantesNormalizados } from '../../../domain/participants.js'
import './panel-lateral.css'

export default function PanelLateral({ torneo, sesion, orden, intervalos, equipos, vueltaRapidaEq }) {
  const enCarrera = torneo.estado === TORNEO.EN_CURSO && sesion && orden.length > 0

  if (enCarrera) {
    return (
      <TimingTower
        orden={orden}
        intervalos={intervalos}
        equipos={equipos}
        vueltaRapidaEq={vueltaRapidaEq}
      />
    )
  }

  return <Inscriptos equipos={equipos} sensores={torneo.sensores} />
}

function Inscriptos({ equipos, sensores }) {
  const lista = Object.entries(equipos || {})
  const listaSensores = Object.entries(sensores || {})
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  return (
    <div className="lateral">
      <div className="lateral-bloque">
        <div className="lateral-titulo">INSCRIPTOS ({lista.length})</div>

        <div className="lateral-filas">
          {lista.length === 0 && <div className="lateral-vacio">TODAVÍA NADIE… ¡ANIMATE!</div>}
          {lista.map(([id, eq]) => (
            <div key={id} className="lateral-equipo">
              <i className="lateral-color" style={{ background: getColor(eq.color)?.hex }} />
              <b className="lateral-nombre">{eq.nombre}</b>
              <span className="lateral-int">{participantesNormalizados(eq).length}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lateral-bloque lateral-bloque--sensores">
        <div className="lateral-titulo">SENSORES ({listaSensores.length})</div>

        <div className="lateral-filas">
          {listaSensores.length === 0 && <div className="lateral-vacio">NINGUNO</div>}
          {listaSensores.map((s) => (
            <div key={s.id} className="lateral-sensor">
              <b className="lateral-nombre">{s.nombre}</b>
              <span className="lateral-int">{s.orden === 0 ? '🏁 META' : `S${s.orden}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

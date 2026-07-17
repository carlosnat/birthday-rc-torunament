import VueltaEnEjecucion from './VueltaEnEjecucion.jsx'
import { CARRITO } from '../domain/constants.js'
import { getColor } from '../domain/colors.js'
import './vueltas-vivas-panel.css'

export default function VueltasVivasPanel({ sesion, equipos, sensores }) {
  if (!sesion) {
    return (
      <div className="pub-panel">
        <div className="pub-panel-title">VUELTAS EN VIVO</div>
        <div className="pub-dim">SIN SESIÓN ACTIVA</div>
      </div>
    )
  }

  const carritos = sesion.carritos || {}
  const enCarrera = Object.entries(carritos).filter(([, carrito]) => carrito.estado === CARRITO.EN_CARRERA)

  if (enCarrera.length === 0) {
    return (
      <div className="pub-panel">
        <div className="pub-panel-title">VUELTAS EN VIVO</div>
        <div className="pub-dim">ESPERANDO LARGADA...</div>
      </div>
    )
  }

  return (
    <div className="pub-panel pub-vueltas-vivas">
      <div className="pub-panel-title">VUELTAS EN VIVO</div>
      <div className="vueltas-grid">
        {enCarrera.map(([eqId, carrito]) => {
          const equipo = equipos[eqId]
          return (
            <div key={eqId} className="vuelta-viva-card">
              <div className="vuelta-header">
                <div className="vuelta-equipo-color" style={{ backgroundColor: getColor(equipo?.color)?.hex }}></div>
                <div className="vuelta-equipo-nombre">{equipo?.nombre || eqId}</div>
              </div>
              <VueltaEnEjecucion carrito={carrito} sesion={sesion} sensores={sensores} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

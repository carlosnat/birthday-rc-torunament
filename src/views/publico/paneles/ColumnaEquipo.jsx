// src/views/publico/paneles/ColumnaEquipo.jsx
// Una columna de la fila 3. Como el panel lateral, sirve a las dos fases:
//   REGISTRO -> los integrantes que se van sumando al equipo
//   EN CURSO -> la vuelta en vivo (cronómetro + sectores)

import VueltaEnEjecucion from '../../../components/VueltaEnEjecucion.jsx'
import AvatarSprite from '../../../components/AvatarSprite.jsx'
import { getColor } from '../../../domain/colors.js'
import { CARRITO, TORNEO } from '../../../domain/constants.js'
import { participantesNormalizados } from '../../../domain/participants.js'
import './columna-equipo.css'

const ESTADO_TEXTO = {
  [CARRITO.EN_GRILLA]: 'EN GRILLA',
  [CARRITO.TERMINO]: 'TERMINÓ',
  [CARRITO.DNF]: 'DNF',
}

export default function ColumnaEquipo({ torneo, sesion, eqId, equipo }) {
  const carrito = sesion?.carritos?.[eqId]
  const corriendo = carrito?.estado === CARRITO.EN_CARRERA
  const enRegistro = torneo.estado === TORNEO.REGISTRO
  const color = getColor(equipo.color)?.hex

  return (
    <article className="col-eq" style={{ '--eq-color': color }}>
      <header className="col-eq-top">
        <span className="col-eq-nombre">{equipo.nombre}</span>
        {carrito && !enRegistro && <span className="col-eq-vueltas">V{carrito.vueltas ?? 0}</span>}
      </header>

      <div className="col-eq-cuerpo">
        {enRegistro ? (
          <Integrantes equipo={equipo} />
        ) : corriendo ? (
          <VueltaEnEjecucion carrito={carrito} sesion={sesion} sensores={torneo.sensores} compacta />
        ) : (
          <div className="col-eq-inactivo">{ESTADO_TEXTO[carrito?.estado] || 'SIN SESIÓN'}</div>
        )}
      </div>
    </article>
  )
}

function Integrantes({ equipo }) {
  const gente = participantesNormalizados(equipo)

  if (gente.length === 0) {
    return <div className="col-eq-inactivo">SIN INTEGRANTES</div>
  }

  return (
    <ul className="col-eq-gente">
      {gente.map((p) => (
        <li key={p.id} className="col-eq-persona">
          <AvatarSprite avatarId={p.avatarId} size={22} />
          <span className="col-eq-persona-nombre">{p.nombre}</span>
        </li>
      ))}
    </ul>
  )
}

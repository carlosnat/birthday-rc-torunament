// src/views/publico/paneles/Escenario.jsx
// Celda 3/4 de la fila 2: el "escenario" de la transmisión. Es lo único que cambia de
// contenido según el estado, así que concentra acá el ruteo y Publico.jsx queda como puro
// layout.
//
// Durante la carrera muestra la cámara de un invitado, o su QR si no hay ninguna. El podio y
// los QR de alta también viven acá porque no tienen otro lugar: sin ellos no se puede
// registrar ni cerrar el torneo.

import QRRegistro from '../../../components/QRRegistro.jsx'
import SemaforoF1 from '../../../components/SemaforoF1.jsx'
import BanderaCuadros from '../../../components/BanderaCuadros.jsx'
import Podio from '../../../components/Podio.jsx'
import TablaPuntos from '../../../components/TablaPuntos.jsx'
import { TORNEO, SESION } from '../../../domain/constants.js'
import { VIEWER } from '../../../webrtc/useCamaraViewer.js'
import { urlRol } from '../../../currentTorneo.js'
import './escenario.css'

export default function Escenario({ torneo, sesion, orden, equipos, standings, sonido, camara }) {
  if (torneo.estado === TORNEO.REGISTRO) {
    return (
      <section className="esc esc--velo esc--qr">
        <PanelQR titulo="EQUIPOS" rol="equipo" />
        <PanelQR titulo="SENSORES" rol="sensor" />
        <PanelQR titulo="CÁMARA" rol="camara" />
      </section>
    )
  }

  if (torneo.estado === TORNEO.FINALIZADO) {
    const podio = standings.map((row, i) => ({ eqId: row.eqId, posicion: i + 1, puntos: row.puntos }))
    return (
      <section className="esc esc--velo">
        <div className="esc-campeon">🏆 CAMPEÓN DEL TORNEO 🏆</div>
        <Podio orden={podio} equipos={equipos} />
      </section>
    )
  }

  if (sesion?.estado === SESION.FINALIZADA) {
    return (
      <section className="esc esc--velo">
        <Podio orden={sesion.resultados || orden} equipos={equipos} pilotosSesion={sesion.pilotos} />
        {standings?.length > 0 && (
          <TablaPuntos standings={standings} equipos={equipos} pilotosSesion={sesion.pilotos} />
        )}
      </section>
    )
  }

  if (sesion?.estado === SESION.BANDERA) {
    return <section className="esc esc--velo"><BanderaCuadros /></section>
  }

  // El semáforo sólo tiene sentido en LARGADA y en el instante del verde. Una vez que
  // alguien arrancó el crono, deja lugar.
  const arrancado = Object.values(sesion?.carritos || {}).some((c) => (c.vueltas || 0) > 0 || c.cronoInicio)
  if (sesion && (sesion.estado === SESION.LARGADA || (sesion.estado === SESION.EN_CURSO && !arrancado))) {
    return <section className="esc esc--velo"><SemaforoF1 estado={sesion.estado} sonido={sonido} /></section>
  }

  // Carrera en curso. Si hay cámara, el video ya se está viendo de fondo a pantalla completa:
  // acá no va nada y lo dejamos pasar. Si no hay, el hueco se auto-documenta con el QR.
  if (camara?.estado === VIEWER.SIN_CAMARA) {
    return (
      <section className="esc esc--velo">
        <PanelQR titulo="CÁMARA" rol="camara" cta="ESCANEÁ PARA TRANSMITIR" />
      </section>
    )
  }

  if (camara?.estado === VIEWER.CONECTANDO) {
    return <section className="esc esc--velo"><div className="esc-msg">CONECTANDO CON LA CÁMARA…</div></section>
  }

  if (camara?.estado === VIEWER.CAIDA) {
    return <section className="esc esc--velo"><div className="esc-msg">SE PERDIÓ LA SEÑAL DE LA CÁMARA</div></section>
  }

  return <section className="esc esc--libre" />
}

function PanelQR({ titulo, rol, cta = 'ESCANEÁ Y SUMATE' }) {
  return (
    <div className="esc-qr">
      <div className="esc-qr-titulo">{titulo}</div>
      <div className="esc-qr-img"><QRRegistro url={urlRol(rol)} size={260} /></div>
      <div className="esc-qr-cta">{cta}</div>
    </div>
  )
}

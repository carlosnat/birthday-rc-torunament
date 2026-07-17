// src/views/publico/Publico.jsx
// Pantalla PÚBLICA (proyector/TV), estilo transmisión de F1.
// Este archivo es sólo la grilla: qué componente va en cada celda. La lógica de cada celda
// vive en paneles/, y las reglas de negocio en domain/.
//
//   ┌───────────────────────────────────────────────┐
//   │ Cabecera                                      │  fila 1
//   ├─────────────┬─────────────────────────────────┤
//   │ PanelLateral│ Escenario                       │  fila 2 (1/4 + 3/4)
//   ├─────────────┴─────────────────────────────────┤
//   │ ColumnaEquipo · una por equipo (hasta 5)      │  fila 3
//   └───────────────────────────────────────────────┘

import { useState } from 'react'
import { useTorneo } from '../../context/TournamentContext.jsx'
import { useNow } from '../../hooks/useNow.js'
import Confeti from '../../components/Confeti.jsx'
import Cabecera from './paneles/Cabecera.jsx'
import PanelLateral from './paneles/PanelLateral.jsx'
import Escenario from './paneles/Escenario.jsx'
import ColumnaEquipo from './paneles/ColumnaEquipo.jsx'
import VideoFondo from '../camara/VideoFondo.jsx'
import { useCamaraViewer } from '../../webrtc/useCamaraViewer.js'
import { clasificar, vueltaRapida } from '../../domain/classification.js'
import { puntosAcumulados, calcularIntervalos } from '../../domain/standings.js'
import { TORNEO, SESION } from '../../domain/constants.js'
import { unlockAudio } from '../../utils/audio.js'
import './publico.css'

export default function Publico() {
  const { torneo, loading } = useTorneo()
  const [sonido, setSonido] = useState(false)
  const now = useNow(1000)
  // Vive acá y no en el panel: el Escenario monta/desmonta según el estado de la sesión, y
  // ahí adentro la conexión se cortaría y se reharía en cada transición. Va antes de los
  // returns de abajo porque los hooks no pueden quedar detrás de un condicional.
  const camara = useCamaraViewer(torneo)

  if (loading) return <div className="pub-center">CARGANDO…</div>
  if (!torneo) return <div className="pub-center">TORNEO NO ENCONTRADO</div>

  const equipos = torneo.equipos || {}
  const sesion = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  const orden = sesion ? clasificar(sesion.carritos, sesion.tipo, torneo.config.puntuacion) : []
  const intervalos = calcularIntervalos(orden)
  const vr = sesion ? vueltaRapida(sesion.carritos) : null
  const standings = puntosAcumulados(torneo)
  const festejo = torneo.estado === TORNEO.FINALIZADO || sesion?.estado === SESION.FINALIZADA
  const lista = Object.entries(equipos)

  return (
    <div className={`pub ${camara.stream ? 'pub--con-video' : ''}`}>
      {/* Capa 0: la imagen es la pantalla. Todo lo de abajo flota encima, así el semáforo, la
          bandera y el podio se superponen en vez de reemplazar el video. */}
      <VideoFondo stream={camara.stream} estado={camara.estado} />

      {festejo && <Confeti active />}

      {!sonido && (
        <button className="audio-unlock" onClick={() => { unlockAudio(); setSonido(true) }}>
          🔊 TOCÁ PARA ACTIVAR EL SONIDO
        </button>
      )}

      <Cabecera torneo={torneo} sesion={sesion} orden={orden} now={now} />

      <div className="pub-fila-2">
        <PanelLateral
          torneo={torneo}
          sesion={sesion}
          orden={orden}
          intervalos={intervalos}
          equipos={equipos}
          vueltaRapidaEq={vr?.eqId}
        />
        <Escenario
          torneo={torneo}
          sesion={sesion}
          orden={orden}
          equipos={equipos}
          standings={standings}
          sonido={sonido}
          camara={camara}
        />
      </div>

      <div className={lista.length ? 'pub-fila-3' : 'pub-fila-3-vacia'}>
        {lista.length === 0
          ? 'ESPERANDO EQUIPOS…'
          : lista.map(([eqId, equipo]) => (
              <ColumnaEquipo key={eqId} torneo={torneo} sesion={sesion} eqId={eqId} equipo={equipo} />
            ))}
      </div>
    </div>
  )
}
